package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.bumptech.glide.Glide
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.Locale
import java.util.concurrent.TimeUnit

@UnstableApi
class PlayerActivity : AppCompatActivity() {

    private lateinit var playerView: PlayerView
    private var exoPlayer: ExoPlayer? = null

    private lateinit var controlsOverlay: View
    private lateinit var btnBack: Button
    private lateinit var btnAudio: Button
    private lateinit var btnSubtitles: Button
    private lateinit var imgMediaLogo: ImageView
    private lateinit var txtPlayerTitle: TextView

    private lateinit var btnRewind30: Button
    private lateinit var btnRewind10: Button
    private lateinit var btnPlayPause: ImageButton
    private lateinit var btnFF10: Button
    private lateinit var btnFF30: Button

    private lateinit var txtCurrentTime: TextView
    private lateinit var txtDuration: TextView
    private lateinit var seekBar: SeekBar
    private lateinit var errorLayout: View
    private lateinit var txtErrorMsg: TextView
    private lateinit var bufferingSpinner: ProgressBar

    private val handler = Handler(Looper.getMainLooper())
    private var controlsVisible = true
    private var isUserSeeking = false
    private var probedDurationMs: Long = 0
    private var previousUncaughtExceptionHandler: Thread.UncaughtExceptionHandler? = null

    private val hideControlsRunnable = Runnable {
        hideControls()
    }

    private val updateProgressRunnable = object : Runnable {
        override fun run() {
            updateProgress()
            handler.postDelayed(this, 500)
        }
    }

    companion object {
        const val EXTRA_VIDEO_URL = "video_url"
        const val EXTRA_TITLE = "title"
        const val EXTRA_LOGO_URL = "logo_url"
        const val EXTRA_TMDB_ID = "tmdb_id"
        const val EXTRA_MEDIA_TYPE = "media_type"

        fun start(context: Context, videoUrl: String, title: String?, logoUrl: String? = null, tmdbId: String? = null, mediaType: String? = null) {
            val intent = Intent(context, PlayerActivity::class.java).apply {
                putExtra(EXTRA_VIDEO_URL, videoUrl)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_LOGO_URL, logoUrl)
                putExtra(EXTRA_TMDB_ID, tmdbId)
                putExtra(EXTRA_MEDIA_TYPE, mediaType)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT))
        hideSystemUI()

        // Global crash guard for background player & decoding threads to prevent app crash and restart
        previousUncaughtExceptionHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("PlayerActivity", "Uncaught exception on thread ${thread.name}", throwable)
            RemoteLogger.e(
                "PlayerActivity",
                "Fatal thread error (${thread.name}): ${throwable.message ?: throwable.javaClass.simpleName} | Stream: ${intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""}",
                throwable
            )
            try {
                if (!isFinishing && !isDestroyed) {
                    runOnUiThread {
                        Toast.makeText(this@PlayerActivity, "Playback encountered an unexpected error and was closed.", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    previousUncaughtExceptionHandler?.uncaughtException(thread, throwable)
                }
            } catch (e: Exception) {
                previousUncaughtExceptionHandler?.uncaughtException(thread, throwable)
            }
        }

        setContentView(R.layout.activity_player)

        playerView = findViewById(R.id.player_view)
        controlsOverlay = findViewById(R.id.controls_overlay)
        btnBack = findViewById(R.id.btn_back)
        btnAudio = findViewById(R.id.btn_audio)
        btnSubtitles = findViewById(R.id.btn_subtitles)
        imgMediaLogo = findViewById(R.id.img_media_logo)
        txtPlayerTitle = findViewById(R.id.txt_player_title)

        btnRewind30 = findViewById(R.id.btn_rewind_30)
        btnRewind10 = findViewById(R.id.btn_rewind_10)
        btnPlayPause = findViewById(R.id.btn_play_pause)
        btnFF10 = findViewById(R.id.btn_ff_10)
        btnFF30 = findViewById(R.id.btn_ff_30)

        txtCurrentTime = findViewById(R.id.txt_current_time)
        txtDuration = findViewById(R.id.txt_duration)
        seekBar = findViewById(R.id.seek_bar)
        errorLayout = findViewById(R.id.error_layout)
        txtErrorMsg = findViewById(R.id.txt_error_msg)
        bufferingSpinner = findViewById(R.id.player_buffering_spinner)

        listOf(btnBack, btnAudio, btnSubtitles, btnRewind30, btnRewind10, btnPlayPause, btnFF10, btnFF30, seekBar).forEach { control ->
            control.isFocusable = true
            control.isFocusableInTouchMode = false
        }
        btnPlayPause.requestFocus()

        val videoUrl = intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE)
        val logoUrl = intent.getStringExtra(EXTRA_LOGO_URL)
        val tmdbId = intent.getStringExtra(EXTRA_TMDB_ID)
        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: "movie"

        RemoteLogger.i("PlayerActivity", "Player launched for '$title' (TMDB: $tmdbId, Type: $mediaType, URL: $videoUrl) | ${RemoteLogger.getDeviceMemorySummary()}")

        txtPlayerTitle.visibility = View.GONE

        if (!logoUrl.isNullOrEmpty()) {
            loadLogoImage(logoUrl)
        } else if (!tmdbId.isNullOrEmpty()) {
            fetchTmdbLogo(tmdbId, mediaType)
        } else if (!title.isNullOrEmpty()) {
            searchTmdbLogoByTitle(title, mediaType)
        } else {
            imgMediaLogo.visibility = View.GONE
        }

        setupControlClickListeners()
        setupSeekBarListener()

        var targetUrl = videoUrl
        if (isFireTablet() && is10BitHevcStream(videoUrl, title)) {
            if (!videoUrl.contains("/api/transcode")) {
                val serverBase = getServerBaseUrl()
                targetUrl = "$serverBase/api/transcode?url=${Uri.encode(videoUrl)}"
                RemoteLogger.w("PlayerActivity", "Fire Tablet hardware guard: Auto-routing 10-bit HEVC stream via server transcode: $targetUrl")
                Log.w("PlayerActivity", "Fire Tablet hardware guard: Auto-routing 10-bit HEVC stream via server transcode: $targetUrl")
                Toast.makeText(this, "Fire Tablet: Transcoding 10-bit HEVC to prevent hardware crash", Toast.LENGTH_LONG).show()
            }
        }

        initializeExoPlayer(targetUrl)

        btnPlayPause.requestFocus()
        resetControlsTimeout()
    }

    private fun isFireTablet(): Boolean {
        val manufacturer = Build.MANUFACTURER ?: ""
        val model = Build.MODEL ?: ""
        val isAmazon = manufacturer.equals("Amazon", ignoreCase = true)
        val isKf = model.startsWith("KF", ignoreCase = true) || model.contains("Fire", ignoreCase = true)
        val isTv = packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_LEANBACK)
        return isAmazon && (isKf || !isTv)
    }

    private fun is10BitHevcStream(url: String, title: String?): Boolean {
        val checkStr = "$url ${title ?: ""}"
        val has10Bit = Regex("""\b(10[\s\-_.]?bit|hi10p?|main10)\b""", RegexOption.IGNORE_CASE).containsMatchIn(checkStr)
        val hasHdr = Regex("""\b(hdr|hdr10|hdr10\+|dv|dovi|dolby[\s\-_.]?vision|hlg)\b""", RegexOption.IGNORE_CASE).containsMatchIn(checkStr)
        val hasHevc = Regex("""\b(hevc|x265|h265|h\.265)\b""", RegexOption.IGNORE_CASE).containsMatchIn(checkStr)
        val has10BitGroup = Regex("""\b(PSA|QxR|MeGusta|Pahe|SAMPA|UTR)\b""", RegexOption.IGNORE_CASE).containsMatchIn(checkStr)

        if (has10Bit) return true
        if (hasHdr) return true
        if (hasHevc && has10BitGroup) return true
        return false
    }

    private fun cleanMediaTitle(rawTitle: String): String {
        var clean = rawTitle.replace(Regex("""\.(mkv|mp4|avi|mov|m4v|wmv|flv|webm)$""", RegexOption.IGNORE_CASE), "")
            .replace(Regex("""[._+]"""), " ")
            .replace(Regex("""\b(1080p|720p|2160p|4k|hdr|web-dl|webrip|h264|x264|h265|hevc|repack|proper|aac|dts|xvid|ethel|eztv|eztvx|rarbg|yts)\b""", RegexOption.IGNORE_CASE), "")
            .replace(Regex("""\[[^\]]*\]|\([^)]*\)"""), "")
            .replace(Regex("""\s+"""), " ")
            .trim()
        return if (clean.isEmpty()) rawTitle else clean
    }

    private fun loadLogoImage(url: String) {
        imgMediaLogo.visibility = View.VISIBLE
        txtPlayerTitle.visibility = View.GONE
        Glide.with(this)
            .load(url)
            .into(imgMediaLogo)
    }

    private fun searchTmdbLogoByTitle(rawTitle: String, mediaType: String) {
        val cleanTitle = cleanMediaTitle(rawTitle)
        if (cleanTitle.isEmpty()) return

        val client = OkHttpClient()
        val url = "https://api.themoviedb.org/3/search/multi?api_key=4544d6db87081702f3a61f38e078b6be&query=" + Uri.encode(cleanTitle)
        val request = Request.Builder().url(url).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) return
                val bodyStr = response.body?.string() ?: return
                try {
                    val json = JSONObject(bodyStr)
                    val results = json.optJSONArray("results")
                    if (results != null && results.length() > 0) {
                        val first = results.getJSONObject(0)
                        val id = first.optInt("id", 0)
                        val type = first.optString("media_type", mediaType)
                        if (id > 0) {
                            fetchTmdbLogo(id.toString(), type)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        })
    }

    private fun fetchTmdbLogo(tmdbId: String, mediaType: String) {
        val client = OkHttpClient()
        val url = "https://api.themoviedb.org/3/$mediaType/$tmdbId/images?api_key=4544d6db87081702f3a61f38e078b6be"
        val request = Request.Builder().url(url).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) return

                val bodyStr = response.body?.string()
                if (!bodyStr.isNullOrEmpty()) {
                    try {
                        val json = JSONObject(bodyStr)
                        val logos = json.optJSONArray("logos")
                        if (logos != null && logos.length() > 0) {
                            var logoPath: String? = null
                            for (i in 0 until logos.length()) {
                                val logoObj = logos.getJSONObject(i)
                                val iso = logoObj.optString("iso_639_1", "")
                                if (iso == "en") {
                                    logoPath = logoObj.optString("file_path", "")
                                    break
                                }
                            }
                            if (logoPath.isNullOrEmpty()) {
                                logoPath = logos.getJSONObject(0).optString("file_path", "")
                            }

                            if (!logoPath.isNullOrEmpty()) {
                                val fullLogoUrl = "https://image.tmdb.org/t/p/w500$logoPath"
                                runOnUiThread {
                                    loadLogoImage(fullLogoUrl)
                                }
                                return
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        })
    }

    @SuppressLint("UnsafeOptInUsageError")
    private fun initializeExoPlayer(videoUrl: String) {
        if (videoUrl.isEmpty()) {
            showError("Invalid stream URL.")
            return
        }

        val renderersFactory = DefaultRenderersFactory(this).apply {
            setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            setEnableDecoderFallback(true)
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .connectionPool(ConnectionPool(8, 2, TimeUnit.MINUTES))
            .followRedirects(true)
            .followSslRedirects(true)
            .build()

        val httpDataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
            .setUserAgent("BubbaFlixTV/1.0 (Android TV Smart Client)")
            .setDefaultRequestProperties(mapOf("Accept-Encoding" to "identity"))

        val dataSourceFactory = DefaultDataSource.Factory(this, httpDataSourceFactory)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: ""
        val isIptv = mediaType.equals("live", ignoreCase = true) || mediaType.equals("iptv", ignoreCase = true)
        val isLiveStream = isIptv ||
                mediaType.equals("livetv", ignoreCase = true) ||
                mediaType.equals("channel", ignoreCase = true) ||
                videoUrl.contains("/proxy/ts/") ||
                videoUrl.contains("/api/dispatcharr/") ||
                videoUrl.contains("/live/")

        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val isLowRamDevice = activityManager?.isLowRamDevice == true || (activityManager?.memoryClass ?: 192) < 256

        // Timeshift in IPTV ONLY:
        // IPTV channels allocate a 30-minute rolling back buffer (10 mins on low-RAM devices) to allow pausing, rewinding,
        // and resuming live TV without dropping frames or jumping forward to live edge.
        // Other live streams (e.g. low-latency feeds) use 0 back-buffer.
        // VOD streams (Movies/TV) use a standard 15s back-buffer with deep forward-cushion.
        val backBufferDurationMs = if (isIptv) {
            if (isLowRamDevice) 600000 else 1800000
        } else if (isLiveStream) {
            0
        } else {
            15000
        }

        val minBufferMs = if (isIptv) 15000 else if (isLiveStream) 2000 else 30000
        val maxBufferMs = if (isIptv) 60000 else if (isLiveStream) 10000 else if (isLowRamDevice) 60000 else 90000
        val bufferForPlaybackMs = if (isLiveStream) 1000 else 2500
        val bufferForPlaybackAfterRebufferMs = if (isLiveStream) 2000 else 6000
        val targetBufferBytes = if (isIptv) {
            if (isLowRamDevice) 96 * 1024 * 1024 else 256 * 1024 * 1024
        } else if (isLowRamDevice) {
            64 * 1024 * 1024
        } else {
            128 * 1024 * 1024
        }

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                minBufferMs,
                maxBufferMs,
                bufferForPlaybackMs,
                bufferForPlaybackAfterRebufferMs
            )
            .setTargetBufferBytes(targetBufferBytes)
            .setPrioritizeTimeOverSizeThresholds(true)
            .setBackBuffer(backBufferDurationMs, isIptv || !isLiveStream)
            .build()

        playerView.setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
        (playerView.videoSurfaceView as? android.view.SurfaceView)?.setZOrderMediaOverlay(true)
        (playerView.videoSurfaceView as? android.view.TextureView)?.isOpaque = false

        var hasRetriedWithFallback = false

        exoPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()
            .apply {
                playerView.player = this
                playerView.keepScreenOn = true

                // Default audio track to English ("en") & disable subtitles by default per user request
                trackSelectionParameters = trackSelectionParameters
                    .buildUpon()
                    .setPreferredAudioLanguage("en")
                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                    .build()

                val mediaItemBuilder = MediaItem.Builder().setUri(Uri.parse(videoUrl))
                if (videoUrl.contains("/proxy/ts/") || videoUrl.endsWith(".ts")) {
                    mediaItemBuilder.setMimeType(MimeTypes.VIDEO_MP2T)
                } else if (videoUrl.contains(".m3u8")) {
                    mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                }

                if (isIptv) {
                    // Enable gentle catch-up for timeshift playback
                    mediaItemBuilder.setLiveConfiguration(
                        MediaItem.LiveConfiguration.Builder()
                            .setMaxPlaybackSpeed(1.04f)
                            .setMinPlaybackSpeed(0.96f)
                            .build()
                    )
                }

                setMediaItem(mediaItemBuilder.build())
                prepare()
                playWhenReady = true

                addListener(object : Player.Listener {
                    @SuppressLint("UnsafeOptInUsageError")
                    override fun onTracksChanged(tracks: Tracks) {
                        super.onTracksChanged(tracks)
                        autoSelectForcedSubtitles(tracks)
                    }

                    override fun onPlaybackStateChanged(state: Int) {
                        val current = exoPlayer?.currentPosition ?: 0L
                        val buffered = exoPlayer?.bufferedPosition ?: 0L
                        val bufferedAhead = (buffered - current).coerceAtLeast(0L)

                        when (state) {
                            Player.STATE_BUFFERING -> {
                                bufferingSpinner.visibility = View.VISIBLE
                                RemoteLogger.d("PlayerActivity", "Playback State: BUFFERING (Position: ${current}ms, BufferedAhead: ${bufferedAhead}ms) | ${RemoteLogger.getDeviceMemorySummary()}")
                            }
                            Player.STATE_READY -> {
                                bufferingSpinner.visibility = View.GONE
                                RemoteLogger.i("PlayerActivity", "Playback State: READY (Duration: ${exoPlayer?.duration}ms, Position: ${current}ms, BufferedAhead: ${bufferedAhead}ms, Playing: $playWhenReady) | ${RemoteLogger.getDeviceMemorySummary()}")
                                errorLayout.visibility = View.GONE
                                btnPlayPause.setImageResource(
                                    if (playWhenReady) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                                )
                                checkAndPromptResume()
                            }
                            Player.STATE_ENDED -> {
                                bufferingSpinner.visibility = View.GONE
                                RemoteLogger.i("PlayerActivity", "Playback State: ENDED. Exiting player.")
                                finish()
                                return
                            }
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        btnPlayPause.setImageResource(
                            if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                        )
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        bufferingSpinner.visibility = View.GONE
                        val errDetails = error.message ?: error.cause?.message ?: "Unknown playback decoding error"
                        RemoteLogger.e("PlayerActivity", "ExoPlayer Error [${error.errorCodeName}]: $errDetails (URL: $videoUrl) | ${RemoteLogger.getDeviceMemorySummary()}", error)
                        sendErrorToServerLog(errDetails, error.errorCodeName, videoUrl)

                        val errMsg = (error.message ?: "") + " " + (error.cause?.message ?: "")
                        val errName = error.errorCodeName.uppercase(Locale.ROOT)

                        if (error.cause is OutOfMemoryError || errMsg.contains("OutOfMemory", ignoreCase = true)) {
                            RemoteLogger.e("PlayerActivity", "Playback OutOfMemoryError: $errMsg | ${RemoteLogger.getDeviceMemorySummary()}")
                            Log.e("PlayerActivity", "Playback OutOfMemoryError: $errMsg")
                            showError("Device memory limit reached. Please restart or close background apps.")
                            return
                        }

                        if (!hasRetriedWithFallback) {
                            hasRetriedWithFallback = true
                            if (!videoUrl.contains("/api/transcode")) {
                                val serverBase = getServerBaseUrl()
                                val transcodeUrl = "$serverBase/api/transcode?url=${Uri.encode(videoUrl)}"
                                RemoteLogger.w("PlayerActivity", "Playback error ($errName: $errMsg). Falling back to server transcode: $transcodeUrl")
                                Log.d("PlayerActivity", "Playback error ($errName: $errMsg). Falling back to server transcode: $transcodeUrl")
                                val fallbackItem = MediaItem.Builder()
                                    .setUri(Uri.parse(transcodeUrl))
                                    .setMimeType(MimeTypes.APPLICATION_M3U8)
                                    .build()
                                setMediaItem(fallbackItem)
                                prepare()
                                playWhenReady = true
                                return
                            } else if (isLiveStream) {
                                val fallbackMime = if (videoUrl.contains(".m3u8")) MimeTypes.APPLICATION_M3U8 else MimeTypes.VIDEO_MP2T
                                val fallbackItem = MediaItem.Builder()
                                    .setUri(Uri.parse(videoUrl))
                                    .setMimeType(fallbackMime)
                                    .build()
                                setMediaItem(fallbackItem)
                                prepare()
                                playWhenReady = true
                                return
                            }
                        }
                        showError("Stream error: ${error.message ?: "Failed to decode stream format"}")
                    }
                })
            }

        handler.post(updateProgressRunnable)
    }

    private fun getServerBaseUrl(): String {
        val prefs = getSharedPreferences("BubbaFlixTVPrefs", Context.MODE_PRIVATE)
        val url = prefs.getString("server_url", "https://bubbaflix.sanders-technologies.net") ?: "https://bubbaflix.sanders-technologies.net"
        return url.replace(Regex("""/+$"""), "")
    }

    private fun sendErrorToServerLog(errorMsg: String, errorCode: String, urlStr: String) {
        try {
            val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
            RemoteLogger.e("PlayerActivity", "Player Error [$errorCode]: $errorMsg | Title: $title | URL: $urlStr")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun setupControlClickListeners() {
        val onScreenTap = View.OnClickListener {
            if (controlsVisible) {
                resetControlsTimeout()
            } else {
                resetControlsTimeout()
                btnPlayPause.requestFocus()
            }
        }

        playerView.setOnClickListener(onScreenTap)
        controlsOverlay.setOnClickListener(onScreenTap)

        btnBack.setOnClickListener { finish() }
        btnBack.setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                if (controlsVisible) {
                    handler.removeCallbacks(hideControlsRunnable)
                    hideControls()
                    return@setOnKeyListener true
                }
            }
            false
        }

        btnAudio.setOnClickListener { showAudioTrackSelectionDialog() }

        btnSubtitles.setOnClickListener { showSubtitleTrackSelectionDialog() }

        btnPlayPause.setOnClickListener {
            resetControlsTimeout()
            exoPlayer?.let { player ->
                if (player.playWhenReady && player.playbackState != Player.STATE_ENDED) {
                    player.playWhenReady = false
                    btnPlayPause.setImageResource(android.R.drawable.ic_media_play)
                } else {
                    if (player.playbackState == Player.STATE_ENDED) {
                        player.seekTo(0)
                    }
                    player.playWhenReady = true
                    btnPlayPause.setImageResource(android.R.drawable.ic_media_pause)
                }
            }
        }

        btnRewind30.setOnClickListener { seekRelative(-30000) }
        btnRewind10.setOnClickListener { seekRelative(-10000) }
        btnFF10.setOnClickListener { seekRelative(10000) }
        btnFF30.setOnClickListener { seekRelative(30000) }
    }

    override fun onTouchEvent(event: MotionEvent?): Boolean {
        if (event != null && (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_UP)) {
            resetControlsTimeout()
        }
        return super.onTouchEvent(event)
    }

    @SuppressLint("UnsafeOptInUsageError")
    private fun showAudioTrackSelectionDialog() {
        resetControlsTimeout()
        val player = exoPlayer ?: return
        val tracks = player.currentTracks

        val audioTrackOptions = ArrayList<Pair<Tracks.Group, Int>>()
        val optionLabels = ArrayList<String>()

        for (group in tracks.groups) {
            if (group.type == C.TRACK_TYPE_AUDIO) {
                val mediaTrackGroup = group.mediaTrackGroup
                for (i in 0 until mediaTrackGroup.length) {
                    val format = mediaTrackGroup.getFormat(i)
                    val lang = if (!format.language.isNullOrEmpty()) Locale(format.language!!).displayLanguage else "Track ${audioTrackOptions.size + 1}"
                    val label = format.label ?: lang
                    val channels = if (format.channelCount > 0) "${format.channelCount}ch" else ""
                    val isSelected = group.isTrackSelected(i)
                    val prefix = if (isSelected) "✓ " else "   "

                    audioTrackOptions.add(Pair(group, i))
                    optionLabels.add("$prefix$label $channels (${format.sampleMimeType ?: "audio"})")
                }
            }
        }

        if (optionLabels.isEmpty()) {
            Toast.makeText(this, "No alternative audio tracks found.", Toast.LENGTH_SHORT).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("🔊 Select Audio Track")
            .setItems(optionLabels.toTypedArray()) { _, which ->
                val (group, trackIndex) = audioTrackOptions[which]
                val builder = player.trackSelectionParameters.buildUpon()
                builder.setOverrideForType(
                    TrackSelectionOverride(group.mediaTrackGroup, trackIndex)
                )
                player.trackSelectionParameters = builder.build()
                Toast.makeText(this, "Audio Track Switched: ${optionLabels[which].replace("✓ ", "")}", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    @SuppressLint("UnsafeOptInUsageError")
    private fun autoSelectForcedSubtitles(tracks: Tracks) {
        try {
            val player = exoPlayer ?: return
            var forcedGroup: Tracks.Group? = null
            var forcedTrackIndex = -1

            for (group in tracks.groups) {
                if (group.type == C.TRACK_TYPE_TEXT) {
                    val mediaTrackGroup = group.mediaTrackGroup
                    for (i in 0 until mediaTrackGroup.length) {
                        val format = mediaTrackGroup.getFormat(i)
                        val lang = format.language?.lowercase() ?: ""
                        val label = format.label?.lowercase() ?: ""
                        val id = format.id?.lowercase() ?: ""
                        val isForced = (format.selectionFlags and C.SELECTION_FLAG_FORCED) != 0 ||
                                label.contains("forced") ||
                                id.contains("forced")

                        val isEnglish = lang == "en" || lang == "eng" || lang == "english" ||
                                label.contains("english") || label.contains("en ") ||
                                lang.isEmpty()

                        if (isForced && isEnglish) {
                            forcedGroup = group
                            forcedTrackIndex = i
                            break
                        }
                    }
                }
                if (forcedGroup != null) break
            }

            val builder = player.trackSelectionParameters.buildUpon()
            if (forcedGroup != null) {
                builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                builder.setOverrideForType(
                    TrackSelectionOverride(forcedGroup.mediaTrackGroup, forcedTrackIndex)
                )
                btnSubtitles.setTextColor(android.graphics.Color.parseColor("#E50914"))
                Log.d("PlayerActivity", "Auto-enabled forced subtitle track")
            } else {
                builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                btnSubtitles.setTextColor(android.graphics.Color.parseColor("#FFFFFF"))
            }
            player.trackSelectionParameters = builder.build()
        } catch (e: Throwable) {
            Log.w("PlayerActivity", "autoSelectForcedSubtitles failed gracefully: ${e.message}")
        }
    }

    @SuppressLint("UnsafeOptInUsageError")
    private fun showSubtitleTrackSelectionDialog() {
        resetControlsTimeout()
        val player = exoPlayer ?: return
        val tracks = player.currentTracks

        val subTrackOptions = ArrayList<Pair<Tracks.Group, Int>?>()
        val optionLabels = ArrayList<String>()

        val isTextDisabled = player.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)
        subTrackOptions.add(null)
        optionLabels.add((if (isTextDisabled) "✓ " else "   ") + "Off")

        for (group in tracks.groups) {
            if (group.type == C.TRACK_TYPE_TEXT) {
                val mediaTrackGroup = group.mediaTrackGroup
                for (i in 0 until mediaTrackGroup.length) {
                    val format = mediaTrackGroup.getFormat(i)
                    val lang = format.language?.lowercase() ?: ""
                    val label = format.label?.lowercase() ?: ""
                    val id = format.id?.lowercase() ?: ""

                    val isForced = (format.selectionFlags and C.SELECTION_FLAG_FORCED) != 0 ||
                            label.contains("forced") ||
                            id.contains("forced")

                    val isEnglish = lang == "en" || lang == "eng" || lang == "english" ||
                            label.contains("english") || label.contains("en ") ||
                            lang.isEmpty()

                    // Filter out non-English subtitles (forced subtitles must also be English only)
                    if (!isEnglish) {
                        continue
                    }

                    val displayLang = if (!format.language.isNullOrEmpty()) Locale(format.language!!).displayLanguage else "Track ${subTrackOptions.size}"
                    val forcedTag = if (isForced) " [Forced]" else ""
                    val displayLabel = (format.label ?: displayLang) + forcedTag
                    val isSelected = !isTextDisabled && group.isTrackSelected(i)
                    val prefix = if (isSelected) "✓ " else "   "

                    subTrackOptions.add(Pair(group, i))
                    optionLabels.add("$prefix$displayLabel (${format.sampleMimeType ?: "subtitle"})")
                }
            }
        }

        if (optionLabels.size <= 1) {
            Toast.makeText(this, "No English subtitle tracks found.", Toast.LENGTH_SHORT).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("💬 Select Subtitles (CC)")
            .setItems(optionLabels.toTypedArray()) { _, which ->
                val selectedOption = subTrackOptions[which]
                val builder = player.trackSelectionParameters.buildUpon()
                if (selectedOption == null) {
                    builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                    btnSubtitles.setTextColor(android.graphics.Color.parseColor("#FFFFFF"))
                    Toast.makeText(this, "Subtitles: OFF", Toast.LENGTH_SHORT).show()
                } else {
                    val (group, trackIndex) = selectedOption
                    builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                    builder.setOverrideForType(
                        TrackSelectionOverride(group.mediaTrackGroup, trackIndex)
                    )
                    btnSubtitles.setTextColor(android.graphics.Color.parseColor("#E50914"))
                    Toast.makeText(this, "Subtitles Selected: ${optionLabels[which].replace("✓ ", "")}", Toast.LENGTH_SHORT).show()
                }
                player.trackSelectionParameters = builder.build()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupSeekBarListener() {
        seekBar.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && isUserSeeking) {
                commitPendingSeek()
            }
        }

        seekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    exoPlayer?.let { player ->
                        isUserSeeking = true
                        val dur = player.duration
                        val liveEdge = if (dur > 0L && dur != C.TIME_UNSET) dur else player.bufferedPosition.coerceAtLeast(player.currentPosition)
                        if (liveEdge > 0L) {
                            val newPos = (liveEdge * progress) / 1000
                            txtCurrentTime.text = formatTime(newPos)
                        }
                    }
                }
            }

            override fun onStartTrackingTouch(sb: SeekBar?) {
                isUserSeeking = true
                resetControlsTimeout()
            }

            override fun onStopTrackingTouch(sb: SeekBar?) {
                commitPendingSeek()
                resetControlsTimeout()
            }
        })
    }

    private fun commitPendingSeek() {
        if (isUserSeeking) {
            exoPlayer?.let { player ->
                val dur = player.duration
                val liveEdge = if (dur > 0L && dur != C.TIME_UNSET) dur else player.bufferedPosition.coerceAtLeast(player.currentPosition)
                if (liveEdge > 0L) {
                    val newPos = (liveEdge * seekBar.progress) / 1000
                    player.seekTo(newPos)
                }
            }
            isUserSeeking = false
        }
    }

    private fun updateProgress() {
        try {
            val player = exoPlayer ?: return
            val current = player.currentPosition
            val buffered = player.bufferedPosition
            val dur = player.duration
            val videoUrl = intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""
            val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: ""
            val isDispatcharrLive = mediaType == "livetv" ||
                    mediaType == "channel" ||
                    videoUrl.contains("/proxy/ts/") ||
                    videoUrl.contains("/api/dispatcharr/") ||
                    videoUrl.contains("/live/")
            val isLive = player.isCurrentMediaItemLive || (isDispatcharrLive && (dur <= 0L || dur == C.TIME_UNSET))

            if (isLive) {
                val liveEdge = dur.coerceAtLeast(buffered.coerceAtLeast(current))
                val behindMs = (liveEdge - current).coerceAtLeast(0L)

                if (liveEdge > 0) {
                    val progress = ((current * 1000) / liveEdge).toInt()
                    val secondaryProgress = ((buffered * 1000) / liveEdge).toInt()
                    if (!isUserSeeking && !seekBar.isPressed) {
                        seekBar.progress = progress.coerceIn(0, 1000)
                    }
                    seekBar.secondaryProgress = secondaryProgress.coerceIn(0, 1000)
                } else {
                    if (!isUserSeeking && !seekBar.isPressed) {
                        seekBar.progress = 1000
                    }
                }

                if (!isUserSeeking) {
                    txtCurrentTime.text = formatTime(current)
                }
                if (behindMs > 4000L) {
                    txtDuration.text = "GO TO LIVE (-${formatTime(behindMs)})"
                    txtDuration.setTextColor(android.graphics.Color.parseColor("#DA2F68"))
                    txtDuration.isFocusable = true
                    txtDuration.isFocusableInTouchMode = false
                    txtDuration.setOnClickListener {
                        player.seekToDefaultPosition()
                        player.playWhenReady = true
                        resetControlsTimeout()
                    }
                } else {
                    txtDuration.text = "● LIVE"
                    txtDuration.setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                    txtDuration.isFocusable = false
                    txtDuration.isFocusableInTouchMode = false
                    txtDuration.setOnClickListener(null)
                }
            } else {
                txtDuration.setTextColor(android.graphics.Color.parseColor("#FFFFFF"))
                txtDuration.isFocusable = false
                txtDuration.isFocusableInTouchMode = false
                txtDuration.setOnClickListener(null)
                if (dur > 0L && dur != C.TIME_UNSET) {
                    val progress = ((current * 1000) / dur).toInt()
                    val secondaryProgress = ((buffered * 1000) / dur).toInt()
                    if (!isUserSeeking && !seekBar.isPressed) {
                        seekBar.progress = progress.coerceIn(0, 1000)
                        txtCurrentTime.text = formatTime(current)
                    }
                    seekBar.secondaryProgress = secondaryProgress.coerceIn(0, 1000)
                    txtDuration.text = formatTime(dur)
                } else {
                    if (!isUserSeeking && !seekBar.isPressed) {
                        seekBar.progress = 0
                        txtCurrentTime.text = formatTime(current)
                    }
                    seekBar.secondaryProgress = 0
                    txtDuration.text = "--:--"
                }
            }
        } catch (e: Exception) {
            Log.e("PlayerActivity", "Error updating progress", e)
        }
    }

    private fun seekRelative(offsetMs: Long) {
        resetControlsTimeout()
        exoPlayer?.let { player ->
            val dur = player.duration
            val current = player.currentPosition
            val buffered = player.bufferedPosition
            val liveEdge = if (dur > 0L && dur != C.TIME_UNSET) dur else buffered.coerceAtLeast(current)

            val targetPos = if (liveEdge > 0L) {
                (current + offsetMs).coerceIn(0L, liveEdge)
            } else {
                (current + offsetMs).coerceAtLeast(0L)
            }

            player.seekTo(targetPos)
            updateProgress()
        }
    }

    private fun formatTime(timeMs: Long): String {
        val totalSec = (timeMs / 1000).toInt()
        val sec = totalSec % 60
        val min = (totalSec / 60) % 60
        val hrs = totalSec / 3600

        return if (hrs > 0) {
            String.format(Locale.US, "%d:%02d:%02d", hrs, min, sec)
        } else {
            String.format(Locale.US, "%02d:%02d", min, sec)
        }
    }

    private fun resetControlsTimeout() {
        showControls()
        handler.removeCallbacks(hideControlsRunnable)
        handler.postDelayed(hideControlsRunnable, 5000)
    }

    private fun showControls() {
        val wasHidden = !controlsVisible
        controlsVisible = true
        controlsOverlay.visibility = View.VISIBLE
        if (wasHidden) {
            val focused = currentFocus
            if (focused == null || focused == playerView || focused == controlsOverlay) {
                btnPlayPause.requestFocus()
            }
        }
    }

    private fun hideControls() {
        controlsVisible = false
        controlsOverlay.visibility = View.GONE
        playerView.requestFocus()
    }

    private fun showError(msg: String) {
        txtErrorMsg.text = msg
        errorLayout.visibility = View.VISIBLE
    }

    private fun hideSystemUI() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val keyCode = event.keyCode
        val action = event.action

        // Dedicated hardware media playback keys
        if (action == KeyEvent.ACTION_DOWN) {
            when (keyCode) {
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                    btnPlayPause.performClick()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_REWIND -> {
                    btnRewind10.performClick()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                    btnFF10.performClick()
                    return true
                }
            }
        }

        // Back button navigation
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == 4 || keyCode == 27 || keyCode == 10009 || keyCode == 461) {
            if (action == KeyEvent.ACTION_DOWN) {
                if (!controlsVisible) {
                    resetControlsTimeout()
                    return true
                } else {
                    saveCurrentWatchProgress()
                    finish()
                    return true
                }
            }
            return true
        }

        // When controls are hidden, ANY navigation key wakes up controls without triggering action
        if (!controlsVisible) {
            if (action == KeyEvent.ACTION_DOWN) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
                    keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
                    keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    resetControlsTimeout()
                    btnPlayPause.requestFocus()
                    return true
                }
            }
            return super.dispatchKeyEvent(event)
        }

        // Controls are visible from here onwards
        if (action == KeyEvent.ACTION_DOWN) {
            // D-Pad Up when back button is focused hides controls
            if (keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                val focused = currentFocus
                if (btnBack.isFocused || focused == btnBack || (focused != null && focused.id == R.id.btn_back)) {
                    handler.removeCallbacks(hideControlsRunnable)
                    hideControls()
                    return true
                }
            }

            // SeekBar D-Pad scrubbing
            if (seekBar.isFocused) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    resetControlsTimeout()
                    isUserSeeking = true
                    val isRepeat = event.repeatCount > 0
                    val step = if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                        if (isRepeat) -20 else -10
                    } else {
                        if (isRepeat) 20 else 10
                    }
                    val newProgress = (seekBar.progress + step).coerceIn(0, 1000)
                    seekBar.progress = newProgress
                    exoPlayer?.let { player ->
                        val dur = player.duration
                        val liveEdge = if (dur > 0L && dur != C.TIME_UNSET) dur else player.bufferedPosition.coerceAtLeast(player.currentPosition)
                        if (liveEdge > 0L) {
                            val targetMs = (liveEdge * newProgress) / 1000
                            txtCurrentTime.text = formatTime(targetMs)
                        }
                    }
                    return true
                }
            }

            // D-Pad Center / Enter click execution: executes the focused button action immediately on a single press
            if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
                resetControlsTimeout()
                if (seekBar.isFocused || isUserSeeking) {
                    commitPendingSeek()
                    return true
                }
                val focused = currentFocus
                if (focused != null && focused != playerView && focused != controlsOverlay) {
                    focused.performClick()
                    return true
                } else {
                    btnPlayPause.requestFocus()
                    btnPlayPause.performClick()
                    return true
                }
            }

            resetControlsTimeout()
        } else if (action == KeyEvent.ACTION_UP) {
            if (seekBar.isFocused && (keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                commitPendingSeek()
                resetControlsTimeout()
                return true
            }
            // Consume key-up for Center / Enter so View doesn't perform a second synthetic click
            if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
                return true
            }
        }

        return super.dispatchKeyEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        return super.onKeyUp(keyCode, event)
    }

    private var hasPromptedResume = false

    private fun getProgressKey(): String {
        val tmdbId = intent.getStringExtra(EXTRA_TMDB_ID)
        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: "movie"
        val videoUrl = intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""
        return if (!tmdbId.isNullOrEmpty()) "prog_${mediaType}_$tmdbId" else "prog_url_${videoUrl.hashCode()}"
    }

    private fun saveCurrentWatchProgress() {
        val player = exoPlayer ?: return
        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: ""
        if (mediaType.equals("live", ignoreCase = true) || mediaType.equals("iptv", ignoreCase = true) || mediaType.equals("livetv", ignoreCase = true)) return

        val key = getProgressKey()
        val pos = player.currentPosition
        val dur = player.duration
        val prefs = getSharedPreferences("BubbaFlixWatchProgress", Context.MODE_PRIVATE)

        if (dur > 0) {
            val pct = (pos.toDouble() / dur.toDouble()) * 100.0
            if (pct >= 95.0) {
                prefs.edit().remove(key).apply()
            } else if (pos >= 10000) {
                prefs.edit().putLong(key, pos).apply()
            }
        }
    }

    private fun checkAndPromptResume() {
        if (hasPromptedResume) return
        hasPromptedResume = true

        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: ""
        if (mediaType.equals("live", ignoreCase = true) || mediaType.equals("iptv", ignoreCase = true) || mediaType.equals("livetv", ignoreCase = true)) return

        val player = exoPlayer ?: return
        val key = getProgressKey()
        val prefs = getSharedPreferences("BubbaFlixWatchProgress", Context.MODE_PRIVATE)
        val savedPos = prefs.getLong(key, 0L)
        val dur = player.duration

        if (savedPos > 15000L && (dur <= 0 || (dur - savedPos) > 60000L)) {
            player.pause()
            val formattedTime = formatTime(savedPos)

            AlertDialog.Builder(this)
                .setTitle("Resume Playback")
                .setMessage("You were watching at $formattedTime. Would you like to resume?")
                .setPositiveButton("Resume ($formattedTime)") { _, _ ->
                    player.seekTo(savedPos)
                    player.play()
                    resetControlsTimeout()
                }
                .setNegativeButton("Start from Beginning") { _, _ ->
                    player.seekTo(0)
                    player.play()
                    resetControlsTimeout()
                }
                .setCancelable(false)
                .show()
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
        handler.removeCallbacks(updateProgressRunnable)
        handler.post(updateProgressRunnable)
    }

    override fun onPause() {
        super.onPause()
        saveCurrentWatchProgress()
        handler.removeCallbacks(updateProgressRunnable)
        try {
            exoPlayer?.pause()
        } catch (e: Exception) {
            Log.e("PlayerActivity", "Error pausing exoPlayer in onPause", e)
        }
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        RemoteLogger.w("PlayerActivity", "TrimMemory signal received (level=$level) | ${RemoteLogger.getDeviceMemorySummary()}")
        try {
            Glide.get(this).trimMemory(level)
            if (level >= TRIM_MEMORY_MODERATE) {
                Glide.get(this).clearMemory()
            }
        } catch (e: Exception) {
            Log.e("PlayerActivity", "Error trimming memory", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        saveCurrentWatchProgress()
        handler.removeCallbacks(updateProgressRunnable)
        handler.removeCallbacks(hideControlsRunnable)

        try {
            exoPlayer?.release()
        } catch (e: Exception) {
            Log.e("PlayerActivity", "Error releasing exoPlayer in onDestroy", e)
        }
        exoPlayer = null

        previousUncaughtExceptionHandler?.let {
            Thread.setDefaultUncaughtExceptionHandler(it)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }
}
