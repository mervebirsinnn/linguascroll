import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["The{} Rosetta{Rosetta} Stone{Taş} is{} often{sıklıkla} described{tanımlanmak} as{olarak} the{} key{anahtar} that{ki} unlocked{açtı} ancient{eski} Egypt{Mısır}, but{ama} the{} metaphor{mecaz} hides{gizler} a{} slower{daha yavaş} and{} more{daha} contested{tartışmalı} story{hikâye}.", "Rosetta Taşı sıklıkla eski Mısır'ı açan anahtar olarak anılır; ancak bu mecaz daha yavaş ve daha tartışmalı bir hikâyeyi gizler."],
    ["Discovered{keşfedilmek} in{-de} seventeen{on yedi} ninety{doksan} nine{dokuz} by{tarafından} French{Fransız} soldiers{askerler} during{sırasında} Napoleon's{Napolyon (iyelik)} Egyptian{Mısır} campaign{sefer}, the{} slab{levha} was{} surrendered{teslim edilmek} to{-e} Britain{İngiltere} after{sonra} the{} French{Fransız} defeat{yenilgi} and{} has{} been{} displayed{sergilenmek} in{-de} the{} British{İngiliz} Museum{Müze} since{-den beri} eighteen{on sekiz} oh{sıfır} two{iki}.", "1799'da Napolyon'un Mısır seferi sırasında Fransız askerlerce keşfedilen levha, Fransız yenilgisinden sonra İngiltere'ye teslim edildi ve 1802'den beri British Museum'da sergileniyor."],
    ["It{} carries{taşır} a{} single{tek} decree{ferman} in{} three{üç} scripts{yazılar}, which{ki bu} is{} why{neden} some{bazı} scholars{bilginler} stress{vurgulamak} that{ki} it{} is{} bilingual{iki dilli}, not{değil} trilingual{üç dilli}: Egyptian{Mısır} appears{görünür} twice{iki kez}, in{} hieroglyphic{hiyeroglif} and{} Demotic{Demotik} form{biçim}, alongside{yanında} Greek{Yunanca}.", "Tek bir fermanı üç yazıyla taşır; bu yüzden bazı bilginler onun üç dilli değil iki dilli olduğunu vurgular: Mısırca iki kez, hiyeroglif ve Demotik biçimde, Yunancanın yanında görünür."],
    ["In{-de} that{o} sense{anlam}, the{} stone{taş} is{} better{daha iyi} understood{anlaşılmak} as{olarak} a{} starting{başlangıç} point{nokta} than{-den} as{olarak} a{} solution{çözüm}.", "Bu anlamda taş, bir çözümden çok bir başlangıç noktası olarak anlaşılır."],
  ],
  [
    ["Because{çünkü} scholars{bilginler} could{-ebilirdi} read{okumak} the{} Greek{Yunanca}, the{} stone{taş} offered{sunmak} an{} unprecedented{eşi görülmemiş} chance{şans} to{-mek} compare{karşılaştırmak} texts{metinler}.", "Bilginler Yunancayı okuyabildiği için taş, metinleri karşılaştırma konusunda eşi görülmemiş bir fırsat sundu."],
    ["Yet{yine de} a{} comparison{karşılaştırma} alone{tek başına} proved{olduğu anlaşıldı (prove + sıfat)} insufficient{yetersiz}, because{çünkü} it{} was{} widely{yaygın biçimde} assumed{varsaymak} that{ki} hieroglyphs{hiyeroglifler} recorded{kaydetmek} ideas{fikirler} rather{yerine (rather than)} than{yerine (rather than)} sounds{sesler}.", "Yine de tek başına bir karşılaştırma yetersiz kaldı, çünkü hiyerogliflerin sesleri değil fikirleri kaydettiği yaygın biçimde varsayılıyordu."],
    ["The{} English{İngiliz} scientist{bilim insanı} Thomas{Thomas} Young{Young} made{yaptı} a{} real{gerçek} breakthrough{atılım} in{} the{} early{erken} eighteen{on sekiz} hundreds{yüzler} by{-erek} showing{göstermek} that{ki} the{} hieroglyphic{hiyeroglif} and{} Demotic{Demotik} texts{metinler} shared{paylaşmak} striking{çarpıcı} similarities{benzerlikler}.", "İngiliz bilim insanı Thomas Young, 1800'lerin başında hiyeroglif ve Demotik metinlerin çarpıcı benzerlikler taşıdığını göstererek gerçek bir atılım yaptı."],
    ["It{} fell{düşmek (görev ...e düştü)} to{düşmek (görev ...e düştü)} the{} Frenchman{Fransız} Jean{Jean}-Francois{Francois} Champollion{Champollion}, however{ancak}, to{-mek} demonstrate{kanıtlamak} that{ki} many{birçok} signs{işaretler} also{ayrıca} spelled{sesleri karşılamak (işaret sesi gösterir)} sounds{sesler}, a{} conclusion{sonuç} he{} announced{duyurdu} in{-de} eighteen{on sekiz} twenty{yirmi} two{iki}.", "Ancak birçok işaretin ses de gösterdiğini, 1822'de duyurduğu bir sonuçla kanıtlamak Fransız Jean-François Champollion'a düştü."],
    ["Progress{ilerleme} depended{bağlıydı} on{-e} patience{sabır}, on{-e} rival{rakip} theories{teoriler}, and{} on{-e} scholars{bilginler} who{ki onlar} were{} willing{istekli} to{-mek} correct{düzeltmek} one{bir} another{diğer}.", "İlerleme sabra, rakip teorilere ve birbirini düzeltmeye istekli bilginlere bağlıydı."],
  ],
  [
    ["Historians{tarihçiler} still{hâlâ} debate{tartışmak} how{nasıl} to{-mek} divide{bölmek} the{} credit{pay}.", "Tarihçiler payın nasıl bölüneceğini hâlâ tartışıyor."],
    ["Young{Young} supplied{sağlamak} an{} early{erken} and{} essential{temel} insight{kavrayış}, while{iken} Champollion's{Champollion (iyelik)} command{hâkimiyet} of{} languages{diller} allowed{izin vermek} him{ona} to{-mek} turn{dönüştürmek} that{o} insight{kavrayış} into{-e} a{} working{işleyen} system{sistem}.", "Young erken ve temel bir kavrayış sağladı; Champollion'un dillere hâkimiyeti ise bu kavrayışı işleyen bir sisteme dönüştürmesine izin verdi."],
    ["The{} episode{olay} suggests{düşündürmek} that{ki} decipherment{çözme} was{} less{daha az} a{} single{tek} moment{an} of{} genius{deha} than{-den} a{} chain{zincir} of{} partial{kısmi} advances{ilerlemeler}.", "Olay, çözmenin tek bir deha anından çok kısmi ilerlemelerin bir zinciri olduğunu düşündürür."],
    ["National{ulusal} pride{gurur} added{eklemek} further{daha fazla} pressure{baskı}, since{çünkü} both{ikisi de} Britain{İngiltere} and{} France{Fransa} wanted{istemek} the{} honour{onur} of{} success{başarı}.", "Ulusal gurur ek baskı yarattı, çünkü hem İngiltere hem Fransa başarının onurunu istiyordu."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-rosetta-rivals", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const brit = "Encyclopaedia Britannica, Rosetta Stone; https://britannica.com/topic/Rosetta-Stone";
const smith = "Smithsonian Magazine, Rosetta Stone, hieroglyphs and Champollion's decipherment; https://www.smithsonianmag.com/history/rosetta-stone-hieroglyphs-champollion-decipherment-egypt-180980834/";

export default {
  slug: "c1-rosetta-rivals", level: "C1", title: "A Key Turned by Many Hands", topic: "Tarih", sortOrder: 14, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central argument of the passage?", evidence: ev(2, "The episode suggests that decipherment was less a single moment of genius than a chain of partial advances."), options: [
      option("o1", "Decipherment was a gradual, shared effort", true, null, "Metin çözmenin bir deha anı değil, kısmi ilerlemeler zinciri olduğunu savunur."),
      option("o2", "Champollion deserved all of the credit", false, "extreme", "Metin Young'ın katkısını da vurgular."),
      option("o3", "The Greek text made decipherment simple", false, "reverse", "Karşılaştırma tek başına yetersiz kaldı."),
      option("o4", "Britain and France shared ownership equally", false, "context", "Sahiplik tartışması ana fikir değildir."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Thomas Young show in the early eighteen hundreds?", evidence: ev(1, "showing that the hieroglyphic and Demotic texts shared striking similarities"), options: [
      option("o1", "That two scripts looked alike", true, null, "Metin hiyeroglif ve Demotik metinlerin benzerliğini söyler."),
      option("o2", "That every hieroglyph stood for a single sound", false, "reverse", "Bu Champollion'un kanıtına yakın ama farklı bir iddiadır."),
      option("o3", "That the Greek lines were a later forgery", false, "notstated", "Sahtecilik anlatılmaz."),
      option("o4", "That the stone had been carved in Britain", false, "reverse", "Taş Mısır'da bulundu."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “contested” mean in the first paragraph?", evidence: ev(0, "a slower and more contested story"), options: [
      option("o1", "Open to argument", true, null, "Contested, tartışmaya açık demektir."),
      option("o2", "Carefully hidden", false, "context", "Gizleme mecazı geçer ama kelime bunu demez."),
      option("o3", "Quickly forgotten", false, "notstated", "Unutulma anlatılmaz."),
      option("o4", "Officially approved", false, "reverse", "Tersini anlatır."),
    ] },
    { key: "q4", type: "inference", prompt: "Why was comparison with the Greek text not enough?", evidence: ev(1, "it was widely assumed that hieroglyphs recorded ideas rather than sounds"), options: [
      option("o1", "A false assumption about signs misled scholars", true, null, "Hiyerogliflerin yalnızca fikir kaydettiği varsayımı engeldi."),
      option("o2", "The Greek text was written in a secret code", false, "notstated", "Gizli kod anlatılmaz."),
      option("o3", "The three scripts told completely different stories", false, "reverse", "Aynı fermanı taşırlar."),
      option("o4", "Nobody in Europe could read ancient Greek", false, "reverse", "Bilginler Yunancayı okuyabiliyordu."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Taş 1799'da Mısır'da Fransız askerlerce bulundu; aynı ferman hiyeroglif, Demotik ve Yunanca yazılıdır (yani Mısırca iki yazı biçimi + Yunanca: bazı bilginlere göre iki dilli, üç yazılı).", source: brit, checkedOn: "2026-11-23" },
    { claim: "Fransız yenilgisinden sonra taş İngiltere'ye geçti; 1802'den beri British Museum'da.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Thomas Young hiyeroglif ve Demotik metinler arasındaki benzerlikleri gösterdi; Champollion 1822'de birçok işaretin ses de gösterdiğini duyurdu.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
