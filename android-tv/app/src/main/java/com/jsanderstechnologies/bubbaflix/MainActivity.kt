package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.net.wifi.WifiManager
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

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

    class AndroidPlayerBridge(private val context: Context, private val activity: Activity) {
        @JavascriptInterface
        fun playStream(videoUrl: String, title: String?, logoUrl: String?, tmdbId: String?, mediaType: String?) {
            PlayerActivity.start(context, videoUrl, title, logoUrl, tmdbId, mediaType)
        }

        @JavascriptInterface
        fun showKeyboard() {
            activity.runOnUiThread {
                val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
                val currentFocusView = activity.currentFocus
                if (currentFocusView != null) {
                    imm?.showSoftInput(currentFocusView, android.view.inputmethod.InputMethodManager.SHOW_FORCED)
                }
            }
        }

        @JavascriptInterface
        fun promptExitApp() {
            (activity as? MainActivity)?.promptExitApp()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        UpdateManager.checkForUpdates(this)
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

        val defaultUa = settings.userAgentString
        settings.userAgentString = "$defaultUa BubbaFlixTV/1.0 (Android TV Smart Client)"

        webView.addJavascriptInterface(AndroidPlayerBridge(this, this), "AndroidPlayer")

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

    private fun discoverLocalServers(onDiscovered: (List<String>) -> Unit) {
        thread {
            val discoveredList = LinkedHashSet<String>()

            // 1. Try UDP Broadcast Discovery on port 5151
            try {
                val socket = DatagramSocket()
                socket.soTimeout = 1500
                socket.broadcast = true

                val message = "BUBBAFLIX_DISCOVER".toByteArray()
                val packet = DatagramPacket(message, message.size, InetAddress.getByName("255.255.255.255"), 5151)
                socket.send(packet)

                val recvBuf = ByteArray(1024)
                val recvPacket = DatagramPacket(recvBuf, recvBuf.size)
                socket.receive(recvPacket)

                val response = String(recvPacket.data, 0, recvPacket.length).trim()
                if (response.contains("bubbaflix-server")) {
                    val serverIp = recvPacket.address.hostAddress
                    discoveredList.add("http://$serverIp:5150")
                }
                socket.close()
            } catch (e: Exception) {
                // Ignore UDP timeout
            }

            // 2. Probe default server & local gateway e.g. 192.168.1.50
            val candidates = listOf(
                DEFAULT_URL,
                "http://192.168.1.50:5150",
                "http://192.168.1.1:5150",
                "http://192.168.0.50:5150",
                "http://192.168.0.1:5150",
                "http://10.0.0.50:5150"
            )

            for (candidate in candidates) {
                try {
                    val conn = URL("$candidate/api/discover").openConnection() as HttpURLConnection
                    conn.connectTimeout = 600
                    conn.readTimeout = 600
                    conn.requestMethod = "GET"
                    if (conn.responseCode == 200) {
                        discoveredList.add(candidate)
                    }
                    conn.disconnect()
                } catch (e: Exception) {
                    // Ignore unreachable candidate
                }
            }

            onDiscovered(discoveredList.toList())
        }
    }

    private fun promptForServerUrl() {
        runOnUiThread {
            val container = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(40, 20, 40, 10)
            }

            val labelDiscovered = TextView(this).apply {
                text = "Discovered Local Servers:"
                textSize = 14f
                visibility = View.GONE
                setPadding(0, 0, 0, 8)
            }
            container.addView(labelDiscovered)

            val discoveredSpinner = Spinner(this).apply {
                visibility = View.GONE
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(0, 0, 0, 20) }
            }
            container.addView(discoveredSpinner)

            val labelInput = TextView(this).apply {
                text = "Server Address (One Row):"
                textSize = 14f
                setPadding(0, 0, 0, 8)
            }
            container.addView(labelInput)

            // ONE-ROW RESTRICTED Server Address Input
            val rowLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }

            val savedUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_URL) ?: DEFAULT_URL

            val input = EditText(this).apply {
                setSingleLine(true)
                maxLines = 1
                inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
                imeOptions = EditorInfo.IME_ACTION_GO or EditorInfo.IME_ACTION_DONE
                hint = "http://192.168.1.50:5150"
                setText(savedUrl)
                setSelection(text.length)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
            }
            rowLayout.addView(input)

            container.addView(rowLayout)

            val dialog = AlertDialog.Builder(this)
                .setTitle("BubbaFlix Server Connection")
                .setView(container)
                .setPositiveButton("Connect", null)
                .setNegativeButton("Cancel", null)
                .create()

            dialog.setOnShowListener {
                val connectBtn = dialog.getButton(AlertDialog.BUTTON_POSITIVE)

                fun doConnect() {
                    val url = input.text.toString().trim()
                    if (url.isNotEmpty()) {
                        loadBubbaFlix(url)
                        dialog.dismiss()
                    } else {
                        Toast.makeText(this@MainActivity, "Server URL required", Toast.LENGTH_SHORT).show()
                    }
                }

                connectBtn?.setOnClickListener { doConnect() }

                // RETURN / ENTER key on soft keyboard or D-Pad remote triggers CONNECT action
                input.setOnEditorActionListener { _, actionId, event ->
                    if (actionId == EditorInfo.IME_ACTION_GO ||
                        actionId == EditorInfo.IME_ACTION_DONE ||
                        actionId == EditorInfo.IME_ACTION_NEXT ||
                        (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)) {
                        doConnect()
                        true
                    } else {
                        false
                    }
                }
            }

            // Perform automatic local network discovery in background thread
            discoverLocalServers { discoveredList ->
                if (discoveredList.isNotEmpty()) {
                    runOnUiThread {
                        labelDiscovered.visibility = View.VISIBLE
                        discoveredSpinner.visibility = View.VISIBLE
                        val adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, discoveredList)
                        discoveredSpinner.adapter = adapter
                        discoveredSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                                val selectedUrl = discoveredList[position]
                                input.setText(selectedUrl)
                                input.setSelection(selectedUrl.length)
                            }
                            override fun onNothingSelected(parent: AdapterView<*>?) {}
                        }
                    }
                }
            }

            dialog.show()
        }
    }

    fun promptExitApp() {
        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle("Exit BubbaFlix?")
                .setMessage("Are you sure you want to exit BubbaFlix TV?")
                .setPositiveButton("Exit") { _, _ ->
                    finishAffinity()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
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
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            webView.evaluateJavascript("document.body.classList.contains('videoPlayerActive');") { result ->
                if (result == "true") {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));",
                        null
                    )
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    promptExitApp()
                }
            }
            return true
        }

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
