import { Platform } from "react-native";

/**
 * 2026-11-20 — iOS yayını: abonelik metinlerindeki mağaza adı (iptal/yönetim/ödeme sorunu yönlendirmeleri).
 * Apple incelemesi, iOS uygulamasında "Google Play" geçen satın alma metinlerini reddeder; bu yüzden metinler
 * mağaza adını buradan alır. Tek sabit — platforma özel metin tabloları kurulmadı (yalnız ad değişiyor).
 */
export const STORE_NAME: "App Store" | "Google Play" = Platform.OS === "ios" ? "App Store" : "Google Play";
