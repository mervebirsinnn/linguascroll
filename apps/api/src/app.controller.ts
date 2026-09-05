import { Controller, Get } from "@nestjs/common";

/**
 * Minimal liveness endpoint: sadece süreç ayakta mı sorusuna cevap verir.
 * Bilinçli olarak DB/dependency health check YAPMIYOR — daha gelişmiş bir
 * readiness sistemi ileride deployment chunk'ında ele alınacak.
 */
@Controller()
export class AppController {
  @Get("health")
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}
