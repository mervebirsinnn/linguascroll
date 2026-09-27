import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ContentAdminSecretGuard } from "./content-admin-secret.guard";

function createExecutionContext(headerValue: string | undefined): ExecutionContext {
  const request = { headers: { "x-admin-secret": headerValue } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createConfigService(secret: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

describe("ContentAdminSecretGuard", () => {
  const REAL_SECRET = "correct-horse-battery-staple";

  it("CONTENT_ADMIN_SECRET yapılandırılmamışsa (env'de tanımsız) isteği reddeder — fail-closed", () => {
    const guard = new ContentAdminSecretGuard(createConfigService(undefined));
    const context = createExecutionContext(REAL_SECRET);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("X-Admin-Secret header'ı hiç gönderilmemişse reddeder", () => {
    const guard = new ContentAdminSecretGuard(createConfigService(REAL_SECRET));
    const context = createExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("yanlış bir secret'ı reddeder", () => {
    const guard = new ContentAdminSecretGuard(createConfigService(REAL_SECRET));
    const context = createExecutionContext("wrong-secret");

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("uzunluğu farklı (ve dolayısıyla kesin yanlış) bir secret'ı timingSafeEqual'a hiç göndermeden güvenle reddeder", () => {
    const guard = new ContentAdminSecretGuard(createConfigService(REAL_SECRET));
    const context = createExecutionContext("short");

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("doğru secret'ı kabul eder", () => {
    const guard = new ContentAdminSecretGuard(createConfigService(REAL_SECRET));
    const context = createExecutionContext(REAL_SECRET);

    expect(guard.canActivate(context)).toBe(true);
  });
});
