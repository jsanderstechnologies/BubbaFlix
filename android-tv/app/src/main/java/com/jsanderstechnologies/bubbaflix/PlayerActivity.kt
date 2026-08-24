package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.bumptech.glide.Glide
import okhttp3.*
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
    private lateinit var btnSubtitles: Button
    private lateinit var imgMediaLogo: ImageView
    private lateinit var txtMediaTitle: TextView

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
        btnSubtitles = findViewById(R.id.btn_subtitles)
        imgMediaLogo = findViewById(R.id.img_media_logo)
        txtMediaTitle = findViewById(R.id.txt_media_title)

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

        val videoUrl = intent.getStringExtra(EXTRA_VIDEO_URL) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "BubbaFlix Stream"
        val logoUrl = intent.getStringExtra(EXTRA_LOGO_URL)
        val tmdbId = intent.getStringExtra(EXTRA_TMDB_ID)
        val mediaType = intent.getStringExtra(EXTRA_MEDIA_TYPE) ?: "movie"

        txtMediaTitle.text = title

        if (!logoUrl.isNullOrEmpty()) {
            loadLogoImage(logoUrl)
        } else if (!tmdbId.isNullOrEmpty()) {
            fetchTmdbLogo(tmdbId, mediaType)
        } else {
            imgMediaLogo.visibility = View.GONE
            txtMediaTitle.visibility = View.VISIBLE
        }

        setupControlClickListeners()
        setupSeekBarListener()
        initializeExoPlayer(videoUrl)

        btnPlayPause.requestFocus()
        resetControlsTimeout()
    }

    private fun loadLogoImage(url: String) {
        imgMediaLogo.visibility = View.VISIBLE
        txtMediaTitle.visibility = View.GONE
        Glide.with(this)
            .load(url)
            .into(imgMediaLogo)
    }

    private fun fetchTmdbLogo(tmdbId: String, mediaType: String) {
        val client = OkHttpClient()
        val url = "https://api.themoviedb.org/3/$mediaType/$tmdbId/images?api_key=4544d6db87081702f3a61f38e078b6be"
        val request = Request.Builder().url(url).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    imgMediaLogo.visibility = View.GONE
                    txtMediaTitle.visibility = View.VISIBLE
                }
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    runOnUiThread {
                        imgMediaLogo.visibility = View.GONE
                        txtMediaTitle.visibility = View.VISIBLE
                    }
                    return
                }

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

                runOnUiThread {
                    imgMediaLogo.visibility = View.GONE
                    txtMediaTitle.visibility = View.VISIBLE
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
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        val dataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
            .setUserAgent("BubbaFlixTV/1.0 (Android TV Smart Client)")

        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        playerView.setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
        (playerView.videoSurfaceView as? android.view.SurfaceView)?.setZOrderMediaOverlay(true)
        (playerView.videoSurfaceView as? android.view.TextureView)?.isOpaque = false

        exoPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                playerView.player = this
                playerView.keepScreenOn = true

                // Disable subtitles by default on launch per user request
                trackSelectionParameters = trackSelectionParameters
                    .buildUpon()
                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                    .build()

                val mediaItem = MediaItem.fromUri(Uri.parse(videoUrl))
                setMediaItem(mediaItem)
                prepare()
                playWhenReady = true

                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        if (state == Player.STATE_READY) {
                            errorLayout.visibility = View.GONE
                            btnPlayPause.setImageResource(
                                if (playWhenReady) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                            )
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        btnPlayPause.setImageResource(
                            if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
                        )
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        showError("Stream error: ${error.message ?: "Failed to decode codec"}")
                    }
                })
            }

        handler.post(updateProgressRunnable)
    }

    private fun setupControlClickListeners() {
        btnBack.setOnClickListener { finish() }

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

    private fun seekRelative(millis: Long) {
        resetControlsTimeout()
        exoPlayer?.let {
            val target = Math.max(0, Math.min(it.duration, it.currentPosition + millis))
            it.seekTo(target)
        }
    }

    private fun updateProgress() {
        exoPlayer?.let { player ->
            val pos = player.currentPosition
            val dur = player.duration

            if (dur > 0 && !seekBar.isPressed) {
                txtCurrentTime.text = formatTime(pos)
                txtDuration.text = formatTime(dur)
                val progress = ((pos.toDouble() / dur.toDouble()) * 1000).toInt()
                seekBar.progress = progress
            }
        }
    }

    private fun formatTime(millis: Long): String {
        if (millis <= 0) return "00:00"
        val seconds = millis / 1000
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60

        return if (h > 0) {
            String.format(Locale.US, "%02d:%02d:%02d", h, m, s)
        } else {
            String.format(Locale.US, "%02d:%02d", m, s)
        }
    }

    private fun resetControlsTimeout() {
        showControls()
        handler.removeCallbacks(hideControlsRunnable)
        handler.postDelayed(hideControlsRunnable, 4500)
    }

    private fun showControls() {
        controlsVisible = true
        controlsOverlay.visibility = View.VISIBLE
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

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish()
            return true
        }

        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            btnPlayPause.performClick()
            return true
        }

        // Show controls overlay on any D-Pad directional navigation press without pausing playback
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN || keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
            showControls()
        }

        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(updateProgressRunnable)
        handler.removeCallbacks(hideControlsRunnable)
        exoPlayer?.release()
        exoPlayer = null
    }
}
