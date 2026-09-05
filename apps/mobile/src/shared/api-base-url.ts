// EXPO_PUBLIC_ önekli değişkenler Expo tarafından build zamanında process.env'e
// gömülür (bkz. apps/mobile/.env.example). localhost fallback'i sadece web/simulator
// için işe yarar; fiziksel cihazda .env'de gerçek bir LAN IP'si tanımlı olmalı.
// features/feed VE features/identity aynı base URL'e ihtiyaç duyduğu için (birden
// fazla gerçek tüketici, artık tek bir feature'a özgü değil) burada, app-seviyesinde
// tek yerde tanımlanıyor — genel bir config katmanı değil, tek bir sabit.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
