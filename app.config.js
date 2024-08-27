const getVariantSpecificConfig = (variant) => {
  switch (variant) {
    case "development":
      return {
        name: "KarateKidcApp (Dev)",
        ios: { bundleIdentifier: "com.emileberhard.karatekidc.dev" },
        android: { package: "com.emileberhard.karatekidc" },
      };
    case "preview":
      return {
        name: "KarateKidcApp (Preview)",
        ios: { bundleIdentifier: "com.emileberhard.karatekidc.preview" },
        android: { package: "com.emileberhard.karatekidc" },
      };
    default:
      return {
        name: "KarateKidcApp",
        ios: { bundleIdentifier: "com.emileberhard.karatekidc.production" },
        android: { package: "com.emileberhard.karatekidc" },
      };
  }
};

export default ({ config }) => {
  const variant = process.env.APP_VARIANT || "production";
  const variantConfig = getVariantSpecificConfig(variant);

  return {
    ...config,
    ...variantConfig,
    slug: "KarateKidcApp",
    version: "1.1.2",
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
      ...variantConfig.ios,
      supportsTablet: true,
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO,
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        NSMicrophoneUsageDescription:
          "This app needs access to the microphone to record voice messages.",
      },
    },
    android: {
      ...variantConfig.android,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#770808",
      },
      permissions: ["RECORD_AUDIO"],
      googleServicesFile: process.env.GOOGLE_SERVICE_JSON,
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
  };
};
