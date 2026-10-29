import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { usersTable } from "../users/users.schema";
import { freePreviewVideosTable } from "./free-preview-videos.schema";
import type { FeedScope } from "@linguascroll/shared-types";
import { freeVideoGrantsTable } from "./free-video-grants.schema";

export type FreeGrantResult = "granted" | "already-granted" | "exhausted" | "unknown-user";

/**
 * 2026-10-27 — ücretsiz hak defterinin (free_video_grants) TEK erişim noktası.
 */
@Injectable()
export class FreeVideoGrantsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** İlk seçki kullanıcı satırı kilidi altında oluşturulur. Farklı cihaz/sekme aynı
   * seçkiyi görür; shuffle, tekrar izleme ve yeni içerik yayını mevcut seçkiyi değiştirmez. */
  async getOrCreatePreview(userId: string, scope: FeedScope, candidates: readonly string[], cap: number): Promise<Set<string>> {
    return this.db.transaction(async (tx) => {
      const user = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).for("update");
      if (!user.length) return new Set<string>();
      const rows = await tx.select({ videoId: freePreviewVideosTable.videoId }).from(freePreviewVideosTable)
        .where(and(eq(freePreviewVideosTable.userId, userId), eq(freePreviewVideosTable.scope, scope)));
      const selected = new Set(rows.map((row) => row.videoId));
      // Katalog başlangıçta 10'dan küçükse yalnızca boş yerler sonradan tamamlanır.
      const added = [...new Set(candidates)].filter((id) => !selected.has(id)).slice(0, Math.max(0, cap - selected.size));
      if (added.length) await tx.insert(freePreviewVideosTable).values(added.map((videoId) => ({ userId, scope, videoId })));
      return new Set([...selected, ...added]);
    });
  }

  /**
   * Hak kontrolü + kaydı TEK transaction'da. Eşzamanlılık: önce kullanıcının `users`
   * satırı `FOR UPDATE` ile kilitleniyor — aynı kullanıcının paralel istekleri (aynı ya da
   * farklı cihaz) burada SIRAYA giriyor; ikinci transaction kilidi aldığında birincinin
   * commit ettiği satırı READ COMMITTED altında yeni sorgularında görüyor. Böylece 9 hak
   * kullanılmışken iki eşzamanlı farklı video isteğinden yalnızca biri geçer.
   *
   * Neden SERIALIZABLE/advisory lock değil: SERIALIZABLE retry döngüsü gerektirir; advisory
   * lock'un anahtarı (uuid→bigint) ayrı bir eşleme ister. Kullanıcı satırı zaten var olan,
   * doğal bir "kullanıcı başına mutex" — kilit sadece o kullanıcının erişim isteklerini
   * sıralar, başka kullanıcıları etkilemez.
   */
  async tryGrant(userId: string, videoId: string, cap: number): Promise<FreeGrantResult> {
    return this.db.transaction(async (tx) => {
      const lockedUser = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).for("update");
      if (lockedUser.length === 0) {
        return "unknown-user";
      }

      const existing = await tx
        .select({ videoId: freeVideoGrantsTable.videoId })
        .from(freeVideoGrantsTable)
        .where(and(eq(freeVideoGrantsTable.userId, userId), eq(freeVideoGrantsTable.videoId, videoId)));
      if (existing.length > 0) {
        return "already-granted";
      }

      const [row] = await tx.select({ value: count() }).from(freeVideoGrantsTable).where(eq(freeVideoGrantsTable.userId, userId));
      if ((row?.value ?? 0) >= cap) {
        return "exhausted";
      }

      await tx.insert(freeVideoGrantsTable).values({ userId, videoId });
      return "granted";
    });
  }

  /**
   * Feed'in sayfa kesme hesabı için (kesin yetki DEĞİL — o tryGrant'ta): toplam tüketilen
   * hak + verilen aday id'lerden hangileri zaten açılmış. İki sorgu, ikisi de PK üzerinden.
   */
  async getUsage(userId: string, candidateVideoIds: readonly string[]): Promise<{ consumed: number; grantedVideoIds: Set<string> }> {
    const [countRows, grantedRows] = await Promise.all([
      this.db.select({ value: count() }).from(freeVideoGrantsTable).where(eq(freeVideoGrantsTable.userId, userId)),
      candidateVideoIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select({ videoId: freeVideoGrantsTable.videoId })
            .from(freeVideoGrantsTable)
            .where(and(eq(freeVideoGrantsTable.userId, userId), inArray(freeVideoGrantsTable.videoId, [...candidateVideoIds]))),
    ]);
    return { consumed: countRows[0]?.value ?? 0, grantedVideoIds: new Set(grantedRows.map((r) => r.videoId)) };
  }
}
