# BubbaFlix TV 📺 - Native Android TV, Google TV & Fire TV App (v1.0.35)

**BubbaFlix TV** is the official native Android application for Android TV, Google TV, Chromecast with Google TV, Nvidia Shield, and Amazon Fire TV devices.

---

## 📲 Downloader App Direct Install Code

You can install **BubbaFlix TV** directly on any Firestick, Android TV, or Google TV device using the **Downloader** app:

> 🔥 **Downloader Code**: **`7862216`**
> 
> 🔗 **Direct APK Download URL**: `https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk`

### Steps to Install via Downloader:
1. Open the **Downloader** app on your Firestick, Fire TV, or Android TV.
2. In the URL/Code search field, enter **`7862216`** and press **Go**.
3. The APK (`BubbaFlixTV.apk`) will download and prompt you to install automatically!

---

## 🌟 Key Features

- 📡 **Automated Client Remote Logging Engine (`v1.0.35`)**: Real-time diagnostic telemetry sent back from Android TV devices to the server (`/api/log`). Captures app startup, device hardware specs, server discovery scans, WebView console warnings/errors, ExoPlayer playback state transitions, OutOfMemory warnings, and thread crashes via an in-memory batching queue and synchronous fatal crash handler.
- 🎭 **Popular Genres Search Engine on Search Page (`v1.0.34`)**: Selecting a popular genre on the Search page directly queries TMDB discover genre IDs (`with_genres`) for true movies and TV shows in that genre rather than matching the genre's name as a text title.
- 🎬 **Direct Remote Back Trailer Exit & Clean Window Engine (`v1.0.33`)**: Completely removed the on-screen exit button for clean viewing and eliminated programmatic fullscreen calls that caused the trailer to shrink into a smaller window upon remote Back press. Back key now directly dismisses the trailer modal back to Details.
- 🖥️ **Fullscreen Trailer Window & Strict Focus Lock Engine (`v1.0.32`)**: True 100% edge-to-edge fullscreen trailer modal with strict D-pad/keyboard focus cycling, preventing stray navigation leaks to background elements.
- 🎬 **Official YouTube Trailer Engine & Back Navigation Fix (`v1.0.31`)**: Intelligent trailer scoring algorithm that prioritizes official studio trailers over clips/featurettes, paired with history pushState/popstate and remote double-back defense to keep the user on the Details page when exiting a trailer.
- 🎯 **First Unwatched TV Episode Auto-Navigation (`v1.0.30`)**: When opening any TV series details page, BubbaFlix automatically switches to the correct season, scrolls down to the first unwatched (or in-progress) episode, and focuses its streams button while preventing scroll snap-back.
- ↕️ **Home Page Vertical Viewport Scrolling (`v1.0.29`)**: Seamless vertical scrolling across all home carousel rows during remote D-pad and arrow navigation with intelligent edge-aware viewport tracking and modal protection.
- 🛡️ **Dynamic Cache Invalidation & Stale Cache Defense (`v1.0.28`)**: Fixed long-lived immutable cache headers on metadata API requests and introduced query versioning (`_v=1.0.29`) to prevent TVs and WebViews from caching stale empty responses.
- 🔍 **Multi-Endpoint Search & Media Type Auto-Tagging (`v1.0.28`)**: Concurrently searches `/search/tv` and `/search/movie` alongside `/search/multi`, ensuring titles with symbols and ampersands (*Georgie & Mandy's First Marriage*) are reliably found.
- 📺 **Prime-Time "On The Air" Sorting (`v1.0.28`)**: Re-ranked shows in the On The Air carousel to bring current prime-time broadcasting series right to the front of the home screen.
- 📺 **Explore TV Series "On The Air" & "Airing Today" Sorts (`v1.0.27`)**: Dedicated sorting filters with seamless infinite scrolling and persistent selection across detail screens.
- 🛡️ **Adult Filter Precision & Title Restoration (`v1.0.27`)**: Strict word-boundary regex filtering prevents false positives on words like "adulthood", restoring titles like *Georgie & Mandy's First Marriage* to search and carousels.
- 🕹️ **Remote D-Pad Repeat Throttle & Jitter Defense (`v1.0.27`)**: 110ms repeat throttling and dynamic instant scrolling eliminate focus jumping and jitter when holding down D-pad arrows or Page Up/Down buttons.
- 🔍 **Interactive Search Bar Input & Soft Keyboard Engine (`v1.0.26`)**: Free editing and appending on the search page with instant soft keyboard toggle on OK/Enter press and seamless backspace/clear support without being kicked out.
- ⬆️ **Smart Remote "Back to Top" & Home Key Navigation (`v1.0.26`)**: Pressing the remote `Home` key or pressing `Back` when scrolled deep down a page (`scrollY > 400`) smoothly returns focus and scroll to the top navigation header.
- 📺 **Expanded "On The Air" TV Series Coverage (`v1.0.26`)**: Multi-page air-date querying ensures upcoming weekly episodes are reliably featured in the dedicated On The Air section.

- ⚡ **ExoPlayer 64MB Ahead-Buffering Engine (`PlayerActivity.kt`)**: Tuned with `DefaultLoadControl` to buffer up to 64MB / 300 seconds ahead during stream playback, eliminating freezing, stutters, and buffering loops on 4K / 1080p high-bitrate media.
- 🛡️ **`largeHeap` & Background Memory Defense**: Added Android manifest `android:largeHeap="true"` and background WebView pausing/memory trimming during video playback to prevent out-of-memory crashes on memory-constrained devices.
- 🕹️ **Native D-Pad Remote Long-Press (`MainActivity.kt`)**: Overrides `dispatchKeyEvent` to reliably catch remote center-key hold events (`event.isLongPress || event.repeatCount == 1`) and trigger the Quick Action Menu directly in the WebView.
- 🚀 **Full-Viewport Transparent Poster Action Menu**: Long-pressing any poster opens an action modal (Favorites, SIMKL Watch Status, View Details) rendered via `createPortal` to `document.body` with a transparent backdrop and spatial `ArrowUp`/`ArrowDown` D-pad cycling.
- 📺 **Player Controls Instant Auto-Hide**: Navigating upward from the player's back button immediately hides the playback controls without waiting for an on-screen timeout.
- ⚡ **Local Device HTTP Disk Caching (`WebSettings.LOAD_DEFAULT`)**: Caches TMDB posters (1-year TTL) and API metadata JSON (1-hour TTL) directly on TV storage for instantaneous page transitions and reduced server traffic.
- 🎭 **Refined Actor Search & Filmography Engine**: Automatically resolves actor names (e.g. *"John Wayne"*), loads their full deduplicated filmography, and strictly filters out unrelated partial-name matches.
- ⚙️ **Automatic Server Settings Inheritance**: Automatically inherits server configurations (Premiumize API key, SIMKL settings, resolution preferences, Groq AI filters) from the backend server (`/api/settings`) on startup without typing on TV remotes!
- 🔍 **Dedicated Search Page & Focus Retention**: Interactive `/search` page with category filters and input focus retention during typing.
- 🔄 **TV Series Episode Refresh Focus Restoration**: Refreshing streams inside TV series episodes preserves scroll position and returns focus directly to the episode dropdown upon reload.
- 🎯 **Persistent Sort & Tab Retention on Details Exit**: Returning from details screens preserves user sorting options and sub-tabs in Explore and Favorites, automatically refocusing the last-selected poster after page reload.
- 📦 **Single APK Build File Name**: Built directly to `BubbaFlixTV.apk` for clean Downloader deployment.
- 🚀 **Interactive OTA Update Checker**: Queries `version.json` on GitHub on launch and prompts the user with an interactive update notification whenever a new `versionCode` is published.
- ⭐ **Favorites Section & Star Toggle**: Seamless D-Pad navigation across the `/favorites` section and details screen star toggle buttons.
- 🕹️ **Unlocked 2D Spatial Remote Control**: Automatic top-left poster focus on page change, non-navigable top logo, and smooth section-transition vertical navigation between carousel rows and top menu bar.
- 📺 **Native Android TV Leanback Banner**: Displays on the home screen launcher of Android TV, Google TV, Nvidia Shield, and Fire TV devices (`LEANBACK_LAUNCHER`).
- 🔐 **Signed Production Release APK (`bubbaflix.jks`)**: Signed with 2048-bit RSA JKS keystore (`V1 + V2 signatures`) to guarantee clean, error-free package installation across all Android versions.

---

## 🛠️ How to Build the APK

### Prerequisites
- JDK 17+ (Android Studio JBR recommended)
- Android SDK (API Level 34)

### Command Line Build
From the `android-tv` directory:

```powershell
# Set Environment Variables & Build Release APK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "F:\Android\Sdk"
.\gradlew.bat assembleRelease --no-configuration-cache
```

The compiled signed APK will be generated at:
`android-tv/app/build/outputs/apk/release/BubbaFlixTV.apk` (and copied to `BubbaFlixTV.apk` in the root directory).

---

## 📲 Installation Methods

### Method 1: Downloader Code
Enter **`7862216`** in the Downloader app search bar.

### Method 2: Direct GitHub Download URL
Enter `https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk` in any browser or Downloader app.

### Method 3: ADB (Android Debug Bridge)
Connect your computer to your TV over Wi-Fi or USB:

```bash
# Connect to Android TV IP
adb connect 192.168.1.XX:5555

# Install BubbaFlix TV APK
adb install -r BubbaFlixTV.apk
```

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
