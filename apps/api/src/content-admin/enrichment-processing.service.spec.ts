import * as fs from "node:fs";
import { BadGatewayException, ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { enrichSttDraft, resolveDraftPath, resolveEnrichedOutputPath } from "../content-enrichment/enrich-transcript";
import { sttDraftSchema } from "../content-enrichment/stt-draft.schema";
import { EnrichmentLlmError } from "../content-enrichment/enrichment-llm-client";
import type { EnrichmentOutput } from "../content-enrichment/enrichment-output.schema";
import { EnrichmentProcessingService } from "./enrichment-processing.service";

const CONTENT_ID = "b1-enrich-test";

function writeDraft(contentId: string, overrides: Partial<Record<string, unknown>> = {}): void {
  const draftPath = resolveDraftPath(contentId);
  fs.mkdirSync(draftPath.replace(/[/\\]draft\.json$/, ""), { recursive: true });
  fs.writeFileSync(
    draftPath,
    JSON.stringify({
      contentId,
      sourceFile: "/tmp/should-not-leak.mp4",
      languageStatus: "ready",
      detectedLanguage: "en",
      languageProbability: 0.95,
      durationMs: 5000,
      segments: [
        { ordinal: 1, startMs: 0, endMs: 1000, text: "Hello there." },
        { ordinal: 2, startMs: 1000, endMs: 2000, text: "How are you?" },
        { ordinal: 3, startMs: 2000, endMs: 3200, text: "I am fine, thanks." },
      ],
      ...overrides,
    }),
  );
}

function validEnrichmentOutput(): EnrichmentOutput {
  return {
    contentSlug: "hello-greeting",
    topic: "lifestyle",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, englishExplanation: "A greeting.", turkishExplanation: "Bir selamlama." },
      { ordinal: 2, englishExplanation: "Asking how someone is.", turkishExplanation: "Birinin nasıl olduğunu sormak." },
      { ordinal: 3, englishExplanation: "Saying you are okay.", turkishExplanation: "İyi olduğunu söylemek." },
    ],
    vocabulary: [{ lemma: "fine", gloss: "iyi (durum bildiren)" }],
    learningPoints: [],
    quiz: {
      segmentOrdinal: 1,
      question: "What does 'Hello there' mean?",
      options: [
        { text: "A greeting", isCorrect: true },
        { text: "A farewell", isCorrect: false },
        { text: "A question", isCorrect: false },
        { text: "An apology", isCorrect: false },
      ],
    },
  };
}

function cleanup(contentId: string): void {
  fs.rmSync(resolveDraftPath(contentId).replace(/[/\\]draft\.json$/, ""), { recursive: true, force: true });
  fs.rmSync(resolveEnrichedOutputPath(contentId).replace(/[/\\]enriched\.json$/, ""), { recursive: true, force: true });
}

describe("EnrichmentProcessingService.enrich", () => {
  afterEach(() => {
    cleanup(CONTENT_ID);
  });

  it("draft.json bulunamazsa NotFoundException fırlatır, Gemini'ye hiç gitmez", async () => {
    const enrichTranscriptFn = jest.fn();
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(NotFoundException);
    expect(enrichTranscriptFn).not.toHaveBeenCalled();
  });

  it("draft.json beklenen şekilde değilse UnprocessableEntityException fırlatır, Gemini'ye hiç gitmez", async () => {
    const draftPath = resolveDraftPath(CONTENT_ID);
    fs.mkdirSync(draftPath.replace(/[/\\]draft\.json$/, ""), { recursive: true });
    fs.writeFileSync(draftPath, JSON.stringify({ languageStatus: "ready" }));
    const enrichTranscriptFn = jest.fn();
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
    expect(enrichTranscriptFn).not.toHaveBeenCalled();
  });

  it('languageStatus "ready" değilse ConflictException fırlatır, Gemini\'ye hiç gitmez', async () => {
    writeDraft(CONTENT_ID, { languageStatus: "needsReview" });
    const enrichTranscriptFn = jest.fn();
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(ConflictException);
    expect(enrichTranscriptFn).not.toHaveBeenCalled();
  });

  it("enriched.json zaten varsa ConflictException fırlatır, üzerine YAZMAZ, Gemini'ye hiç gitmez", async () => {
    writeDraft(CONTENT_ID);
    const outputPath = resolveEnrichedOutputPath(CONTENT_ID);
    fs.mkdirSync(outputPath.replace(/[/\\]enriched\.json$/, ""), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ marker: "existing-human-reviewed-file" }));
    const enrichTranscriptFn = jest.fn();
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(ConflictException);
    expect(enrichTranscriptFn).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(outputPath, "utf-8"))).toEqual({ marker: "existing-human-reviewed-file" });
  });

  it("Gemini EnrichmentLlmError fırlatırsa (429/quota dahil) BadGatewayException'a çevirir, enriched.json hiç yazılmaz", async () => {
    writeDraft(CONTENT_ID);
    const enrichTranscriptFn = jest.fn().mockRejectedValue(new EnrichmentLlmError("quota exceeded (429)"));
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(BadGatewayException);
    expect(fs.existsSync(resolveEnrichedOutputPath(CONTENT_ID))).toBe(false);
  });

  it("LLM çıktısı draft'ın segment ordinal kümesiyle eşleşmezse UnprocessableEntityException fırlatır, enriched.json hiç yazılmaz", async () => {
    writeDraft(CONTENT_ID);
    const mismatched = validEnrichmentOutput();
    mismatched.quiz.segmentOrdinal = 999;
    const enrichTranscriptFn = jest.fn().mockResolvedValue(mismatched);
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    await expect(service.enrich(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
    expect(fs.existsSync(resolveEnrichedOutputPath(CONTENT_ID))).toBe(false);
  });

  it("başarılı akışta enriched.json'ı gerçekten diske yazar ve response'ta sourceFile'ı DAHİL ETMEZ", async () => {
    writeDraft(CONTENT_ID);
    const enrichTranscriptFn = jest.fn().mockResolvedValue(validEnrichmentOutput());
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    const result = await service.enrich(CONTENT_ID);

    expect(enrichTranscriptFn).toHaveBeenCalledWith([
      { ordinal: 1, startMs: 0, endMs: 1000, text: "Hello there." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "How are you?" },
      { ordinal: 3, startMs: 2000, endMs: 3200, text: "I am fine, thanks." },
    ]);
    expect(result).not.toHaveProperty("sourceFile");
    expect(result.contentId).toBe(CONTENT_ID);
    expect(result.topic).toBe("lifestyle");
    expect(result.cefrLevel).toBe("A1");
    expect(result.quality).toEqual({ status: "pass", issues: [] });
    expect(result.segments).toHaveLength(3);

    const outputPath = resolveEnrichedOutputPath(CONTENT_ID);
    expect(fs.existsSync(outputPath)).toBe(true);
    const onDisk = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    // Diskteki dosya, publish-content.ts'in ihtiyaç duyduğu sourceFile'ı İÇERİR
    // (bkz. Chunk 17C teknik inceleme, "known limitation") — sadece HTTP
    // response'tan hariç tutuluyor, dosyadan DEĞİL.
    expect(onDisk.sourceFile).toBe("/tmp/should-not-leak.mp4");
  });

  it("Chunk 17D — draft.json'daki storageKey'i (SttProcessingService'in yazdığı, madde 2 provenance zinciri) client'tan İSTEMEDEN enriched.json'a taşır", async () => {
    writeDraft(CONTENT_ID, { storageKey: "originals/b1-enrich-test/9f8e7d6c-uuid.mp4" });
    const enrichTranscriptFn = jest.fn().mockResolvedValue(validEnrichmentOutput());
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    const result = await service.enrich(CONTENT_ID);

    expect(result.storageKey).toBe("originals/b1-enrich-test/9f8e7d6c-uuid.mp4");
    const onDisk = JSON.parse(fs.readFileSync(resolveEnrichedOutputPath(CONTENT_ID), "utf-8"));
    expect(onDisk.storageKey).toBe("originals/b1-enrich-test/9f8e7d6c-uuid.mp4");
  });

  it("Chunk 17D — draft.json'da storageKey YOKSA (offline/yerel akış) enriched.json'da null kalır", async () => {
    writeDraft(CONTENT_ID); // storageKey hiç yok — offline draft
    const enrichTranscriptFn = jest.fn().mockResolvedValue(validEnrichmentOutput());
    const service = new EnrichmentProcessingService(enrichTranscriptFn);

    const result = await service.enrich(CONTENT_ID);

    expect(result.storageKey).toBeNull();
  });
  describe("category (HTTP body'den)", () => {
    const PREFIXED_ID = "ielts-c1-prefix-only";
    afterEach(() => cleanup(PREFIXED_ID));

    it("category=ielts verilirse response'a VE diskteki enriched.json'a açıkça yazılır", async () => {
      writeDraft(CONTENT_ID);
      const service = new EnrichmentProcessingService(jest.fn().mockResolvedValue(validEnrichmentOutput()));

      const result = await service.enrich(CONTENT_ID, "ielts");

      expect(result.category).toBe("ielts");
      expect(JSON.parse(fs.readFileSync(resolveEnrichedOutputPath(CONTENT_ID), "utf-8")).category).toBe("ielts");
    });

    it("category verilmezse mevcut güvenli default korunur: draft'a hiçbir category yazılmaz (publish general varsayar)", async () => {
      writeDraft(CONTENT_ID);
      const service = new EnrichmentProcessingService(jest.fn().mockResolvedValue(validEnrichmentOutput()));

      const result = await service.enrich(CONTENT_ID);

      expect(result.category).toBeUndefined();
      expect(JSON.parse(fs.readFileSync(resolveEnrichedOutputPath(CONTENT_ID), "utf-8"))).not.toHaveProperty("category");
    });

    it('contentId önekinden category/cefrLevel türetilmez: "ielts-c1-" önekli id category yazmaz, seviye enrichment çıktısından gelir', async () => {
      writeDraft(PREFIXED_ID);
      const service = new EnrichmentProcessingService(jest.fn().mockResolvedValue(validEnrichmentOutput()));

      const result = await service.enrich(PREFIXED_ID);

      expect(result.category).toBeUndefined();
      expect(result.cefrLevel).toBe("A1");
    });

    it("CLI ve HTTP AYNI use-case'i (enrichSttDraft) kullanır: aynı girdi için aynı draft ve aynı category çıkar", async () => {
      writeDraft(CONTENT_ID);
      const enrichFn = jest.fn().mockResolvedValue(validEnrichmentOutput());
      const sttDraft = sttDraftSchema.parse(JSON.parse(fs.readFileSync(resolveDraftPath(CONTENT_ID), "utf-8")));

      // CLI yolu: main() `enrichSttDraft(contentId, draft, { category })` çağırır.
      const cliDraft = await enrichSttDraft(CONTENT_ID, sttDraft, { category: "ielts", enrichFn });
      // HTTP yolu.
      const httpResult = await new EnrichmentProcessingService(enrichFn).enrich(CONTENT_ID, "ielts");

      const { sourceFile: _omitted, ...cliComparable } = cliDraft;
      expect(httpResult).toEqual(cliComparable);
      expect(httpResult.category).toBe(cliDraft.category);
      expect(httpResult.category).toBe("ielts");
    });
  });
});
