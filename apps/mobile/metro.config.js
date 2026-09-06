// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];
// 2. Let Metro know where to resolve packages, and in what order.
//
// Üçüncü giriş (`node_modules/.pnpm/node_modules`) gerekli — pnpm'in normal
// (symlink) linking modunda, bir paketin SADECE DOĞRUDAN bağımlılıkları kendi
// node_modules'ünde symlink olarak bulunur; derin/transitive bağımlılıklar
// (örn. expo-video -> expo-modules-core -> invariant/expo-modules-jsi,
// react-native -> @react-native/assets-registry gibi) hiçbir yerde flat/symlink
// olarak YOK, sadece pnpm'in kendi content-addressable store'unda. pnpm bu
// tür "hoisting'e duyarlı olmayan" araçlar için TAM OLARAK bu amaçla
// `node_modules/.pnpm/node_modules` altında dahili, düz bir hoist klasörü
// tutuyor (tüm bağımlılıkların birleşik kümesi) — Metro'nun
// `disableHierarchicalLookup` ile diğer iki yolda bulamadığı her transitive
// paket burada bulunur. Bu, expo-video import zincirinin ("Unable to resolve
// module expo-modules-core/invariant/@react-native/assets-registry...")
// paketleri tek tek apps/mobile/package.json'a eklemeye çalışmak yerine kökten
// çözümü.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];
// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
