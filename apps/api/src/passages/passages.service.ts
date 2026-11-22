import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  passageAnswerResultSchema,
  passageLevelSchema,
  passagePageSchema,
  type Passage,
  type PassageAnswerResult,
  type PassagePage,
  type PassagesQuery,
} from "@linguascroll/shared-types";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { PassageAnswersRepository } from "./passage-answers-repository";
import { decodePassageCursor, encodePassageCursor, InvalidPassageCursorError } from "./passage-cursor";
import { buildParagraphRuns, type RunWordInfo } from "./passage-runs";
import {
  PassagesRepository,
  type PassageOptionRow,
  type PassageQuestionRow,
  type PassageRow,
  type PassageSpanRow,
  type PassageWordRow,
} from "./passages-repository";

/** Bir sayfadaki METİN sayısı (mobil her metni 5 dikey sayfaya açar → 15 sayfa). Pagination birimi metindir. */
export const PASSAGES_PAGE_SIZE = 3;

type OpenContent = {
  questionsByPassage: Map<string, PassageQuestionRow[]>;
  optionsByQuestion: Map<string, PassageOptionRow[]>;
  wordsByPassage: Map<string, PassageWordRow[]>;
  spansByPassage: Map<string, PassageSpanRow[]>;
  answersByQuestion: Map<string, { optionId: string; isCorrect: boolean }>;
  savedWordIds: Set<string>;
};

/**
 * Okuma pratiği use-case'leri. Erişim kararı TEK yerde: `SubscriptionsService.hasFullAccess` (kapı kapalı veya abone) ya da
 * metnin kendi `is_free_sample` işareti — ücretsiz hak defterine (free_video_grants) hiç yazılmaz.
 *
 * Gizlilik kuralı: cevaplanmamış bir soruda doğru şık, doğruluk bayrağı, tuzak türü ve açıklamalar payload'a HİÇ girmez
 * (`result: null`); kilitli metin yalnız başlık alanlarını taşır ve kilitli metin için soru/cevap/kelime sorguları hiç çalışmaz.
 * Kelime anlamları (gloss) açıktır (ürün kararı: öğrenme pratiği).
 */
@Injectable()
export class PassagesService {
  constructor(
    private readonly passagesRepository: PassagesRepository,
    private readonly passageAnswersRepository: PassageAnswersRepository,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async listPassages(userId: string, query: PassagesQuery): Promise<PassagePage> {
    const after = this.parseCursor(query);
    const hasFullAccess = await this.subscriptionsService.hasFullAccess(userId);

    // +1 satır: "sonraki sayfa var mı" bilgisi için (ek bir COUNT sorgusu olmadan).
    const rows = await this.passagesRepository.findActivePage(query.level, after, PASSAGES_PAGE_SIZE + 1);
    const hasMore = rows.length > PASSAGES_PAGE_SIZE;
    const page = rows.slice(0, PASSAGES_PAGE_SIZE);

    const openRows = page.filter((row) => hasFullAccess || row.isFreeSample);
    const content = await this.loadOpenContent(
      userId,
      openRows.map((row) => row.id),
    );
    const openIds = new Set(openRows.map((row) => row.id));

    const items = page.map((row): Passage => (openIds.has(row.id) ? this.toOpenPassage(row, content) : toLockedPassage(row)));

    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodePassageCursor({ level: query.level, sortOrder: last.sortOrder, id: last.id }) : null;
    return passagePageSchema.parse({ items, nextCursor });
  }

  async answerQuestion(userId: string, questionId: string, optionId: string): Promise<PassageAnswerResult> {
    const context = await this.passagesRepository.findQuestionAccessContext(questionId);
    // Emekli metin kullanıcıya gösterilmediği için cevaplanamaz: bilinmeyenle aynı 404.
    if (!context || context.retiredAt !== null) {
      throw new NotFoundException(`Soru bulunamadı: "${questionId}"`);
    }
    if (!context.isFreeSample && !(await this.subscriptionsService.hasFullAccess(userId))) {
      throw new ForbiddenException("Bu metin için abonelik gerekli");
    }

    const recorded = await this.passageAnswersRepository.record({ userId, questionId, optionId });
    if (recorded.status === "invalid-option") {
      throw new BadRequestException(`"${optionId}", "${questionId}" sorusuna ait bir şık değil`);
    }

    const options = await this.passagesRepository.findOptions([questionId]);
    // `correct` saklanan anlık görüntüden gelir (içerik sonradan düzeltilse bile tarihsel sonuç bozulmaz).
    return buildAnswerResult(options, recorded.answer.optionId, recorded.answer.isCorrect);
  }

  private parseCursor(query: PassagesQuery) {
    if (query.cursor === undefined) return null;
    try {
      const cursor = decodePassageCursor(query.cursor);
      if (cursor.level !== query.level) {
        throw new BadRequestException("Cursor başka bir seviyeye ait");
      }
      return cursor;
    } catch (error) {
      if (error instanceof InvalidPassageCursorError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /** Açık metinlerin içeriği: her tür için TEK toplu sorgu (metin/soru başına döngü yok). */
  private async loadOpenContent(userId: string, passageIds: string[]): Promise<OpenContent> {
    const [questions, words, spans] = await Promise.all([
      this.passagesRepository.findQuestions(passageIds),
      this.passagesRepository.findWords(passageIds),
      this.passagesRepository.findSpans(passageIds),
    ]);
    const questionIds = questions.map((question) => question.id);
    const [options, answers, savedWordIds] = await Promise.all([
      this.passagesRepository.findOptions(questionIds),
      this.passagesRepository.findUserAnswers(userId, questionIds),
      this.passagesRepository.findSavedWordIds(userId, [...new Set(words.map((word) => word.wordId))]),
    ]);

    return {
      questionsByPassage: groupBy(questions, (question) => question.passageId),
      optionsByQuestion: groupBy(options, (option) => option.questionId),
      wordsByPassage: groupBy(words, (word) => word.passageId),
      spansByPassage: groupBy(spans, (span) => span.passageId),
      answersByQuestion: new Map(answers.map((answer) => [answer.questionId, { optionId: answer.optionId, isCorrect: answer.isCorrect }])),
      savedWordIds,
    };
  }

  private toOpenPassage(row: PassageRow, content: OpenContent): Passage {
    const wordInfo = new Map<string, RunWordInfo>(
      (content.wordsByPassage.get(row.id) ?? []).map((word) => [word.wordId, { gloss: word.gloss, saved: content.savedWordIds.has(word.wordId), contextSentence: word.contextSentence }]),
    );
    const spans = content.spansByPassage.get(row.id) ?? [];
    const paragraphs = row.paragraphs.map((text, paragraphIndex) =>
      buildParagraphRuns(
        text,
        spans.filter((span) => span.paragraphIndex === paragraphIndex),
        wordInfo,
      ),
    );

    const questions = (content.questionsByPassage.get(row.id) ?? []).map((question) => {
      const options = content.optionsByQuestion.get(question.id) ?? [];
      const answer = content.answersByQuestion.get(question.id);
      return {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        // Cevap öncesi şık: yalnız id + metin.
        options: options.map((option) => ({ id: option.id, text: option.text })),
        // Anahtar ve açıklamalar YALNIZ kullanıcı bu soruyu daha önce cevapladıysa.
        result: answer ? buildAnswerResult(options, answer.optionId, answer.isCorrect) : null,
      };
    });

    return { access: "open", id: row.id, level: passageLevelSchema.parse(row.level), title: row.title, topic: row.topic, paragraphs, questions };
  }
}

function toLockedPassage(row: PassageRow): Passage {
  return { access: "locked", id: row.id, level: passageLevelSchema.parse(row.level), title: row.title, topic: row.topic };
}

function buildAnswerResult(options: readonly PassageOptionRow[], selectedOptionId: string, correct: boolean): PassageAnswerResult {
  const correctOption = options.find((option) => option.isCorrect);
  if (!correctOption) {
    // DB yalnız "en fazla bir" doğru şıkkı garanti eder; "tam bir" kuralı runtime'da (quizzes ile aynı) — sessizce yanlış sonuç dönme.
    throw new Error("Soru için doğru şık bulunamadı — veri bütünlüğü sorunu");
  }
  return passageAnswerResultSchema.parse({
    selectedOptionId,
    correctOptionId: correctOption.id,
    correct,
    options: options.map((option) => ({
      optionId: option.id,
      isCorrect: option.isCorrect,
      trapType: option.trapType,
      explanation: option.explanation,
    })),
  });
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
