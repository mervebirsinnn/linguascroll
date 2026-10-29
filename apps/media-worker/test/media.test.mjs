import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../.test-dist/index.js';
const secret = 'test-only-secret-with-at-least-32-chars';
async function signed(path = '/video.mp4', expiry = Math.floor(Date.now()/1000)+300) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${path}:${expiry}`));
  return `https://media.example${path}?exp=${expiry}&sig=${Buffer.from(signature).toString('base64url')}`;
}
const object = { body: 'video', size: 5, httpEtag: 'etag', writeHttpMetadata:()=>{} };
const bucket = { get: async()=>object, head:async()=>object };
test('secret eksikken içerik hiçbir zaman açılmaz',async()=>{assert.equal((await worker.fetch(new Request('https://media.example/video.mp4'),{MEDIA_BUCKET:bucket})).status,503);});
test('geçerli imza oynatır; imzasız/değiştirilmiş/süresi dolmuş reddedilir', async()=>{
  const env={MEDIA_BUCKET:bucket,MEDIA_URL_SIGNING_SECRET:secret}; const url=await signed();
  assert.equal((await worker.fetch(new Request(url),env)).status,200);
  assert.equal((await worker.fetch(new Request('https://media.example/video.mp4'),env)).status,403);
  assert.equal((await worker.fetch(new Request(url.replace('/video.mp4','/other.mp4')),env)).status,403);
  assert.equal((await worker.fetch(new Request(await signed('/video.mp4',1)),env)).status,403);
});
test('koşullu R2 yanıtı body olmadan 304 döner',async()=>{
  // Gerçek R2 koşullu yanıtında body anahtarı hiç yoktur.
  const {body,...withoutBody}=object;
  assert.equal((await worker.fetch(new Request(await signed(),{headers:{"if-none-match":"etag"}}),{MEDIA_BUCKET:{get:async()=>withoutBody},MEDIA_URL_SIGNING_SECRET:secret})).status,304);
});

test('If-Match önkoşulu başarısızsa 304 yerine 412 döner',async()=>{
  const {body,...withoutBody}=object;
  assert.equal((await worker.fetch(new Request(await signed(),{headers:{'if-match':'different'}}),{MEDIA_BUCKET:{get:async()=>withoutBody},MEDIA_URL_SIGNING_SECRET:secret})).status,412);
});
