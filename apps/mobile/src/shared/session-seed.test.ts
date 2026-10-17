import { getRandomValues } from "expo-crypto";
import { generateSessionSeed, getSessionSeed, SessionSeedError } from "./session-seed";

jest.mock("expo-crypto", () => ({ getRandomValues: jest.fn() }));

const mockedGetRandomValues = getRandomValues as unknown as jest.Mock;
const SEED_PATTERN = /^[0-9a-f]{32}$/;

/** Her çağrıda FARKLI baytlar dolduran kontrollü sahte CSPRNG. */
function installCountingRandom(): void {
  let counter = 0;
  mockedGetRandomValues.mockImplementation((array: Uint8Array) => {
    counter += 1;
    array.forEach((_, i) => (array[i] = (counter * 31 + i * 7) % 256));
    return array;
  });
}

beforeEach(() => {
  mockedGetRandomValues.mockReset();
  installCountingRandom();
});

describe("session-seed (expo-crypto)", () => {
  it("expo-crypto'dan TAM 16 baytlık Uint8Array ister ve 32 küçük harf hex üretir", () => {
    const seed = generateSessionSeed();
    expect(mockedGetRandomValues).toHaveBeenCalledTimes(1);
    const [array] = mockedGetRandomValues.mock.calls[0] as [Uint8Array];
    expect(array).toBeInstanceOf(Uint8Array);
    expect(array.length).toBe(16);
    expect(seed).toMatch(SEED_PATTERN);
  });

  it("baytları sıfır dolgulu küçük harf hex'e çevirir (0x00, 0x0f, 0xff, 0xab)", () => {
    mockedGetRandomValues.mockImplementation((array: Uint8Array) => {
      array.set([0x00, 0x0f, 0xff, 0xab], 0);
      return array;
    });
    expect(generateSessionSeed()).toBe("000fffab" + "00".repeat(12));
  });

  it("Math.random KULLANMAZ", () => {
    const random = jest.spyOn(Math, "random");
    generateSessionSeed();
    const calls = random.mock.calls.length;
    random.mockRestore();
    expect(calls).toBe(0);
  });

  it("üretim hatasında sessiz fallback yok: SessionSeedError fırlatır (Math.random'a düşmez)", () => {
    mockedGetRandomValues.mockImplementation(() => {
      throw new Error("native module yok");
    });
    const random = jest.spyOn(Math, "random");
    let thrown: unknown;
    try {
      generateSessionSeed();
    } catch (error) {
      thrown = error;
    }
    const calls = random.mock.calls.length;
    random.mockRestore();
    expect(thrown).toBeInstanceOf(SessionSeedError);
    expect((thrown as Error).cause).toBeInstanceOf(Error);
    expect(calls).toBe(0);
  });

  it("geçersiz biçimli (ör. kısa) native çıktı da SessionSeedError verir", () => {
    mockedGetRandomValues.mockImplementation((array: Uint8Array) => array.subarray(0, 4));
    expect(() => generateSessionSeed()).toThrow(SessionSeedError);
  });

  it("aynı modül ömründe getSessionSeed hep aynı seed'i verir ve native yalnızca BİR kez çağrılır (rerender/remount/retry/pagination/sekme)", () => {
    jest.isolateModules(() => {
      const { getSessionSeed: isolatedGet } = require("./session-seed") as typeof import("./session-seed");
      const mocked = (require("expo-crypto") as { getRandomValues: jest.Mock }).getRandomValues;
      mocked.mockImplementation((array: Uint8Array) => array.fill(7));
      const first = isolatedGet();
      for (let i = 0; i < 20; i++) expect(isolatedGet()).toBe(first);
      expect(mocked).toHaveBeenCalledTimes(1);
    });
  });

  it("yeni izole modül (= yeni JS process / cold start) YENİ seed üretir", () => {
    const seeds: string[] = [];
    for (let i = 0; i < 3; i++) {
      jest.isolateModules(() => {
        const { getSessionSeed: isolatedGet } = require("./session-seed") as typeof import("./session-seed");
        const mocked = (require("expo-crypto") as { getRandomValues: jest.Mock }).getRandomValues;
        mocked.mockImplementation((array: Uint8Array) => array.fill(i + 1));
        seeds.push(isolatedGet());
      });
    }
    expect(new Set(seeds).size).toBe(3);
  });

  it("modül düzeyindeki getSessionSeed de tek seed döner", () => {
    expect(getSessionSeed()).toBe(getSessionSeed());
  });

  it("seed hiçbir kalıcı depoya yazılmaz (AsyncStorage kullanılmaz)", () => {
    const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "session-seed.ts"), "utf-8") as string;
    expect(source).not.toMatch(/from\s+["'].*async-storage/);
  });
});
