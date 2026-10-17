import type { ConfigService } from "@nestjs/config";
import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3";
import { findOrphanCandidates, formatOrphanReport, parseOrphanArgs } from "./report-r2-orphans";
import { R2StorageService, type R2ObjectSummary } from "./r2-storage.service";

const NOW = new Date("2026-10-15T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const obj = (key: string, ageMinutes: number | null): R2ObjectSummary => ({ key, lastModified: ageMinutes === null ? null : minutesAgo(ageMinutes), size: 10 });

describe("findOrphanCandidates (read-only karşılaştırma)", () => {
  const base = { now: NOW, minAgeMs: 60 * 60_000, prefix: "originals/" };

  it("DB'de referanslı nesne orphan değildir; referanssız ve yeterince eski nesne orphan adayıdır", () => {
    const report = findOrphanCandidates({
      ...base,
      objects: [obj("originals/a/1.mp4", 500), obj("originals/b/2.mp4", 500)],
      dbStorageKeys: new Set(["originals/a/1.mp4"]),
    });
    expect(report.referencedObjects).toBe(1);
    expect(report.orphanCandidates.map((o) => o.key)).toEqual(["originals/b/2.mp4"]);
  });

  it("minAge'den genç referanssız nesne (devam eden publish olabilir) orphan SAYILMAZ, ayrı raporlanır", () => {
    const report = findOrphanCandidates({ ...base, objects: [obj("originals/new/3.mp4", 5)], dbStorageKeys: new Set() });
    expect(report.orphanCandidates).toHaveLength(0);
    expect(report.tooRecentToJudge.map((o) => o.key)).toEqual(["originals/new/3.mp4"]);
  });

  it("tam eşik yaşı orphan adayıdır (>=); LastModified bilinmiyorsa güvenli taraf: yargılanmaz", () => {
    const report = findOrphanCandidates({ ...base, objects: [obj("originals/edge/4.mp4", 60), obj("originals/unknown/5.mp4", null)], dbStorageKeys: new Set() });
    expect(report.orphanCandidates.map((o) => o.key)).toEqual(["originals/edge/4.mp4"]);
    expect(report.tooRecentToJudge.map((o) => o.key)).toEqual(["originals/unknown/5.mp4"]);
  });

  it("DB'de referansı olup R2'de olmayan anahtarı (oynatılamaz video) 'missingInR2' olarak raporlar; prefix dışını yok sayar", () => {
    const report = findOrphanCandidates({ ...base, objects: [obj("originals/a/1.mp4", 500)], dbStorageKeys: new Set(["originals/a/1.mp4", "originals/gone/9.mp4", "other/x.mp4"]) });
    expect(report.missingInR2).toEqual(["originals/gone/9.mp4"]);
  });

  it("rapor biçimi 'silinmedi' der ve adayları listeler", () => {
    const report = findOrphanCandidates({ ...base, objects: [obj("originals/b/2.mp4", 500)], dbStorageKeys: new Set() });
    const text = formatOrphanReport(report, NOW);
    expect(text).toMatch(/hiçbir şey silinmedi/);
    expect(text).toMatch(/ORPHAN-ADAYI\s+originals\/b\/2\.mp4/);
  });
});

describe("parseOrphanArgs", () => {
  it("varsayılanlar: prefix originals/, 60 dk, json yok", () => {
    expect(parseOrphanArgs([])).toEqual({ prefix: "originals/", minAgeMinutes: 60, json: false });
  });
  it("silme/uygulama bayrağı YOKTUR: --delete/--apply/--force bilinmeyen argüman olarak reddedilir", () => {
    for (const flag of ["--delete", "--apply", "--force", "--remove"]) {
      expect(() => parseOrphanArgs([flag])).toThrow(/SİLMEZ/);
    }
  });
  it("geçersiz --min-age-minutes reddedilir", () => {
    expect(() => parseOrphanArgs(["--min-age-minutes", "-1"])).toThrow();
    expect(() => parseOrphanArgs(["--min-age-minutes", "abc"])).toThrow();
  });
});

describe("R2StorageService.listOriginalVideoObjects (read-only, sayfalı)", () => {
  const config = { get: (key: string) => ({ R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET_NAME: "bucket", R2_PUBLIC_BASE_URL: "https://x" })[key as "R2_BUCKET_NAME"] } as unknown as ConfigService;

  it("ContinuationToken ile tüm sayfaları dolaşır ve yalnızca ListObjectsV2Command gönderir", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Contents: [{ Key: "originals/a/1.mp4", LastModified: minutesAgo(10), Size: 5 }], IsTruncated: true, NextContinuationToken: "t1" })
      .mockResolvedValueOnce({ Contents: [{ Key: "originals/b/2.mp4", Size: 6 }], IsTruncated: false });
    const service = new R2StorageService(config, { send } as unknown as S3Client);

    const objects = await service.listOriginalVideoObjects("originals/");

    expect(objects.map((o) => o.key)).toEqual(["originals/a/1.mp4", "originals/b/2.mp4"]);
    expect(send).toHaveBeenCalledTimes(2);
    for (const call of send.mock.calls) {
      expect(call[0]).toBeInstanceOf(ListObjectsV2Command);
    }
    expect((send.mock.calls[0]![0] as ListObjectsV2Command).input).toEqual({ Bucket: "bucket", Prefix: "originals/", ContinuationToken: undefined });
    expect((send.mock.calls[1]![0] as ListObjectsV2Command).input.ContinuationToken).toBe("t1");
  });
});
