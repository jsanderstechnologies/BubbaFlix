# BubbaFlix TV 📺 - Native Android TV, Google TV & Fire TV App

**BubbaFlix TV** is the official native Android application for Android TV, Google TV, Chromecast with Google TV, Nvidia Shield, and Amazon Fire TV devices.

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
# Build Debug APK
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease
```

The compiled APK will be generated at:
`android-tv/app/build/outputs/apk/debug/app-debug.apk`

---

## 📲 How to Install & Sideload on TV Devices

### Method 1: ADB (Android Debug Bridge)
Connect your computer to your TV over Wi-Fi or USB:

```bash
# Connect to Android TV IP
adb connect 192.168.1.XX:5555

# Install BubbaFlix TV APK
adb install -r android-tv/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Firestick / Android TV "Downloader" App
1. Install the **Downloader** app from the Amazon Appstore or Google Play Store on your TV.
2. Enable "Install Unknown Apps" for Downloader in TV Settings.
3. Enter the URL of your hosted `BubbaFlixTV.apk` or GitHub Release link in Downloader to install directly!

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
