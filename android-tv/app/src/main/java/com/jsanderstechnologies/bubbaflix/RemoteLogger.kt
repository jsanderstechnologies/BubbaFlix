package com.jsanderstechnologies.bubbaflix

import com.jsanderstechnologies.bubbaflix.BuildConfig
import android.app.ActivityManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Environment
import android.os.StatFs
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
import java.util.Locale
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

    data class MemoryStats(
        val ramTotalBytes: Long,
        val ramAvailBytes: Long,
        val ramUsedBytes: Long,
        val ramPercentUsed: Int,
        val romTotalBytes: Long,
        val romAvailBytes: Long,
        val romUsedBytes: Long,
        val romPercentUsed: Int,
        val jvmMaxBytes: Long,
        val jvmTotalBytes: Long,
        val jvmUsedBytes: Long
    )

    private val logQueue = ConcurrentLinkedQueue<LogItem>()
    private var scheduler: ScheduledExecutorService? = null
    private val isFlushing = AtomicBoolean(false)

    private var appContext: Context? = null
    private var prefs: SharedPreferences? = null
    private var cachedServerUrl: String = DEFAULT_SERVER_URL
    private var deviceModel: String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
    private var appVersion: String = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"

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
    private var lastMemoryReportTime = 0L

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
            val vName = pInfo.versionName ?: BuildConfig.VERSION_NAME
            @Suppress("DEPRECATION")
            val vCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode.toInt()
            } else {
                pInfo.versionCode
            }
            appVersion = "$vName ($vCode)"
        } catch (e: Exception) {
            appVersion = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
        }

        installCrashHandler()

        scheduler = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "BubbaFlix-RemoteLogger").apply { isDaemon = true }
        }
        scheduler?.scheduleWithFixedDelay({
            flushLogsInternal(sync = false)
        }, 3, 3, TimeUnit.SECONDS)

        i("AppLifecycle", "BubbaFlixTV App initialized. Device: $deviceModel, Android: ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT}), Version: $appVersion, Server: $cachedServerUrl")
        i("DeviceStats", getDeviceMemorySummary())
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

    fun getMemoryStats(): MemoryStats {
        var ramTotal = 0L
        var ramAvail = 0L
        try {
            val actManager = appContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            actManager?.getMemoryInfo(memInfo)
            ramTotal = memInfo.totalMem
            ramAvail = memInfo.availMem
        } catch (e: Exception) {
            // Ignore
        }
        val ramUsed = (ramTotal - ramAvail).coerceAtLeast(0L)
        val ramPercent = if (ramTotal > 0) ((ramUsed * 100) / ramTotal).toInt() else 0

        var romTotal = 0L
        var romAvail = 0L
        try {
            val dataDir = Environment.getDataDirectory()
            val statFs = StatFs(dataDir.path)
            romTotal = statFs.blockCountLong * statFs.blockSizeLong
            romAvail = statFs.availableBlocksLong * statFs.blockSizeLong
        } catch (e: Exception) {
            // Ignore
        }
        val romUsed = (romTotal - romAvail).coerceAtLeast(0L)
        val romPercent = if (romTotal > 0) ((romUsed * 100) / romTotal).toInt() else 0

        val runtime = Runtime.getRuntime()
        val jvmMax = runtime.maxMemory()
        val jvmTotal = runtime.totalMemory()
        val jvmUsed = (jvmTotal - runtime.freeMemory()).coerceAtLeast(0L)

        return MemoryStats(
            ramTotalBytes = ramTotal,
            ramAvailBytes = ramAvail,
            ramUsedBytes = ramUsed,
            ramPercentUsed = ramPercent,
            romTotalBytes = romTotal,
            romAvailBytes = romAvail,
            romUsedBytes = romUsed,
            romPercentUsed = romPercent,
            jvmMaxBytes = jvmMax,
            jvmTotalBytes = jvmTotal,
            jvmUsedBytes = jvmUsed
        )
    }

    fun formatBytes(bytes: Long): String {
        if (bytes <= 0) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB", "TB")
        val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt().coerceIn(0, units.size - 1)
        return String.format(Locale.US, "%.2f %s", bytes / Math.pow(1024.0, digitGroups.toDouble()), units[digitGroups])
    }

    fun getDeviceMemorySummary(): String {
        val s = getMemoryStats()
        return "RAM: ${formatBytes(s.ramUsedBytes)} / ${formatBytes(s.ramTotalBytes)} (${s.ramPercentUsed}% used, ${formatBytes(s.ramAvailBytes)} free) | ROM: ${formatBytes(s.romUsedBytes)} / ${formatBytes(s.romTotalBytes)} (${s.romPercentUsed}% used, ${formatBytes(s.romAvailBytes)} free)"
    }

    fun logMemoryStats(tag: String = "DeviceStats") {
        i(tag, getDeviceMemorySummary())
    }

    private fun flushLogsInternal(sync: Boolean) {
        if (logQueue.isEmpty()) return
        if (!isFlushing.compareAndSet(false, true)) return

        try {
            val now = System.currentTimeMillis()
            if (now - lastMemoryReportTime > 120_000L) {
                lastMemoryReportTime = now
                d("DeviceStats", getDeviceMemorySummary())
            }

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
                    put("appVersion", appVersion)
                    put("versionName", BuildConfig.VERSION_NAME)
                    put("versionCode", BuildConfig.VERSION_CODE)
                    if (!item.stack.isNullOrEmpty()) {
                        put("stack", item.stack)
                    }
                }
                jsonArray.put(itemObj)
            }

            val stats = getMemoryStats()
            val memoryJson = JSONObject().apply {
                put("ramUsed", formatBytes(stats.ramUsedBytes))
                put("ramTotal", formatBytes(stats.ramTotalBytes))
                put("ramAvailable", formatBytes(stats.ramAvailBytes))
                put("ramPercentUsed", stats.ramPercentUsed)
                put("romUsed", formatBytes(stats.romUsedBytes))
                put("romTotal", formatBytes(stats.romTotalBytes))
                put("romAvailable", formatBytes(stats.romAvailBytes))
                put("romPercentUsed", stats.romPercentUsed)
                put("summary", getDeviceMemorySummary())
            }

            val payload = JSONObject().apply {
                put("source", "BubbaFlix Android TV")
                put("device", deviceModel)
                put("appVersion", appVersion)
                put("versionName", BuildConfig.VERSION_NAME)
                put("versionCode", BuildConfig.VERSION_CODE)
                put("memory", memoryJson)
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
