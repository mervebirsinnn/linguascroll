// Chunk 11 — process-lifecycle.spec.ts'in "gerçek tree-kill" entegrasyon
// testi için sabit bir fixture. Gerçek whisper/ffmpeg DEĞİL — sadece "bir
// process kendi alt-process'ini spawn ediyor" gerçekliğini taklit eden, saf
// Node.js. `node spawn-tree.js <ownHeartbeatPath> <childHeartbeatPath>`
// çağrılır: kendi heartbeat dosyasını periyodik yazar VE ikinci bir Node
// process'i (grandchild) spawn edip ONUN heartbeat dosyasını yazmasını sağlar.
// Test, ana process'i (bu script) `killChildTree` ile öldürüp HER İKİ heartbeat
// dosyasının da durduğunu doğrular — sadece doğrudan child'ın değil, TÜM
// ağacın öldüğünü kanıtlamak için.
const { spawn } = require("node:child_process");
const fs = require("node:fs");

const [, , ownHeartbeatPath, childHeartbeatPath] = process.argv;

setInterval(() => {
  fs.appendFileSync(ownHeartbeatPath, ".");
}, 50);

const grandchildScript = `
setInterval(() => {
  require("node:fs").appendFileSync(${JSON.stringify(childHeartbeatPath)}, ".");
}, 50);
`;
spawn(process.execPath, ["-e", grandchildScript], { stdio: "ignore" });

// Bu process kendi kendine asla bitmez — sadece dıştan (test'in killChildTree
// çağrısıyla) sonlandırılır.
