import { Controller, Delete, Headers, HttpCode, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { FirebaseTokenVerifier } from "./firebase-token-verifier";

/** Normal guard kullanıcı yaratır; silme tekrarında yaratmadan, taze token ile idempotent temizlenir. */
@Controller("account")
export class AccountDeletionController {
  constructor(private readonly verifier: FirebaseTokenVerifier, private readonly users: UsersService) {}
  @Delete()
  @HttpCode(204)
  async delete(@Headers("authorization") authorization?: string): Promise<void> {
    const token = authorization && /^Bearer\s+(\S+)$/.exec(authorization)?.[1];
    if (!token) throw new UnauthorizedException("Oturum gerekli");
    const uid = await this.verifier.verifyDeletionToken(token);
    const id = await this.users.beginDeletion(uid);
    // Firebase geçici hata verirse işaretli kayıt kalır; aynı taze token ile DELETE tekrar edilebilir.
    await this.verifier.deleteFirebaseUser(uid);
    if (id) await this.users.finishDeletion(id);
  }
}
