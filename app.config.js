export default ({ config }) => ({
  ...config,
  name: "KarateKidcApp",
  slug: "KarateKidcApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "karatekidcapp",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.emileberhard.karatekidc",
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO,
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      NSMicrophoneUsageDescription:
        "This app needs access to the microphone to record voice messages.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#770808",
    },
    package: "com.emileberhard.karatekidc",
    permissions: ["RECORD_AUDIO"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#ffffff",
        sounds: ["./assets/sounds/notification.wav"],
        playSoundOnNotification: true,
      },
    ],
    "expo-router",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "06df8d9a-ac9e-460a-a314-10f4ac2bfa4b",
    },
  },
});
