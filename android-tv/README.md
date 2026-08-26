# BubbaFlix TV 📺 - Native Android TV, Google TV & Fire TV App (v1.0.4)

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

- 📡 **Dispatcharr Live TV & EPG Auto-Inheritance**: Automatically inherits your Dispatcharr Server URL and API Key from the backend server (`/api/settings`) on startup without typing on TV remotes!
- 🔍 **Dedicated Search Page & Focus Retention**: Interactive `/search` page with category filters and input focus retention during typing.
- 📦 **Single APK Build File Name**: Built directly to `BubbaFlixTV.apk` for clean Downloader deployment.
- 📺 **ExoPlayer 5-Minute Ahead-Buffering Engine**: Tuned in `PlayerActivity.kt` with `DefaultLoadControl` to buffer up to 300 seconds (5 minutes) ahead during stream playback, eliminating freezing, stutters, and buffering loops on 4K / 1080p high-bitrate media.
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
