import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadApprovedArtifact, promoteDraftToApproved } from "./approved-artifact";
import type { PublishDraft } from "./publish-draft.schema";

/**
 * IELTS kategorisi approved artifact akışında (promote → approved/<id>.json → load) KAYBOLMAMALI ve
 * kategori/seviye dosya adından türetilmemeli: tek kaynak, artifact'teki doğrulanmış draft alanlarıdır.
 */
function draftFor(contentId: string, overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId,
    muxAssetId: `local-${contentId}`,
    sourceFile: `${contentId}.mp4`,
    storageKey: null,
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "B2",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "He ended up staying there.", englishExplanation: "He stayed longer than planned.", turkishExplanation: "Planladığından uzun kaldı." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
    ],
    vocabulary: [{ lemma: "books", gloss: "kitaplar" }],
    learningPoints: [
      { segmentOrdinal: 1, type: "phrase", expression: "ended up staying", englishExplanation: "An unplanned result.", turkishExplanation: "Planlanmamış sonuç.", exampleEn: null, exampleTr: null },
    ],
    quiz: {
      segmentOrdinal: 2,
      question: "What does she love doing?",
      options: [
        { text: "Reading books", isCorrect: true },
        { text: "Cooking food", isCorrect: false },
        { text: "Playing games", isCorrect: false },
        { text: "Riding bikes", isCorrect: false },
      ],
    },
    quality: { status: "pass", issues: [] },
    ...overrides,
  };
}

describe("approved artifact — category taşınması", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "approved-category-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  function promote(draft: PublishDraft): void {
    promoteDraftToApproved(draft, {
      contentId: draft.contentId,
      acknowledgeNeedsReview: false,
      note: null,
      overwrite: false,
      media: { localFileName: `${draft.contentId}.mp4` },
      approvedDir: dir,
    });
  }

  it('category: "ielts" terfi ve yükleme sonrasında korunur; gerçek cefrLevel değişmez', () => {
    promote(draftFor("some-clip", { category: "ielts" }));
    const artifact = loadApprovedArtifact("some-clip", dir);
    expect(artifact.draft.category).toBe("ielts");
    expect(artifact.draft.cefrLevel).toBe("B2");
  });

  it('"ielts-c1-" önekli contentId ne kategori ne seviye kanıtıdır: category yoksa yazılmaz, cefrLevel artifact\'ten gelir', () => {
    promote(draftFor("ielts-c1-prefixed-only"));
    const artifact = loadApprovedArtifact("ielts-c1-prefixed-only", dir);
    expect(artifact.draft.category).toBeUndefined();
    expect(artifact.draft.cefrLevel).toBe("B2");
  });
});
