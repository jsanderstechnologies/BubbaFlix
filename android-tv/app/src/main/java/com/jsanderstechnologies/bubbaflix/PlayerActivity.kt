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
import androidx.appcompat.app.AppCompatActivity
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
import okhttp3.OkHttpClient
import java.util.Locale
import java.util.concurrent.TimeUnit

@UnstableApi
class PlayerActivity : AppCompatActivity() {

    private lateinit var playerView: PlayerView
    private var exoPlayer: ExoPlayer? = null

    private lateinit var controlsOverlay: View
    private lateinit var btnBack: Button
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
        hideSystemUI()

        setContentView(R.layout.activity_player)

        playerView = findViewById(R.id.player_view)
        controlsOverlay = findViewById(R.id.controls_overlay)
        btnBack = findViewById(R.id.btn_back)
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

        txtMediaTitle.text = title

        if (!logoUrl.isNullOrEmpty()) {
            imgMediaLogo.visibility = View.VISIBLE
            txtMediaTitle.visibility = View.GONE
            Glide.with(this)
                .load(logoUrl)
                .into(imgMediaLogo)
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

    @SuppressLint("UnsafeOptInUsageError")
    private fun initializeExoPlayer(videoUrl: String) {
        if (videoUrl.isEmpty()) {
            showError("Invalid stream URL.")
            return
        }

        // Enable Extension Decoders for Universal Codec Support (AC3, EAC3, TrueHD, DTS, HEVC, H.264, AV1, VP9)
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

        exoPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                playerView.player = this
                playerView.keepScreenOn = true
                val mediaItem = MediaItem.fromUri(Uri.parse(videoUrl))
                setMediaItem(mediaItem)
                prepare()
                playWhenReady = true

                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        if (state == Player.STATE_READY) {
                            errorLayout.visibility = View.GONE
                            btnPlayPause.setImageResource(
                                if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
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

        btnPlayPause.setOnClickListener {
            exoPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                } else {
                    it.play()
                }
            }
        }

        btnRewind30.setOnClickListener { seekRelative(-30000) }
        btnRewind10.setOnClickListener { seekRelative(-10000) }
        btnFF10.setOnClickListener { seekRelative(10000) }
        btnFF30.setOnClickListener { seekRelative(30000) }
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

            if (dur > 0) {
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
        handler.postDelayed(hideControlsRunnable, 3500)
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
