import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { forwardTerminationSignals, killChildTree, type KillableChild } from "./process-lifecycle";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bir dosyanın boyutunun sıfırın üstüne çıkmasını (heartbeat yazımının gerçekten başladığını) polling ile bekler. */
async function waitUntilGrows(filePath: string, timeoutMs: number): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const size = fs.statSync(filePath).size;
    if (size > 0) {
      return size;
    }
    await delay(50);
  }
  return fs.statSync(filePath).size;
}

/**
 * Bu blok GERÇEK Jest process'ine ASLA sinyal göndermiyor — `signalSource`
 * her zaman izole bir `EventEmitter` instance'ı, `process`'in kendisi değil
 * (kararsız/tehlikeli test'ten kaçınma — bkz. process-lifecycle.ts yorumu).
 */
describe("forwardTerminationSignals — fake child + izole signal source", () => {
  function makeFakeChild(): { child: KillableChild; killedSignals: (NodeJS.Signals | undefined)[] } {
    const killedSignals: (NodeJS.Signals | undefined)[] = [];
    const child: KillableChild = {
      pid: 4242,
      kill: (signal) => {
        killedSignals.push(signal);
        return true;
      },
    };
    return { child, killedSignals };
  }

  it("izole signalSource SIGINT emit edince child sonlandırılır (linux dalı)", () => {
    const { child, killedSignals } = makeFakeChild();
    const signalSource = new EventEmitter();

    forwardTerminationSignals(child, signalSource, "linux");
    signalSource.emit("SIGINT");

    expect(killedSignals).toEqual(["SIGTERM"]);
  });

  it("izole signalSource SIGTERM emit edince de sonlandırılır", () => {
    const { child, killedSignals } = makeFakeChild();
    const signalSource = new EventEmitter();

    forwardTerminationSignals(child, signalSource, "linux");
    signalSource.emit("SIGTERM");

    expect(killedSignals).toEqual(["SIGTERM"]);
  });

  it("dönen cleanup fonksiyonu çağrılınca dinleyiciler kaldırılır — sonraki emit hiçbir şey tetiklemez", () => {
    const { child, killedSignals } = makeFakeChild();
    const signalSource = new EventEmitter();

    const stopForwarding = forwardTerminationSignals(child, signalSource, "linux");
    stopForwarding();
    signalSource.emit("SIGINT");

    expect(killedSignals).toEqual([]);
  });
});

describe("killChildTree — platform dallanması (fake child, gerçek OS çağrısı yok)", () => {
  it("POSIX'te doğrudan child.kill('SIGTERM') çağrılır", () => {
    const killedSignals: (NodeJS.Signals | undefined)[] = [];
    const child: KillableChild = { pid: 123, kill: (s) => (killedSignals.push(s), true) };

    killChildTree(child, "linux");

    expect(killedSignals).toEqual(["SIGTERM"]);
  });

  it("win32'de child.kill() DOĞRUDAN çağrılmaz — taskkill /T üzerinden gidilir", () => {
    const kill = jest.fn();
    const child: KillableChild = { pid: 999999, kill };

    killChildTree(child, "win32");

    expect(kill).not.toHaveBeenCalled();
  });
});

describe("killChildTree — GERÇEK entegrasyon: tüm process ağacı sonlanıyor mu (Windows)", () => {
  it("bir process + onun spawn ettiği grandchild, killChildTree(parent,'win32') sonrası İKİSİ DE duruyor", async () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ownHeartbeat = path.join(os.tmpdir(), `linguascroll-stt-test-own-${runId}.txt`);
    const childHeartbeat = path.join(os.tmpdir(), `linguascroll-stt-test-child-${runId}.txt`);
    fs.writeFileSync(ownHeartbeat, "");
    fs.writeFileSync(childHeartbeat, "");

    const fixturePath = path.join(__dirname, "test-fixtures", "spawn-tree.js");
    // execFile/spawn ARGÜMAN DİZİSİ ile — hiçbir path shell string'ine
    // birleştirilmiyor (Windows'ta boşluklu path'ler dahil güvenli).
    const proc = spawn(process.execPath, [fixturePath, ownHeartbeat, childHeartbeat], { stdio: "ignore" });

    try {
      // Her iki heartbeat'in de GERÇEKTEN artmaya başladığını doğrula (yarış
      // koşulunu önlemek için) — bu, "kill çalıştı" iddiasının anlamlı bir
      // temeli olduğunu garanti eder. Windows'ta ikinci bir node process'inin
      // (grandchild) spawn+ilk çalışma gecikmesi belirgin olabiliyor, bu yüzden
      // cömert bir bekleme + polling kullanılıyor (sabit kısa bir delay yerine).
      const ownSizeBeforeKill = await waitUntilGrows(ownHeartbeat, 3000);
      const childSizeBeforeKill = await waitUntilGrows(childHeartbeat, 3000);
      expect(ownSizeBeforeKill).toBeGreaterThan(0);
      expect(childSizeBeforeKill).toBeGreaterThan(0);

      const exited = new Promise<void>((resolve) => proc.once("exit", () => resolve()));
      killChildTree({ pid: proc.pid, kill: (s) => proc.kill(s) }, "win32");
      await exited;

      // Kill sonrası bir süre bekleyip heartbeat dosyalarının artık
      // BÜYÜMEDİĞİNİ doğrula — grandchild (ffmpeg/whisper analogu) da
      // gerçekten ölmüş, sadece doğrudan child değil.
      const ownSizeRightAfterKill = fs.statSync(ownHeartbeat).size;
      const childSizeRightAfterKill = fs.statSync(childHeartbeat).size;
      await delay(500);
      const ownSizeLater = fs.statSync(ownHeartbeat).size;
      const childSizeLater = fs.statSync(childHeartbeat).size;

      expect(ownSizeLater).toBe(ownSizeRightAfterKill);
      expect(childSizeLater).toBe(childSizeRightAfterKill);
    } finally {
      try {
        proc.kill("SIGKILL");
      } catch {
        // zaten ölü olabilir
      }
      fs.rmSync(ownHeartbeat, { force: true });
      fs.rmSync(childHeartbeat, { force: true });
    }
  }, 20000);
});
