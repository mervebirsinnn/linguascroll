import { Controller, Post } from "@nestjs/common";
import type { AnonymousUser } from "@linguascroll/shared-types";
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
}
