import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Claude parti 02 (pilot): her seviyeden bir özgün metin. Kullanım: node build-claude-02.mjs [B1 B2 C1 C2]
const levels = ['B1', 'B2', 'C1', 'C2'];
const limits = { B1: [130, 190, 2, 3], B2: [180, 260, 3, 3], C1: [250, 350, 3, 4], C2: [300, 400, 4, 5] };
const only = process.argv.slice(2).map((l) => l.toUpperCase());
const packs = [];
const files = readdirSync(new URL('./claude-02/', import.meta.url)).filter((f) => /^(b1|b2|c1|c2)(-.+)?\.mjs$/.test(f)).sort();
const seenSlugs = new Set();
const seenOrders = new Set();
let failures = 0;
for (const file of files) {
  const level = file.slice(0, 2).toUpperCase();
  if (only.length && !only.includes(level) && !only.includes(file.replace('.mjs', '').toUpperCase())) continue;
  let pack;
  try { ({ default: pack } = await import(`./claude-02/${file}`)); } catch (e) { console.log(`HATA ${file}: ${e.message}`); failures++; continue; }
  try {
  assert.ok(!seenSlugs.has(pack.slug), `slug tekrarı: ${pack.slug}`);
  seenSlugs.add(pack.slug);
  assert.ok(!seenOrders.has(`${level}:${pack.sortOrder}`), `${level}: sortOrder tekrarı ${pack.sortOrder}`);
  seenOrders.add(`${level}:${pack.sortOrder}`);
  assert.ok(pack.slug.startsWith(`${level.toLowerCase()}-`), `slug seviyeyle başlamalı: ${pack.slug}`);
  if (/^(b1|b2|c1|c2)-.+\.mjs$/.test(file)) {
    // Doğru şık konumları dengesi: soru başına döndürme (rotasyon) ile; slug'dan türetilen sabit bir permütasyon kullanılır (deterministik).
    const seed = [...pack.slug].reduce((n, c) => n + c.charCodeAt(0), 0);
    const perms = [[0, 2, 1, 3], [1, 3, 0, 2], [2, 0, 3, 1], [3, 1, 2, 0]];
    const targets = perms[seed % 4];
    pack.questions.forEach((q, qi) => {
      const at = q.options.findIndex((o) => o.isCorrect);
      const shift = (targets[qi] - at + 4) % 4;
      const rotated = q.options.map((_, i) => q.options[(i - shift + 4) % 4]);
      q.options = rotated.map((o, i) => ({ ...o, key: `o${i + 1}` }));
    });
  }
  assert.equal(pack.level, level);
  assert.ok(pack.sortOrder >= 1 && pack.sortOrder <= 99, 'Claude sortOrder 1-99');
  assert.equal(pack.isFreeSample, false);
  assert.equal(pack.editorial.original, true);
  assert.ok(pack.editorial.sources.length > 0);
  const count = pack.paragraphs.join(' ').split(/\s+/).length;
  const [min, max, minP, maxP] = limits[level];
  assert.ok(count >= min && count <= max, `${level}: ${count} kelime, beklenen ${min}-${max}`);
  assert.ok(pack.paragraphs.length >= minP && pack.paragraphs.length <= maxP, `${level}: ${pack.paragraphs.length} paragraf`);
  assert.deepEqual(pack.questions.map((q) => q.type), ['main-idea', 'detail', 'vocabulary', 'inference']);
  const spans = pack.words.flatMap((w) => w.spans);
  for (const s of spans) assert.equal(pack.paragraphs[s.paragraphIndex].slice(s.start, s.end), s.surface);
  pack.paragraphs.forEach((p, pi) => {
    for (const m of p.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)) {
      assert.equal(spans.filter((s) => s.paragraphIndex === pi && s.start <= m.index && s.end >= m.index + m[0].length).length, 1, `${pack.slug}: kapsama ${m[0]}`);
    }
  });
  const positions = [];
  for (const q of pack.questions) {
    assert.equal(q.options.length, 4);
    const correct = q.options.filter((o) => o.isCorrect);
    assert.equal(correct.length, 1, `${pack.slug}/${q.key}: tek doğru`);
    const lens = q.options.map((o) => o.text.length);
    assert.ok(correct[0].text.length < Math.max(...lens), `${pack.slug}/${q.key}: doğru şık en uzun`);
    assert.ok(Math.max(...lens) / Math.min(...lens) <= 2.5, `${pack.slug}/${q.key}: şık uzunluk oranı`);
    for (const o of q.options) {
      assert.ok(o.explanation?.trim(), `${pack.slug}/${q.key}/${o.key}: açıklama`);
      if (!o.isCorrect) assert.ok(o.trapType, `${pack.slug}/${q.key}/${o.key}: trapType`);
      if (o.isCorrect) assert.ok(!/\b(always|all|never|only)\b/i.test(o.text), `${pack.slug}: doğru şıkta mutlak ifade`);
    }
    positions.push(q.options.findIndex((o) => o.isCorrect));
  }
  for (let p = 0; p < 4; p++) assert.ok(positions.filter((x) => x === p).length <= 2, `${pack.slug}: doğru şık konumu ${positions}`);
  packs.push(pack);
  } catch (e) { console.log(`HATA ${file}: ${e.message.split(String.fromCharCode(10))[0]}`); failures++; }
}
if (failures) { console.log(`${failures} dosya hatalı; paket yazılmadı`); process.exit(1); }
mkdirSync(new URL('./packs/', import.meta.url), { recursive: true });
for (const pack of packs) {
  const target = new URL(`./packs/${pack.slug}.json`, import.meta.url);
  writeFileSync(target, JSON.stringify(pack, null, 2) + '\n');
  console.log(`${pack.slug} (${pack.level}): ${pack.paragraphs.join(' ').split(/\s+/).length} kelime; ${pack.words.reduce((n, w) => n + w.spans.length, 0)} span; doğru konumları ${pack.questions.map((q) => q.options.findIndex((o) => o.isCorrect)).join(',')}`);
}
