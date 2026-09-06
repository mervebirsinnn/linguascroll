import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { transcriptSegmentLearningPointsTable } from "./transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "./transcript-segments.schema";

/**
 * seed-videos.ts/seed-quizzes.ts ile aynı desen: bağımsız script, DATABASE_URL'i
 * doğrudan process.env'den okur, sabit id'lerle idempotent (`ON CONFLICT DO NOTHING`).
 *
 * Kullanıcı kararı: Chunk 10'un TTS+waveform curated video transcript'leri
 * KALDIRILDI — feed artık SADECE Chunk 11'in gerçek, kullanıcının kendi
 * sağladığı videolarını içeriyor (bkz. seed-videos.ts'teki aynı karar).
 *
 * Chunk 11 — GERÇEK insan konuşmalı videolar (STT pipeline çıktısından).
 * `text` alanları elle YAZILMADI — scripts/stt/output/<content-id>/draft.json'dan
 * BİREBİR kopyalandı (ordinal/startMs/endMs/text). Sadece englishExplanation/
 * turkishExplanation/learning point'ler elle eklendi (bkz. ÖNEMLİ AYRIM, Chunk 11 planı).
 */
const videoIds = {
  workingOutAgain: "60000000-0000-4000-8000-000000000001",
  commonMistakes: "60000000-0000-4000-8000-000000000002",
  introduceYourself: "60000000-0000-4000-8000-000000000003",
  orderingFood: "60000000-0000-4000-8000-000000000004",
};

const seedSegments = [
  // --- Chunk 11: working-out-again (gerçek video, STT draft.json'dan) ---
  { id: "61000000-0000-4000-8000-000000000001", videoId: videoIds.workingOutAgain, ordinal: 1, startMs: 1560, endMs: 2400,
    text: "Hi,",
    englishExplanation: "A casual greeting to start the video.",
    turkishExplanation: "Videoyu başlatan gündelik bir selamlama." },
  { id: "61000000-0000-4000-8000-000000000002", videoId: videoIds.workingOutAgain, ordinal: 2, startMs: 3180, endMs: 6340,
    text: "today I decided to start working out again.",
    englishExplanation: "Today, the speaker made a decision to start exercising again.",
    turkishExplanation: "Konuşmacı bugün yeniden spor yapmaya başlamaya karar vermiş." },
  { id: "61000000-0000-4000-8000-000000000003", videoId: videoIds.workingOutAgain, ordinal: 3, startMs: 6820, endMs: 9920,
    text: "I haven't exercised regularly for a while.",
    englishExplanation: "The speaker hasn't been exercising on a regular basis for some time.",
    turkishExplanation: "Konuşmacı bir süredir düzenli olarak egzersiz yapmıyormuş." },
  { id: "61000000-0000-4000-8000-000000000004", videoId: videoIds.workingOutAgain, ordinal: 4, startMs: 10700, endMs: 13300,
    text: "So I want to take things slowly.",
    englishExplanation: "The speaker wants to start slowly, without rushing.",
    turkishExplanation: "Konuşmacı acele etmeden, yavaş yavaş başlamak istiyor." },
  { id: "61000000-0000-4000-8000-000000000005", videoId: videoIds.workingOutAgain, ordinal: 5, startMs: 13920, endMs: 18420,
    text: "My main goal is to feel stronger and have more energy.",
    englishExplanation: "The speaker's main objective is to become stronger and gain more energy.",
    turkishExplanation: "Konuşmacının asıl hedefi daha güçlü olmak ve daha fazla enerjiye sahip olmak." },
  { id: "61000000-0000-4000-8000-000000000006", videoId: videoIds.workingOutAgain, ordinal: 6, startMs: 18420, endMs: 21260,
    text: "I know it might be difficult at first,",
    englishExplanation: "The speaker expects it to be hard in the beginning.",
    turkishExplanation: "Konuşmacı başlangıçta zor olabileceğinin farkında." },
  { id: "61000000-0000-4000-8000-000000000007", videoId: videoIds.workingOutAgain, ordinal: 7, startMs: 21760, endMs: 24820,
    text: "but I'm actually looking forward to it.",
    englishExplanation: "Despite the difficulty, the speaker is genuinely excited about it.",
    turkishExplanation: "Zorluğa rağmen, konuşmacı bunu gerçekten dört gözle bekliyor." },

  // --- Chunk 11: common-mistakes (gerçek video, STT draft.json'dan) ---
  { id: "61000000-0000-4000-8000-000000000011", videoId: videoIds.commonMistakes, ordinal: 1, startMs: 0, endMs: 4840,
    text: "A lot of English learners accidentally say, I am agree when they want to support an idea.",
    englishExplanation: "Many English learners mistakenly say 'I am agree' when they mean to agree with something.",
    turkishExplanation: "Birçok İngilizce öğrencisi bir fikri desteklemek isterken yanlışlıkla 'I am agree' der." },
  { id: "61000000-0000-4000-8000-000000000012", videoId: videoIds.commonMistakes, ordinal: 2, startMs: 5300, endMs: 9320,
    text: "In English, agree is already a verb, so you just say, I agree,",
    englishExplanation: "Because 'agree' is already a verb, the correct form is simply 'I agree'.",
    turkishExplanation: "'Agree' kelimesi zaten bir fiil olduğu için doğru kullanım sadece 'I agree'dir." },
  { id: "61000000-0000-4000-8000-000000000013", videoId: videoIds.commonMistakes, ordinal: 3, startMs: 9820, endMs: 10540,
    text: "like in the sentence,",
    englishExplanation: "For example, in a sentence like this:",
    turkishExplanation: "Örneğin şöyle bir cümlede:" },
  { id: "61000000-0000-4000-8000-000000000014", videoId: videoIds.commonMistakes, ordinal: 4, startMs: 11180, endMs: 12260,
    text: "I agree with your idea.",
    englishExplanation: "'I agree with your idea' is the correct way to say it.",
    turkishExplanation: "'I agree with your idea' doğru kullanımdır." },
  { id: "61000000-0000-4000-8000-000000000015", videoId: videoIds.commonMistakes, ordinal: 5, startMs: 12800, endMs: 16380,
    text: "Another tricky mix up is using say me instead of tell me.",
    englishExplanation: "Another common confusion is saying 'say me' instead of 'tell me'.",
    turkishExplanation: "Bir diğer yaygın karışıklık 'tell me' yerine 'say me' demek." },
  { id: "61000000-0000-4000-8000-000000000016", videoId: videoIds.commonMistakes, ordinal: 6, startMs: 16900, endMs: 18300,
    text: "You always tell someone something,",
    englishExplanation: "You always use 'tell' together with the person you're speaking to.",
    turkishExplanation: "'Tell' her zaman konuştuğun kişiyle birlikte kullanılır." },
  { id: "61000000-0000-4000-8000-000000000017", videoId: videoIds.commonMistakes, ordinal: 7, startMs: 18800, endMs: 19240,
    text: "for example,",
    englishExplanation: "For example:",
    turkishExplanation: "Örneğin:" },
  { id: "61000000-0000-4000-8000-000000000018", videoId: videoIds.commonMistakes, ordinal: 8, startMs: 19740, endMs: 20800,
    text: "please tell me the time.",
    englishExplanation: "'Please tell me the time' is the correct way to ask.",
    turkishExplanation: "'Please tell me the time' doğru soru şeklidir." },
  { id: "61000000-0000-4000-8000-000000000019", videoId: videoIds.commonMistakes, ordinal: 9, startMs: 21280, endMs: 25580,
    text: "Finally, people often say discuss about, but the word about is unnecessary.",
    englishExplanation: "Finally, people often add the word 'about' after 'discuss', but it isn't necessary.",
    turkishExplanation: "Son olarak, insanlar genellikle 'discuss'tan sonra 'about' kelimesini ekliyor ama buna gerek yok." },
  { id: "61000000-0000-4000-8000-000000000020", videoId: videoIds.commonMistakes, ordinal: 10, startMs: 26280, endMs: 30600,
    text: "You just discuss something directly, such as, let's discuss our weekend plans.",
    englishExplanation: "You discuss something directly, without adding 'about' — for example: 'let's discuss our weekend plans'.",
    turkishExplanation: "Bir şeyi 'about' eklemeden doğrudan 'discuss' edersin — örneğin: 'let's discuss our weekend plans'." },
  { id: "61000000-0000-4000-8000-000000000021", videoId: videoIds.commonMistakes, ordinal: 11, startMs: 31280, endMs: 35500,
    text: "Making these small fixes will make your speaking feel instantly smoother and more",
    englishExplanation: "Making these small corrections will instantly make your speaking sound smoother and more...",
    turkishExplanation: "Bu küçük düzeltmeleri yapmak konuşmanı anında daha akıcı ve daha..." },
  { id: "61000000-0000-4000-8000-000000000022", videoId: videoIds.commonMistakes, ordinal: 12, startMs: 35500, endMs: 35920,
    text: "confident.",
    englishExplanation: "...confident.",
    turkishExplanation: "...kendinden emin gösterecek." },

  // --- Chunk 11: introduce-yourself (gerçek video, STT draft.json'dan) ---
  { id: "61000000-0000-4000-8000-000000000031", videoId: videoIds.introduceYourself, ordinal: 1, startMs: 0, endMs: 4220,
    text: "Introducing yourself in English does not need to feel scary or complicated.",
    englishExplanation: "Introducing yourself in English is simple once you know a few key phrases.",
    turkishExplanation: "İngilizce kendini tanıtmak birkaç önemli ifadeyi bilince oldukça kolaydır." },
  { id: "61000000-0000-4000-8000-000000000032", videoId: videoIds.introduceYourself, ordinal: 2, startMs: 4760, endMs: 8120,
    text: "Start with your background using the phrase, I'm originally from.",
    englishExplanation: "Start with where you're from, using the phrase 'I'm originally from'.",
    turkishExplanation: "Aslen nereli olduğunla başla — 'I'm originally from' ifadesini kullanarak." },
  { id: "61000000-0000-4000-8000-000000000033", videoId: videoIds.introduceYourself, ordinal: 3, startMs: 8680, endMs: 9800,
    text: "Followed by where you live now.",
    englishExplanation: "Then follow it with where you currently live.",
    turkishExplanation: "Ardından şu an nerede yaşadığını ekle." },
  { id: "61000000-0000-4000-8000-000000000034", videoId: videoIds.introduceYourself, ordinal: 4, startMs: 10280, endMs: 11740,
    text: "For instance, you can say,",
    englishExplanation: "For instance, you can say:",
    turkishExplanation: "Örneğin şöyle diyebilirsin:" },
  { id: "61000000-0000-4000-8000-000000000035", videoId: videoIds.introduceYourself, ordinal: 5, startMs: 12280, endMs: 15300,
    text: "I'm originally from Brazil, but now I live in Chicago.",
    englishExplanation: "'I'm originally from Brazil, but now I live in Chicago' is a real example of this pattern.",
    turkishExplanation: "'I'm originally from Brazil, but now I live in Chicago' bu kalıbın gerçek bir örneği." },
  { id: "61000000-0000-4000-8000-000000000036", videoId: videoIds.introduceYourself, ordinal: 6, startMs: 16020, endMs: 19880,
    text: "Next, share your current job using the phrase, I've been working as.",
    englishExplanation: "Next, describe your current job using the phrase 'I've been working as'.",
    turkishExplanation: "Sonra, şu anki mesleğini 'I've been working as' ifadesiyle anlat." },
  { id: "61000000-0000-4000-8000-000000000037", videoId: videoIds.introduceYourself, ordinal: 7, startMs: 19880, endMs: 21160,
    text: "Which shows your.",
    // NOT (kod yorumu, kullanıcıya gösterilen alan değil): bu segment videonun
    // gerçek, kesik bitişi — STT çıktısı aynen taşındı, cümle elle TAMAMLANMADI.
    englishExplanation: "This sentence appears to be cut off here — the video ends before completing the thought.",
    turkishExplanation: "Bu cümle burada yarım kalmış görünüyor — video, düşünce tamamlanmadan bitiyor." },

  // --- Chunk 11: ordering-food (gerçek video, STT draft.json'dan) ---
  { id: "61000000-0000-4000-8000-000000000041", videoId: videoIds.orderingFood, ordinal: 1, startMs: 0, endMs: 4620,
    text: "Ordering food in English is actually super simple once you know a few key phrases.",
    englishExplanation: "Ordering food in English is simple once you know a few key phrases.",
    turkishExplanation: "İngilizce yemek siparişi vermek birkaç önemli ifadeyi bilince oldukça kolaydır." },
  { id: "61000000-0000-4000-8000-000000000042", videoId: videoIds.orderingFood, ordinal: 2, startMs: 5080, endMs: 10320,
    text: "First, instead of saying I want, try using could I get, like, could I get the cheeseburger",
    englishExplanation: "First, instead of saying 'I want', try 'could I get' — for example, 'could I get the cheeseburger'.",
    turkishExplanation: "Önce, 'I want' demek yerine 'could I get' kullanmayı dene — örneğin 'could I get the cheeseburger'." },
  { id: "61000000-0000-4000-8000-000000000043", videoId: videoIds.orderingFood, ordinal: 3, startMs: 10320, endMs: 10720,
    text: "please?",
    englishExplanation: "...please?' (the polite phrase continues here)",
    turkishExplanation: "...lütfen?' (kibar ifadenin devamı)" },
  { id: "61000000-0000-4000-8000-000000000044", videoId: videoIds.orderingFood, ordinal: 4, startMs: 11340, endMs: 12340,
    text: "It sounds much more polite.",
    englishExplanation: "This phrasing sounds much more polite than saying 'I want'.",
    turkishExplanation: "Bu ifade 'I want' demekten çok daha kibar gelir." },
  { id: "61000000-0000-4000-8000-000000000045", videoId: videoIds.orderingFood, ordinal: 5, startMs: 12980, endMs: 17800,
    text: "Next, when you are ready to choose your main meal, say I'll have, for example, I'll have",
    englishExplanation: "Next, when choosing your main meal, say 'I'll have' — for example, 'I'll have...'",
    turkishExplanation: "Sonra, ana yemeğini seçerken 'I'll have' de — örneğin 'I'll have...'" },
  { id: "61000000-0000-4000-8000-000000000046", videoId: videoIds.orderingFood, ordinal: 6, startMs: 17800, endMs: 18500,
    text: "the grilled salmon.",
    englishExplanation: "...the grilled salmon.' (the example continues here)",
    turkishExplanation: "...ızgara somon.' (örneğin devamı)" },
  { id: "61000000-0000-4000-8000-000000000047", videoId: videoIds.orderingFood, ordinal: 7, startMs: 18960, endMs: 23820,
    text: "Finally, if you want to know about side dishes, ask does this come with, like, does this",
    englishExplanation: "Finally, to ask about side dishes, use 'does this come with' — for example, 'does this...'",
    turkishExplanation: "Son olarak, yanında ne geldiğini sormak için 'does this come with' kullan — örneğin 'does this...'" },
  { id: "61000000-0000-4000-8000-000000000048", videoId: videoIds.orderingFood, ordinal: 8, startMs: 23820, endMs: 24760,
    text: "come with a side salad?",
    englishExplanation: "...come with a side salad?' (the example continues here)",
    turkishExplanation: "...yanında salata geliyor mu?' (örneğin devamı)" },
  { id: "61000000-0000-4000-8000-000000000049", videoId: videoIds.orderingFood, ordinal: 9, startMs: 25240, endMs: 29700,
    text: "Try these three phrases next time you eat out, and you will instantly sound like a local.",
    englishExplanation: "Using these three phrases will instantly make you sound like a native speaker when eating out.",
    turkishExplanation: "Bu üç ifadeyi kullanmak, dışarıda yemek yerken anadili İngilizce olan biri gibi konuşmanı sağlayacak." },
];

const seedLearningPoints = [
  // --- Chunk 11: working-out-again ---
  { id: "62000000-0000-4000-8000-000000000001", transcriptSegmentId: "61000000-0000-4000-8000-000000000002", type: "phrase", ordinal: 1,
    expression: "decide to + verb",
    englishExplanation: "Used to express making a decision to do something.",
    turkishExplanation: "Bir şey yapmaya karar vermek için kullanılır.",
    exampleEn: "She decided to learn Spanish.", exampleTr: "İspanyolca öğrenmeye karar verdi." },
  { id: "62000000-0000-4000-8000-000000000002", transcriptSegmentId: "61000000-0000-4000-8000-000000000003", type: "grammar", ordinal: 1,
    expression: "present perfect + for + duration",
    englishExplanation: "Used to describe an action that started in the past and whose effect continues to be true now.",
    turkishExplanation: "Geçmişte başlayıp etkisi hâlâ süren bir durumu anlatmak için kullanılır.",
    exampleEn: "I haven't seen him for a while.", exampleTr: "Onu bir süredir görmedim." },
  { id: "62000000-0000-4000-8000-000000000003", transcriptSegmentId: "61000000-0000-4000-8000-000000000007", type: "phrase", ordinal: 1,
    expression: "look forward to + noun/gerund",
    englishExplanation: "Used to say you feel excited about something that will happen.",
    turkishExplanation: "Gerçekleşecek bir şey için heyecanlı/istekli olmayı ifade eder.",
    exampleEn: "I'm looking forward to the weekend.", exampleTr: "Hafta sonunu dört gözle bekliyorum." },

  // --- Chunk 11: common-mistakes (video, bir dil dersi olduğu için segment↔learning point eşlemesi yoğun) ---
  { id: "62000000-0000-4000-8000-000000000011", transcriptSegmentId: "61000000-0000-4000-8000-000000000011", type: "grammar", ordinal: 1,
    expression: "I agree (NOT 'I am agree')",
    englishExplanation: "'Agree' is already a verb in English, so it needs no 'am/is/are' before it.",
    turkishExplanation: "'Agree' İngilizce'de zaten bir fiildir, önüne 'am/is/are' eklenmez.",
    exampleEn: "I agree with you.", exampleTr: "Sana katılıyorum." },
  { id: "62000000-0000-4000-8000-000000000012", transcriptSegmentId: "61000000-0000-4000-8000-000000000015", type: "grammar", ordinal: 1,
    expression: "tell someone (NOT 'say me')",
    englishExplanation: "'Tell' is used together with a person (tell someone); 'say' is used with the words spoken, not a person.",
    turkishExplanation: "'Tell' bir kişiyle birlikte kullanılır (tell someone); 'say' ise söylenen sözle kullanılır, kişiyle değil.",
    exampleEn: "Tell me your name.", exampleTr: "Bana adını söyle." },
  { id: "62000000-0000-4000-8000-000000000013", transcriptSegmentId: "61000000-0000-4000-8000-000000000019", type: "grammar", ordinal: 1,
    expression: "discuss something (NOT 'discuss about something')",
    englishExplanation: "'Discuss' already means 'to talk about', so adding 'about' after it is redundant.",
    turkishExplanation: "'Discuss' zaten 'hakkında konuşmak' anlamına gelir, bu yüzden arkasına 'about' eklemek gereksizdir.",
    exampleEn: "Let's discuss the plan.", exampleTr: "Planı tartışalım." },

  // --- Chunk 11: introduce-yourself ---
  { id: "62000000-0000-4000-8000-000000000021", transcriptSegmentId: "61000000-0000-4000-8000-000000000032", type: "phrase", ordinal: 1,
    expression: "I'm originally from + place",
    englishExplanation: "Used to say where you were born or grew up, especially if you live somewhere else now.",
    turkishExplanation: "Aslen nereli olduğunu (şu an başka bir yerde yaşasan bile) söylemek için kullanılır.",
    exampleEn: "I'm originally from Italy.", exampleTr: "Aslen İtalyanım." },
  { id: "62000000-0000-4000-8000-000000000022", transcriptSegmentId: "61000000-0000-4000-8000-000000000036", type: "grammar", ordinal: 1,
    expression: "I've been working as + job (present perfect continuous)",
    englishExplanation: "Used to describe a job you have been doing for some time, up to now.",
    turkishExplanation: "Şu ana kadar bir süredir yaptığın bir işi anlatmak için kullanılır.",
    exampleEn: "I've been working as a teacher for five years.", exampleTr: "Beş yıldır öğretmen olarak çalışıyorum." },

  // --- Chunk 11: ordering-food ---
  { id: "62000000-0000-4000-8000-000000000031", transcriptSegmentId: "61000000-0000-4000-8000-000000000042", type: "phrase", ordinal: 1,
    expression: "Could I get...? (instead of 'I want')",
    englishExplanation: "A polite way to order food, more natural than directly saying 'I want'.",
    turkishExplanation: "Yemek sipariş ederken doğrudan 'I want' demek yerine kullanılan daha kibar bir ifade.",
    exampleEn: "Could I get a coffee, please?", exampleTr: "Bir kahve alabilir miyim?" },
  { id: "62000000-0000-4000-8000-000000000032", transcriptSegmentId: "61000000-0000-4000-8000-000000000045", type: "phrase", ordinal: 1,
    expression: "I'll have... (ordering food)",
    englishExplanation: "A common, natural way to state your choice when ordering food.",
    turkishExplanation: "Yemek siparişinde tercihini belirtmek için kullanılan doğal ve yaygın bir ifade.",
    exampleEn: "I'll have the grilled salmon.", exampleTr: "Izgara somon alayım." },
  { id: "62000000-0000-4000-8000-000000000033", transcriptSegmentId: "61000000-0000-4000-8000-000000000047", type: "phrase", ordinal: 1,
    expression: "Does this come with...?",
    englishExplanation: "Used to ask what is included with a dish.",
    turkishExplanation: "Bir yemeğin yanında ne geldiğini sormak için kullanılır.",
    exampleEn: "Does this come with fries?", exampleTr: "Bunun yanında patates kızartması geliyor mu?" },
] as const;

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  await db.insert(videoTranscriptSegmentsTable).values(seedSegments).onConflictDoNothing({ target: videoTranscriptSegmentsTable.id });
  await db
    .insert(transcriptSegmentLearningPointsTable)
    .values(seedLearningPoints.map((lp) => ({ ...lp })))
    .onConflictDoNothing({ target: transcriptSegmentLearningPointsTable.id });

  await pool.end();
  console.log(
    `Seed tamamlandı: ${seedSegments.length} transcript segment, ${seedLearningPoints.length} learning point (idempotent).`,
  );
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
