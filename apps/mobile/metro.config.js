// Learn more: https://docs.expo.dev/guides/monorepos/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// getSentryExpoConfig, getDefaultConfig'in yerini alıyor (aynı imza) — Sentry'nin
// source map'lere debug-id gömen Metro serializer'ını ekliyor, aşağıdaki
// pnpm/monorepo resolver ayarlarını ETKİLEMİYOR.
const config = getSentryExpoConfig(projectRoot);

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

// 4. `watchFolders = [workspaceRoot]` tüm monorepo'yu (packages/shared-types'ı
// çözebilmek için) izliyor — ama bu, mobile'ın hiç ihtiyaç duymadığı
// `apps/api`'yi de kapsıyor. `apps/api/scripts/stt/{input,tmp,output}` STT
// pipeline'ının SANİYELER içinde yaratıp SİLDİĞİ scratch klasörler — Metro'nun
// dosya izleyicisi (Watchman yoksa FallbackWatcher) bir klasörü izlemeye
// başladığı ANDA o klasör silinirse ENOENT ile TAMAMEN ÇÖKÜYOR (gerçekte
// yaşanmış bir crash, bkz. proje geçmişi). Bu üç klasörün + backend'in kendi
// `dist`/derleme çıktısının Metro tarafından hiç izlenmemesi gerekiyor —
// zaten JS/TS kaynak kodu değiller, mobile bundle'ına hiç girmiyorlar.
config.resolver.blockList = [
  /apps[\\/]api[\\/]scripts[\\/]stt[\\/](input|tmp|output)[\\/].*/,
  /apps[\\/]api[\\/]dist[\\/].*/,
];

// 5. '@sentry/core' ÖZEL DURUMU — workspace'te AYNI ANDA iki uyumsuz major sürüm var:
// apps/api'nin @sentry/nestjs zinciri @sentry/core@11.0.0 ister, apps/mobile'ın
// @sentry/react-native@8.28.0 zinciri @sentry/core@10.75.2 ister. disableHierarchicalLookup
// nedeniyle Metro normalde '@sentry/core' için SADECE üçüncü nodeModulesPaths girdisine
// (pnpm'in paylaşımlı, TEK sürüm tutabilen flat hoist klasörü) bakıyor — o klasörde hangi
// sürümün kazandığı `pnpm install` çalıştırma sırasına bağlı (doğrulandı: bir önceki
// kurulumda 10.37.0, bu kurulumda 11.0.0 kazanmıştı) ve mobile bundle'ına yanlışlıkla
// @sentry/core@11.0.0'ın sızıp "undefined is not a constructor" startup crash'ine yol
// açmasının kök nedeni buydu. SADECE bu bir specifier için hierarchical lookup'ı yeniden
// açıyoruz: import eden dosyanın (context.originModulePath) kendi dizininden yukarı arama,
// pnpm'in HER paket için zaten doğru izole ettiği nested @sentry/core kopyasını (paylaşımlı
// flat klasörü hiç görmeden) buluyor. Diğer TÜM modüller (diğer @sentry/* paketleri dahil —
// onlar için collision kanıtlanmadı) değişmeden mevcut resolver'a delege ediliyor.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@sentry/core' || moduleName.startsWith('@sentry/core/')) {
    return context.resolveRequest(
      { ...context, disableHierarchicalLookup: false, nodeModulesPaths: [] },
      moduleName,
      platform
    );
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
