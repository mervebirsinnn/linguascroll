/**
 * Yayın (release) bayrakları. Repo'daki mevcut desen: her EXPO_PUBLIC_ env'i okuyan TEK bir modül (bkz. api-base-url.ts,
 * revenuecat-config.ts); ayrı bir bayrak/config çerçevesi yok, burada da eklenmedi.
 *
 * EXPO_PUBLIC_ değişkenleri build/bundle ZAMANINDA gömülür: değeri değiştirmek YENİ bir build (ya da bu env ile yeniden üretilmiş bir
 * JS güncellemesi) gerektirir; yayındaki bir uygulamada çalışma zamanında açılıp kapatılamaz. Bu bayrak yalnız GİRİŞİ gizler: API
 * erişim kontrolünün (abonelik/kilit, kimlik) yerine GEÇMEZ — endpoint'ler backend'de zaten bağımsız olarak korunur.
 */

/** Yalnız "true" (büyük/küçük harf ve boşluk önemsiz) açık sayılır; tanımsız/boş/diğer her şey KAPALI (güvenli varsayılan). */
export function parseFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Okuma / Paragraf Pratiği girişi. VARSAYILAN KAPALI: backend migration'ları (0020–0022) ve içerik hazır olmadan yayımlanmasın.
 * Geliştirme/testte açmak için `.env` içine EXPO_PUBLIC_PASSAGES_ENABLED=true yaz (Expo'yu yeniden başlat).
 */
export const PASSAGES_ENABLED: boolean = parseFlag(process.env.EXPO_PUBLIC_PASSAGES_ENABLED);

/** Bayrak kapalıysa giriş eylemi HİÇ verilmez (Feed buton çizmez); açıksa verilen eylem aynen döner. */
export function gatedEntry(enabled: boolean, open: () => void): (() => void) | undefined {
  return enabled ? open : undefined;
}

/** Bayrak kapalıyken `mode` yanlışlıkla 'passages' olsa bile ekran çizilmez (ikinci savunma). */
export function shouldRenderPassages(enabled: boolean, mode: string): boolean {
  return enabled && mode === "passages";
}
