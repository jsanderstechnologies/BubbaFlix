package com.jsanderstechnologies.bubbaflix

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.PrintWriter
import java.io.StringWriter
import java.util.ArrayList
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

object RemoteLogger {

    private const val TAG = "RemoteLogger"
    private const val DEFAULT_SERVER_URL = "https://bubbaflix.sanders-technologies.net"
    private const val MAX_QUEUE_SIZE = 300
    private const val BATCH_SIZE = 50

    data class LogItem(
        val timestamp: Long,
        val level: String,
        val tag: String,
        val message: String,
        val stack: String? = null
    )

    private val logQueue = ConcurrentLinkedQueue<LogItem>()
    private var scheduler: ScheduledExecutorService? = null
    private val isFlushing = AtomicBoolean(false)

    private var appContext: Context? = null
    private var prefs: SharedPreferences? = null
    private var cachedServerUrl: String = DEFAULT_SERVER_URL
    private var deviceModel: String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
    private var appVersion: String = "1.0.35 (36)"

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(4, TimeUnit.SECONDS)
            .writeTimeout(4, TimeUnit.SECONDS)
            .readTimeout(4, TimeUnit.SECONDS)
            .build()
    }

    private var previousExceptionHandler: Thread.UncaughtExceptionHandler? = null

    // Message duplicate suppression
    private var lastLoggedMessage: String? = null
    private var duplicateCount = 0
    private var lastLoggedTime = 0L

    fun init(context: Context) {
        if (appContext != null) return
        appContext = context.applicationContext
        prefs = context.getSharedPreferences("BubbaFlixTVPrefs", Context.MODE_PRIVATE)

        val savedUrl = prefs?.getString("server_url", DEFAULT_SERVER_URL)
        if (!savedUrl.isNullOrEmpty()) {
            cachedServerUrl = cleanUrl(savedUrl)
        }

        try {
            @Suppress("DEPRECATION")
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            @Suppress("DEPRECATION")
            appVersion = "${pInfo.versionName} (${pInfo.versionCode})"
        } catch (e: Exception) {
            // Default fallback
        }

        installCrashHandler()

        scheduler = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "BubbaFlix-RemoteLogger").apply { isDaemon = true }
        }
        scheduler?.scheduleWithFixedDelay({
            flushLogsInternal(sync = false)
        }, 3, 3, TimeUnit.SECONDS)

        i("AppLifecycle", "BubbaFlixTV App initialized. Device: $deviceModel, Android: ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT}), Version: $appVersion, Server: $cachedServerUrl")
    }

    fun setServerUrl(url: String) {
        val cleaned = cleanUrl(url)
        if (cleaned.isNotEmpty()) {
            cachedServerUrl = cleaned
            d("RemoteLogger", "Updated server URL to $cachedServerUrl")
        }
    }

    fun getServerUrl(): String = cachedServerUrl

    private fun cleanUrl(url: String): String {
        var clean = url.trim()
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
            clean = "http://$clean"
        }
        return clean.replace(Regex("""/+$"""), "")
    }

    private fun installCrashHandler() {
        previousExceptionHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val stack = getStackTraceString(throwable)
            e("FatalCrash", "FATAL EXCEPTION on thread [${thread.name}]: ${throwable.message}\n$stack", throwable)
            // Synchronously flush before process exits
            flushLogsInternal(sync = true)
            previousExceptionHandler?.uncaughtException(thread, throwable)
        }
    }

    fun d(tag: String, message: String) {
        Log.d(tag, message)
        enqueue("DEBUG", tag, message)
    }

    fun i(tag: String, message: String) {
        Log.i(tag, message)
        enqueue("INFO", tag, message)
    }

    fun w(tag: String, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.w(tag, message, throwable)
        } else {
            Log.w(tag, message)
        }
        val stack = throwable?.let { getStackTraceString(it) }
        enqueue("WARN", tag, message, stack)
    }

    fun e(tag: String, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(tag, message, throwable)
        } else {
            Log.e(tag, message)
        }
        val stack = throwable?.let { getStackTraceString(it) }
        enqueue("ERROR", tag, message, stack)
        triggerImmediateFlush()
    }

    private fun enqueue(level: String, tag: String, message: String, stack: String? = null) {
        val now = System.currentTimeMillis()

        synchronized(this) {
            if (message == lastLoggedMessage && (now - lastLoggedTime) < 1000) {
                duplicateCount++
                return
            } else if (duplicateCount > 0) {
                logQueue.offer(LogItem(now, "DEBUG", tag, "[Suppressed $duplicateCount duplicate occurrences]"))
                duplicateCount = 0
            }
            lastLoggedMessage = message
            lastLoggedTime = now
        }

        while (logQueue.size >= MAX_QUEUE_SIZE) {
            logQueue.poll()
        }

        logQueue.offer(LogItem(now, level, tag, message, stack))
    }

    fun triggerImmediateFlush() {
        scheduler?.execute {
            flushLogsInternal(sync = false)
        }
    }

    private fun flushLogsInternal(sync: Boolean) {
        if (logQueue.isEmpty()) return
        if (!isFlushing.compareAndSet(false, true)) return

        try {
            val batch = ArrayList<LogItem>(BATCH_SIZE)
            var count = 0
            while (count < BATCH_SIZE) {
                val item = logQueue.poll() ?: break
                batch.add(item)
                count++
            }

            if (batch.isEmpty()) {
                isFlushing.set(false)
                return
            }

            val jsonArray = JSONArray()
            for (item in batch) {
                val itemObj = JSONObject().apply {
                    put("timestamp", item.timestamp)
                    put("level", item.level)
                    put("tag", item.tag)
                    put("message", item.message)
                    if (!item.stack.isNullOrEmpty()) {
                        put("stack", item.stack)
                    }
                }
                jsonArray.put(itemObj)
            }

            val payload = JSONObject().apply {
                put("source", "BubbaFlix Android TV")
                put("device", deviceModel)
                put("appVersion", appVersion)
                put("logs", jsonArray)
            }

            val endpoint = "$cachedServerUrl/api/log"
            val body = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url(endpoint)
                .post(body)
                .build()

            try {
                val response = httpClient.newCall(request).execute()
                val success = response.isSuccessful
                response.close()

                if (!success) {
                    requeueBatch(batch)
                }
            } catch (e: Exception) {
                requeueBatch(batch)
            }
        } finally {
            isFlushing.set(false)
            if (!sync && !logQueue.isEmpty()) {
                scheduler?.schedule({ flushLogsInternal(false) }, 500, TimeUnit.MILLISECONDS)
            }
        }
    }

    private fun requeueBatch(batch: List<LogItem>) {
        if (logQueue.size + batch.size < MAX_QUEUE_SIZE) {
            for (item in batch) {
                logQueue.offer(item)
            }
        }
    }

    private fun getStackTraceString(t: Throwable): String {
        val sw = StringWriter()
        val pw = PrintWriter(sw)
        t.printStackTrace(pw)
        return sw.toString()
    }
}
