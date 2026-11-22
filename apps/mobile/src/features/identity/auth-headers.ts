import { Platform } from "react-native";
import { CLIENT_PLATFORM_HEADER } from "@linguascroll/shared-types";
import { getIdToken } from "./auth-gateway";

/**
 * 2026-10-27 — kullanıcıya ait her backend isteğinin taşıdığı kimlik. Backend kimliği SADECE
 * bu token'dan çıkarır; istemci artık hiçbir istekte userId göndermiyor. Her çağrıda taze token
 * istenir (Firebase SDK önbellekliyor, süresi dolmak üzereyse yeniliyor) — bir component'in
 * elinde bayat bir token string'i tutmasına gerek yok. Generic bir fetch sarmalayıcısı DEĞİL:
 * sadece header üretir, her API dosyası kendi isteğini ve doğrulamasını yapmaya devam eder.
 *
 * 2026-11-22 — platforma göre abonelik kapısı: aynı yerden X-Client-Platform (ios/android) da gönderilir. Kullanıcıya ait
 * isteklerin hepsi buradan geçtiği için tek değişiklik yeterli. Bu bir yetki değil, sınıflandırmadır (bkz. shared-types
 * client-platform.ts); web gibi başka platformlarda gönderilmez, backend bunu "bilinmeyen platform" sayar.
 */
export type UserRequestHeaders = { Authorization: string; "X-Client-Platform"?: "ios" | "android" };

export function clientPlatformHeader(os: string): Pick<UserRequestHeaders, "X-Client-Platform"> {
  return os === "ios" || os === "android" ? { [CLIENT_PLATFORM_HEADER]: os } : {};
}

export async function authHeaders(): Promise<UserRequestHeaders> {
  return { Authorization: `Bearer ${await getIdToken()}`, ...clientPlatformHeader(Platform.OS) };
}
