import { getIdToken } from "./auth-gateway";

/**
 * 2026-10-27 — kullanıcıya ait her backend isteğinin taşıdığı kimlik. Backend kimliği SADECE
 * bu token'dan çıkarır; istemci artık hiçbir istekte userId göndermiyor. Her çağrıda taze token
 * istenir (Firebase SDK önbellekliyor, süresi dolmak üzereyse yeniliyor) — bir component'in
 * elinde bayat bir token string'i tutmasına gerek yok. Generic bir fetch sarmalayıcısı DEĞİL:
 * sadece header üretir, her API dosyası kendi isteğini ve doğrulamasını yapmaya devam eder.
 */
export async function authHeaders(): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await getIdToken()}` };
}
