/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.test\\.ts$",
  // apps/mobile'ın ana tsconfig.json'ı Expo'nun bundler-hedefli ayarlarını
  // kullanıyor (module: "preserve", moduleResolution: "bundler", noEmit: true) —
  // bunlar Metro/bundler için doğru ama ts-jest'in CommonJS'e derleyip Node'da
  // çalıştırabilmesi için değil. tsconfig.jest.json SADECE bu üç ayarı override
  // ediyor; geri kalan her şey (strict, jsx, lib) aynı kalıyor.
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.jest.json" }],
  },
};
