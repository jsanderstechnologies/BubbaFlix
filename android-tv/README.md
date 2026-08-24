# BubbaFlix TV 📺 - Native Android TV, Google TV & Fire TV App (v1.0.0)

**BubbaFlix TV v1.0.0** is the official native Android application for Android TV, Google TV, Chromecast with Google TV, Nvidia Shield, and Amazon Fire TV devices.

---

## 📲 Downloader App Direct Install Code

You can install **BubbaFlix TV** directly on any Firestick, Android TV, or Google TV device using the **Downloader** app:

> 🔥 **Downloader Code**: **`7862216`**

### Steps to Install via Downloader:
1. Open the **Downloader** app on your Firestick, Fire TV, or Android TV.
2. In the URL/Code search field, enter **`7862216`** and press **Go**.
3. The APK (`BubbaFlixTV-v1.0.0.apk`) will download and prompt you to install automatically!

---

## 🌟 Key Features

- 📺 **Native Android TV Leanback Banner**: Displays on the home screen launcher of Android TV, Google TV, and Fire TV devices.
- 🕹️ **D-Pad Remote Control Optimization**: Fully hardware-accelerated WebView engine tuned for TV remotes with zero latency.
- 🎬 **Unified Web Video Player Integration**: Embedded player with TMDB title logo artwork, OpenSubtitles search, and D-Pad transport controls.
- ⚙️ **Custom Server Address Prompt**: Easily connect to any local network BubbaFlix backend server (e.g. `http://192.168.1.50:5150`).
- ⚡ **Auto Fullscreen & System UI Hiding**: Automatically hides navigation and status bars for a true 10ft cinema experience.

---

## 🛠️ How to Build the APK

### Prerequisites
- JDK 17+
- Android SDK (API Level 34)

### Command Line Build
From the `android-tv` directory:

```bash
# Build Debug APK (BubbaFlixTV-v1.0.0.apk)
./gradlew.bat assembleDebug

# Build Release APK
./gradlew.bat assembleRelease
```

The compiled APK will be generated at:
`android-tv/app/build/outputs/apk/debug/BubbaFlixTV-v1.0.0.apk`

---

## 📲 Alternative Installation Methods

### Method 1: Downloader Code
Enter **`7862216`** in the Downloader app search bar.

### Method 2: ADB (Android Debug Bridge)
Connect your computer to your TV over Wi-Fi or USB:

```bash
# Connect to Android TV IP
adb connect 192.168.1.XX:5555

# Install BubbaFlix TV APK
adb install -r BubbaFlixTV-v1.0.0.apk
```

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
