// Root cause fix (2. koşu) — ilk smoke koşusunda bir script bug'ı (URLSearchParams,
// bkz. api.js) her iterasyonu ~170ms'de patlatıp bitirmişti; iterasyonlar think-time
// sleep'lerine HİÇ ulaşamadığı için 70 saniyede 415 gerçek `users` satırı üretildi.
// Bu dosya, HANGİ script hatası olursa olsun bu sınıf bir kazayı (exception →
// anında yeni iterasyon → exception → ... sonsuz-hızlı döngü) YAPISAL olarak
// imkansız kılan tek, paylaşılan bir sarmalayıcı — her iki senaryo dosyası
// (read-only.js, full-journey.js) BUNU kullanıyor, kendi try/catch'ini icat etmiyor.
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import { MIN_ITERATION_COOLDOWN_S } from "./config.js";

/**
 * HTTP hatalarından (4xx/5xx — zaten `check()`/`http_req_failed` metriğiyle
 * görünür) AYRI, SCRIPT/runtime seviyesinde atılan exception'ları sayan özel
 * metrik — k6'nın end-of-run summary'sinde `script_exceptions` olarak görünür.
 * Bu ayrım kullanıcının açık talimatı: "HTTP failure ile script/runtime
 * exception ayrıştırılabilsin".
 */
export const scriptExceptions = new Counter("script_exceptions");

/**
 * Bir VU iterasyonunun TAMAMINI sarmalar. `journeyFn` içinde ATILAN her
 * exception burada YAKALANIR (iterasyon k6'ya "failed" olarak sızmaz, bu
 * kasıtlı — amaç crash-loop'u önlemek, k6'nın kendi VU'yu öldürmesini
 * beklemek değil) ve `scriptExceptions` sayacına eklenir. `finally` bloğu —
 * BAŞARILI olsun ya da olmasın — HER ZAMAN en az `MIN_ITERATION_COOLDOWN_S`
 * kadar uyur: bu, bir exception'ın iterasyon hızını sıfıra yaklaştırıp
 * kontrolsüz sayıda write üretmesini yapısal olarak engelleyen TEK mekanizma
 * (normal/başarılı bir iterasyonda zaten think-time sleep'leri bunu fazlasıyla
 * aşıyor — bu sadece bir taban/güvenlik ağı, normal akışı YAVAŞLATMIYOR).
 */
export function runIterationSafely(journeyFn) {
  try {
    journeyFn();
  } catch (err) {
    scriptExceptions.add(1);
    console.error(`[load-test] iteration script exception (HTTP hatası DEĞİL): ${err}`);
  } finally {
    sleep(MIN_ITERATION_COOLDOWN_S);
  }
}
