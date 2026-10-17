import type { VideoWordGlosses } from "@linguascroll/shared-types";
import type { SegmentWordGlossesRepository } from "./segment-word-glosses-repository";
import { WORD_GLOSSES_CACHE_TTL_MS, WordGlossesService } from "./word-glosses.service";

const SEGMENT_ID = "00000000-0000-4000-8000-000000000001";
const glosses: VideoWordGlosses = { [SEGMENT_ID]: { home: "ev" } };

function createService(result: VideoWordGlosses) {
  const findForVideo = jest.fn().mockResolvedValue(result);
  const service = new WordGlossesService({ findForVideo } as unknown as SegmentWordGlossesRepository);
  return { service, findForVideo };
}

describe("WordGlossesService", () => {
  it("TTL içinde ikinci istek DB'ye gitmez", async () => {
    const { service, findForVideo } = createService(glosses);
    await service.getForVideo("v1", 1000);
    await service.getForVideo("v1", 1000 + WORD_GLOSSES_CACHE_TTL_MS - 1);
    expect(findForVideo).toHaveBeenCalledTimes(1);
  });

  it("TTL dolunca yeniden okur", async () => {
    const { service, findForVideo } = createService(glosses);
    await service.getForVideo("v1", 1000);
    await service.getForVideo("v1", 1000 + WORD_GLOSSES_CACHE_TTL_MS + 1);
    expect(findForVideo).toHaveBeenCalledTimes(2);
  });

  it("boş sonucu cache'lemez (CLI sonradan üretince hemen görünür)", async () => {
    const { service, findForVideo } = createService({});
    await service.getForVideo("v1", 1000);
    await service.getForVideo("v1", 1001);
    expect(findForVideo).toHaveBeenCalledTimes(2);
  });

  it("videoId'ler birbirinden bağımsız cache'lenir", async () => {
    const { service, findForVideo } = createService(glosses);
    await service.getForVideo("v1", 1000);
    await service.getForVideo("v2", 1000);
    expect(findForVideo).toHaveBeenCalledTimes(2);
  });
});
