import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// drizzle-kit, Nest'in DI/ConfigModule'ü dışında, bağımsız bir CLI olarak çalışır —
// bu yüzden .env'i kendi başına (dotenv ile) okur. Runtime'daki app.module.ts'in
// Zod fail-fast validation'ı burada geçerli değil; DATABASE_URL eksikse drizzle-kit
// kendi hatasını verir.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
}

export default defineConfig({
  // Glob: her feature kendi *.schema.ts dosyasını tutar (feature-first). Chunk 4A'da
  // tek dosyaya sabitlenmişti, Chunk 5'in quizzes.schema.ts'i eklenince bu güncellendi.
  schema: "./src/**/*.schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
