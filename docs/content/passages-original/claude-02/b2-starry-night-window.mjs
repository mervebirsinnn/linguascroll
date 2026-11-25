import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} the{} spring{ilkbahar} of{} eighteen{on sekiz} eighty{seksen} nine{dokuz}, Vincent{Vincent} van{van} Gogh{Gogh} entered{girdi} an{} asylum{akıl hastanesi} in{} the{} French{Fransız} town{kasaba} of{} Saint{Saint}-Remy{Remy}, seeking{arayarak} relief{rahatlama} from{-den} his{} mental{zihinsel} illness{hastalık}.", "1889 baharında Vincent van Gogh, zihinsel hastalığından rahatlama arayarak Fransa'nın Saint-Rémy kasabasındaki bir akıl hastanesine girdi."],
    ["He{} stayed{kaldı} there{orada} for{boyunca} about{yaklaşık} twelve{on iki} months{ay}, and{} during{sırasında} that{o} year{yıl} he{} produced{üretti} some{bazı} of{} his{} most{en} celebrated{ünlü} work{eser}.", "Orada yaklaşık on iki ay kaldı ve o yıl en ünlü eserlerinden bazılarını üretti."],
    ["Among{arasında} them{onlar} was{} The{} Starry{yıldızlı} Night{gece}, which{ki o} he{} painted{boyadı} in{-de} mid{orta}-June{Haziran}.", "Bunların arasında Haziran ortasında yaptığı Yıldızlı Gece de vardı."],
  ],
  [
    ["The{} picture{resim} was{} inspired{esinlenmiş} by{tarafından} the{} view{manzara} from{-den} his{} window{pencere}, where{ki orada} he{} could{-ebilirdi} watch{izlemek} the{} morning{sabah} sky{gökyüzü} just{hemen} before{önce} sunrise{gün doğumu}.", "Resim, gün doğumundan hemen önce sabah gökyüzünü izleyebildiği penceresinden görünen manzaradan esinlenmişti."],
    ["He{} also{ayrıca} wrote{yazdı} to{-e} his{} brother{kardeş} Theo{Theo} about{hakkında} the{} morning{sabah} star{yıldız} he{} saw{gördü} from{-den} his{} window{pencere}.", "Ayrıca kardeşi Theo'ya penceresinden gördüğü sabah yıldızını yazdı."],
    ["Yet{yine de} the{} village{köy} below{aşağıdaki} was{} not{} copied{kopyalandı} directly{doğrudan} from{-den} life{hayat}.", "Ancak aşağıdaki köy doğrudan hayattan kopyalanmadı."],
    ["Van{van} Gogh{Gogh} combined{birleştirdi} what{ne} he{} observed{gözlemledi} with{ile} imagination{hayal gücü}, memory{bellek} and{} emotion{duygu}.", "Van Gogh gözlemlediklerini hayal gücü, bellek ve duyguyla birleştirdi."],
    ["The{} result{sonuç} is{} less{daha az} a{} record{kayıt} of{} a{} place{yer} than{-den} a{} picture{resim} of{} a{} feeling{his}.", "Sonuç bir yerin kaydından çok bir duygunun resmidir."],
  ],
  [
    ["Viewers{izleyiciler} have{} long{uzun süredir} noticed{fark etti} the{} swirling{dönen} sky{gökyüzü}, painted{boyanmış} in{} thick{kalın}, energetic{enerjik} strokes{fırça darbeleri}.", "İzleyiciler kalın, enerjik fırça darbeleriyle boyanmış dönen gökyüzünü uzun süredir fark ediyor."],
    ["For{için} many{birçok} viewers{izleyiciler}, the{} sky{gökyüzü} seems{görünür} to{-mek} move{hareket etmek}, even{bile} though{rağmen} the{} canvas{tuval} is{} still{sabit}.", "Birçok izleyici için tuval sabit olsa bile gökyüzü hareket ediyor gibi görünür."],
    ["The{} dark{koyu} tree{ağaç} in{} the{} foreground{ön plan} points{işaret eder} upward{yukarı} like{gibi} a{} flame{alev}, linking{bağlayan} the{} earth{yeryüzü} to{-e} the{} stars{yıldızlar}.", "Ön plandaki koyu ağaç, yeryüzünü yıldızlara bağlayan bir alev gibi yukarı doğru işaret eder."],
    ["Today{bugün} the{} work{eser} belongs{ait} to{-e} the{} Museum{Müze} of{} Modern{Modern} Art{Sanat} in{} New{Yeni} York{York}.", "Bugün eser New York'taki Modern Sanat Müzesi'ne aittir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-starry-night-window", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const moma = "MoMA, Vincent van Gogh, The Starry Night, 1889 (koleksiyon kaydı); https://www.moma.org/collection/works/79802";

export default {
  slug: "b2-starry-night-window", level: "B2", title: "A Sky Painted From Memory", topic: "Sanat", sortOrder: 14, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "Van Gogh combined what he observed with imagination, memory and emotion."), options: [
      option("o1", "How a view became a painting", true, null, "Metin gerçek manzaranın resme dönüşmesini anlatır."),
      option("o2", "Why Van Gogh preferred painting villages", false, "notstated", "Köy tercihi anlatılmaz."),
      option("o3", "How asylums in France treated patients", false, "context", "Tedavi yöntemleri anlatılmaz."),
      option("o4", "How museums decide which paintings to buy", false, "notstated", "Satın alma anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "How long did Van Gogh stay at the asylum?", evidence: findEvidence(paragraphs, "He stayed there for about twelve months"), options: [
      option("o1", "About twelve months", true, null, "Metin yaklaşık on iki ay der."),
      option("o2", "About six months in all", false, "detail", "Süre yarıya indirilmiştir."),
      option("o3", "About three whole years", false, "detail", "Süre fazla uzundur."),
      option("o4", "About two months only", false, "detail", "Süre fazla kısadır."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “celebrated” mean in the first paragraph?", evidence: ev(0, "some of his most celebrated work"), options: [
      option("o1", "Widely praised and well known", true, null, "Celebrated, çok övülen ve tanınan demektir."),
      option("o2", "Recently finished by an artist", false, "context", "Bitmişlik anlamı yok."),
      option("o3", "Covered in thick bright colours", false, "context", "Renkler başka bir paragrafta geçer."),
      option("o4", "Held inside a locked museum room", false, "context", "Müze sonda geçer ama kelime bunu demez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about the village in the painting?", evidence: findEvidence(paragraphs, "Yet the village below was not copied directly from life."), options: [
      option("o1", "It came partly from his mind.", true, null, "Köy doğrudan kopyalanmadı; hayal gücü ve bellek karıştı."),
      option("o2", "It was painted later from a photograph.", false, "notstated", "Fotoğraf anlatılmaz."),
      option("o3", "It was copied from a nearby town.", false, "reverse", "Köy doğrudan kopyalanmadı."),
      option("o4", "It was taken from another painting.", false, "notstated", "Başka tablo anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Van Gogh 1889'da Saint-Rémy'deki Saint-Paul-de-Mausole akıl hastanesine girdi, yaklaşık on iki ay kaldı; The Starry Night Haziran ortasında yapıldı.", source: moma, checkedOn: "2026-11-23" },
    { claim: "Tablo penceresinden görünen sabah gökyüzünden esinlendi; doğrudan gözlemin yanında hayal gücü, anılar ve duygulara dayanır.", source: moma, checkedOn: "2026-11-23" },
    { claim: "Eser MoMA (New York) koleksiyonundadır.", source: moma, checkedOn: "2026-11-23" },
  ] },
};
