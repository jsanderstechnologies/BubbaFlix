package com.jsanderstechnologies.bubbaflix

import android.app.Application

class BubbaFlixApp : Application() {
    override fun onCreate() {
        super.onCreate()
        RemoteLogger.init(this)
    }
}
