export interface Env {
  MEDIA_BUCKET: R2Bucket;
  /** API ile aynı secret; eksikse medya hiçbir koşulda herkese açılmaz. */
  MEDIA_URL_SIGNING_SECRET?: string;
}

/**
 * apps/api/src/videos/signed-media-url.ts ile BİREBİR aynı algoritma: HMAC-SHA256,
 * girdi `${pathname}:${exp}`, imza base64url, pathname HAM (decode edilmemiş) path.
 * Ayrı deploy birimi olduğu için ortak paket yok — birini değiştiren diğerini de değiştirmeli.
 * `crypto.subtle.verify` karşılaştırmayı sabit zamanda yapar.
 */
async function hasValidSignature(url: URL, secret: string): Promise<boolean> {
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) * 1000 <= Date.now()) {
    return false;
  }
  let signature: Uint8Array;
  try {
    const base64 = sig.replace(/-/g, "+").replace(/_/g, "/");
    signature = Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(`${url.pathname}:${exp}`));
}

// Chunk 17 — read-only R2 playback proxy. r2.dev public dev subdomain'i
// bazı ağlarda TLS handshake sırasında connection reset veriyordu; bu Worker
// aynı `linguascroll-videos` bucket'ını kendi workers.dev subdomain'i
// üzerinden serve ederek r2.dev'i tamamen bypass eder.
//
// Kasıtlı olarak minimal: tek dosya, framework yok, routing kütüphanesi yok.
// R2StorageService.buildPlaybackUrl() sadece storageKey'i base URL'e join
// ediyor (bkz. o dosya) — yani bu Worker'ın path'i doğrudan object key'in
// kendisi, ek bir prefix/route şeması icat etmiyoruz.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    if (!env.MEDIA_URL_SIGNING_SECRET || env.MEDIA_URL_SIGNING_SECRET.length < 32) {
      return new Response("Media unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const url = new URL(request.url);
    // 2026-10-27 — ücretsiz hak kontrolü API'de; worker sadece API'nin verdiği kısa ömürlü
    // imzayı doğruluyor. Geçersizse 403 (hangi kontrolün tutmadığı sızdırılmaz).
    if (!(await hasValidSignature(url, env.MEDIA_URL_SIGNING_SECRET))) {
      return new Response("Forbidden", { status: 403 });
    }
    // Baştaki "/" atılıyor: R2 object key'leri slash'sız saklanıyor
    // (ör. "originals/.../video.mp4"), URL path'i "/originals/.../video.mp4".
    let key: string;
    try { key = decodeURIComponent(url.pathname.replace(/^\/+/, "")); }
    catch { return new Response("Bad Request", { status: 400 }); }
    if (!key) {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method === "HEAD") {
      const object = await env.MEDIA_BUCKET.head(key);
      if (object === null) {
        return new Response(null, { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("accept-ranges", "bytes");
      headers.set("content-length", String(object.size));
      return new Response(null, { status: 200, headers });
    }

    // GET — Range header'ı doğrudan R2'ye devrediyoruz; R2 kendi range
    // parse'ını yapıp yalnızca istenen byte aralığını okuyor (MP4
    // seek/scrubbing için gereken davranış budur).
    const object = await env.MEDIA_BUCKET.get(key, {
      range: request.headers,
      onlyIf: request.headers,
    });

    if (object === null) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("accept-ranges", "bytes");

    // R2 koşullu GET, body olmadan dönüyorsa 304; olmayan body'yi MP4 gibi sunma.
    headers.set("cache-control", "private, no-store");
    if (!("body" in object)) return new Response(null, { status: 304, headers });
    const range = object.range;
    if (range) {
      const offset = "offset" in range && range.offset !== undefined ? range.offset : 0;
      const length =
        "length" in range && range.length !== undefined ? range.length : object.size - offset;
      const end = offset + length - 1;
      headers.set("content-range", `bytes ${offset}-${end}/${object.size}`);
      headers.set("content-length", String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  },
};
