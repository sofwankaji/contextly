# Contextly Android

Personal Android APK, mobile first. Bundle web assets locally with Capacitor; do not set a remote server URL. Vocabulary and review history stay in IndexedDB on the device. Preserve app ID, HTTPS localhost origin, database migrations and signing identity across updates.

Native local notifications schedule reviews on the device, including when the app is closed. Notification taps open the associated Recall card. Keep initial 3/7 day reminders and reschedule rated cards.

Gemini calls go directly to Google through native code using each device owner's key, encrypted by Android Keystore. Never embed API keys, signing keys, credentials or private app data in Git or APK assets. Do not silently switch to paid models. Keep the provider actually used visible. Existing web source hooks may retain web compatibility; the APK must not need a Contextly backend.

Push main builds and publishes signed APKs through GitHub Actions. Update installation requires Android confirmation. Keep release versionCode increasing. Signing secrets belong in GitHub encrypted secrets, not source.

Escape user text in HTML, validate imports, preserve existing vocabulary. Test native scheduling/protocol/update helpers and affected capture/Recall behavior before pushing. Use accessible touch controls and Thai UI text.
