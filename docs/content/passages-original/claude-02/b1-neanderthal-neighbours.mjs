import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Neanderthals{Neandertaller} were{} early{erken} humans{insanlar} who{ki onlar} lived{yaşadı} in{} Europe{Avrupa} and{} parts{kısımlar} of{} Asia{Asya} long{uzun} ago{önce}.", "Neandertaller, uzun zaman önce Avrupa'da ve Asya'nın bazı bölgelerinde yaşayan erken insanlardı."],
    ["For{boyunca} many{birçok} years{yıl}, people{insanlar} thought{düşündü} of{} them{onları} as{olarak} slow{yavaş} and{} simple{basit}.", "Uzun yıllar boyunca insanlar onları yavaş ve basit sanırdı."],
    ["Today{bugün}, scientists{bilim insanları} can{-ebilir} read{okumak} their{onların} DNA{DNA} from{-den} old{eski} bones{kemikler}, and{} the{} results{sonuçlar} have{} changed{değiştirdi} that{o} picture{resim}.", "Bugün bilim insanları onların DNA'sını eski kemiklerden okuyabiliyor ve sonuçlar bu resmi değiştirdi."],
    ["The{} new{yeni} story{hikâye} is{} more{daha} interesting{ilginç}.", "Yeni hikâye daha ilginç."],
  ],
  [
    ["When{-dığında} researchers{araştırmacılar} compared{karşılaştırdı} Neanderthal{Neandertal} DNA{DNA} with{ile} the{} DNA{DNA} of{} people{insanlar} today{bugün}, they{} found{buldu} something{bir şey} surprising{şaşırtıcı}.", "Araştırmacılar Neandertal DNA'sını bugünkü insanların DNA'sıyla karşılaştırdığında şaşırtıcı bir şey buldu."],
    ["In{-de} the{} study{çalışma}, many{birçok} of{} the{} people{insanlar} tested{test edilmek} carried{taşımak} a{} small{küçük} amount{miktar} of{} Neanderthal{Neandertal} DNA{DNA}.", "Çalışmada test edilen kişilerin birçoğu az miktarda Neandertal DNA'sı taşıyordu."],
    ["For{için} people{insanlar} in{} the{} study{çalışma} whose{kimlerin} families{aileler} came{geldi} from{-den} outside{dışında} Africa{Afrika}, it{} was{} usually{genellikle} between{arasında} one{bir} and{} two{iki} percent{yüzde}.", "Çalışmadaki, aileleri Afrika dışından gelenlerde bu oran genellikle yüzde bir ile iki arasındaydı."],
    ["That{o} means{demek} our{bizim} ancestors{atalar} and{} the{} Neanderthals{Neandertaller} had{sahip oldu} children{çocuklar} together{birlikte}.", "Bu, atalarımızın ve Neandertallerin birlikte çocuk sahibi olduğu anlamına gelir."],
  ],
  [
    ["In{-de} the{} African{Afrikalı} people{insanlar} it{} studied{incelemek}, a{} newer{daha yeni} study{çalışma} also{ayrıca} found{buldu} a{} little{az} Neanderthal{Neandertal} DNA{DNA}.", "Daha yeni bir çalışma, incelediği Afrikalı insanlarda da az miktarda Neandertal DNA'sı buldu."],
    ["The{} scientists{bilim insanları} think{düşünür} that{ki} some{bir kısmı} of{} it{} may{-ebilir} have{-miş} come{gelmek} back{geri} with{ile} early{erken} humans{insanlar}.", "Bilim insanları bunun bir kısmının erken insanlarla geri gelmiş olabileceğini düşünüyor."],
    ["So{bu yüzden} Neanderthals{Neandertaller} are{} not{} only{yalnızca} a{} part{parça} of{} history{tarih}.", "Yani Neandertaller yalnızca tarihin bir parçası değil."],
    ["A{} small{küçük} piece{parça} of{} them{onlar} is{} still{hâlâ} inside{içinde} many{birçok} of{} us{biz}.", "Onlardan küçük bir parça hâlâ birçoğumuzun içinde."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-neanderthal-neighbours", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cell = "Chen, Wolf, Fu, Li ve Akey, Identifying and Interpreting Apparent Neanderthal Ancestry in African Individuals, Cell 180(4), 2020; https://doi.org/10.1016/j.cell.2020.01.012";
const smith = "Smithsonian Magazine, 4 Şubat 2020, haber: Cell dergisindeki Akey ekibi çalışması (Afrikalılardaki Neandertal DNA'sı); https://www.smithsonianmag.com/smart-news/new-research-expands-neanderthals-genetic-legacy-modern-humans-180974099/";

export default {
  slug: "b1-neanderthal-neighbours", level: "B1", title: "Our Neanderthal Neighbours", topic: "Neandertaller", sortOrder: 20, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "many of the people tested carried a small amount of Neanderthal DNA"), options: [
      option("o1", "What DNA shows about our link to Neanderthals", true, null, "Metin, DNA karşılaştırmasının Neandertallerle bugünkü insanlar arasındaki bağı gösterdiğini anlatır."),
      option("o2", "Where Neanderthals lived in Europe and Asia", false, "detail", "Yaşadıkları yer yalnızca ilk cümlede geçer; metnin asıl konusu değildir."),
      option("o3", "Why Neanderthals were slower than early humans", false, "reverse", "Metin onların yavaş sanıldığını ama bu resmin DNA bulgularıyla değiştiğini söyler."),
      option("o4", "How scientists learned to read old bones", false, "detail", "Kemiklerden DNA okunması yalnızca bir araçtır; metin DNA bulgularını anlatır."),
    ] },
    { key: "q2", type: "detail", prompt: "How much Neanderthal DNA do many people with ancestors outside Africa carry?", evidence: ev(1, "it was usually between one and two percent"), options: [
      option("o1", "About one to two percent", true, null, "Metin yüzde bir ile iki arası der."),
      option("o2", "About half of their DNA", false, "extreme", "Yarısı çok abartılıdır."),
      option("o3", "About ten to twenty percent", false, "detail", "Oran yüzde on-yirmi değildir."),
      option("o4", "None at all, as far as we know", false, "reverse", "Metin bunun tersini söyler."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “ancestors” mean in the second paragraph?", evidence: ev(1, "our ancestors and the Neanderthals had children together"), options: [
      option("o1", "Family members who lived long ago", true, null, "Ancestor, çok önce yaşamış aile üyesidir."),
      option("o2", "Scientists who study old bones today", false, "context", "Bilim insanları geçer ama ancestor onlar değildir."),
      option("o3", "Children who were born last year", false, "reverse", "Atalar çocukların tersidir."),
      option("o4", "Animals that lived in a cold place", false, "context", "Hayvanlardan söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about early humans and Neanderthals?", evidence: ev(1, "That means our ancestors and the Neanderthals had children together."), options: [
      option("o1", "They never met each other at all.", false, "reverse", "Birlikte çocuk sahibi oldular."),
      option("o2", "They lived near and mixed.", true, null, "Ortak DNA, iki grubun karıştığını gösterir."),
      option("o3", "They spoke exactly the same language.", false, "notstated", "Dilden söz edilmez."),
      option("o4", "They always lived in the same homes.", false, "extreme", "Böyle bir bilgi yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Birincil çalışma (Cell, 2020): örneklenen genomlarda Avrupalı/Asyalılarda yaklaşık %1,7-1,8 Neandertal soyu; örneklenen Afrikalı bireylerde bunun yaklaşık üçte biri (ortalama ~17 milyon baz çifti); bulgular örneklemle sınırlıdır, bütün insanlara genellenemez.", source: cell, checkedOn: "2026-11-23" },
    { claim: "Afrika dışı atalara sahip insanlar genomlarında yaklaşık yüzde 1,7-1,8 Neandertal DNA'sı taşır (eski tahminler yüzde 1-4); iki grup çocuk sahibi olmuştur.", source: smith, checkedOn: "2026-11-23" },
    { claim: "2020 Cell çalışması Afrikalı topluluklarda da az miktarda Neandertal DNA'sı buldu; yazarlara göre bir kısmı erken modern insanlarla Afrika'ya geri taşınmış olabilir.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
