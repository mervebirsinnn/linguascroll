import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} James{James} Webb{Webb} Space{uzay} Telescope{teleskop} was{} launched{fırlatıldı} on{-de (günler için)} Christmas{Noel} Day{günü} in{} two{iki} thousand{bin} twenty{yirmi} one{bir}, and{} astronomers{gökbilimciler} have{} been{} using{kullanmak} it{} to{-mek için} study{incelemek} the{} early{erken} universe{evren} ever{beri} since{o zamandan}.", "James Webb Uzay Teleskobu 2021'de Noel günü fırlatıldı ve gökbilimciler o zamandan beri erken evreni incelemek için onu kullanıyor."],
    ["After{sonra} launch{fırlatma}, it{} travelled{yolculuk etti} for{boyunca} about{yaklaşık} a{} month{ay} to{-e} reach{ulaşmak} a{} region{bölge} roughly{kabaca} one{bir} and{} a{} half{buçuk} million{milyon} kilometres{kilometre} from{-den} Earth{Dünya}.", "Fırlatmadan sonra yaklaşık bir ay boyunca yolculuk edip Dünya'dan kabaca bir buçuk milyon kilometre uzaktaki bir bölgeye ulaştı."],
    ["Near{yakınında} that{o} point{nokta}, the{} gravity{yerçekimi} of{} the{} Sun{Güneş} and{} Earth{Dünya} combine{birleşmek} in{} a{} way{biçim} that{ki} lets{izin verir} a{} spacecraft{uzay aracı} hold{tutmak} a{} steady{sabit} position{konum}.", "O noktanın yakınında Güneş'in ve Dünya'nın yerçekimi, bir uzay aracının sabit bir konumu korumasına izin verecek biçimde birleşir."],
  ],
  [
    ["Unlike{-den farklı olarak} the{} Hubble{Hubble} telescope{teleskop}, which{ki o} mostly{çoğunlukla} observes{gözlemler} visible{görünür} light{ışık}, Webb{Webb} is{} an{} infrared{kızılötesi} observatory{gözlemevi}.", "Çoğunlukla görünür ışığı gözlemleyen Hubble teleskobunun aksine Webb bir kızılötesi gözlemevidir."],
    ["Its{onun} main{ana} mirror{ayna} is{} about{yaklaşık} six{altı} and{} a{} half{buçuk} metres{metre} wide{geniş}, and{} it{} is{} built{inşa edilmiş} from{-den} eighteen{on sekiz} hexagonal{altıgen} segments{parçalar} coated{kaplı} with{ile} a{} thin{ince} layer{tabaka} of{} gold{altın}.", "Ana aynası yaklaşık altı buçuk metre genişliğindedir ve ince bir altın tabakayla kaplı on sekiz altıgen parçadan oluşur."],
    ["The{} segments{parçalar} are{} aligned{hizalanmış} so{öyle ki} precisely{hassas biçimde} that{ki} they{} behave{davranmak} like{gibi} a{} single{tek} giant{dev} mirror{ayna}.", "Parçalar o kadar hassas hizalanmıştır ki tek bir dev ayna gibi davranırlar."],
    ["This{bu} design{tasarım} lets{izin verir} the{} mirror{ayna} collect{toplamak} a{} great{büyük} deal{miktar} of{} faint{soluk} light{ışık}.", "Bu tasarım aynanın büyük miktarda soluk ışık toplamasına izin verir."],
  ],
  [
    ["Light{ışık} takes{alır} time{zaman} to{-mek} travel{yol almak}, so{bu yüzden} the{} light{ışık} from{-den} faraway{uzak} galaxies{galaksiler} left{ayrıldı} them{onlar} long{uzun} ago{önce}.", "Işığın yol alması zaman alır; bu yüzden uzak galaksilerden gelen ışık onları çok önce terk etmiştir."],
    ["Studying{incelemek} that{o} light{ışık} is{} therefore{bu nedenle} a{} form{biçim} of{} looking{bakmak} into{içine} the{} past{geçmiş}.", "Bu ışığı incelemek, bu nedenle geçmişe bakmanın bir biçimidir."],
    ["Many{birçok} of{} these{bu} objects{nesneler} are{} far{çok} too{fazla} faint{soluk} for{için} older{daha eski} telescopes{teleskoplar}.", "Bu nesnelerin birçoğu eski teleskoplar için fazla soluktur."],
    ["Webb's{Webb'in} infrared{kızılötesi} sensitivity{duyarlılık} lets{izin verir} astronomers{gökbilimciler} observe{gözlemlemek} some{bazı} of{} the{} earliest{en erken} galaxies{galaksiler} that{ki} have{} been{} detected{tespit edilmiş}.", "Webb'in kızılötesi duyarlılığı, gökbilimcilerin şimdiye kadar tespit edilmiş en erken galaksilerin bazılarını gözlemlemesine izin verir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-webb-looking-back", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA Scientific Visualization Studio, James Webb Space Telescope Launch and Orbit at L2; https://svs.gsfc.nasa.gov/4991/";
const brit = "Encyclopaedia Britannica, James Webb Space Telescope; https://www.britannica.com/topic/James-Webb-Space-Telescope";

export default {
  slug: "b2-webb-looking-back", level: "B2", title: "Looking Back in Time", topic: "Bilim", sortOrder: 12, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: findEvidence(paragraphs, "Studying that light is therefore a form of looking into the past."), options: [
      option("o1", "A telescope viewing early space", true, null, "Metin Webb'in tasarımını ve erken evreni gözlemesini anlatır."),
      option("o2", "A history of Hubble's discoveries", false, "context", "Hubble yalnızca karşılaştırmadır."),
      option("o3", "A study of why gold reflects light", false, "context", "Altın kaplama ayrıntıdır."),
      option("o4", "A plan to build a bigger telescope", false, "notstated", "Daha büyük teleskop planı anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "How is Webb's main mirror built?", evidence: ev(1, "it is built from eighteen hexagonal segments coated with a thin layer of gold"), options: [
      option("o1", "Eighteen hexagonal pieces with a gold coating", true, null, "Metin on sekiz altıgen parçayı ve altın tabakayı söyler."),
      option("o2", "One solid piece of polished glass in a metal frame", false, "reverse", "Ayna tek parça değildir."),
      option("o3", "Six large pieces joined together by astronauts in orbit", false, "notstated", "Astronotlardan söz edilmez."),
      option("o4", "Hundreds of tiny mirrors placed in several rows", false, "extreme", "Yüzlerce küçük ayna yoktur; on sekiz parça vardır."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “steady” mean in the first paragraph?", evidence: ev(0, "hold a steady position"), options: [
      option("o1", "Stable and not changing much", true, null, "Steady, sabit ve değişmeyen demektir."),
      option("o2", "Extremely fast and difficult to follow", false, "reverse", "Sabit olmak hızlı hareketin tersidir."),
      option("o3", "Covered with a thin layer of metal", false, "context", "Kaplama aynayla ilgilidir; steady bununla ilgili değildir."),
      option("o4", "Slightly different from other options", false, "sound", "Steady sözcüğünün anlamı bu değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred from the final paragraph?", evidence: ev(2, "the light from faraway galaxies left them long ago"), options: [
      option("o1", "Far galaxies appear as they were.", true, null, "Işık uzun yol aldığı için galaksileri geçmişteki hâlleriyle görürüz."),
      option("o2", "Galaxies disappear before their light arrives.", false, "extreme", "Metin böyle bir şey söylemez."),
      option("o3", "Telescopes can move light faster than normal.", false, "extreme", "Işığın hızlandırılmasından söz edilmez."),
      option("o4", "Nearby stars are always older than distant ones.", false, "reverse", "Metinde böyle bir karşılaştırma yok."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "JWST 25 Aralık 2021'de fırlatıldı ve yaklaşık bir ay sonra Dünya'dan ~1,5 milyon km uzaktaki Güneş-Dünya L2 çevresindeki yörüngesine ulaştı.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "JWST bir kızılötesi gözlemevidir; yaklaşık 6,5 m'lik ana aynası altın kaplı berilyumdan, 18 altıgen parçadan oluşur.", source: brit, checkedOn: "2026-11-23" },
    { claim: "Uzak nesnelerden gelen ışık uzun yol aldığı için onları gözlemek geçmişe bakmaktır; Webb bilinen en erken galaksilerin bazılarını gözlemleyebilir.", source: brit, checkedOn: "2026-11-23" },
  ] },
};
