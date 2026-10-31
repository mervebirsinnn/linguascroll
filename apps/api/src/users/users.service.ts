import { ForbiddenException, Injectable } from "@nestjs/common";
import { UsersRepository } from "./users-repository";

/**
 * SQL/Drizzle bilmiyor. İki use-case: (1) doğrulanmış bir Firebase hesabını backend
 * kullanıcısına çözmek (bkz. auth/firebase-auth.guard.ts), (2) diğer feature'ların kendi
 * userId'lerini yazmadan önce varlık kontrolü. İkinci use-case bilinçli olarak burada —
 * VideosService/QuizzesService doğrudan UsersRepository'ye değil, bu service'e bağımlı
 * (feature'lar arası sınır repository değil, service seviyesinde).
 *
 * 2026-10-27 — `createAnonymousUser` KALDIRILDI: kimlik artık istemcinin uydurduğu/sakladığı
 * bir UUID değil, sunucunun doğruladığı Firebase token'ı.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async resolveFirebaseUser(firebaseUid: string): Promise<string> {
    const { id, deletedAt } = await this.usersRepository.findOrCreateByFirebaseUid(firebaseUid);
    if (deletedAt) throw new ForbiddenException("Hesap silme işlemi sürüyor");
    return id;
  }

  async beginDeletion(firebaseUid: string) { return this.usersRepository.beginDeletion(firebaseUid); }
  async finishDeletion(userId: string) { return this.usersRepository.finishDeletion(userId); }

  async userExists(userId: string): Promise<boolean> {
    return this.usersRepository.existsById(userId);
  }
}
