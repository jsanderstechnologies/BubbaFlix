package com.jsanderstechnologies.bubbaflix.tvchannels

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.tvprovider.media.tv.PreviewChannel
import androidx.tvprovider.media.tv.PreviewChannelHelper
import androidx.tvprovider.media.tv.PreviewProgram
import androidx.tvprovider.media.tv.TvContractCompat
import com.jsanderstechnologies.bubbaflix.MainActivity
import com.jsanderstechnologies.bubbaflix.R
import com.jsanderstechnologies.bubbaflix.RemoteLogger
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

object TvChannelManager {

    private const val TAG = "TvChannelManager"
    private const val PREFS_NAME = "BubbaFlixTVPrefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_LAST_SYNC_TIME = "tv_channels_last_sync_time"

    private const val DEFAULT_TMDB_TOKEN =
        "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU"

    private val executor = Executors.newSingleThreadExecutor()
    private val isSyncing = AtomicBoolean(false)
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build()

    data class ChannelDef(
        val key: String,
        val displayName: String,
        val description: String,
        val endpoint: String,
        val isMovie: Boolean,
        val isIptv: Boolean = false
    )

    val CHANNELS = listOf(
        ChannelDef(
            key = "bubbaflix_live_tv",
            displayName = "BubbaFlix: Live TV",
            description = "Live IPTV Channels & Schedules",
            endpoint = "/api/iptv/channels",
            isMovie = false,
            isIptv = true
        ),
        ChannelDef(
            key = "bubbaflix_on_the_air",
            displayName = "BubbaFlix: On The Air",
            description = "TV Shows Currently On The Air",
            endpoint = "/tv/on_the_air",
            isMovie = false
        ),
        ChannelDef(
            key = "bubbaflix_airing_today",
            displayName = "BubbaFlix: Airing Today",
            description = "TV Episodes Airing Today",
            endpoint = "/tv/airing_today",
            isMovie = false
        ),
        ChannelDef(
            key = "bubbaflix_trending_movies",
            displayName = "BubbaFlix: Trending Movies",
            description = "Top Trending Movies This Week",
            endpoint = "/trending/movie/week",
            isMovie = true
        ),
        ChannelDef(
            key = "bubbaflix_popular_shows",
            displayName = "BubbaFlix: Popular Shows",
            description = "Popular TV Series",
            endpoint = "/tv/popular",
            isMovie = false
        )
    )

    fun syncChannelsAsync(context: Context, force: Boolean = false) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            RemoteLogger.i(TAG, "Android TV Preview Channels require Android 8.0 (API 26) or higher. Device API: ${Build.VERSION.SDK_INT}")
            return
        }

        val appContext = context.applicationContext
        executor.execute {
            if (isSyncing.getAndSet(true)) {
                RemoteLogger.d(TAG, "Sync already in progress. Skipping.")
                return@execute
            }

            try {
                val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val lastSync = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)
                val now = System.currentTimeMillis()
                val minInterval = 30 * 60 * 1000L // 30 minutes throttle unless forced

                if (!force && (now - lastSync < minInterval)) {
                    RemoteLogger.d(TAG, "Skipping channel sync, last synced ${(now - lastSync) / 60000} mins ago.")
                    return@execute
                }

                RemoteLogger.i(TAG, "Starting Android TV / Projectivy HomeScreen Channels sync (force=$force)...")
                val helper = PreviewChannelHelper(appContext)
                val existingChannels = try {
                    helper.allChannels
                } catch (e: Exception) {
                    RemoteLogger.w(TAG, "Failed to retrieve existing channels: ${e.message}")
                    emptyList()
                }

                val serverUrl = prefs.getString(KEY_SERVER_URL, null)

                for (def in CHANNELS) {
                    try {
                        syncSingleChannel(appContext, helper, existingChannels, def, serverUrl)
                    } catch (e: Exception) {
                        RemoteLogger.e(TAG, "Error syncing channel '${def.displayName}': ${e.message}")
                    }
                }

                prefs.edit().putLong(KEY_LAST_SYNC_TIME, now).apply()
                RemoteLogger.i(TAG, "Android TV / Projectivy HomeScreen Channels sync completed successfully.")
            } catch (t: Throwable) {
                RemoteLogger.e(TAG, "Fatal error during channel sync: ${t.message}")
            } finally {
                isSyncing.set(false)
            }
        }
    }

    private fun syncSingleChannel(
        context: Context,
        helper: PreviewChannelHelper,
        existingChannels: List<PreviewChannel>,
        def: ChannelDef,
        serverUrl: String?
    ) {
        var channel = existingChannels.firstOrNull { it.internalProviderId == def.key }
        val channelId: Long

        if (channel == null) {
            val builder = PreviewChannel.Builder()
                .setDisplayName(def.displayName)
                .setDescription(def.description)
                .setAppLinkIntentUri(Uri.parse("bubbaflix://home"))
                .setInternalProviderId(def.key)

            try {
                val logoUri = Uri.parse("android.resource://${context.packageName}/${R.drawable.ic_launcher}")
                builder.setLogo(logoUri)
            } catch (e: Exception) {
                // Ignore icon failure
            }

            channelId = helper.publishChannel(builder.build())
            try {
                TvContractCompat.requestChannelBrowsable(context, channelId)
            } catch (e: Exception) {
                RemoteLogger.w(TAG, "Failed to request browsable for ${def.displayName}: ${e.message}")
            }
            RemoteLogger.i(TAG, "Created and published channel '${def.displayName}' (ID: $channelId)")
        } else {
            channelId = channel.id
        }

        // Fetch media items
        val itemsJson = if (def.isIptv) {
            fetchIptvChannelsList(serverUrl)
        } else {
            fetchMediaList(serverUrl, def.endpoint)
        }
        if (itemsJson == null || itemsJson.length() == 0) {
            RemoteLogger.w(TAG, "No items returned for '${def.displayName}' (${def.endpoint})")
            return
        }

        // Delete previous programs for this channel
        try {
            val programsUri = TvContractCompat.buildPreviewProgramsUriForChannel(channelId)
            context.contentResolver.delete(programsUri, null, null)
        } catch (e: Exception) {
            RemoteLogger.w(TAG, "Failed to clear old programs for channel $channelId: ${e.message}")
        }

        // Publish new programs
        var count = 0
        for (i in 0 until itemsJson.length()) {
            if (count >= 20) break
            val item = itemsJson.optJSONObject(i) ?: continue

            if (def.isIptv) {
                val streamId = item.optLong("stream_id", -1L).takeIf { it > 0 } ?: item.optString("stream_id").toLongOrNull() ?: continue
                val chNum = item.optInt("channel_number", (count + 1))
                val name = item.optString("name").ifEmpty { "Channel $chNum" }
                val catName = item.optString("category_name", "Live TV")
                val streamIcon = item.optString("stream_icon", "")

                val displayTitle = "Ch. $chNum | $name"
                val deepLinkUri = Uri.parse("bubbaflix://live/$streamId")

                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = deepLinkUri
                    putExtra("mediaType", "live")
                    putExtra("streamId", streamId.toString())
                    putExtra("channelNumber", chNum)
                    putExtra("title", name)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val intentUri = Uri.parse(launchIntent.toUri(Intent.URI_INTENT_SCHEME))

                val programBuilder = PreviewProgram.Builder()
                    .setChannelId(channelId)
                    .setTitle(displayTitle)
                    .setDescription(catName)
                    .setIntentUri(intentUri)
                    .setWeight(100 - count)
                    .setType(TvContractCompat.PreviewProgramColumns.TYPE_LIVE_SCHEDULE)

                if (streamIcon.isNotEmpty()) {
                    programBuilder.setPosterArtUri(Uri.parse(streamIcon))
                    programBuilder.setPosterArtAspectRatio(TvContractCompat.PreviewProgramColumns.ASPECT_RATIO_16_9)
                }

                try {
                    helper.publishPreviewProgram(programBuilder.build())
                    count++
                } catch (e: Exception) {
                    RemoteLogger.w(TAG, "Failed to publish IPTV program '$displayTitle': ${e.message}")
                }
                continue
            }

            val origLang = item.optString("original_language", "")
            if (origLang.isNotEmpty() && origLang != "en") continue

            val id = item.optLong("id", -1L)
            if (id <= 0) continue

            val title = if (def.isMovie) {
                item.optString("title").ifEmpty { item.optString("original_title") }
            } else {
                item.optString("name").ifEmpty { item.optString("original_name") }
            }
            if (title.isEmpty()) continue

            val overview = item.optString("overview", "")
            val posterPath = item.optString("poster_path", "")
            val backdropPath = item.optString("backdrop_path", "")

            val mediaType = if (def.isMovie) "movie" else "tv"
            val deepLinkUri = Uri.parse("bubbaflix://$mediaType/$id")

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = deepLinkUri
                putExtra("mediaType", mediaType)
                putExtra("tmdbId", id.toString())
                putExtra("title", title)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val intentUri = Uri.parse(launchIntent.toUri(Intent.URI_INTENT_SCHEME))

            val programBuilder = PreviewProgram.Builder()
                .setChannelId(channelId)
                .setTitle(title)
                .setDescription(overview)
                .setIntentUri(intentUri)
                .setWeight(100 - count)
                .setType(if (def.isMovie) TvContractCompat.PreviewProgramColumns.TYPE_MOVIE else TvContractCompat.PreviewProgramColumns.TYPE_TV_SERIES)

            val posterUriStr = when {
                posterPath.isNotEmpty() -> "https://image.tmdb.org/t/p/w500$posterPath"
                backdropPath.isNotEmpty() -> "https://image.tmdb.org/t/p/w780$backdropPath"
                else -> null
            }

            if (posterUriStr != null) {
                programBuilder.setPosterArtUri(Uri.parse(posterUriStr))
                programBuilder.setPosterArtAspectRatio(TvContractCompat.PreviewProgramColumns.ASPECT_RATIO_2_3)
            }

            try {
                helper.publishPreviewProgram(programBuilder.build())
                count++
            } catch (e: Exception) {
                RemoteLogger.w(TAG, "Failed to publish program '$title' (ID: $id): ${e.message}")
            }
        }

        RemoteLogger.i(TAG, "Channel '${def.displayName}' updated with $count program card(s).")
    }

    private fun fetchMediaList(serverUrl: String?, endpoint: String): org.json.JSONArray? {
        val cleanEndpoint = if (endpoint.startsWith("/")) endpoint else "/$endpoint"

        // 1. Try local server TMDB proxy first if configured
        if (!serverUrl.isNullOrEmpty()) {
            val serverApiUrl = "$serverUrl/api/tmdb$cleanEndpoint?language=en-US&with_original_language=en"
            try {
                val req = Request.Builder()
                    .url(serverApiUrl)
                    .header("Authorization", "Bearer $DEFAULT_TMDB_TOKEN")
                    .build()
                httpClient.newCall(req).execute().use { resp ->
                    if (resp.isSuccessful) {
                        val body = resp.body?.string()
                        if (!body.isNullOrEmpty()) {
                            val json = JSONObject(body)
                            val results = json.optJSONArray("results")
                            if (results != null && results.length() > 0) {
                                return results
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Fallback to direct TMDB
            }
        }

        // 2. Direct TMDB API fallback
        val directTmdbUrl = "https://api.themoviedb.org/3$cleanEndpoint?language=en-US&with_original_language=en"
        try {
            val req = Request.Builder()
                .url(directTmdbUrl)
                .header("Authorization", "Bearer $DEFAULT_TMDB_TOKEN")
                .build()
            httpClient.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    val body = resp.body?.string()
                    if (!body.isNullOrEmpty()) {
                        val json = JSONObject(body)
                        return json.optJSONArray("results")
                    }
                }
            }
        } catch (e: Exception) {
            RemoteLogger.w(TAG, "Direct TMDB fetch failed for $directTmdbUrl: ${e.message}")
        }

        return null
    }

    private fun fetchIptvChannelsList(serverUrl: String?): org.json.JSONArray? {
        if (serverUrl.isNullOrEmpty()) return null
        val apiUrl = "$serverUrl/api/iptv/channels"
        try {
            val req = Request.Builder().url(apiUrl).build()
            httpClient.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    val body = resp.body?.string()
                    if (!body.isNullOrEmpty()) {
                        val json = JSONObject(body)
                        val channels = json.optJSONArray("channels")
                        if (channels != null && channels.length() > 0) {
                            return channels
                        }
                    }
                }
            }
        } catch (e: Exception) {
            RemoteLogger.w(TAG, "Failed to fetch IPTV channels from server: ${e.message}")
        }
        return null
    }
}
