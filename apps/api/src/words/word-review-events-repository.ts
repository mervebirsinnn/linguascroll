import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import type { ReviewEvent } from "./review-scheduling";
import { wordReviewEventsTable } from "./word-review-events.schema";

/**
 * `QuizAnswerEventsRepository`/`VideoWatchEventsRepository` ile AYNI desen:
 * append-only event log'unun persistence katmanı, ayrı bir aggregate.
 */
@Injectable()
export class WordReviewEventsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(params: { userId: string; wordId: string; isCorrect: boolean }): Promise<void> {
    await this.db.insert(wordReviewEventsTable).values(params);
  }

  /**
   * Kullanıcının TÜM review event'lerini `wordId`'ye göre gruplu döner — review
   * session hesaplaması (bkz. WordsService.getReviewSession) için TEK batch
   * sorgu, id başına ayrı bir sorgu YOK (mevcut N+1-önleme deseni).
   */
  async findEventsForUser(userId: string): Promise<Map<string, ReviewEvent[]>> {
    const rows = await this.db
      .select({
        wordId: wordReviewEventsTable.wordId,
        isCorrect: wordReviewEventsTable.isCorrect,
        reviewedAt: wordReviewEventsTable.reviewedAt,
      })
      .from(wordReviewEventsTable)
      .where(eq(wordReviewEventsTable.userId, userId));

    const eventsByWordId = new Map<string, ReviewEvent[]>();
    for (const row of rows) {
      const list = eventsByWordId.get(row.wordId) ?? [];
      list.push({ isCorrect: row.isCorrect, reviewedAt: row.reviewedAt });
      eventsByWordId.set(row.wordId, list);
    }
    return eventsByWordId;
  }

  /**
   * Progress aggregate — DISTINCT kelime sayıları (shared-types/words-progress.ts'in
   * semantik yorumuna bkz.: "kaç event" değil "kaç FARKLI kelime"). Tek sorguda,
   * `FILTER` ile hem "tüm zamanlar" hem "since" (bkz. WordsService — `since` =
   * now - 7 gün) sayıları — iki ayrı sorgu YOK.
   */
  async getReviewCounts(userId: string, since: Date): Promise<{ reviewed: number; reviewedSince: number; correct: number; correctSince: number }> {
    const [row] = await this.db
      .select({
        reviewed: sql<number>`COUNT(DISTINCT ${wordReviewEventsTable.wordId})`,
        reviewedSince: sql<number>`COUNT(DISTINCT ${wordReviewEventsTable.wordId}) FILTER (WHERE ${wordReviewEventsTable.reviewedAt} >= ${since})`,
        correct: sql<number>`COUNT(DISTINCT ${wordReviewEventsTable.wordId}) FILTER (WHERE ${wordReviewEventsTable.isCorrect})`,
        correctSince: sql<number>`COUNT(DISTINCT ${wordReviewEventsTable.wordId}) FILTER (WHERE ${wordReviewEventsTable.isCorrect} AND ${wordReviewEventsTable.reviewedAt} >= ${since})`,
      })
      .from(wordReviewEventsTable)
      .where(eq(wordReviewEventsTable.userId, userId));

    return {
      reviewed: Number(row?.reviewed ?? 0),
      reviewedSince: Number(row?.reviewedSince ?? 0),
      correct: Number(row?.correct ?? 0),
      correctSince: Number(row?.correctSince ?? 0),
    };
  }
}
