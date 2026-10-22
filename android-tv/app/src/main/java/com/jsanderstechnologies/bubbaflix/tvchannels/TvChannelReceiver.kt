package com.jsanderstechnologies.bubbaflix.tvchannels

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.jsanderstechnologies.bubbaflix.RemoteLogger

class TvChannelReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        RemoteLogger.i("TvChannelReceiver", "Received TV channels broadcast: $action")
        when (action) {
            "android.media.tv.action.INITIALIZE_PROGRAMS",
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                TvChannelManager.syncChannelsAsync(context, force = true)
            }
        }
    }
}
