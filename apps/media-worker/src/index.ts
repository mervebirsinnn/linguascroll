export interface Env {
  MEDIA_BUCKET: R2Bucket;
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

    const url = new URL(request.url);
    // Baştaki "/" atılıyor: R2 object key'leri slash'sız saklanıyor
    // (ör. "originals/.../video.mp4"), URL path'i "/originals/.../video.mp4".
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
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
