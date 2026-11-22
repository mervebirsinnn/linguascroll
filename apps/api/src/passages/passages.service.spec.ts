import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { SubscriptionsService } from "../subscriptions/subscriptions.service";
import type { PassageAnswersRepository } from "./passage-answers-repository";
import { encodePassageCursor } from "./passage-cursor";
import type { PassageRow, PassagesRepository } from "./passages-repository";
import { PASSAGES_PAGE_SIZE, PassagesService } from "./passages.service";

const USER = "00000000-0000-4000-8000-0000000000a1";
const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function passageRow(n: number, overrides: Partial<PassageRow> = {}): PassageRow {
  return {
    id: uuid(n),
    slug: `p${n}`,
    level: "B2",
    title: `T${n}`,
    topic: "K",
    paragraphs: ["Plain text."],
    sortOrder: n,
    isFreeSample: false,
    contentRevision: 1,
    contentHash: "h",
    retiredAt: null,
    createdAt: new Date(0),
    ...overrides,
  };
}

function makeService(options: { rows?: PassageRow[]; fullAccess?: boolean } = {}) {
  const calls = {
    findActivePage: [] as unknown[][],
    findQuestions: [] as string[][],
    findOptions: [] as string[][],
    findWords: [] as string[][],
    findSpans: [] as string[][],
    findUserAnswers: [] as unknown[][],
    findSavedWordIds: [] as unknown[][],
    hasFullAccess: 0,
    hasFullAccessArgs: [] as unknown[][],
    record: 0,
  };
  const passagesRepository = {
    findActivePage: async (...args: unknown[]) => {
      calls.findActivePage.push(args);
      return options.rows ?? [];
    },
    findQuestions: async (ids: string[]) => (calls.findQuestions.push([...ids]), []),
    findOptions: async (ids: string[]) => (calls.findOptions.push([...ids]), []),
    findWords: async (ids: string[]) => (calls.findWords.push([...ids]), []),
    findSpans: async (ids: string[]) => (calls.findSpans.push([...ids]), []),
    findUserAnswers: async (...args: unknown[]) => (calls.findUserAnswers.push(args), []),
    findSavedWordIds: async (...args: unknown[]) => (calls.findSavedWordIds.push(args), new Set<string>()),
    findQuestionAccessContext: async () => null,
  } as unknown as PassagesRepository;
  const subscriptions = {
    hasFullAccess: async (...args: unknown[]) => {
      calls.hasFullAccess += 1;
      calls.hasFullAccessArgs.push(args);
      return options.fullAccess ?? false;
    },
  } as unknown as SubscriptionsService;
  const answers = { record: async () => (calls.record += 1, { status: "invalid-option" }) } as unknown as PassageAnswersRepository;
  return { service: new PassagesService(passagesRepository, answers, subscriptions), calls };
}

describe("PassagesService.listPassages", () => {
  it("boş katalog: boş sayfa ve nextCursor null", async () => {
    const { service } = makeService({ rows: [] });
    await expect(service.listPassages(USER, { level: "B2" })).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("sayfa PAGE_SIZE+1 satır ister; fazla satır nextCursor üretir ve sayfaya girmez", async () => {
    const rows = Array.from({ length: PASSAGES_PAGE_SIZE + 1 }, (_, i) => passageRow(i + 1));
    const { service, calls } = makeService({ rows, fullAccess: false });

    const page = await service.listPassages(USER, { level: "B2" });

    expect(calls.findActivePage[0]?.[2]).toBe(PASSAGES_PAGE_SIZE + 1);
    expect(page.items).toHaveLength(PASSAGES_PAGE_SIZE);
    expect(page.nextCursor).not.toBeNull();
  });

  it("N+1 yok: içerik sorguları SAYFA başına birer kez, yalnız açık metinlerin id'leriyle çağrılır", async () => {
    const rows = [passageRow(1, { isFreeSample: true }), passageRow(2), passageRow(3, { isFreeSample: true })];
    const { service, calls } = makeService({ rows, fullAccess: false });

    await service.listPassages(USER, { level: "B2" }).catch(() => undefined);

    // Açık metinler soru içermediği için şema doğrulaması düşebilir; burada yalnız sorgu şekli ölçülüyor.
    for (const key of ["findQuestions", "findWords", "findSpans"] as const) {
      expect(calls[key]).toHaveLength(1);
      expect(calls[key][0]).toEqual([uuid(1), uuid(3)]);
    }
    expect(calls.findUserAnswers).toHaveLength(1);
    expect(calls.findSavedWordIds).toHaveLength(1);
  });

  it("tamamen kilitli sayfada kilitli metinlerin id'leri içerik sorgularına HİÇ gitmez", async () => {
    const rows = [passageRow(1), passageRow(2)];
    const { service, calls } = makeService({ rows, fullAccess: false });

    const page = await service.listPassages(USER, { level: "C1" });

    expect(page.items.map((item) => item.access)).toEqual(["locked", "locked"]);
    for (const key of ["findQuestions", "findWords", "findSpans"] as const) {
      expect(calls[key].every((ids) => ids.length === 0)).toBe(true);
    }
  });

  it("erişim kararına istemci platformu iletilir; platformsuz çağrı bilinmeyen platformdur (null)", async () => {
    const { service, calls } = makeService({ rows: [passageRow(1)] });
    await service.listPassages(USER, { level: "B2" }, "ios");
    await service.listPassages(USER, { level: "B2" });
    expect(calls.hasFullAccessArgs).toEqual([[USER, "ios"], [USER, null]]);
  });

  it("erişim tek kez sorgulanır (metin başına değil)", async () => {
    const rows = [passageRow(1), passageRow(2), passageRow(3)];
    const { service, calls } = makeService({ rows, fullAccess: false });

    await service.listPassages(USER, { level: "B2" });

    expect(calls.hasFullAccess).toBe(1);
  });

  it("cursor'un seviyesi istekle uyuşmazsa 400; bozuk cursor 400 ve repository'ye gidilmez", async () => {
    const { service, calls } = makeService();
    const cursor = encodePassageCursor({ level: "B1", sortOrder: 1, id: uuid(1) });

    await expect(service.listPassages(USER, { level: "B2", cursor })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listPassages(USER, { level: "B2", cursor: "###" })).rejects.toBeInstanceOf(BadRequestException);
    expect(calls.findActivePage).toHaveLength(0);
  });
});

describe("PassagesService.answerQuestion", () => {
  function serviceWithContext(context: unknown, fullAccess: boolean) {
    const calls = { record: 0, hasFullAccess: 0 };
    const passagesRepository = { findQuestionAccessContext: async () => context, findOptions: async () => [] } as unknown as PassagesRepository;
    const answers = { record: async () => (calls.record += 1, { status: "invalid-option" }) } as unknown as PassageAnswersRepository;
    const subscriptions = { hasFullAccess: async () => (calls.hasFullAccess += 1, fullAccess) } as unknown as SubscriptionsService;
    return { service: new PassagesService(passagesRepository, answers, subscriptions), calls };
  }

  it("bilinmeyen soru → 404, hiçbir şey yazılmaz", async () => {
    const { service, calls } = serviceWithContext(null, true);
    await expect(service.answerQuestion(USER, uuid(1), uuid(2))).rejects.toBeInstanceOf(NotFoundException);
    expect(calls.record).toBe(0);
  });

  it("emekli metin → 404", async () => {
    const { service, calls } = serviceWithContext({ questionId: uuid(1), passageId: uuid(9), isFreeSample: true, retiredAt: new Date() }, true);
    await expect(service.answerQuestion(USER, uuid(1), uuid(2))).rejects.toBeInstanceOf(NotFoundException);
    expect(calls.record).toBe(0);
  });

  it("kilitli metin → 403 ve cevap yazılmaz", async () => {
    const { service, calls } = serviceWithContext({ questionId: uuid(1), passageId: uuid(9), isFreeSample: false, retiredAt: null }, false);
    await expect(service.answerQuestion(USER, uuid(1), uuid(2))).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls.record).toBe(0);
  });

  it("ücretsiz örnek abonelik sorgulanmadan açılır (hak/abonelik çağrısı yok)", async () => {
    const { service, calls } = serviceWithContext({ questionId: uuid(1), passageId: uuid(9), isFreeSample: true, retiredAt: null }, false);
    await expect(service.answerQuestion(USER, uuid(1), uuid(2))).rejects.toBeInstanceOf(BadRequestException); // mock: invalid-option
    expect(calls.hasFullAccess).toBe(0);
    expect(calls.record).toBe(1);
  });

  it("geçersiz şık → 400", async () => {
    const { service } = serviceWithContext({ questionId: uuid(1), passageId: uuid(9), isFreeSample: false, retiredAt: null }, true);
    await expect(service.answerQuestion(USER, uuid(1), uuid(2))).rejects.toBeInstanceOf(BadRequestException);
  });
});
