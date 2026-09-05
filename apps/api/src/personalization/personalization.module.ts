import { Module } from "@nestjs/common";
import { PersonalizationRepository } from "./personalization-repository";
import { PersonalizationService } from "./personalization.service";

@Module({
  providers: [PersonalizationService, PersonalizationRepository],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}
