import { Injectable } from "@nestjs/common";
import { anonymousUserSchema, type AnonymousUser } from "@linguascroll/shared-types";
import { UsersRepository } from "./users-repository";

/**
 * SQL/Drizzle bilmiyor. İki use-case: (1) yeni bir anonymous identity yaratmak,
 * (2) diğer feature'ların (video watch-events, quiz answer-events) kendi
 * external-input userId'sini yazmadan önce doğrulayabilmesi için varlık kontrolü.
 * Bu ikinci use-case bilinçli olarak burada — VideosService/QuizzesService
 * doğrudan UsersRepository'ye değil, bu service'e bağımlı (feature'lar arası
 * sınır repository değil, service seviyesinde).
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createAnonymousUser(): Promise<AnonymousUser> {
    const user = await this.usersRepository.create();
    return anonymousUserSchema.parse(user);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.usersRepository.existsById(userId);
  }
}
