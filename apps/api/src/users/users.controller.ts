import { Controller, Get, UseGuards } from "@nestjs/common";
import { currentUserSchema, type CurrentUser } from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";

@Controller()
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  /**
   * 2026-10-27 — giriş yapmış kullanıcının sabit backend id'si. Mobile bunu RevenueCat App User
   * ID'si olarak kullanır (backend entitlement'ı aynı id ile sorgular). İlk çağrıda kullanıcı
   * satırı guard tarafından yaratılmış olur.
   *
   * `POST /users/anonymous` ve `GET /users/:userId/exists` KALDIRILDI: kimlik artık istemcinin
   * sakladığı bir UUID değil, doğrulanmış Firebase token'ı.
   */
  @Get("me")
  getCurrentUser(@AuthUserId() userId: string): CurrentUser {
    return currentUserSchema.parse({ userId });
  }
}
