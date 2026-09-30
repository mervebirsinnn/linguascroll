#!/usr/bin/env node
// Node.js yardımcı script'i (k6 script'i DEĞİL — bu yüzden lib/ altında ama
// k6 runtime'ında ÇALIŞMAZ, `node` ile çalıştırılır). k6'nın `--out json=`
// çıktısı (NDJSON — her satır bir metrik noktası) `http_req_duration`
// metriğini her isteğin `tags.endpoint`/`tags.status` bilgisiyle birlikte
// taşıyor. k6'nın kendi text summary'si tag bazında kırılım VERMEDİĞİ için
// (bkz. README), 10-user gibi çok-iterasyonlu koşularda "endpoint bazında
// gerçek p50/p95/p99/count" sorusuna cevap vermenin YEGANE yolu bu —
// read-only.js/full-journey.js'in KENDİSİ değişmedi, bu sadece zaten var
// olan `tags` verisini okuyan, AYRI bir post-processing aracı.
//
// Kullanım: node lib/analyze-json-output.js <k6-json-output-dosyası>
import { readFileSync } from "node:fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Kullanım: node analyze-json-output.js <k6-out-json-dosyası>");
  process.exit(1);
}

const lines = readFileSync(filePath, "utf-8").split("\n").filter(Boolean);

/** endpoint -> { durations: number[], statuses: Map<status, count>, failed: number } */
const byEndpoint = new Map();
let totalHttpReqs = 0;
let firstTs = null;
let lastTs = null;

for (const line of lines) {
  let point;
  try {
    point = JSON.parse(line);
  } catch {
    continue;
  }
  if (point.type !== "Point" || point.metric !== "http_req_duration") {
    continue;
  }
  const tags = point.data.tags || {};
  const endpoint = tags.endpoint || "(untagged)";
  const status = tags.status || "?";
  const value = point.data.value;
  const ts = new Date(point.data.time).getTime();
  if (firstTs === null || ts < firstTs) firstTs = ts;
  if (lastTs === null || ts > lastTs) lastTs = ts;

  if (!byEndpoint.has(endpoint)) {
    byEndpoint.set(endpoint, { durations: [], statuses: new Map() });
  }
  const bucket = byEndpoint.get(endpoint);
  bucket.durations.push(value);
  bucket.statuses.set(status, (bucket.statuses.get(status) || 0) + 1);
  totalHttpReqs++;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function fmt(ms) {
  return `${ms.toFixed(2)}ms`;
}

console.log(`\nToplam http_req_duration örneği: ${totalHttpReqs}`);
if (firstTs !== null && lastTs !== null) {
  console.log(`Zaman aralığı: ${((lastTs - firstTs) / 1000).toFixed(1)}s\n`);
}

const rows = [...byEndpoint.entries()].sort((a, b) => b[1].durations.length - a[1].durations.length);

for (const [endpoint, bucket] of rows) {
  const sorted = [...bucket.durations].sort((a, b) => a - b);
  const count = sorted.length;
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const max = sorted[sorted.length - 1];
  const statusStr = [...bucket.statuses.entries()].map(([s, c]) => `${s}:${c}`).join(", ");
  console.log(
    `${endpoint.padEnd(18)} count=${String(count).padEnd(5)} p50=${fmt(p50).padEnd(10)} p95=${fmt(p95).padEnd(10)} p99=${fmt(p99).padEnd(10)} max=${fmt(max).padEnd(10)} statuses=[${statusStr}]`,
  );
}
console.log("");
