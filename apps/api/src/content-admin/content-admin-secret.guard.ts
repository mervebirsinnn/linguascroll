import { timingSafeEqual } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * `express`'in kendi `Request` tipini import ETMİYORUZ — bu repo'da (ve genel
 * olarak monorepo'da) `express`/`@types/express` DOĞRUDAN bir dependency değil
 * (sadece `@nestjs/platform-express`'in transitive'i), bu yüzden tip çözümlemesi
 * güvenilir değil. İhtiyacımız olan tek şey ham `headers` objesi — Node'un
 * `IncomingMessage.headers` şekli (Express de bunu aynen kullanır, header adları
 * küçük harfe normalize edilmiş olarak gelir).
 */
interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Deploy prep — content-admin/* internete açıldığında (Render) auth'suz kalmaması
 * için minimal bir paylaşılan-secret guard'ı. Sadece ContentAdminController'a
 * uygulanıyor (bkz. o dosyadaki `@UseGuards`) — feed/videos/quizzes/words/users gibi
 * mobile'ın kullandığı public endpoint'ler bundan hiç etkilenmiyor. Yeni bir
 * JWT/user-login sistemi DEĞİL: content-admin zaten "mobile'ın hiç bilmediği, dar/iç
 * bir endpoint" (bkz. content-admin.controller.ts) — tek bir sabit secret bu
 * tasarım niyetiyle orantılı.
 *
 * Fail-closed: CONTENT_ADMIN_SECRET tanımlı değilse (app.module.ts'teki envSchema'da
 * `.optional()` olduğu için boot'u engellemez) TÜM content-admin isteklerini
 * reddeder — "yapılandırılmamışsa açık kapı" değil, "yapılandırılmamışsa kilitli"
 * daha güvenli varsayılan.
 */
@Injectable()
export class ContentAdminSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService.get<string>("CONTENT_ADMIN_SECRET");
    if (!expectedSecret) {
      throw new UnauthorizedException("CONTENT_ADMIN_SECRET yapılandırılmamış — content-admin endpoint'leri devre dışı.");
    }

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const headerValue = request.headers["x-admin-secret"];
    const providedSecret = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!providedSecret || !this.secretsMatch(providedSecret, expectedSecret)) {
      throw new UnauthorizedException("Eksik veya geçersiz X-Admin-Secret header'ı.");
    }

    return true;
  }

  /**
   * `timingSafeEqual` FARKLI uzunluktaki buffer'larda kendisi throw eder — bu yüzden
   * uzunluk eşitliğini önce ELLE kontrol ediyoruz (kısa-devre `false`). Bu, gövde
   * içeriğini karakter karakter karşılaştırırken oluşan timing sızıntısını önlüyor;
   * SADECE uzunluk bilgisinin sızması (secret'ın kendisi değil, kaç karakter olduğu)
   * kabul edilebilir bir MVP ödünü.
   */
  private secretsMatch(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
