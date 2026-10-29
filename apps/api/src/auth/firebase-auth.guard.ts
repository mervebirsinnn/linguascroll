import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { FirebaseTokenVerifier } from "./firebase-token-verifier";

/**
 * request-logging.middleware.ts ile AYNI gerekçe: express tipleri doğrudan dependency değil.
 * `authUserId` guard'ın doğrulanmış token'dan çözdüğü backend kullanıcı id'si.
 */
interface AuthenticatedRequestLike {
  headers: Record<string, string | string[] | undefined>;
  authUserId?: string;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/;

/**
 * 2026-10-27 — kullanıcıya ait TÜM endpoint'lerin kimlik kaynağı. `Authorization: Bearer
 * <Firebase ID token>` doğrulanır (bkz. FirebaseTokenVerifier), Firebase UID backend
 * kullanıcısına çözülür (ilk girişte yaratılır) ve request'e yazılır. İstemcinin gönderdiği
 * hiçbir userId (query/body/path) artık yetki kaynağı DEĞİL — controller'lar kimliği sadece
 * `@AuthUserId()` ile buradan alır.
 *
 * Global APP_GUARD değil: /health, /media (kendi imza kontrolü) ve content-admin (kendi secret
 * guard'ı) bu kimliği kullanmıyor — guard, kullanıcıya ait controller'lara açıkça konuyor.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly tokenVerifier: FirebaseTokenVerifier,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequestLike>();
    const header = request.headers.authorization;
    const token = typeof header === "string" ? BEARER_PATTERN.exec(header)?.[1] : undefined;
    if (!token) {
      throw new UnauthorizedException("Oturum gerekli");
    }

    const firebaseUid = await this.tokenVerifier.verify(token);
    if (firebaseUid === null) {
      // Hangi kontrolün (imza/süre/issuer/audience) tutmadığı istemciye sızdırılmaz.
      throw new UnauthorizedException("Oturum geçersiz ya da süresi dolmuş");
    }

    request.authUserId = await this.usersService.resolveFirebaseUser(firebaseUid);
    return true;
  }
}

/**
 * Controller parametresi: guard'ın doğruladığı backend kullanıcı id'si. Guard'sız bir
 * route'ta kullanılırsa sessizce undefined dönmek yerine patlar (programlama hatası).
 */
export const AuthUserId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const { authUserId } = context.switchToHttp().getRequest<AuthenticatedRequestLike>();
  if (!authUserId) {
    throw new Error("AuthUserId, FirebaseAuthGuard olmayan bir route'ta kullanıldı");
  }
  return authUserId;
});
