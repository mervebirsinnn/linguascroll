// Tüm soruların "doğru şık en uzun olmamalı" ve oran kontrolünü TEK seferde listeler (build ilk hatada durur).
import { readdirSync } from 'node:fs';
const files = readdirSync(new URL('./claude-03/', import.meta.url)).filter((f) => /^(b1|b2|c1|c2)-.+\.mjs$/.test(f)).sort();
for (const f of files) {
  const { default: p } = await import(`./claude-03/${f}`);
  for (const q of p.questions) {
    const lens = q.options.map((o) => o.text.length);
    const c = q.options.find((o) => o.isCorrect).text.length;
    if (c >= Math.max(...lens) || Math.max(...lens) / Math.min(...lens) > 2.5) console.log(`${f} ${q.key}: doğru=${c} şıklar=${lens.join('/')}`);
  }
}
