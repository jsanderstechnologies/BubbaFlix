package com.jsanderstechnologies.bubbaflix

import android.app.Activity
import android.app.ProgressDialog
import android.content.Intent
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.FileProvider
import okhttp3.*
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object UpdateManager {

    private const val TAG = "BubbaFlixUpdateManager"
    private const val VERSION_CHECK_URL = "https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/version.json"

    fun checkForUpdates(activity: Activity) {
        val client = OkHttpClient.Builder().build()
        val request = Request.Builder()
            .url(VERSION_CHECK_URL)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.w(TAG, "Failed to check for updates from GitHub: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    Log.w(TAG, "GitHub version check returned non-200 code: ${response.code}")
                    return
                }

                val bodyStr = response.body?.string()
                if (!bodyStr.isNullOrEmpty()) {
                    try {
                        val json = JSONObject(bodyStr)
                        val remoteVersionCode = json.optInt("versionCode", 0)
                        val remoteVersionName = json.optString("versionName", "1.0.0")
                        val apkUrl = json.optString("apkUrl", "")
                        val releaseNotes = json.optString("releaseNotes", "New performance and feature updates.")

                        @Suppress("DEPRECATION")
                        val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
                        @Suppress("DEPRECATION")
                        val localVersionCode = pInfo.versionCode

                        Log.d(TAG, "Local versionCode: $localVersionCode, Remote versionCode: $remoteVersionCode")

                        if (remoteVersionCode > localVersionCode && apkUrl.isNotEmpty()) {
                            activity.runOnUiThread {
                                showUpdatePromptDialog(activity, remoteVersionName, releaseNotes, apkUrl)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing version.json from GitHub", e)
                    }
                }
            }
        })
    }

    private fun showUpdatePromptDialog(activity: Activity, versionName: String, releaseNotes: String, apkUrl: String) {
        if (activity.isFinishing || activity.isDestroyed) return

        val builder = AlertDialog.Builder(activity)
        builder.setTitle("🚀 BubbaFlix TV Update Available (v$versionName)")
        builder.setMessage("$releaseNotes\n\nWould you like to update the BubbaFlix TV app?")

        builder.setPositiveButton("Yes") { dialog, _ ->
            dialog.dismiss()
            downloadAndInstallApk(activity, apkUrl)
        }

        builder.setNegativeButton("No") { dialog, _ ->
            dialog.dismiss()
        }

        builder.setCancelable(true)
        val dialog = builder.create()
        dialog.show()

        // Focus Update Now button for TV remote D-Pad controls
        dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.requestFocus()
    }

    @Suppress("DEPRECATION")
    private fun downloadAndInstallApk(activity: Activity, apkUrl: String) {
        val progressDialog = ProgressDialog(activity).apply {
            setTitle("Downloading BubbaFlix Update")
            setMessage("Downloading latest APK from GitHub... Please wait.")
            setProgressStyle(ProgressDialog.STYLE_HORIZONTAL)
            isIndeterminate = false
            max = 100
            setCancelable(false)
            show()
        }

        val client = OkHttpClient.Builder().build()
        val request = Request.Builder().url(apkUrl).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity.runOnUiThread {
                    progressDialog.dismiss()
                    Toast.makeText(activity, "Failed to download update: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    activity.runOnUiThread {
                        progressDialog.dismiss()
                        Toast.makeText(activity, "Download failed (Server code ${response.code})", Toast.LENGTH_LONG).show()
                    }
                    return
                }

                val body = response.body ?: return
                val contentLength = body.contentLength()
                val apkFile = File(activity.cacheDir, "BubbaFlix_Update.apk")

                try {
                    val inputStream = body.byteStream()
                    val outputStream = FileOutputStream(apkFile)
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    var totalRead: Long = 0

                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                        outputStream.write(buffer, 0, bytesRead)
                        totalRead += bytesRead
                        if (contentLength > 0) {
                            val progress = ((totalRead * 100) / contentLength).toInt()
                            activity.runOnUiThread {
                                progressDialog.progress = progress
                            }
                        }
                    }

                    outputStream.flush()
                    outputStream.close()
                    inputStream.close()

                    activity.runOnUiThread {
                        progressDialog.dismiss()
                        installApk(activity, apkFile)
                    }
                } catch (e: Exception) {
                    activity.runOnUiThread {
                        progressDialog.dismiss()
                        Toast.makeText(activity, "Error saving update file: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        })
    }

    private fun installApk(activity: Activity, apkFile: File) {
        if (!apkFile.exists()) {
            Toast.makeText(activity, "Update APK file not found.", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val apkUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            activity.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch package installer", e)
            Toast.makeText(activity, "Failed to launch installer: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
