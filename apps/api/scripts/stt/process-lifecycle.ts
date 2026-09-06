import { spawnSync } from "node:child_process";
import type { EventEmitter } from "node:events";

/**
 * Chunk 11 — subprocess cleanup için KÜÇÜK, SOMUT bir birim (generic bir
 * ProcessManager interface/factory DEĞİL). `child`/`signalSource` parametre
 * olarak geliyor ki unit testler gerçek Jest process'ine SIGINT göndermeden
 * (bu kararsız/tehlikeli olurdu), sahte bir child + sahte bir EventEmitter ile
 * bu mantığı doğrulayabilsin (bkz. process-lifecycle.spec.ts). Gerçek
 * production kullanımı (run-stt-pipeline.ts) gerçek `process`'i geçirir.
 */
export type KillableChild = {
  pid?: number;
  kill(signal?: NodeJS.Signals): boolean;
};

/**
 * Windows'ta Node'un `child.kill()`'i SADECE doğrudan child'ı sonlandırır —
 * child'ın kendi spawn ettiği bir alt-process (örn. transcribe.py'nin
 * çağırdığı ffmpeg/whisper) miras alınan bir process group olmadan hayatta
 * kalabilir (orphan). `taskkill /T` TÜM ağacı sonlandırır. POSIX'te SIGTERM
 * yeterli kabul ediliyor (bu repo'nun geliştirme ortamı Windows olduğu için
 * Windows yolu gerçek bir entegrasyon testiyle doğrulanıyor, bkz.
 * process-lifecycle.spec.ts — POSIX yolu doğrulanmadı, dokümante edilmiş bir
 * varsayım).
 */
export function killChildTree(child: KillableChild, platform: NodeJS.Platform = process.platform): void {
  if (platform === "win32" && child.pid !== undefined) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    return;
  }
  child.kill("SIGTERM");
}

/**
 * `signalSource`'ta SIGINT/SIGTERM dinler, tetiklenince `killChildTree` çağırır.
 * Dönen fonksiyon dinleyicileri kaldırır (child normal bitince çağrılmalı —
 * aksi halde sonraki bir sinyal, artık var olmayan bir child'ı hedeflemeye
 * çalışır).
 */
export function forwardTerminationSignals(
  child: KillableChild,
  signalSource: Pick<EventEmitter, "on" | "off">,
  platform: NodeJS.Platform = process.platform,
): () => void {
  const handler = () => killChildTree(child, platform);
  signalSource.on("SIGINT", handler);
  signalSource.on("SIGTERM", handler);
  return () => {
    signalSource.off("SIGINT", handler);
    signalSource.off("SIGTERM", handler);
  };
}
