package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.media.audiofx.DynamicsProcessing
import android.media.audiofx.LoudnessEnhancer
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

    private val handler = Handler(Looper.getMainLooper())
    private var controlsVisible = true

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

        listOf(btnBack, btnAudio, btnSubtitles, btnRewind30, btnRewind10, btnPlayPause, btnFF10, btnFF30, seekBar).forEach { control ->
            control.isFocusable = true
            control.isFocusableInTouchMode = true
        }
        btnPlayPause.requestFocus()

        val videoUrl = intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE)
        val logoUrl = intent.getStringExtra(EXTRA_LOGO_URL)
        val tmdbId = intent.getStringExtra(EXTRA_TMDB_ID)
        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: "movie"

        if (!title.isNullOrEmpty()) {
            txtPlayerTitle.text = cleanMediaTitle(title)
            txtPlayerTitle.visibility = View.VISIBLE
        } else {
            txtPlayerTitle.visibility = View.GONE
        }

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
        initializeExoPlayer(videoUrl)

        btnPlayPause.requestFocus()
        resetControlsTimeout()
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
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()

        val dataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
            .setUserAgent("BubbaFlixTV/1.0 (Android TV Smart Client)")

        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        val isLiveStream = (intent.getStringExtra(EXTRA_MEDIA_TYPE) == "tv") ||
                videoUrl.contains("/proxy/ts/") ||
                videoUrl.contains("/transcode") ||
                videoUrl.contains("/live/") ||
                videoUrl.endsWith(".ts")

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                if (isLiveStream) 1500 else 60000,
                if (isLiveStream) 30000 else 300000,
                if (isLiveStream) 1000 else 2500,
                if (isLiveStream) 1500 else 5000
            )
            .setBackBuffer(30000, true)
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
                if (isLiveStream || videoUrl.contains("/proxy/ts/") || videoUrl.endsWith(".ts")) {
                    mediaItemBuilder.setMimeType(MimeTypes.VIDEO_MP2T)
                } else if (videoUrl.contains(".m3u8")) {
                    mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                }
                setMediaItem(mediaItemBuilder.build())
                prepare()
                playWhenReady = true

                addListener(object : Player.Listener {
                    override fun onAudioSessionIdChanged(audioSessionId: Int) {
                        setupAudioNormalization(audioSessionId)
                    }

                    override fun onPlaybackStateChanged(state: Int) {
                        if (state == Player.STATE_ENDED) {
                            finish()
                            return
                        }
                        if (state == Player.STATE_READY) {
                            errorLayout.visibility = View.GONE
                            btnPlayPause.setImageResource(
                                if (playWhenReady) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                            )
                            checkAndPromptResume()
                            if (exoPlayer != null) {
                                setupAudioNormalization(exoPlayer!!.audioSessionId)
                            }
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        btnPlayPause.setImageResource(
                            if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                        )
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        val errDetails = error.message ?: error.cause?.message ?: "Unknown playback decoding error"
                        sendErrorToServerLog(errDetails, error.errorCodeName, videoUrl)

                        val isDecoderOrFormatError = (error.message?.contains("MediaCodecAudioRenderer", ignoreCase = true) == true) ||
                                (error.message?.contains("mp4a-latm", ignoreCase = true) == true) ||
                                (error.message?.contains("AudioTrack", ignoreCase = true) == true) ||
                                (error.message?.contains("Codec", ignoreCase = true) == true) ||
                                (error.message?.contains("format_supported=YES", ignoreCase = true) == true) ||
                                error.errorCodeName.contains("CONTAINER", ignoreCase = true) ||
                                error.errorCodeName.contains("PARSING", ignoreCase = true) ||
                                error.errorCodeName.contains("UNSUPPORTED", ignoreCase = true)

                        if (!hasRetriedWithFallback && (isLiveStream || isDecoderOrFormatError)) {
                            hasRetriedWithFallback = true
                            if (isDecoderOrFormatError && !videoUrl.contains("/api/transcode")) {
                                val baseUrl = videoUrl.substringBefore("/api/dispatcharr").substringBefore("/api/channels")
                                val transcodeUrl = "$baseUrl/api/transcode?url=${Uri.encode(videoUrl)}"
                                val fallbackItem = MediaItem.Builder()
                                    .setUri(Uri.parse(transcodeUrl))
                                    .build()
                                setMediaItem(fallbackItem)
                                prepare()
                                playWhenReady = true
                                return
                            }

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
                        showError("Stream error: ${error.message ?: "Failed to decode stream format"}")
                    }
                })
            }

        handler.post(updateProgressRunnable)
    }

    private fun sendErrorToServerLog(errorMsg: String, errorCode: String, urlStr: String) {
        try {
            val prefs = getSharedPreferences("BubbaFlixTVPrefs", Context.MODE_PRIVATE)
            val serverBase = prefs.getString("server_url", "https://bubbaflix.sanders-technologies.net") ?: "https://bubbaflix.sanders-technologies.net"
            val logEndpoint = "${serverBase.replace(Regex("""/+$"""), "")}/api/log"

            val title = intent.getStringExtra(EXTRA_TITLE) ?: ""

            val client = OkHttpClient()
            val jsonPayload = JSONObject().apply {
                put("level", "ERROR")
                put("source", "BubbaFlix Android App (ExoPlayer)")
                put("message", errorMsg)
                put("errorCode", errorCode)
                put("mediaUrl", urlStr)
                put("title", title)
            }

            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = jsonPayload.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(logEndpoint)
                .post(requestBody)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {}
                override fun onResponse(call: Call, response: Response) {
                    response.close()
                }
            })
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

        btnAudio.setOnClickListener { showAudioTrackSelectionDialog() }

        btnSubtitles.setOnClickListener { toggleSubtitles() }

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

    private fun toggleSubtitles() {
        resetControlsTimeout()
        val player = exoPlayer ?: return
        val isDisabled = player.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)

        if (isDisabled) {
            player.trackSelectionParameters = player.trackSelectionParameters
                .buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                .build()
            Toast.makeText(this, "Subtitles: ON", Toast.LENGTH_SHORT).show()
            btnSubtitles.setTextColor(android.graphics.Color.parseColor("#DA2F68"))
        } else {
            player.trackSelectionParameters = player.trackSelectionParameters
                .buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                .build()
            Toast.makeText(this, "Subtitles: OFF", Toast.LENGTH_SHORT).show()
            btnSubtitles.setTextColor(android.graphics.Color.parseColor("#FFFFFF"))
        }
    }

    private fun setupSeekBarListener() {
        seekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser && exoPlayer != null) {
                    val duration = exoPlayer!!.duration
                    if (duration > 0) {
                        val newPos = (duration * progress) / 1000
                        txtCurrentTime.text = formatTime(newPos)
                    }
                }
            }

            override fun onStartTrackingTouch(sb: SeekBar?) {
                resetControlsTimeout()
            }

            override fun onStopTrackingTouch(sb: SeekBar?) {
                if (exoPlayer != null && sb != null) {
                    val duration = exoPlayer!!.duration
                    if (duration > 0) {
                        val newPos = (duration * sb.progress) / 1000
                        exoPlayer!!.seekTo(newPos)
                    }
                }
                resetControlsTimeout()
            }
        })
    }

    private fun updateProgress() {
        val player = exoPlayer ?: return
        val isLive = player.isCurrentMediaItemLive || intent.getStringExtra(EXTRA_MEDIA_TYPE) == "tv"
        val current = player.currentPosition
        val dur = player.duration
        val buffered = player.bufferedPosition

        if (isLive) {
            val liveEdge = player.duration.coerceAtLeast(player.bufferedPosition.coerceAtLeast(current))
            val behindMs = (liveEdge - current).coerceAtLeast(0L)

            if (liveEdge > 0) {
                val progress = ((current * 1000) / liveEdge).toInt()
                val secondaryProgress = ((buffered * 1000) / liveEdge).toInt()
                seekBar.progress = progress
                seekBar.secondaryProgress = secondaryProgress
            } else {
                seekBar.progress = 1000
            }

            txtCurrentTime.text = formatTime(current)
            if (behindMs > 4000L) {
                txtDuration.text = "GO TO LIVE (-${formatTime(behindMs)})"
                txtDuration.setTextColor(android.graphics.Color.parseColor("#DA2F68"))
                txtDuration.setOnClickListener {
                    player.seekToDefaultPosition()
                    player.playWhenReady = true
                    resetControlsTimeout()
                }
            } else {
                txtDuration.text = "● LIVE"
                txtDuration.setTextColor(android.graphics.Color.parseColor("#4CAF50"))
            }
        } else if (dur > 0) {
            val progress = ((current * 1000) / dur).toInt()
            val secondaryProgress = ((buffered * 1000) / dur).toInt()
            seekBar.progress = progress
            seekBar.secondaryProgress = secondaryProgress
            txtCurrentTime.text = formatTime(current)
            txtDuration.text = formatTime(dur)
        } else {
            seekBar.progress = 0
            seekBar.secondaryProgress = 0
            txtCurrentTime.text = "00:00"
            txtDuration.text = "00:00"
        }
    }

    private fun seekRelative(offsetMs: Long) {
        resetControlsTimeout()
        exoPlayer?.let { player ->
            val isLive = player.isCurrentMediaItemLive || intent.getStringExtra(EXTRA_MEDIA_TYPE) == "tv"
            val maxPos = if (isLive) player.bufferedPosition.coerceAtLeast(player.currentPosition) else player.duration.coerceAtLeast(0L)
            val newPos = (player.currentPosition + offsetMs).coerceIn(0L, if (maxPos > 0) maxPos else Long.MAX_VALUE)
            player.seekTo(newPos)
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
        controlsVisible = true
        controlsOverlay.visibility = View.VISIBLE
        if (currentFocus == null || currentFocus == playerView || currentFocus == controlsOverlay) {
            btnPlayPause.post {
                btnPlayPause.requestFocus()
            }
        }
    }

    private fun hideControls() {
        controlsVisible = false
        controlsOverlay.visibility = View.GONE
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

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        resetControlsTimeout()

        if (!controlsVisible) {
            if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
                keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
                keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                showControls()
                btnPlayPause.post {
                    btnPlayPause.requestFocus()
                }
                return true
            }
        }

        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                val focused = currentFocus
                if (focused != null && focused != playerView && focused != controlsOverlay) {
                    focused.performClick()
                } else {
                    btnPlayPause.requestFocus()
                    btnPlayPause.performClick()
                }
                return true
            }
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
            KeyEvent.KEYCODE_BACK, 4, 27, 10009, 461 -> {
                saveCurrentWatchProgress()
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
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

    private var loudnessEnhancer: LoudnessEnhancer? = null

    private fun setupAudioNormalization(audioSessionId: Int) {
        if (audioSessionId == C.AUDIO_SESSION_ID_UNSET || audioSessionId == 0) return

        try {
            // LoudnessEnhancer Normalization: Normalizes dynamic range and boosts dialogue (+1.5 dB / 1500 mB target gain)
            if (loudnessEnhancer == null) {
                loudnessEnhancer = LoudnessEnhancer(audioSessionId).apply {
                    setTargetGain(1500)
                    enabled = true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onPause() {
        super.onPause()
        saveCurrentWatchProgress()
    }

    override fun onDestroy() {
        super.onDestroy()
        saveCurrentWatchProgress()
        handler.removeCallbacks(updateProgressRunnable)
        handler.removeCallbacks(hideControlsRunnable)

        try {
            loudnessEnhancer?.release()
            loudnessEnhancer = null
        } catch (e: Exception) {}

        exoPlayer?.release()
        exoPlayer = null
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }
}
