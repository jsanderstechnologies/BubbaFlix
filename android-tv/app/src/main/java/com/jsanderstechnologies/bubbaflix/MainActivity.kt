package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    companion object {
        private const val PREFS_NAME = "BubbaFlixTVPrefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val DEFAULT_URL = "http://192.168.1.50:5150"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hide system UI status & navigation bars for immersive 10ft TV experience
        hideSystemUI()

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            isFocusable = true
            isFocusableInTouchMode = true
        }
        setContentView(webView)

        setupWebViewSettings()

        val savedUrl = prefs.getString(KEY_SERVER_URL, null)
        if (savedUrl.isNullOrEmpty()) {
            promptForServerUrl()
        } else {
            loadBubbaFlix(savedUrl)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Configure custom Android TV / Google TV User-Agent
        val defaultUa = settings.userAgentString
        settings.userAgentString = "$defaultUa BubbaFlixTV/1.0 (Android TV Smart Client)"

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                return super.onConsoleMessage(consoleMessage)
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                super.onShowCustomView(view, callback)
                if (customView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customView = view
                customViewCallback = callback
                webView.visibility = View.GONE
                (window.decorView as ViewGroup).addView(
                    view,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
            }

            override fun onHideCustomView() {
                super.onHideCustomView()
                if (customView == null) return
                webView.visibility = View.VISIBLE
                (window.decorView as ViewGroup).removeView(customView)
                customView = null
                customViewCallback?.onCustomViewHidden()
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
            }
        }
    }

    private fun loadBubbaFlix(url: String) {
        var target = url.trim()
        if (!target.startsWith("http://") && !target.startsWith("https://")) {
            target = "http://$target"
        }
        if (target.endsWith("/")) {
            target = target.substring(0, target.length - 1)
        }
        prefs.edit().putString(KEY_SERVER_URL, target).apply()
        webView.loadUrl(target)
    }

    private fun promptForServerUrl() {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("BubbaFlix TV Server Address")
        builder.setMessage("Enter the IP address or URL of your BubbaFlix server (e.g. http://192.168.1.50:5150):")

        val input = EditText(this)
        input.setText(DEFAULT_URL)
        input.setSelection(input.text.length)
        builder.setView(input)

        builder.setPositiveButton("Connect") { dialog, _ ->
            val url = input.text.toString()
            if (url.isNotEmpty()) {
                loadBubbaFlix(url)
            } else {
                Toast.makeText(this, "Server URL required", Toast.LENGTH_SHORT).show()
                promptForServerUrl()
            }
            dialog.dismiss()
        }

        builder.setCancelable(false)
        builder.show()
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
        // Handle Back button on Android TV D-Pad Remote
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // First check if Web Player modal is active in web app
            webView.evaluateJavascript("document.body.classList.contains('videoPlayerActive');") { result ->
                if (result == "true") {
                    // Trigger ESC key inside web player to close modal cleanly
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));",
                        null
                    )
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    super.onBackPressed()
                }
            }
            return true
        }

        // Long press menu button to change server URL
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            promptForServerUrl()
            return true
        }

        return super.onKeyDown(keyCode, event)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }
}
