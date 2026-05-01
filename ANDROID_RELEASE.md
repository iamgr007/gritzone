# Android Release Guide — Publishing GRITZONE to Play Store

This app uses Capacitor + a remote `server.url` (https://gritzone.me), so app
updates are *content* updates served by your live website. You only need to
publish a new APK/AAB to Play Store when you change native config (icons,
permissions, plugins, app name, version, etc.).

---

## One-time setup: generate a release keystore

> ⚠️ **BACK THIS FILE UP.** If you lose the keystore, you cannot ship updates
> to your existing Play Store listing — ever.

```bash
cd android
keytool -genkey -v \
  -keystore gritzone-release.keystore \
  -alias gritzone -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for a store password and a key password. Use the **same** value
for both to keep things simple, and save them in a password manager.

Then create `android/keystore.properties` (gitignored):

```properties
storeFile=gritzone-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=gritzone
keyPassword=YOUR_PASSWORD
```

A template lives at `android/keystore.properties.example`.

---

## Build a release AAB (recommended for Play Store)

From the project root:

```bash
npm run android:release
```

This runs `cap sync android` then `./gradlew bundleRelease`.
Output:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Upload that `.aab` to Play Console → your app → Production → Create new release.

## Build a release APK (for sideloading / testing)

```bash
npm run android:apk
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Bumping the version

Edit `android/app/build.gradle`:
```gradle
versionCode 3       // integer; increment by 1 for every Play Store upload
versionName "1.0.2" // user-facing
```
Play Store rejects a build that has the same `versionCode` as a previous one.

---

## App icons & splash screens

Source artwork lives in `resources/`. To regenerate native icons & splash:
```bash
npm run cap:assets
npm run android:sync
```

---

## First-time Play Console upload checklist

- [ ] App name: **GRITZONE**
- [ ] Package name: `me.gritzone.app` (set in `android/app/build.gradle` & `capacitor.config.ts`)
- [ ] Privacy Policy URL: https://gritzone.me/privacy
- [ ] Permissions in `android/app/src/main/AndroidManifest.xml` are needed:
      INTERNET, CAMERA, POST_NOTIFICATIONS (push). Remove any you don't use.
- [ ] Feature graphic, screenshots (phone + 7" tablet recommended)
- [ ] Short description (≤ 80 chars), Long description
- [ ] Content rating questionnaire
- [ ] Data Safety form (we collect: account, fitness, photos for workout logs)
- [ ] Target API level 36 ✅ (already configured in `android/variables.gradle`)
- [ ] Signed with upload key ✅ (this guide)

---

## Push notifications (optional)

If you want FCM push working in release builds, drop your
`google-services.json` into `android/app/` and rebuild.
The Gradle script already enables the Google Services plugin only if that
file exists (see `android/app/build.gradle` bottom of file).

---

## Common gotchas

- **"App not signed"** when uploading: your `keystore.properties` is missing
  or has wrong paths. Run `./gradlew bundleRelease --info` to see the resolved
  signing config.
- **"Version code 1 already used"**: bump `versionCode` in
  `android/app/build.gradle`.
- **"Java home"**: needs JDK 21. Capacitor 8 requires Java 21.
  ```bash
  brew install --cask temurin@21
  export JAVA_HOME=$(/usr/libexec/java_home -v 21)
  ```
- **"SDK location not found"**: create `android/local.properties`:
  ```properties
  sdk.dir=/opt/homebrew/share/android-commandlinetools
  ```
  (or `~/Library/Android/sdk` if you installed via Android Studio.)
- **Gradle cache corruption**: `cd android && ./gradlew clean`.
