import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { z } from "zod";
import { AppController } from "./app.controller";
import { DatabaseModule } from "./database/database.module";
import { FeedModule } from "./feed/feed.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { UsersModule } from "./users/users.module";
import { VideosModule } from "./videos/videos.module";
import { WordsModule } from "./words/words.module";

// Uygulamanın zorunlu ortam değişkenleri. ConfigModule.forRoot'un validate fonksiyonu
// olarak kullanılıyor: process.env eksik/bozuksa NestFactory.create() sırasında,
// app.listen()'a hiç ulaşmadan fail-fast crash eder — ilk HTTP isteğini beklemez.
// Ayrı bir config dosyası/framework açmıyoruz, birkaç alanlık bir Zod şeması yeterli.
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL tanımlı olmalı")
    .refine(
      (value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "postgres:" || protocol === "postgresql:";
        } catch {
          return false;
        }
      },
      { message: "DATABASE_URL geçerli bir postgres:// veya postgresql:// URL'si olmalı" },
    ),
  // Chunk 8: feed pagination cursor'ının HMAC imzası (bkz. feed/feed-cursor.ts).
  // Confidentiality değil tamper-detection hedefi — yine de zayıf/tahmin edilebilir
  // bir secret imzayı anlamsız kılar, bu yüzden minimum bir uzunluk zorunlu.
  FEED_CURSOR_SECRET: z.string().min(32, "FEED_CURSOR_SECRET en az 32 karakter olmalı"),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    DatabaseModule,
    UsersModule,
    VideosModule,
    QuizzesModule,
    WordsModule,
    FeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
