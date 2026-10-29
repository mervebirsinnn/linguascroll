import { Global, Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { FirebaseAuthGuard } from "./firebase-auth.guard";
import { FirebaseTokenVerifier } from "./firebase-token-verifier";

/**
 * @Global: guard, kullanıcıya ait endpoint'leri olan HER feature modülünde (feed, videos,
 * quizzes, words, subscriptions, users) `@UseGuards(FirebaseAuthGuard)` ile kullanılıyor;
 * Nest guard'ı o modülün injector'ında kurduğu için bağımlılıkları (verifier + UsersService)
 * her yerde çözülebilir olmalı. DatabaseModule ile aynı "uygulama geneli tek kaynak" gerekçesi.
 */
@Global()
@Module({
  imports: [UsersModule],
  providers: [FirebaseTokenVerifier, FirebaseAuthGuard],
  exports: [FirebaseTokenVerifier, FirebaseAuthGuard, UsersModule],
})
export class AuthModule {}
