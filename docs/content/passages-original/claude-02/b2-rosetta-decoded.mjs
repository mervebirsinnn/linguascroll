import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} centuries{yüzyıllar}, the{} carved{oyulmuş} signs{işaretler} on{üzerindeki} Egyptian{Mısır} temples{tapınaklar} were{} a{} mystery{gizem}.", "Yüzyıllar boyunca Mısır tapınaklarındaki oyma işaretler bir gizemdi."],
    ["Visitors{ziyaretçiler} stared{baktı} at{-e (bakmak)} the{} walls{duvarlar} without{-meden} understanding{anlamak} a{} single{tek} word{sözcük}.", "Ziyaretçiler tek bir sözcüğü anlamadan duvarlara baktı."],
    ["Nobody{kimse} could{-ebilirdi} read{okumak} hieroglyphs{hiyeroglifler}, and{} the{} language{dil} behind{arkasındaki} them{onlar} had{} been{} forgotten{unutulmuş}.", "Kimse hiyerogliflerini okuyamıyordu ve arkalarındaki dil unutulmuştu."],
    ["That{o} changed{değişti} after{sonra} French{Fransız} soldiers{askerler} working{çalışan} in{} Egypt{Mısır} in{-de} seventeen{on yedi} ninety{doksan} nine{dokuz} discovered{keşfetti} a{} slab{levha} of{} dark{koyu} stone{taş} near{yakınında} the{} town{kasaba} of{} Rosetta{Rosetta}.", "Bu, 1799'da Mısır'da çalışan Fransız askerlerin Rosetta kasabası yakınında koyu renkli bir taş levha keşfetmesinden sonra değişti."],
  ],
  [
    ["The{} stone{taş} carried{taşıyordu} one{tek} decree{ferman} written{yazılmış} in{} three{üç} scripts{yazılar}: hieroglyphs{hiyeroglifler}, a{} simpler{daha basit} Egyptian{Mısır} script{yazı} known{bilinen} as{olarak} Demotic{Demotik}, and{} ancient{eski} Greek{Yunanca}.", "Taşta üç yazıyla yazılmış tek bir ferman vardı: hiyeroglifler, Demotik denen daha basit bir Mısır yazısı ve eski Yunanca."],
    ["Scholars{bilginler} could{-ebilirdi} read{okumak} Greek{Yunanca}, so{bu yüzden} they{} realised{fark etti} that{ki} the{} other{diğer} two{iki} versions{sürümler} must{-meli} say{söylemek} the{} same{aynı} thing{şey}.", "Bilginler Yunancayı okuyabiliyordu; bu yüzden diğer iki sürümün de aynı şeyi söylemesi gerektiğini fark ettiler."],
    ["This{bu} comparison{karşılaştırma} gave{verdi} them{onlara} their{onların} first{ilk} real{gerçek} clues{ipuçları}.", "Bu karşılaştırma onlara ilk gerçek ipuçlarını verdi."],
    ["After{sonra} the{} French{Fransız} surrender{teslim oluş}, the{} stone{taş} passed{geçti} to{-e} Britain{İngiltere}, and{} it{} has{} been{} displayed{sergilenmiş} in{-de} the{} British{İngiliz} Museum{Müze} since{-den beri} eighteen{on sekiz} oh{sıfır} two{iki}.", "Fransızların teslim oluşundan sonra taş İngiltere'ye geçti ve 1802'den beri British Museum'da sergileniyor."],
  ],
  [
    ["Decipherment{çözme} was{} not{} quick{çabuk}, however{ancak}.", "Ancak çözme işi çabuk olmadı."],
    ["Researchers{araştırmacılar} such{gibi (such as kalıbı)} as{gibi (such as kalıbı)} Thomas{Thomas} Young{Young} made{yaptı} early{erken} progress{ilerleme}, but{ama} it{} was{} the{} French{Fransız} scholar{bilgin} Jean{Jean}-Francois{Francois} Champollion{Champollion} who{ki o} announced{duyurdu} in{-de} eighteen{on sekiz} twenty{yirmi} two{iki} that{ki} he{} had{} cracked{çözmüştü} the{} system{sistem}.", "Thomas Young gibi araştırmacılar erken ilerleme kaydetti ama sistemi çözdüğünü 1822'de duyuran Fransız bilgin Jean-François Champollion oldu."],
    ["He{} showed{gösterdi} that{ki} many{birçok} signs{işaretler} stood{temsil etmek (stand for)} for{temsil etmek (stand for)} sounds{sesler}, not{değil} just{sadece} for{için} ideas{fikirler}.", "Birçok işaretin yalnızca fikirleri değil, sesleri de temsil ettiğini gösterdi."],
    ["Ancient{eski} Egypt{Mısır} could{-ebildi} finally{sonunda} speak{konuşmak} in{} its{onun} own{kendi} words{sözcükler}.", "Eski Mısır sonunda kendi sözcükleriyle konuşabildi."],
    ["Today{bugün}, scholars{bilginler} can{-ebilir} read{okumak} many{birçok} Egyptian{Mısır} texts{metinler} written{yazılmış} on{üzerine} stone{taş} and{} papyrus{papirüs}.", "Bugün bilginler taş ve papirüs üzerine yazılmış birçok Mısır metnini okuyabiliyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-rosetta-decoded", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const brit = "Encyclopaedia Britannica, Rosetta Stone; https://britannica.com/topic/Rosetta-Stone";
const smith = "Smithsonian Magazine, Rosetta Stone, hieroglyphs and Champollion's decipherment; https://www.smithsonianmag.com/history/rosetta-stone-hieroglyphs-champollion-decipherment-egypt-180980834/";

export default {
  slug: "b2-rosetta-decoded", level: "B2", title: "How Egypt Learned to Speak Again", topic: "Tarih", sortOrder: 13, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "it was the French scholar Jean-Francois Champollion who announced in eighteen twenty two that he had cracked the system"), options: [
      option("o1", "How a stone helped scholars read hieroglyphs", true, null, "Metin taşın hiyeroglifleri okumaya nasıl yardım ettiğini anlatır."),
      option("o2", "Why Britain and France fought over Egypt", false, "context", "Çatışma yalnızca arka plandır."),
      option("o3", "How soldiers in Egypt learned to read Greek", false, "context", "Yunancayı bilginler okuyabiliyordu; askerler değil."),
      option("o4", "How museums choose pieces from other countries", false, "notstated", "Müze seçimi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Which three scripts appeared on the stone?", evidence: ev(1, "hieroglyphs, a simpler Egyptian script known as Demotic, and ancient Greek"), options: [
      option("o1", "Hieroglyphs, Demotic and Greek", true, null, "Metin bu üç yazıyı sayar."),
      option("o2", "Hieroglyphs, Latin and Arabic", false, "notstated", "Latince ve Arapça geçmez."),
      option("o3", "Greek, Roman letters and Hebrew", false, "notstated", "Bu yazılar taşta yoktur."),
      option("o4", "Demotic, Greek and old French", false, "context", "Fransız askerler geçer ama Fransızca yazı yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “cracked” mean in the last paragraph?", evidence: ev(2, "announced in eighteen twenty two that he had cracked the system"), options: [
      option("o1", "Solved a difficult problem", true, null, "Crack, bir sistemi çözmek anlamına da gelir."),
      option("o2", "Broke something into pieces", false, "sound", "Sözcüğün gerçek anlamıdır; burada mecaz kullanılmıştır."),
      option("o3", "Made a loud sudden noise", false, "sound", "Ses anlamı bağlamda yok."),
      option("o4", "Lost an important object", false, "context", "Kayıp anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final line about Egypt speaking suggest?", evidence: findEvidence(paragraphs, "Ancient Egypt could finally speak in its own words."), options: [
      option("o1", "Egyptian records became readable directly.", true, null, "Çözme, Mısır kayıtlarının doğrudan okunmasını sağladı."),
      option("o2", "Greek translations were no longer needed at all.", false, "extreme", "Metin böyle bir sonuç söylemez."),
      option("o3", "Egyptians themselves had returned to speak it.", false, "reverse", "Konuşan Mısırlılar değil, okunan metinlerdir."),
      option("o4", "The stone began to speak after being repaired.", false, "context", "Mecazı gerçek anlama çevirir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Taş 1799'da Mısır'da Fransız askerlerce Rosetta yakınında bulundu; aynı ferman hiyeroglif, Demotik ve Yunanca olmak üzere üç yazıyla yazılıydı.", source: brit, checkedOn: "2026-11-23" },
    { claim: "Taş Fransız teslimiyetinden sonra İngiltere'ye geçti; 1802'den beri British Museum'da sergileniyor.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Thomas Young erken ilerleme kaydetti; Champollion 1822'de hiyeroglifleri çözdüğünü duyurdu ve birçok işaretin ses de gösterdiğini ortaya koydu.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
