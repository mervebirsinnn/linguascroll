import { BadRequestException, Injectable } from "@nestjs/common";
import { R2StorageService } from "./r2-storage.service";
import { uploadVideoResponseSchema, type UploadVideoRequest, type UploadVideoResponse } from "./upload-video.schema";

/**
 * Sadece "video/mp4" — controller'daki `FileInterceptor` boyut sınırını
 * (Multer seviyesinde, gövde hiç okunmadan) zaten uyguluyor; burası tipi
 * kontrol ediyor. `file.mimetype` client'ın gönderdiği bir header (multer
 * dosya içeriğini sniff etmiyor) — bu yüzden gerçek bir içerik doğrulaması
 * DEĞİL, sadece "aşikar yanlış tip"leri (örn. .txt) erkenden reddetmek için.
 * Daha derin bir doğrulama (gerçek codec/container kontrolü) bu chunk'ın
 * kapsamı dışında — STT pipeline zaten ffprobe ile kendi girdisini doğruluyor.
 */
const ALLOWED_MIME_TYPES = new Set(["video/mp4"]);

/**
 * Chunk 17 — MP4 upload → R2 → draft metadata. Kasıtlı olarak DB'ye HİÇBİR
 * SATIR YAZMIYOR (kullanıcı kararı): `videosTable`'da draft/status kavramı yok,
 * `VideosRepository.findVideos()` unconditional `SELECT *` (bkz. o dosya) — yani
 * oraya yazılan HER satır feed'de görünür olurdu. Bu chunk'ta "draft" kavramı
 * sadece bu response'un kendisi (R2'deki nesne + burada dönen metadata); kalıcı
 * bir content-draft tablosu, review workflow'u gerçekten ihtiyaç duyduğunda
 * ayrı bir chunk olarak eklenecek.
 */
@Injectable()
export class ContentAdminService {
  constructor(private readonly r2Storage: R2StorageService) {}

  async uploadDraftVideo(file: Express.Multer.File | undefined, body: UploadVideoRequest): Promise<UploadVideoResponse> {
    if (!file) {
      throw new BadRequestException('"file" alanı zorunlu (multipart/form-data, video/mp4).');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Desteklenmeyen dosya tipi: "${file.mimetype}" — sadece video/mp4 kabul edilir.`);
    }
    if (file.size === 0) {
      throw new BadRequestException("Yüklenen dosya boş.");
    }

    const { storageKey } = await this.r2Storage.uploadOriginalVideo({
      contentId: body.contentId,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    // title/topic/level burada BİLİNÇLİ OLARAK hiçbir yere yazılmıyor — sadece
    // ileride publish-content.ts'in ihtiyaç duyacağı şekli baştan doğrulamak
    // için kabul ediliyorlar (bkz. upload-video.schema.ts). Bir content-draft
    // tablosu eklendiğinde bu değerlerin kalıcı hale getirilmesi o chunk'ın işi.
    return uploadVideoResponseSchema.parse({
      contentId: body.contentId,
      storageKey,
      playbackUrl: this.r2Storage.buildPlaybackUrl(storageKey),
      originalFilename: file.originalname,
      sizeBytes: file.size,
    });
  }
}
