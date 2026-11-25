import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Many{birçok} bats{yarasalar} fly{uçmak} and{} hunt{avlanmak} at{} night{gece}, when{-dığında} it{} is{} very{çok} dark{karanlık}.", "Birçok yarasa, hava çok karanlıkken gece uçar ve avlanır."],
    ["Their{} hearing{işitme} is{} excellent{mükemmel}.", "İşitmeleri mükemmeldir."],
    ["So{bu yüzden} many{birçok} bats{yarasalar} use{kullanmak} sound{ses} to{-mek için} find{bulmak} their{} way{yol}.", "Bu yüzden birçok yarasa yolunu bulmak için ses kullanır."],
    ["This{} skill{beceri} is{} called{adlandırılır} echolocation{ekolokasyon}.", "Bu beceriye ekolokasyon denir."],
  ],
  [
    ["A{} bat{yarasa} makes{çıkarır} short{kısa} and{} very{çok} high{yüksek} sounds{sesler}.", "Bir yarasa kısa ve çok yüksek sesler çıkarır."],
    ["Many{birçok} of{} these{} sounds{sesler} are{} too{fazla} high{yüksek} for{} people{insanlar} to{-mek için} hear{duymak}.", "Bu seslerin birçoğu insanların duyamayacağı kadar yüksektir."],
    ["The{} sounds{sesler} hit{çarpmak} objects{nesneler} and{} come{gelmek} back{geri} as{} echoes{yankılar}.", "Sesler nesnelere çarpar ve yankı olarak geri gelir."],
    ["The{} bat{yarasa} listens{dinler} to{-e} the{} echoes{yankılar} with{} its{} ears{kulaklar}.", "Yarasa yankıları kulaklarıyla dinler."],
    ["From{-den} the{} echoes{yankılar}, it{} can{-ebilir} tell{anlamak} how{ne kadar} far{uzak} away{uzakta} an{} insect{böcek} is{} and{} where{nerede} it{} is{} in{} the{} air{hava}.", "Yankılardan bir böceğin ne kadar uzakta olduğunu ve havada nerede olduğunu anlayabilir."],
  ],
  [
    ["When{-dığında} a{} bat{yarasa} gets{olmak} close{yakın} to{-e} its{} food{yiyecek}, it{} makes{çıkarır} sounds{sesler} much{çok daha} faster{hızlı}.", "Bir yarasa yiyeceğine yaklaştığında sesleri çok daha hızlı çıkarır."],
    ["This{} gives{verir} it{} more{daha çok} information{bilgi} about{hakkında} the{} moving{hareket eden} insect{böcek}.", "Bu ona hareket eden böcek hakkında daha çok bilgi verir."],
    ["Echolocation{ekolokasyon} is{} so{o kadar} exact{kesin} that{ki} some{bazı} bats{yarasalar} can{-ebilir} catch{yakalamak} insects{böcekler} in{} the{} dark{karanlık}.", "Ekolokasyon o kadar kesindir ki bazı yarasalar karanlıkta böcekleri yakalayabilir."],
    ["A{} few{birkaç} other{diğer} animals{hayvanlar}, such{gibi} as{} dolphins{yunuslar}, use{kullanmak} echolocation{ekolokasyon} too{de}.", "Yunuslar gibi birkaç başka hayvan da ekolokasyon kullanır."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-bat-echolocation", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const asuEcho = "Arizona State University, Ask A Biologist, Echolocation; https://askabiologist.asu.edu/echolocation";
const npsEcho = "U.S. National Park Service, Bat Echolocation; https://www.nps.gov/subjects/bats/echolocation.htm";
const usgsBuzz = "U.S. Geological Survey, Terminal phase feeding call (Hawaiian hoary bat); https://www.usgs.gov/media/audio/terminal-phase-feeding-call-hawaiian-hoary-bat";
const snxEcho = "Science News Explores, Echoes of hunting; https://www.snexplores.org/article/echoes-hunting";
const whoiDolphin = "Woods Hole Oceanographic Institution, How does a dolphin echolocate?; https://www.whoi.edu/science/B/people/kamaral/echolocation.html";

export default {
  slug: "b1-bat-echolocation", level: "B1", title: "Seeing With Sound", topic: "Biyoloji", sortOrder: 36, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "So many bats use sound to find their way."), options: [
      option("o1", "How bats use sound to move and hunt", true, null, "Metin yarasaların yön bulmak ve avlanmak için sesi nasıl kullandığını anlatır."),
      option("o2", "Why bats sleep upside down during the day", false, "notstated", "Yarasaların nasıl uyuduğu anlatılmaz."),
      option("o3", "Why bat eyes are better than human eyes", false, "notstated", "Gözlerin kıyaslanması anlatılmaz; metin yarasaların sesi kullandığını anlatır."),
      option("o4", "How dolphins and bats share their food in the sea", false, "context", "Yunuslar yalnızca ekolokasyon kullanan başka bir hayvan örneğidir."),
    ] },
    { key: "q2", type: "detail", prompt: "What can a bat learn from the echoes?", evidence: ev(1, "it can tell how far away an insect is and where it is in the air"), options: [
      option("o1", "How far away an insect is and where it is", true, null, "Metin yankılardan böceğin ne kadar uzakta olduğunun ve nerede olduğunun anlaşıldığını söyler."),
      option("o2", "How old the insect is and what it eats", false, "notstated", "Böceğin yaşı ya da beslenmesi anlatılmaz."),
      option("o3", "How many other bats are flying nearby in the dark", false, "notstated", "Diğer yarasaların sayısından söz edilmez."),
      option("o4", "Which sounds people can hear at night", false, "context", "Metin insanların bu seslerin birçoğunu duyamadığını söyler; yankılar bunu öğretmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "exact" mean in the third paragraph?', evidence: ev(2, "Echolocation is so exact that some bats can catch insects in the dark."), options: [
      option("o1", "Very correct and careful", true, null, "Exact, hatasız ve kesin demektir; bu yüzden yarasalar minicik böcekleri yakalayabilir."),
      option("o2", "Very loud and noisy", false, "context", "Cümle sesin gürlüğünü değil, doğruluğunu anlatır."),
      option("o3", "Very slow and difficult", false, "reverse", "Kesin bir yöntem, yarasanın avı yakalamasını kolaylaştırır."),
      option("o4", "Very new and strange to use", false, "context", "Yöntemin yeniliği anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer from the passage?", evidence: findEvidence(paragraphs, "Many of these sounds are too high for people to hear."), options: [
      option("o1", "A hunting bat may seem quiet to people.", true, null, "Seslerin birçoğu insan kulağı için fazla yüksek olduğundan avlanan yarasa insanlara sessiz görünebilir."),
      option("o2", "Bats cannot hear their own sounds well.", false, "reverse", "Yarasalar kendi seslerinin yankılarını kulaklarıyla dinler."),
      option("o3", "Bats need light to catch their food.", false, "reverse", "Bazı yarasalar tam karanlıkta böcek yakalayabilir."),
      option("o4", "People can hear every sound a bat makes nearby.", false, "reverse", "Seslerin birçoğunu insanlar duyamaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Yarasalar karanlıkta/geceleri yön bulmak ve av bulmak için ekolokasyon kullanır.", source: asuEcho, checkedOn: "2026-11-25" },
    { claim: "Ekolokasyon sesleri insan işitme aralığının üstündedir (ultrason).", source: npsEcho, checkedOn: "2026-11-25" },
    { claim: "Yankının dönme süresi nesnenin uzaklığını, iki kulaktaki fark av nerede olduğunu gösterir.", source: snxEcho, checkedOn: "2026-11-25" },
    { claim: "Yarasa av fark edince çağrı hızını artırır (feeding buzz).", source: usgsBuzz, checkedOn: "2026-11-25" },
    { claim: "Yunuslar da ekolokasyonla yiyecek ve nesneleri bulur.", source: whoiDolphin, checkedOn: "2026-11-25" },
  ] },
};
