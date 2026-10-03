/** @type {import('jest').Config} */
// 2026-10-01 — iki AYRI proje: "logic" (mevcut, değişmedi — saf TS mantık
// testleri, Node'da ts-jest ile) ve "component" (YENİ — gerçek component
// render testleri, jest-expo preset'iyle react-native testing library
// kullanarak). İkisini AYNI config'te, farklı testEnvironment/transform
// gerektirdiği için TEK bir proje olarak birleştirmek mümkün değildi — bu
// yüzden Jest'in "projects" (multi-project) özelliği kullanıldı. "logic"
// projesinin davranışı bu değişiklikten ÖNCEKİYLE BİREBİR AYNI (sadece
// displayName eklendi) — mevcut testler hiç etkilenmiyor.
module.exports = {
  projects: [
    {
      displayName: "logic",
      preset: "ts-jest",
      testEnvironment: "node",
      rootDir: "src",
      testRegex: ".*\\.test\\.ts$",
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.jest.json" }],
      },
    },
    {
      displayName: "component",
      preset: "jest-expo",
      rootDir: ".",
      testMatch: ["<rootDir>/src/**/*.test.tsx"],
    },
  ],
};
