import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} Book{Kitap} Seven{Yedi} of{} the{} Republic{Devlet}, Plato{Platon} asks{sorar} his{} readers{okuyucular} to{-mek} imagine{hayal etmek} prisoners{mahkûmlar} who{ki onlar} have{} spent{harcamak} their{onların} whole{bütün} lives{hayatlar} chained{zincirli} inside{içinde} a{} cave{mağara}.", "Platon, Devlet'in yedinci kitabında okuyucularından, bütün hayatlarını bir mağarada zincirlenmiş olarak geçirmiş mahkûmları hayal etmelerini ister."],
    ["They{} face{bakmak} a{} blank{boş} wall{duvar} and{} cannot{-amaz} turn{dönmek} their{onların} heads{başlar}.", "Boş bir duvara bakarlar ve başlarını çeviremezler."],
    ["Behind{arkasında} them{onlar}, a{} fire{ateş} burns{yanar}, and{} figures{figürler} carried{taşınan} in{} front{önünde} of{} it{} cast{düşürmek (gölge)} moving{hareket eden} shadows{gölgeler} on{üzerine} the{} wall{duvar}.", "Arkalarında bir ateş yanar ve önünde taşınan figürler duvara hareketli gölgeler düşürür."],
    ["Since{çünkü} the{} prisoners{mahkûmlar} have{} never{asla} seen{görmek} anything{hiçbir şey} else{başka}, they{} take{kabul etmek} the{} shadows{gölgeler} to{-e} be{olmak} reality{gerçeklik}.", "Mahkûmlar hiç başka bir şey görmedikleri için gölgeleri gerçeklik sayarlar."],
  ],
  [
    ["Plato{Platon} then{sonra} imagines{hayal eder} one{biri} prisoner{mahkûm} being{olmak} freed{özgür bırakılmak} and{} forced{zorlanmış} to{-mek} walk{yürümek} towards{doğru} the{} light{ışık}.", "Platon sonra bir mahkûmun serbest bırakıldığını ve ışığa doğru yürümeye zorlandığını hayal eder."],
    ["The{} glare{göz kamaştırıcı parlaklık} is{} painful{acı verici}, and{} at{-de} first{önce} the{} man{adam} wants{ister} to{-e} return{dönmek} to{-e} the{} familiar{tanıdık} shadows{gölgeler}.", "Parlaklık acı vericidir ve adam önce tanıdık gölgelere dönmek ister."],
    ["Gradually{yavaş yavaş}, however{ancak}, his{onun} eyes{gözler} adjust{uyum sağlamak}, and{} he{} comes{gelmek} to{-mek} see{görmek} trees{ağaçlar}, rivers{nehirler} and{} finally{sonunda} the{} sun{güneş} itself{kendisi}.", "Ancak yavaş yavaş gözleri uyum sağlar ve ağaçları, nehirleri ve sonunda güneşin kendisini görmeye başlar."],
    ["Plato{Platon} suggests{öne sürer} that{ki} this{} is{} how{nasıl} the{} mind{zihin} moves{hareket eder} from{-den} opinion{görüş} to{-e} understanding{anlayış}.", "Platon, zihnin görüşten anlayışa bu şekilde ilerlediğini öne sürer."],
  ],
  [
    ["The{} freed{özgür kalan} man{adam} goes{gider} back{geri} to{-e} tell{anlatmak} the{} others{diğerleri}, but{ama} his{onun} eyes{gözler} now{şimdi} struggle{zorlanır} in{} the{} dark{karanlık}.", "Özgür kalan adam diğerlerine anlatmak için geri döner ama gözleri artık karanlıkta zorlanır."],
    ["The{} prisoners{mahkûmlar} conclude{sonuca varmak} that{ki} the{} journey{yolculuk} has{} damaged{zarar vermek} him{ona}, and{} they{} refuse{reddetmek} to{-mek} leave{ayrılmak}.", "Mahkûmlar yolculuğun ona zarar verdiği sonucuna varır ve ayrılmayı reddeder."],
    ["Readers{okuyucular} have{} long{uzun süredir} seen{görmek} the{} story{hikâye} as{olarak} a{} comment{yorum} on{üzerine} education{eğitim}: real{gerçek} learning{öğrenme} can{-ebilir} be{olmak} uncomfortable{rahatsız edici}, and{} those{o kişiler} who{ki onlar} gain{kazanmak} new{yeni} insight{kavrayış} may{-ebilir} not{değil} be{olmak} welcomed{memnuniyetle karşılanmış} by{tarafından} the{} people{insanlar} they{} left{bıraktı} behind{geride}.", "Okuyucular hikâyeyi uzun süredir eğitim üzerine bir yorum olarak görür: gerçek öğrenme rahatsız edici olabilir ve yeni bir kavrayış kazananlar geride bıraktıkları insanlarca memnuniyetle karşılanmayabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-plato-shadows", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const plato = "Plato, Republic VII (514a-520a), Mağara Alegorisi (Jowett çevirisi, ders notu PDF); https://scholar.harvard.edu/sites/scholar.harvard.edu/files/seyer/files/plato_republic_514b-518d_allegory-of-the-cave.pdf";

export default {
  slug: "b2-plato-shadows", level: "B2", title: "Mistaking Shadows for Reality", topic: "Felsefe", sortOrder: 22, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: findEvidence(paragraphs, "Readers have long seen the story as a comment on education"), options: [
      option("o1", "Plato's tale of truth", true, null, "Metin mağara alegorisini ve öğrenmeyle ilişkisini anlatır."),
      option("o2", "A history of Athenian politics", false, "context", "Siyaset yalnızca bir yorum biçimidir; metnin konusu alegoridir."),
      option("o3", "A comparison of Plato's students", false, "notstated", "Öğrenciler anlatılmaz."),
      option("o4", "A guide to ancient Greek theatre", false, "context", "Gölgeler tiyatro değil, alegoridir."),
    ] },
    { key: "q2", type: "detail", prompt: "What do the prisoners believe the shadows are?", evidence: ev(0, "they take the shadows to be reality"), options: [
      option("o1", "They believe the shadows are real.", true, null, "Metin gölgeleri gerçeklik sandıklarını söyler."),
      option("o2", "They believe the shadows are a game.", false, "notstated", "Oyun olarak görmezler."),
      option("o3", "They believe the shadows come from the sun.", false, "reverse", "Güneşi hiç görmemişlerdir."),
      option("o4", "They believe the shadows are dangerous spirits.", false, "notstated", "Ruhlar anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “adjust” mean in the second paragraph?", evidence: ev(1, "his eyes adjust"), options: [
      option("o1", "Get used to a change", true, null, "Adjust, yeni duruma alışmak, uyum sağlamak demektir."),
      option("o2", "Suddenly close and stay shut", false, "reverse", "Gözlerin kapanması anlatılmaz."),
      option("o3", "Move quickly towards a fire", false, "context", "Ateş geçer ama kelime bunu demez."),
      option("o4", "Turn away from bright objects", false, "context", "Kaçınmak anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "Why do the prisoners refuse to leave?", evidence: ev(2, "The prisoners conclude that the journey has damaged him, and they refuse to leave."), options: [
      option("o1", "They think the journey harmed him", true, null, "Mahkûmlar yolculuğun ona zarar verdiği sonucuna varır."),
      option("o2", "They are afraid of the fire behind them", false, "notstated", "Ateşten korktukları anlatılmaz."),
      option("o3", "They think he has become wiser than them", false, "reverse", "Metin onların adamın zarar gördüğünü düşündüğünü söyler."),
      option("o4", "They were told to stay by the guards", false, "notstated", "Gardiyanlardan söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Platon'un Devlet'inde (Kitap VII, 514a-520a) mağara alegorisi: ömür boyu zincirli mahkûmlar ateşin duvara düşürdüğü gölgeleri gerçek sanır; serbest kalan biri ışığa çıkar, gözleri alışır, sonra dönüp anlattığında diğerleri ona inanmaz.", source: plato, checkedOn: "2026-11-23" },
    { claim: "Alegori genellikle eğitimin (paideia) etkisi ve eksikliği hakkında bir hikâye olarak yorumlanır.", source: plato, checkedOn: "2026-11-23" },
  ] },
};
