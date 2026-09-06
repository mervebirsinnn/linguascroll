/** @type {import('jest').Config} */
// Chunk 11 — apps/api'nin ANA jest.config.js'inden (rootDir: "src") BİLİNÇLİ
// OLARAK ayrı: bu klasör apps/api'nin production/domain kaynak ağacının
// (src/) parçası DEĞİL, bağımsız bir offline tooling. ts-jest bu dosyanın
// yanındaki tsconfig.json'ı otomatik kullanır — main app'in tsconfig'ine hiç
// dokunmaz.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
};
