/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.(spec|e2e-spec)\\.ts$",
  setupFiles: ["<rootDir>/../jest.setup.ts"],
  // Tüm integration/e2e testleri TEK bir paylaşılan test veritabanını (linguascroll_test)
  // kullanıyor — Jest'in varsayılan davranışı test DOSYALARINI paralel worker'larda
  // çalıştırmak, bu da bir dosyanın TRUNCATE'inin başka bir dosyanın az önce insert
  // ettiği satırı silmesine yol açabiliyor (gerçekten gözlemlendi). Testcontainers gibi
  // container-başına izolasyona geçmek yerine (Chunk 4B'de bilinçli reddedilmişti),
  // en küçük doğru çözüm: testleri seri çalıştırmak.
  maxWorkers: 1,
};
