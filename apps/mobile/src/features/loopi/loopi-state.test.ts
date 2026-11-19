import {
  emptyLoopiState,
  initializeIfMissing,
  markRevealed,
  openLoopiCard,
  parseLoopiState,
  recordCreated,
  removeWord,
  resolveLoopiReveal,
  shouldShowLoopiDot,
  type LoopiState,
  type SavedWordForReveal,
} from "./loopi-state";

/**
 * 2026-11-17 — Loopi'nin saf durum mantığı. Plandaki zorunlu senaryolar: çift kayıt, silip başka kelime kaydetme,
 * toplu kayıt, eşik atlama, yeni cihaz (sessiz başlangıç), init'ten önce kayıt, bozuk veri, nokta.
 * Eşzamanlı yazma ve hesap ayrımı depo katmanında: loopi-store.test.ts.
 */

function saved(id: string, lemma: string, minute: number): SavedWordForReveal {
  return { word: { id, lemma }, savedAt: new Date(Date.UTC(2026, 10, 17, 10, minute)).toISOString() };
}

/** n adet "eski" kayıtlı kelime (bekleyen değil). */
function oldWords(n: number): SavedWordForReveal[] {
  return Array.from({ length: n }, (_, i) => saved(`old-${i}`, `old${i}`, 0));
}

function state(seenStage: number | null, pending: string[] = []): LoopiState {
  return { version: 1, seenStage, pending };
}

describe("recordCreated / removeWord", () => {
  it("çift kayıt: aynı wordId iki kez bildirilse de pending'de tek kayıt", () => {
    const once = recordCreated(emptyLoopiState(), "A");
    const twice = recordCreated(once, "A");
    expect(twice.pending).toEqual(["A"]);
    expect(twice).toBe(once); // değişiklik yoksa aynı nesne (gereksiz yazma yok)
  });

  it("removeWord bekleyenden çıkarır; olmayan kelimede durum aynen döner", () => {
    const s = recordCreated(recordCreated(emptyLoopiState(), "A"), "B");
    expect(removeWord(s, "A").pending).toEqual(["B"]);
    expect(removeWord(s, "Z")).toBe(s);
  });
});

describe("resolveLoopiReveal", () => {
  it("tek yeni kelime: hapta o kelime, +0", () => {
    const words = [saved("A", "tomato", 5)];
    const reveal = resolveLoopiReveal(state(0, ["A"]), words);
    expect(reveal).toEqual({ latest: { wordId: "A", lemma: "tomato" }, extraCount: 0, fromStage: 0, toStage: 1 });
  });

  it("silip başka kelime kaydetme: A kaydet → A sil → B kaydet ⇒ latest B, +0, toplam aynı → uzama yok", () => {
    // Kart en son 3 kelimede görüldü (seenStage 2). A kaydedildi (4), A silindi (3), B kaydedildi (4)?
    // Hayır: toplam yine 3 olsun diye eski kelimelerden biri de silinmiş say — önemli olan: removeWord
    // ÇAĞRILMAMIŞ olsa bile (ör. silme başka bir yoldan) sunucu listesinde A yok, resolve A'yı kendisi süzer.
    const pending = ["A", "B"];
    const words = [...oldWords(2), saved("B", "bridge", 9)];
    const reveal = resolveLoopiReveal(state(2, pending), words);
    expect(reveal.latest).toEqual({ wordId: "B", lemma: "bridge" });
    expect(reveal.extraCount).toBe(0);
    expect(reveal.toStage).toBe(2);
    expect(reveal.fromStage).toBe(2); // uzama yok
  });

  it("toplu: A, B, C, D kaydedildi, B silindi ⇒ latest savedAt'i en yeni olan, +2", () => {
    const words = [...oldWords(4), saved("A", "a", 1), saved("C", "c", 7), saved("D", "d", 3)];
    const reveal = resolveLoopiReveal(state(2, ["A", "B", "C", "D"]), words);
    expect(reveal.latest).toEqual({ wordId: "C", lemma: "c" }); // ekleme sırası değil, sunucu savedAt
    expect(reveal.extraCount).toBe(2);
  });

  it("eşik atlama: seenStage 2, sayı 16 ⇒ tek uzama doğrudan stage 4", () => {
    const reveal = resolveLoopiReveal(state(2), oldWords(16));
    expect(reveal).toMatchObject({ latest: null, fromStage: 2, toStage: 4 });
  });

  it("başka cihazda kaydedilenler (pending boş): hap yok, yalnız uzama", () => {
    const reveal = resolveLoopiReveal(state(1), oldWords(3));
    expect(reveal.latest).toBeNull();
    expect(reveal.toStage).toBe(2);
  });

  it("sayı azaldı (kelime silindi): fromStage toStage'den büyük gösterilmez → küçülme animasyonu yok", () => {
    const reveal = resolveLoopiReveal(state(4), oldWords(9));
    expect(reveal.fromStage).toBe(reveal.toStage);
  });
});

describe("initializeIfMissing — yeni cihaz / yeniden kurulum", () => {
  it("durum yok, 20 kelime ⇒ seenStage 4 (sessiz), nokta yok", () => {
    const s = initializeIfMissing(emptyLoopiState(), 20, 0);
    expect(s.seenStage).toBe(4);
    expect(shouldShowLoopiDot(s, 20)).toBe(false);
  });

  it("init'ten ÖNCE bu cihazda 1 yeni kayıt: sayı 21 ⇒ seenStage = stage(20), o kayıt kutlanabilir kalır", () => {
    const s = initializeIfMissing(recordCreated(emptyLoopiState(), "A"), 21, 1);
    expect(s.seenStage).toBe(4);
    expect(s.pending).toEqual(["A"]);
  });

  it("init'ten önceki kayıt bir eşiği geçirdiyse nokta çıkar (örn. 0 → 1)", () => {
    const s = initializeIfMissing(recordCreated(emptyLoopiState(), "A"), 1, 1);
    expect(s.seenStage).toBe(0);
    expect(shouldShowLoopiDot(s, 1)).toBe(true);
  });

  it("zaten başlatılmışsa dokunulmaz", () => {
    const s = state(3, ["X"]);
    expect(initializeIfMissing(s, 100, 0)).toBe(s);
  });
});

describe("markRevealed / shouldShowLoopiDot", () => {
  it("eşik geçilince nokta var, markRevealed sonrası yok, pending temizlenir", () => {
    const s = state(1, ["A"]);
    expect(shouldShowLoopiDot(s, 3)).toBe(true);
    const after = markRevealed(s, 3);
    expect(after).toEqual({ version: 1, seenStage: 2, pending: [] });
    expect(shouldShowLoopiDot(after, 3)).toBe(false);
  });

  it("eşik geçmeyen kayıtta nokta çıkmaz", () => {
    expect(shouldShowLoopiDot(state(2), 7)).toBe(false);
  });

  it("sayı düşünce seenStage düşürülmez; aynı eşiğe dönüşte yeniden kutlama/nokta yok (karar d)", () => {
    const after = markRevealed(state(3), 2); // 8'den 2'ye indi, kart açıldı
    expect(after.seenStage).toBe(3);
    expect(shouldShowLoopiDot(after, 8)).toBe(false);
  });

  it("başlatılmamış durumda nokta yok", () => {
    expect(shouldShowLoopiDot(emptyLoopiState(), 50)).toBe(false);
  });
});

describe("openLoopiCard — kart açılışının tamamı", () => {
  it("yeni cihaz, bekleyen yok: sessiz (reveal null), mevcut boy görüldü sayılır", () => {
    const { nextState, reveal } = openLoopiCard(emptyLoopiState(), oldWords(20));
    expect(reveal).toBeNull();
    expect(nextState.seenStage).toBe(4);
  });

  it("ilk kelime: reveal oynatılır ve AYNI adımda görüldü yazılır", () => {
    const { nextState, reveal } = openLoopiCard(state(0, ["A"]), [saved("A", "tomato", 1)]);
    expect(reveal).toEqual({ latest: { wordId: "A", lemma: "tomato" }, extraCount: 0, fromStage: 0, toStage: 1 });
    expect(nextState).toEqual({ version: 1, seenStage: 1, pending: [] });
  });

  it("ikinci açılış aynı şeyi tekrar oynatmaz", () => {
    const first = openLoopiCard(state(0, ["A"]), [saved("A", "tomato", 1)]);
    const second = openLoopiCard(first.nextState, [saved("A", "tomato", 1)]);
    expect(second.reveal).toBeNull();
  });

  it("bekleyen kelimelerin hepsi silinmiş, eşik değişmemiş: oynatılacak bir şey yok", () => {
    const { reveal, nextState } = openLoopiCard(state(2, ["A"]), oldWords(3));
    expect(reveal).toBeNull();
    expect(nextState.pending).toEqual(["A"]); // temizlik markRevealed ile olur; zararsız (resolve süzer)
  });
});

describe("parseLoopiState — bozuk/eski veri sessiz başlangıç", () => {
  it.each([null, "", "{", "[]", '{"version":2,"seenStage":1,"pending":[]}', '{"version":1,"seenStage":-1,"pending":[]}', '{"version":1,"pending":"A"}'])(
    "%p → boş durum, hata yok",
    (raw) => {
      expect(parseLoopiState(raw)).toEqual(emptyLoopiState());
    },
  );

  it("geçerli değer aynen okunur", () => {
    expect(parseLoopiState('{"version":1,"seenStage":3,"pending":["A"]}')).toEqual(state(3, ["A"]));
  });
});
