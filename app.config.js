export default ({ config }) => ({
  ...config,
  name: "KarateKidcApp",
  slug: "KarateKidcApp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
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
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.emileberhard.karatekidc",
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
        sounds: ["./assets/sounds/notification-sound.wav"],
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
  owner: "emileberhard",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https:
  },
});
