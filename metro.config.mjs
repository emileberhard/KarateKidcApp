import { getDefaultConfig } from "expo/metro-config";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push("mjs");

export default defaultConfig;
