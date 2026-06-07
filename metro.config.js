const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// config.watchman = {
//   useWatchman: false,
//   projectRoot: __dirname,
// };

// config.fileSystemWatcher = {
//   unstable_enableSymlinks: true,
// };

// config.resolver.disableHierarchicalLookup = true; NO ENCUENTRA .EXPO Y CRASHA

module.exports = withNativeWind(config, { 
  input: "./global.css",
  inlineRem: 16,
  strict: false // Agregar esto también
});