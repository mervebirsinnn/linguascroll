import { Module } from "@nestjs/common";
import { ContentAdminController } from "./content-admin.controller";
import { ContentAdminService } from "./content-admin.service";
import { EnrichmentProcessingService } from "./enrichment-processing.service";
import { R2StorageService } from "./r2-storage.service";
import { SttProcessingService } from "./stt-processing.service";

@Module({
  controllers: [ContentAdminController],
  providers: [ContentAdminService, R2StorageService, SttProcessingService, EnrichmentProcessingService],
})
export class ContentAdminModule {}
