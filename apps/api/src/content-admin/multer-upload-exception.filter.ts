import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from "@nestjs/common";
import { MulterError } from "multer";

/**
 * `@types/express` bağımlılık olarak eklenmedi — Express'in gerçek `Response`
 * tipi yerine burada sadece kullandığımız iki metodu tanımlayan minimal, yerel
 * bir arayüz yeterli (projede başka hiçbir dosya `express` tiplerini import
 * etmiyor, ilk kez burada gerekmesin diye ekstra bir dependency açmıyoruz).
 */
interface MinimalHttpResponse {
  status(code: number): { json(body: unknown): void };
}

/**
 * Chunk 17 — kullanıcı kararı: dosya boyutu sınırı Multer/busboy seviyesinde
 * (`FileInterceptor`'ın `limits.fileSize`'ı, bkz. content-admin.controller.ts)
 * uygulanıyor ki aşırı büyük bir dosya TAMAMEN okunmadan/işlenmeden erkenden
 * reddedilsin. Ama Multer, sınır aşıldığında Nest'in HTTP exception hiyerarşisine
 * ait olmayan kendi `MulterError`'ını fırlatıyor — bu, filtresiz bırakılırsa
 * Nest'in default exception filter'ından ham bir 500 olarak sızardı. Bu, o
 * MulterError'ı temiz bir 413'e çeviren, sadece bu controller'a scope'lu küçük
 * bir filter (global bir exception filter/middleware katmanı DEĞİL).
 */
@Catch(MulterError)
export class MulterUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<MinimalHttpResponse>();
    const mapped =
      exception.code === "LIMIT_FILE_SIZE"
        ? new PayloadTooLargeException("Yüklenen dosya izin verilen boyut sınırını aşıyor.")
        : new PayloadTooLargeException(exception.message);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}
