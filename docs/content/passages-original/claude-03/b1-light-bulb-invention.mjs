import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Before{-den önce} electric{elektrikli} lights{ışıklar}, people{insanlar} used{kullandı} candles{mumlar} and{} oil{yağ} lamps{lambalar} at{} night{gece}.", "Elektrikli ışıklardan önce insanlar geceleri mum ve yağ lambası kullanırdı."],
    ["These{} gave{verdi} weak{zayıf} light{ışık}, made{çıkardı} smoke{duman}, and{} could{-ebilirdi} easily{kolayca} start{başlatmak} fires{yangınlar}.", "Bunlar zayıf ışık verir, duman çıkarır ve kolayca yangın başlatabilirdi."],
    ["In{} the{} nineteenth{on dokuzuncu} century{yüzyıl}, many{birçok} inventors{mucitler} tried{denedi} to{-meyi} make{yapmak} light{ışık} with{} electricity{elektrik}.", "On dokuzuncu yüzyılda birçok mucit elektrikle ışık yapmayı denedi."],
    ["It{} was{} a{} hard{zor} problem{sorun}.", "Bu zor bir sorundu."],
  ],
  [
    ["A{} light{ışık} bulb{ampul} works{çalışır} in{} a{} simple{basit} way{şekil}.", "Bir ampul basit bir şekilde çalışır."],
    ["Electricity{elektrik} passes{geçer} through{içinden} a{} very{çok} thin{ince} thread{tel} inside{içinde} the{} glass{cam}.", "Elektrik, camın içindeki çok ince bir telden geçer."],
    ["The{} thread{tel} gets{olur} so{o kadar} hot{sıcak} that{ki} it{} starts{başlar} to{-meye} glow{parlamak}.", "Tel o kadar ısınır ki parlamaya başlar."],
    ["The{} air{hava} is{} taken{alınır} out{dışarı} of{} the{} bulb{ampul}, because{çünkü} air{hava} would{-ardı} make{sağlamak} the{} hot{sıcak} thread{tel} burn{yanmak} up{tamamen} quickly{hızla}.", "Ampulün içindeki hava alınır, çünkü hava sıcak telin hızla yanıp bitmesine yol açardı."],
    ["The{} hardest{en zor} part{kısım} was{} finding{bulmak} a{} thread{tel} that{ki} could{-ebilen} glow{parlamak} for{boyunca} a{} long{uzun} time{süre}.", "En zor kısım, uzun süre parlayabilen bir tel bulmaktı."],
  ],
  [
    ["In{} 1879, Thomas{Thomas} Edison{Edison} and{} his{} team{ekip} in{} the{} United{Birleşik} States{Devletler} made{yaptı} a{} bulb{ampul} that{ki} lasted{dayandı} for{boyunca} many{birçok} hours{saatler}.", "1879'da Thomas Edison ve Amerika Birleşik Devletleri'ndeki ekibi saatlerce dayanan bir ampul yaptı."],
    ["They{} tested{denedi} many{çok sayıda} materials{malzemeler} before{-meden önce} they{} found{buldular} good{iyi} ones{olanlar}.", "İyi olanları bulmadan önce çok sayıda malzeme denediler."],
    ["At{} about{yaklaşık} the{} same{aynı} time{zaman}, Joseph{Joseph} Swan{Swan} in{} England{İngiltere} made{yaptı} a{} similar{benzer} bulb{ampul}.", "Yaklaşık aynı zamanda İngiltere'de Joseph Swan benzer bir ampul yaptı."],
    ["So{yani} the{} light{ışık} bulb{ampul} was{} not{} the{} work{eser} of{} just{sadece} one{bir} person{kişi}.", "Yani ampul tek bir kişinin eseri değildi."],
    ["Today{bugün}, many{birçok} homes{evler} use{kullanır} LED{LED} bulbs{ampuller}, which{ki} need{ihtiyaç duyar} much{çok} less{daha az} energy{enerji}.", "Bugün birçok ev çok daha az enerjiye ihtiyaç duyan LED ampuller kullanıyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-light-bulb-invention", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const doeHistory = "U.S. Department of Energy, The History of the Light Bulb; https://www.energy.gov/articles/history-light-bulb";
const lindaSwan = "Linda Hall Library, Scientist of the Day: Joseph Wilson Swan; https://www.lindahall.org/about/news/scientist-of-the-day/joseph-wilson-swan/";
const energyStar = "ENERGY STAR, Learn About LED Bulbs; https://www.energystar.gov/products/lighting_fans/light_bulbs/learn_about_led_bulbs";

export default {
  slug: "b1-light-bulb-invention", level: "B1", title: "A Thin Thread of Light", topic: "Teknoloji", sortOrder: 34, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "In the nineteenth century, many inventors tried to make light with electricity."), options: [
      option("o1", "How the light bulb works and was developed", true, null, "Metin ampulün nasıl çalıştığını ve nasıl geliştirildiğini anlatır."),
      option("o2", "Why candles are still better than bulbs", false, "reverse", "Metin mumların zayıf ışık verdiğini ve yangın çıkarabildiğini söyler."),
      option("o3", "The life of Thomas Edison as a young boy", false, "notstated", "Edison'un çocukluğu anlatılmaz."),
      option("o4", "How electricity is made in big power stations", false, "notstated", "Elektriğin üretimi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Why is the air taken out of the bulb?", evidence: ev(1, "because air would make the hot thread burn up quickly"), options: [
      option("o1", "So the thread does not burn up", true, null, "Metin havanın sıcak telin hızla yanmasına yol açacağını söyler."),
      option("o2", "So the glass stays cool to touch", false, "notstated", "Camın sıcaklığından söz edilmez."),
      option("o3", "So the light becomes a different colour", false, "notstated", "Işığın renginden söz edilmez."),
      option("o4", "So the bulb is lighter to carry", false, "notstated", "Ampulün ağırlığı anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “glow” mean in the second paragraph?", evidence: ev(1, "The thread gets so hot that it starts to glow."), options: [
      option("o1", "Shine because it is hot", true, null, "Tel çok ısındığı için ışık vermeye başlar; glow bu anlamdadır."),
      option("o2", "Break into many small pieces", false, "context", "Kırılmaktan söz edilmez."),
      option("o3", "Turn cold and dark very fast", false, "reverse", "Tel soğumaz, tersine çok ısınır ve ışık verir."),
      option("o4", "Make a loud ringing sound", false, "context", "Sesle ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about the early bulb threads?", evidence: findEvidence(paragraphs, "They tested many materials before they found good ones."), options: [
      option("o1", "Many early threads did not last long", true, null, "Çok sayıda malzeme denenmesi ve en zor kısmın uzun süre parlayan tel bulmak olması, çoğunun çabuk bittiğini düşündürür."),
      option("o2", "Edison found the right thread on his first try", false, "reverse", "Metin çok sayıda malzeme denendiğini söyler."),
      option("o3", "Swan copied Edison's bulb years later", false, "reverse", "Metin Swan'ın yaklaşık aynı zamanda çalıştığını söyler."),
      option("o4", "Making the glass was the hardest part", false, "reverse", "Metin en zor kısmın uygun teli bulmak olduğunu söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "19. yüzyılda dünyanın dört bir yanında bilim insanları akkor lamba üzerinde çalıştı; filamanın oksitlenip yanmaması için ampulden hava vakumla alınır (veya inert gaz doldurulur).", source: doeHistory, checkedOn: "2026-11-25" },
    { claim: "Edison'un ekibi birkaç malzemeyi (karbon, platin, sonra yine karbon) denedi; 1879'da karbon filaman saatlerce (14,5 saat) dayandı.", source: doeHistory, checkedOn: "2026-11-25" },
    { claim: "Joseph Swan İngiltere'de karbon filamanlı ampulünü 3 Şubat 1879'da Newcastle'da gösterdi; Edison ve Swan şirketleri sonra birleşti.", source: lindaSwan, checkedOn: "2026-11-25" },
    { claim: "LED ürünler akkor ampullere göre yaklaşık %90'a kadar daha verimli ışık üretir (az enerji).", source: energyStar, checkedOn: "2026-11-25" },
  ] },
};
