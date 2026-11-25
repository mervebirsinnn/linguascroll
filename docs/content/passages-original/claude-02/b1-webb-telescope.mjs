import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} James{James} Webb{Webb} Space{uzay} Telescope{teleskop} is{} one{bir} of{} the{} biggest{en büyük} telescopes{teleskoplar} ever{şimdiye kadar} sent{gönderilen} into{-e} space{uzay}.", "James Webb Uzay Teleskobu, şimdiye kadar uzaya gönderilen en büyük teleskoplardan biridir."],
    ["It{} was{} launched{fırlatıldı} on{-de (günler için)} Christmas{Noel} Day{günü} in{} two{iki} thousand{bin} twenty{yirmi} one{bir}.", "O, 2021 yılında Noel günü fırlatıldı."],
    ["Today{bugün} it{} floats{süzülür} about{yaklaşık} one{bir} and{} a{} half{buçuk} million{milyon} kilometres{kilometre} from{-den} Earth{Dünya}.", "Bugün Dünya'dan yaklaşık bir buçuk milyon kilometre uzakta süzülüyor."],
    ["Its{onun} job{görev} is{} to{-mek} look{bakmak} far{uzak} away{uzağa} and{} far{çok} back{geriye} in{} time{zaman}.", "Görevi uzağa ve zamanda çok geriye bakmaktır."],
    ["Light{ışık} from{-den} far{uzak} away{uzaktan} takes{almak} a{} very{çok} long{uzun} time{zaman} to{-mek} arrive{ulaşmak}.", "Uzaktan gelen ışığın ulaşması çok uzun zaman alır."],
  ],
  [
    ["The{} telescope{teleskop} looks{bakar} at{-e (bakmak)} infrared{kızılötesi} light{ışık}, which{ki bu} people{insanlar} cannot{-amaz} see{görmek} with{} their{} eyes{göz}.", "Teleskop, insanların gözleriyle göremediği kızılötesi ışığa bakar."],
    ["Its{} main{ana} mirror{ayna} is{} covered{kaplı} with{} gold{altın} and{} made{yapılmış} of{} eighteen{on sekiz} smaller{daha küçük} pieces{parçalar}.", "Ana aynası altınla kaplıdır ve on sekiz küçük parçadan yapılmıştır."],
    ["Together{birlikte}, they{} work{çalışır} like{gibi} one{bir} huge{dev} mirror{ayna}, about{yaklaşık} six{altı} and{} a{} half{buçuk} metres{metre} wide{geniş}.", "Birlikte, yaklaşık altı buçuk metre genişliğinde dev bir ayna gibi çalışırlar."],
  ],
  [
    ["Webb{Webb} stays{kalır} near{yakınında} a{} point{nokta} in{} space{uzay} where{ki orada} the{} pull{çekim} of{} the{} Sun{Güneş} and{} Earth{Dünya} helps{yardım eder} keep{tutmak} it{} steady{sabit}.", "Webb, Güneş'in ve Dünya'nın çekiminin onu sabit tutmaya yardım ettiği uzaydaki bir noktanın yakınında kalır."],
    ["Scientists{bilim insanları} use{kullanır} the{} telescope{teleskop} to{-mek için} study{incelemek} faraway{uzaktaki} stars{yıldızlar} and{} very{çok} old{eski} galaxies{galaksiler}.", "Bilim insanları teleskobu uzaktaki yıldızları ve çok eski galaksileri incelemek için kullanır."],
    ["It{} sends{gönderir} its{onun} pictures{görüntüler} back{geri} to{-e} Earth{Dünya} so{böylece} people{insanlar} everywhere{her yerde} can{-ebilir} enjoy{keyfini çıkarmak} them{onları}.", "Görüntülerini Dünya'ya geri gönderir; böylece her yerdeki insanlar onların keyfini çıkarabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-webb-telescope", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA Scientific Visualization Studio, James Webb Space Telescope Launch and Orbit at L2; https://svs.gsfc.nasa.gov/4991/";
const brit = "Encyclopaedia Britannica, James Webb Space Telescope; https://www.britannica.com/topic/James-Webb-Space-Telescope";

export default {
  slug: "b1-webb-telescope", level: "B1", title: "A Giant Eye in Space", topic: "Bilim", sortOrder: 12, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "The James Webb Space Telescope is one of the biggest telescopes ever sent into space."), options: [
      option("o1", "A big telescope for studying space", true, null, "Metin Webb teleskobunu ve ne için kullanıldığını anlatır."),
      option("o2", "How the Sun gives light to Earth", false, "notstated", "Güneş'in ışığı anlatılmaz."),
      option("o3", "A trip by astronauts to old galaxies", false, "reverse", "Webb astronotlarla değil, uzaktan çalışan bir teleskop olarak anlatılır."),
      option("o4", "How gold is mined for mirrors", false, "context", "Altın yalnızca ayna kaplamasıdır."),
    ] },
    { key: "q2", type: "detail", prompt: "How far from Earth does the telescope float?", evidence: ev(0, "Today it floats about one and a half million kilometres from Earth."), options: [
      option("o1", "Six and a half thousand kilometres", false, "detail", "Altı buçuk metre aynanın genişliğidir, uzaklık değil."),
      option("o2", "Eighteen thousand kilometres", false, "detail", "On sekiz sayısı ayna parçalarının sayısıdır."),
      option("o3", "One and a half million kilometres", true, null, "Metin bir buçuk milyon kilometre der."),
      option("o4", "Two thousand kilometres", false, "notstated", "Metinde böyle bir uzaklık yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “steady” mean in the last paragraph?", evidence: ev(2, "helps keep it steady"), options: [
      option("o1", "Staying in one place", true, null, "Steady, sabit, çok oynamayan demektir."),
      option("o2", "Very hot and bright", false, "context", "Sıcaklıkla ilgili bir ifade yoktur."),
      option("o3", "Moving faster each day", false, "reverse", "Sabit olmak hızlanmanın tersidir."),
      option("o4", "Covered with gold", false, "context", "Altın aynanın kaplamasıdır; steady onunla ilgili değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about the very old galaxies Webb studies?", evidence: findEvidence(paragraphs, "Light from far away takes a very long time to arrive."), options: [
      option("o1", "We see them as they looked long ago.", true, null, "Uzaktan gelen ışık çok geç ulaşır; bu yüzden galaksileri geçmişteki hâlleriyle görürüz."),
      option("o2", "They have since disappeared completely.", false, "extreme", "Metin galaksilerin yok olduğunu söylemez."),
      option("o3", "They are closer to Earth than Webb.", false, "reverse", "Galaksiler uzaktadır; Webb'den yakın değildir."),
      option("o4", "Their light travels faster than other light.", false, "notstated", "Işık hızlarının farklı olduğu söylenmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "JWST 25 Aralık 2021'de Guiana Uzay Merkezi'nden fırlatıldı ve Dünya'dan yaklaşık 1,5 milyon km uzaktaki Güneş-Dünya L2 noktası çevresinde yörüngededir.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "JWST bir kızılötesi gözlemevidir; 6,5 metre çapında, altın kaplı berilyum ana aynası 18 altıgen parçadan oluşur.", source: brit, checkedOn: "2026-11-23" },
  ] },
};
