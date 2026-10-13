![Hushilume](public/hushilume/banner.svg)

Give old hardware a useful second life.

Hushilume began with an old Mi A3 phone and an old speaker that were lying around. Together, they became a quiet music player with moving backgrounds, four large cards, and one central control.

Old phones still contain useful computing power, screens, storage, and connections. This project starts with one simple use for that hardware. More uses can come later. **For now, it plays music.**

## See it running

Playback and fullscreen view:

<video src="https://github.com/Martin-Atrin/Hushilume/raw/refs/heads/main/docs/media/hushilume-playback.mp4" controls="controls" muted="muted" playsinline="playsinline"></video>

Settings and media sources:

<video src="https://github.com/Martin-Atrin/Hushilume/raw/refs/heads/main/docs/media/hushilume-settings.mp4" controls="controls" muted="muted" playsinline="playsinline"></video>

These silent recordings show the actual local app with the Mi A3 media profile and landscape screen shape. They are browser captures, not recordings from the physical phone. The demo uses a personal media library, which is not bundled with the public app. Import your own media to make it yours.

[Source and releases](https://github.com/Martin-Atrin/Hushilume).

Hushilume is a TypeScript app packaged with Capacitor. It is designed for private installation, without an app-store account or a server. iOS signing still follows Apple's device provisioning rules.

## Use it

1. Hold the central play/pause button for 650 ms to open settings. On a keyboard, press comma.
2. Choose a card and one of its three scenes.
3. Import audio files, or set a YouTube, Spotify, or SoundCloud link.
4. Choose a name, color, cover image, and optional looping video.
5. Save your changes.

Tap a card to play. Tap the selected card again to advance its scene. Tap the center to pause or resume. After 15 seconds, local playback enters the ambient view. Tap anywhere to return.

The public build includes original artwork and moving light backgrounds. **It does not include a music library.** Import your own audio to play offline. Imports are copied into the app, so they survive restarts. Uninstalling the app removes imported files and settings.

Hushilume was previously named Ambiance. The application ID and storage identifiers stay unchanged so updates retain existing files and settings.

## Media sources

| Source | Behavior |
| --- | --- |
| Device audio files | Offline playback, random entry, five-second crossfades, ambient mode, and screen wake |
| Installed library | Optional operator-supplied local manifest and audio files |
| YouTube | Visible embedded video player; internet required |
| Spotify | Spotify embed; available playback depends on the account, browser, and provider |
| SoundCloud | Visible SoundCloud player; availability depends on the recording and provider |

Provider playback uses the provider's controls. It stops when its dialog closes. It does not use local-file crossfades or hide behind the ambient view. This app does not extract or download audio from these services. If an embed is unavailable, use the provider's own app or import an audio file you can use.

Videos are muted and overlap at their loop boundary. A missing or failed video uses the cover with original moving light fields. This fallback is animated artwork, not stock video footage.

## Screen shape

Settings include automatic Mi A3 detection, no cutout for iPad, teardrop, wide notch, pill, and camera-hole shapes. Tune width, depth, edge, and position. Automatic edge selection follows orientation. The card borders trace the selected shape and the central control with a six-pixel gap. The fullscreen glow follows the same cutout and stays outside that gap.

Other device presets are cosmetic templates. They do not claim to measure the physical cutout on every device. Use the controls to match your device.

## Develop

Requires Node 24+, npm, JDK 21 and Android SDK 36 for Android, or Xcode 26+ for iOS.

```sh
npm ci
npm run dev
npm test
npm run build
npx cap sync
```

The web build is in `dist-android/`; the historical directory name is shared by both native platforms. `npm run build` deliberately excludes private media and private manifests.

## Android APK

```sh
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Install it using `adb install -r PATH_TO_APK`, or open it on your Android device. The supplied preview APK is debug-signed, intended for private testing. Use your own persistent signing key for personal release builds.

## iPad and iPhone

```sh
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select the App target, select your signing team, and choose your connected iPad. Build and run. The app supports portrait and landscape on iPad. An exported development IPA only installs on devices included in its provisioning profile. A free Personal Team usually requires renewal after seven days; a paid membership permits registered-device distribution. No App Store publication is required.

See [Apple's registered-device distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices).

## Project layout

- `src/main.ts`: interface and playback coordination
- `src/settings.ts`, `src/config.ts`: settings UI, validation, and persistence
- `src/media-store.ts`: native file copying and browser IndexedDB storage
- `src/audio.ts`, `src/video-loop.ts`, `src/motion.ts`: local media and motion
- `src/contours.ts`: card and device cutout geometry
- `public/hushilume/`: original logo and default artwork
- `android/`, `ios/`: native platform projects

No backend, telemetry, advertising SDK, or account is required. Local imports stay on the device. Provider players make requests to their respective services when opened. HTTPS cover and video URLs make requests to their hosts.

## What comes next

Music is the first use for this hardware. The wider goal is to find small, practical jobs for devices that still work. Further uses of the phone's computing power are open for exploration; they are not implemented features or a fixed roadmap.

## License

Code and original Hushilume artwork: [MIT](LICENSE). Manrope: [SIL Open Font License](public/fonts/OFL.txt). Third-party packages retain their licenses. User-supplied media and provider content are not licensed by this project. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
