import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} Sahara{Sahra} in{} North{Kuzey} Africa{Afrika} is{} the{} largest{en büyük} hot{sıcak} desert{çöl} in{} the{} world{dünya}.", "Kuzey Afrika'daki Sahra, dünyanın en büyük sıcak çölüdür."],
    ["It{} gets{alır} very{çok} little{az} rain{yağmur}.", "Çok az yağmur alır."],
    ["The{} days{günler} can{-ebilir} be{} burning{kavurucu} hot{sıcak}.", "Günler kavurucu sıcak olabilir."],
    ["Still{yine de}, many{birçok} plants{bitkiler}, animals{hayvanlar} and{} people{insanlar} live{yaşar} there{orada}.", "Yine de orada birçok bitki, hayvan ve insan yaşar."],
  ],
  [
    ["Desert{çöl} animals{hayvanlar} have{sahiptir} clever{akıllıca} ways{yollar} to{-mek için} survive{hayatta kalmak}.", "Çöl hayvanlarının hayatta kalmak için akıllıca yolları vardır."],
    ["The{} camel{deve} can{-ebilir} walk{yürümek} for{boyunca} days{günler} without{-meden} drinking{içmek}.", "Deve günlerce su içmeden yürüyebilir."],
    ["Its{} hump{hörgüç} does{} not{} hold{tutmak} water{su}, as{-dığı gibi} many{birçok} people{insanlar} think{düşünür}; it{} stores{depolar} fat{yağ} for{} energy{enerji}.", "Hörgücü, birçok insanın sandığı gibi su tutmaz; enerji için yağ depolar."],
    ["The{} small{küçük} fennec{çöl tilkisi} fox{tilki} has{sahiptir} very{çok} large{büyük} ears{kulaklar}.", "Küçük çöl tilkisinin çok büyük kulakları vardır."],
    ["These{} ears{kulaklar} help{yardım eder} it{} lose{kaybetmek} heat{ısı} and{} hear{duymak} insects{böcekler} moving{hareket eden} under{altında} the{} sand{kum}.", "Bu kulaklar ısı kaybetmesine ve kumun altında hareket eden böcekleri duymasına yardım eder."],
    ["The{} fennec{çöl tilkisi} fox{tilki} also{ayrıca} hides{saklanır} in{} holes{yuvalar} during{boyunca} the{} day{gün} and{} comes{gelir} out{dışarı} at{} night{gece}.", "Çöl tilkisi ayrıca gündüz yuvalarda saklanır ve gece dışarı çıkar."],
  ],
  [
    ["Many{birçok} people{insanlar} in{} the{} Sahara{Sahra} live{yaşar} near{yakınında} an{} oasis{vaha}.", "Sahra'daki birçok insan bir vahanın yakınında yaşar."],
    ["An{} oasis{vaha} is{} a{} green{yeşil} place{yer} with{} water{su} from{-den} under{altı} the{} ground{toprak}.", "Vaha, yer altından gelen suyu olan yeşil bir yerdir."],
    ["Farmers{çiftçiler} there{orada} grow{yetiştirir} date{hurma} palms{ağaçları} and{} other{diğer} crops{ürünler}.", "Oradaki çiftçiler hurma ağaçları ve başka ürünler yetiştirir."],
    ["Other{diğer} groups{gruplar}, such{gibi} as{örneğin} the{} Tuareg{Tuaregler}, have{} travelled{seyahat etmiş} across{boyunca} the{} desert{çöl} with{} their{} animals{hayvanlar} for{boyunca} a{} very{çok} long{uzun} time{zaman}.", "Tuaregler gibi başka gruplar çok uzun zamandır hayvanlarıyla çölü baştan başa dolaşmaktadır."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-sahara-desert-life", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const natgeoDeserts = "National Geographic, Deserts, facts and information; https://www.nationalgeographic.com/environment/article/deserts";
const natgeoOasis = "National Geographic, How to save a desert oasis before it vanishes completely; https://www.nationalgeographic.com/environment/article/desert-oasis-morocco-vanishing";
const sdzCamel = "San Diego Zoo Wildlife Alliance, Camel; https://animals.sandiegozoo.org/animals/camel";
const nzpFennec = "Smithsonian's National Zoo, Fennec fox; https://nationalzoo.si.edu/animals/fennec-fox";
const natgeoTuareg = "National Geographic, Lost Lords of the Sahara; https://www.nationalgeographic.com/magazine/article/sahara-tuareg";

export default {
  slug: "b1-sahara-desert-life", level: "B1", title: "Living in the Great Desert", topic: "Doğa", sortOrder: 33, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "Still, many plants, animals and people live there."), options: [
      option("o1", "How life survives in a very hard desert", true, null, "Metin zor koşullara rağmen Sahra'da hayvanların ve insanların nasıl yaşadığını anlatır."),
      option("o2", "Why the Sahara became a desert long ago", false, "notstated", "Çölün nasıl oluştuğu anlatılmaz."),
      option("o3", "How camels carry water in their humps", false, "reverse", "Metin hörgücün su değil yağ depoladığını söyler."),
      option("o4", "Why people are leaving the Sahara for cities", false, "notstated", "Şehirlere göçten söz edilmez."),
    ] },
    { key: "q2", type: "detail", prompt: "What does a camel's hump store?", evidence: ev(1, "it stores fat for energy"), options: [
      option("o1", "Fat that gives it energy", true, null, "Metin hörgücün enerji için yağ depoladığını söyler."),
      option("o2", "Water for long walks", false, "reverse", "Metin bunun yaygın bir yanlış inanç olduğunu söyler."),
      option("o3", "Food it takes from an oasis", false, "notstated", "Vahadan alınan yiyecekten söz edilmez."),
      option("o4", "Cool air to fight the heat", false, "notstated", "Hörgüçte hava depolandığı söylenmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “survive” mean in the second paragraph?", evidence: ev(1, "Desert animals have clever ways to survive."), options: [
      option("o1", "Stay alive in a hard place", true, null, "Paragraf hayvanların zor çölde nasıl yaşamaya devam ettiğini anlatır."),
      option("o2", "Travel quickly across the sand", false, "context", "Hızlı yolculuk bu kelimenin anlamı değildir."),
      option("o3", "Hide from people and cities", false, "context", "Saklanma bir yöntemdir ama kelimenin anlamı değildir."),
      option("o4", "Grow bigger than other animals", false, "context", "Büyümekle ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about the fennec fox?", evidence: findEvidence(paragraphs, "These ears help it lose heat and hear insects moving under the sand."), options: [
      option("o1", "The fennec fox probably hunts insects", true, null, "Kumun altındaki böcekleri duyması, onları avladığını düşündürür."),
      option("o2", "The fennec fox drinks water every hour", false, "notstated", "Su içme sıklığından söz edilmez."),
      option("o3", "Large ears make the fox feel hotter", false, "reverse", "Metin kulakların ısı kaybetmeye yardım ettiğini söyler."),
      option("o4", "The fennec fox is the largest desert animal", false, "reverse", "Metin onu küçük bir tilki olarak tanımlar."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kuzey Afrika'daki Sahra dünyanın en büyük sıcak çölü; gündüz sıcaklıkları 50 C'ye (122 F) ulaşabilir; çöller yılda 25 cm'den az yağış alan yerlerdir.", source: natgeoDeserts, checkedOn: "2026-11-25" },
    { claim: "Fas Sahrası vahalarında hurma ağaçları ve diğer ürünler yeraltı suyuna (akifer) dayanır; hurma ağacı vahanın temel türüdür.", source: natgeoOasis, checkedOn: "2026-11-25" },
    { claim: "Deve hörgücünde su değil yağ depolar ve bir hafta veya daha uzun süre susuz kalabilir.", source: sdzCamel, checkedOn: "2026-11-25" },
    { claim: "Fennec tilkisinin kulakları ısı atar ve kumun altındaki avı dinlemeye yarar; gündüz yeraltı yuvalarında saklanır, geceleri aktiftir.", source: nzpFennec, checkedOn: "2026-11-25" },
    { claim: "Tuaregler yüzyıllar boyunca Sahra'da kervan ticaretine hâkim oldu ve deve ile keçi sürüleriyle çöl boyunca dolaştı.", source: natgeoTuareg, checkedOn: "2026-11-25" },
  ] },
};
