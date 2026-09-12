# Onboarding & First-Use Analytics Events — Chunk 17 İçin Contract

Bu dosya sadece bir **isim/kontrat** dokümanı — Chunk 15'te hiçbir analytics SDK'sı/event-gönderme kodu eklenmedi (kullanıcı kararı: "Analytics sadece dokümante edilsin, SDK yok"). Chunk 17'de gerçek bir analytics pipeline kurulduğunda, bu event'lerin TETİKLENME NOKTALARI aşağıda kod-referanslı olarak belirtiliyor.

| Event | Ne zaman | Payload | Tetikleneceği yer (Chunk 17'de) |
|---|---|---|---|
| `onboarding_started` | `OnboardingFlow` ilk render edildiğinde (Level ekranı görünür olduğunda) | — | `OnboardingFlow.tsx` mount |
| `level_selected` | Kullanıcı bir CEFR level'a dokunduğunda | `{ level: CefrLevel }` | `LevelScreen.tsx` → `onSelect` |
| `topic_selected` | Kullanıcı bir topic chip'ini toggle ettiğinde | `{ topic: Topic, selected: boolean }` | `InterestsScreen.tsx` → `toggle` |
| `onboarding_completed` | Kullanıcı Interests ekranında "Devam Et"e bastığında (skip DEĞİL) | `{ level: CefrLevel \| null, topicCount: number }` | `OnboardingFlow.tsx` → `handleInterestsContinue` |
| `onboarding_skipped` | Kullanıcı herhangi bir ekranda "Atla"ya bastığında | `{ step: "level" \| "interests" }` | `OnboardingFlow.tsx` → `onSkip` |
| `first_video_started` | Kullanıcının GERÇEKTEN İLK kez bir video oynatmaya başladığı an (tüm session'lar boyunca bir kez) | `{ videoId: string }` | `VideoFeedItem.tsx` — `isActive` effect'i, `player.play()` çağrısı |
| `first_subtitle_tapped` | `handleSubtitleTap` ilk kez tetiklendiğinde | `{ videoId: string, segmentId: string }` | `VideoFeedItem.tsx` → `handleSubtitleTap` |
| `first_word_saved` | Bir kelime ilk kez `saved:true` olduğunda (word-tap veya vocabulary panelinden — ikisi de `onToggleSaveWord`'ü kullanıyor) | `{ wordId: string }` | `use-saved-word-ids.ts` → `applyToggleSuccess` |
| `first_quiz_answered` | Bir quiz ilk kez başarıyla cevaplandığında | `{ quizId: string, correct: boolean }` | `QuizFeedItem.tsx` → `submit`'in başarı dalı |

**"İlk kez" (first_*) event'lerinin tespiti**: bu event'ler TÜM app ömrü boyunca sadece BİR KEZ tetiklenmeli — Chunk 17'de muhtemelen `vocabulary-hint-storage.ts`'teki desenle AYNI şekilde (küçük bir AsyncStorage boolean seti) izlenecek, ayrı bir analytics-state modeli GEREKMİYOR.

**Kapsam dışı (bu dosyada YOK)**: event gönderme kodu, bir SDK seçimi (Amplitude/Mixpanel/vb.), event batching/retry, kullanıcı-seviyesi analytics profili — hepsi Chunk 17'nin kapsamı.

## Learning Memory & Review — Chunk 16 Eklentisi

Chunk 15'teki AYNI kural: bu SADECE bir isim/kontrat listesi, Chunk 16'da hiçbir SDK/event-gönderme kodu eklenmedi (kullanıcı kararı — madde 13, "Analytics: sadece isim/kontrat, SDK yok").

| Event | Ne zaman | Payload | Tetikleneceği yer (Chunk 17'de) |
|---|---|---|---|
| `learning_memory_opened` | Kullanıcı Feed'deki "📚 Kelimelerim" butonuna basıp `MemoryFlow` render edildiğinde | — | `App.tsx` → `onOpenMemory` / `MemoryFlow.tsx` mount |
| `review_started` | `ReviewScreen`, en az 1 due kelimeyle başarıyla yüklendiğinde (boş session'da TETİKLENMEZ) | `{ sessionSize: number }` | `ReviewScreen.tsx` — `useReviewSession` success, `state.words.length > 0` |
| `review_item_answered` | Bir `ReviewCard`'ın submit'i başarılı olduğunda (hatalı/retry denemeleri DEĞİL, sadece nihai başarı) | `{ wordId: string, correct: boolean }` | `ReviewCard.tsx` → `submit`'in başarı dalı (`onAnswered` çağrılmadan hemen önce) |
| `review_completed` | Kullanıcı session'daki son kelimeyi de cevaplayıp "Bu oturumdaki tüm kelimeleri tekrar ettin" ekranına ulaştığında | `{ completedCount: number }` | `ReviewScreen.tsx` — `currentIndex >= state.words.length` durumuna geçiş |
| `progress_viewed` | `ProgressScreen`, veri başarıyla yüklendiğinde | `{ savedCount: number, reviewedCount: number, rememberedCorrectlyCount: number }` | `ProgressScreen.tsx` — `useWordsProgress` success |

**Kapsam dışı (Chunk 15'tekiyle AYNI sınır)**: event gönderme kodu, SDK seçimi, batching/retry — hepsi Chunk 17'nin kapsamı. Bu chunk'ta streak/XP/gamification event'leri BİLİNÇLİ OLARAK yok (madde 7 — "streak yok, XP yok, level-up yok, coin yok").
