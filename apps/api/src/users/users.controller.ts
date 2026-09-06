import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import type { AnonymousUser, UserExistsResponse } from "@linguascroll/shared-types";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Body yok — sadece opak bir anonymous identity yaratır. Nest'in @Post()
  // varsayılanı olan 201 (Created) burada semantik olarak doğru: bu endpoint
  // gerçekten yeni bir kaynak (users satırı) yaratıyor.
  @Post("anonymous")
  createAnonymousUser(): Promise<AnonymousUser> {
    return this.usersService.createAnonymousUser();
  }

  /**
   * Mobile'ın AsyncStorage'da SAKLI bir anonymousUserId'yi güvenle yeniden
   * kullanıp kullanamayacağını sormasi için (bkz. use-anonymous-user-id.ts) —
   * bir DB reset'i (dev/test) sonrası "hayalet" bir id'nin her feed isteğinde
   * sessizce 400 üretmesi yerine, bootstrap anında AÇIKÇA tespit edilebilsin.
   * `userExists` zaten var olan, başka feature'ların da kullandığı service
   * metodu — burada sadece HTTP'ye açılıyor, yeni bir iş kuralı YOK.
   */
  @Get(":userId/exists")
  async checkUserExists(@Param("userId", new ParseUUIDPipe()) userId: string): Promise<UserExistsResponse> {
    const exists = await this.usersService.userExists(userId);
    return { exists };
  }
}
