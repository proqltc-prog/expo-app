/**
 * Convenience identifiers for `RequestConfiguration.testDeviceIdentifiers`.
 *
 * Emulators and simulators are already treated as test devices by the Google
 * Mobile Ads SDK on iOS and Android (classic and Next-Gen). Prefer those
 * automatic detections over listing identifiers unless you need the classic
 * Android `EMULATOR` alias below.
 *
 * For physical devices, pass the hashed device id that the SDK prints to
 * logcat / Xcode when an ad is requested (the log line mentions
 * `RequestConfiguration.Builder.setTestDeviceIds`).
 */
export declare const TestDeviceIds: {
    /**
     * Classic Android only: maps to `AdRequest.DEVICE_ID_EMULATOR`.
     * Unnecessary on iOS and on Android Next-Gen (emulators are auto-detected;
     * Next-Gen strips this alias before calling the SDK).
     */
    readonly EMULATOR: "EMULATOR";
};
//# sourceMappingURL=TestDeviceIds.d.ts.map