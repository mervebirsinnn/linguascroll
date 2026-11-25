import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Placing{yerleştirmek} a{} telescope{teleskop} about{yaklaşık} one{bir} and{} a{} half{buçuk} million{milyon} kilometres{kilometre} from{-den} Earth{Dünya} may{-ebilir} seem{görünmek} an{} extravagant{abartılı} choice{seçim}, since{çünkü} anything{herhangi bir şey} that{ki} goes{gitmek} wrong{ters} out{dışarı} there{orada} is{} effectively{fiilen} beyond{ötesinde} repair{onarım}.", "Bir teleskobu Dünya'dan yaklaşık bir buçuk milyon kilometre uzağa yerleştirmek abartılı bir seçim gibi görünebilir, çünkü orada ters giden her şey fiilen onarımın ötesindedir."],
    ["Yet{yine de} the{} James{James} Webb{Webb} Space{uzay} Telescope{teleskop}, launched{fırlatılan} on{-de (günler için)} Christmas{Noel} Day{günü} in{} two{iki} thousand{bin} twenty{yirmi} one{bir}, was{} deliberately{kasıtlı olarak} sent{gönderilmek} to{-e} that{o} distance{mesafe}, where{ki orada} it{} circles{dönmek} a{} point{nokta} known{bilinen} as{olarak} the{} second{ikinci} Sun{Güneş}-Earth{Dünya} Lagrange{Lagrange} point{nokta}.", "Yine de 2021'de Noel günü fırlatılan James Webb Uzay Teleskobu, ikinci Güneş-Dünya Lagrange noktası denen bir noktanın çevresinde döndüğü o mesafeye bilerek gönderildi."],
    ["At{-de} such{böyle} a{} location{konum}, the{} combined{birleşik} gravity{yerçekimi} of{} the{} two{iki} bodies{cisimler} allows{izin verir} a{} spacecraft{uzay aracı} to{-mek} hold{tutmak} a{} stable{kararlı} position{konum} with{ile} very{çok} little{az} fuel{yakıt}.", "Böyle bir konumda iki cismin birleşik yerçekimi, bir uzay aracının çok az yakıtla kararlı bir konumu korumasına izin verir."],
    ["That{o} makes{yapar} reliability{güvenilirlik} the{} first{ilk} requirement{gereksinim} of{} the{} whole{bütün} design{tasarım}, and{} it{} explains{açıklar} the{} years{yıllar} of{} testing{test} that{ki} came{gelmek} before{önce} launch{fırlatma}.", "Bu, güvenilirliği tüm tasarımın ilk gereksinimi yapar ve fırlatmadan önceki yıllarca süren testleri açıklar."],
  ],
  [
    ["The{} reason{neden} for{için} such{böyle} remoteness{uzaklık} lies{yatar} in{} the{} instrument{aygıt} itself{kendisi}.", "Bu uzaklığın nedeni aygıtın kendisinde yatar."],
    ["Webb{Webb} is{} an{} infrared{kızılötesi} observatory{gözlemevi}, and{} infrared{kızılötesi} detection{algılama} is{} easily{kolayca} swamped{bastırılmış} by{tarafından} heat{ısı}.", "Webb bir kızılötesi gözlemevidir ve kızılötesi algılama ısı tarafından kolayca bastırılır."],
    ["Keeping{tutmak} the{} observatory{gözlemevi} far{uzak} from{-den} Earth{Dünya} helps{yardım eder} it{} avoid{kaçınmak} the{} warmth{sıcaklık} of{} our{bizim} planet{gezegen}, so{böylece} that{ki} its{onun} sensitive{hassas} instruments{aygıtlar} can{-ebilir} stay{kalmak} cold{soğuk}.", "Gözlemevini Dünya'dan uzak tutmak, gezegenimizin sıcaklığından kaçınmasına yardım eder; böylece hassas aygıtları soğuk kalabilir."],
    ["The{} primary{birincil} mirror{ayna}, roughly{kabaca} six{altı} and{} a{} half{buçuk} metres{metre} across{boyunca}, is{} assembled{birleştirilmiş} from{-den} eighteen{on sekiz} hexagonal{altıgen} segments{parçalar} coated{kaplı} with{ile} gold{altın}, and{} these{bu} segments{parçalar} act{davranmak} together{birlikte} as{olarak} a{} single{tek} surface{yüzey}.", "Kabaca altı buçuk metre genişliğindeki birincil ayna, altınla kaplı on sekiz altıgen parçadan oluşur ve bu parçalar birlikte tek bir yüzey gibi davranır."],
  ],
  [
    ["Because{çünkü} light{ışık} travels{yol alır} at{-de} a{} finite{sonlu} speed{hız}, the{} faintest{en soluk} objects{nesneler} Webb{Webb} detects{algılar} are{} also{ayrıca} the{} oldest{en eski}: their{onların} light{ışık} left{ayrıldı} home{ev} long{uzun} before{önce} Earth{Dünya} existed{var olmak}.", "Işık sonlu bir hızla yol aldığı için Webb'in algıladığı en soluk nesneler aynı zamanda en eskileridir: ışıkları, Dünya var olmadan çok önce yuvasını terk etmiştir."],
    ["Observing{gözlemlemek} them{onları} is{} therefore{bu nedenle} less{daha az} like{gibi} taking{almak} a{} photograph{fotoğraf} than{-den} reading{okumak} an{} old{eski} letter{mektup}.", "Onları gözlemlemek bu nedenle bir fotoğraf çekmekten çok eski bir mektubu okumaya benzer."],
    ["Astronomers{gökbilimciler} hope{ummak} the{} data{veri} will{-ecek} reveal{ortaya çıkarmak} how{nasıl} some{bazı} of{} the{} first{ilk} galaxies{galaksiler} formed{oluştu}, although{rağmen} interpreting{yorumlamak} such{böyle} faint{soluk} signals{sinyaller} will{-ecek} demand{gerektirmek} years{yıllar} of{} careful{dikkatli} analysis{analiz}.", "Gökbilimciler verinin ilk galaksilerin bazılarının nasıl oluştuğunu ortaya çıkarmasını umuyor; ancak bu kadar soluk sinyalleri yorumlamak yıllarca dikkatli analiz gerektirecek."],
    ["Whatever{ne olursa olsun} the{} results{sonuçlar} turn{dönmek} out{çıkmak} to{-e} be{olmak}, the{} mission{görev} already{zaten} shows{gösterir} how{ne kadar} far{uzağa} careful{dikkatli} engineering{mühendislik} can{-ebilir} extend{uzatmak} human{insan} sight{görüş}.", "Sonuçlar ne olursa olsun görev, dikkatli mühendisliğin insan görüşünü ne kadar uzağa taşıyabildiğini zaten gösteriyor."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-webb-cold-and-far", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA Scientific Visualization Studio, James Webb Space Telescope Launch and Orbit at L2; https://svs.gsfc.nasa.gov/4991/";
const brit = "Encyclopaedia Britannica, James Webb Space Telescope; https://www.britannica.com/topic/James-Webb-Space-Telescope";

export default {
  slug: "c1-webb-cold-and-far", level: "C1", title: "Cold, Far and Looking Back", topic: "Bilim", sortOrder: 12, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central point of the passage?", evidence: ev(1, "Keeping the observatory far from Earth helps it avoid the warmth of our planet"), options: [
      option("o1", "Webb's distance suits its infrared work", true, null, "Metin uzak konumun kızılötesi gözlemi mümkün kıldığını anlatır."),
      option("o2", "Distance makes Webb easier to repair", false, "reverse", "Metin uzaklığın onarımı zorlaştırdığını söyler."),
      option("o3", "Gold mirrors are needed by every telescope", false, "extreme", "Altın yalnızca Webb'in kaplamasıdır."),
      option("o4", "Webb mainly photographs nearby planets", false, "reverse", "Webb uzak, soluk nesneleri gözlemler."),
    ] },
    { key: "q2", type: "detail", prompt: "Why must the instruments stay cold?", evidence: ev(1, "infrared detection is easily swamped by heat"), options: [
      option("o1", "Heat easily overwhelms infrared detection", true, null, "Metin kızılötesi algılamanın ısı tarafından bastırıldığını söyler."),
      option("o2", "The gold coating melts at ordinary temperatures", false, "notstated", "Altının erimesinden söz edilmez."),
      option("o3", "The segments would otherwise become misaligned", false, "notstated", "Hizalama sorunu anlatılmaz."),
      option("o4", "Cold air improves the quality of the launch", false, "notstated", "Fırlatma kalitesi konu değildir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “swamped” mean in the second paragraph?", evidence: ev(1, "infrared detection is easily swamped by heat"), options: [
      option("o1", "Beaten by something stronger", true, null, "Swamped, daha güçlü bir şey tarafından bastırılmış demektir."),
      option("o2", "Partly hidden by thick clouds", false, "context", "Bulutlar anlatılmaz."),
      option("o3", "Carefully repaired after damage", false, "context", "Onarım geçer ama anlam bu değildir."),
      option("o4", "Slowly cooled to a lower level", false, "reverse", "Soğutma ısının tersine bir işlemdir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the comparison to “reading an old letter” imply?", evidence: ev(2, "Observing them is therefore less like taking a photograph than reading an old letter."), options: [
      option("o1", "The light shows the past, not the present", true, null, "Işık geçmişten gelir; bugünü değil geçmişi gösterir."),
      option("o2", "The data are difficult to translate into words", false, "context", "Benzetme dil çevirisi değil, zaman gecikmesi içindir."),
      option("o3", "Distant objects are written in a code", false, "context", "Kodlama anlatılmaz."),
      option("o4", "Astronomers receive messages from other life", false, "extreme", "Böyle bir iddia yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "JWST 25 Aralık 2021'de fırlatıldı ve Dünya'dan yaklaşık 1,5 milyon km uzaktaki Güneş-Dünya L2 noktası çevresinde yörüngededir.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "JWST bir kızılötesi gözlemevidir; yaklaşık 6,5 m'lik, altın kaplı ana aynası 18 altıgen parçadan oluşur.", source: brit, checkedOn: "2026-11-23" },
    { claim: "Uzak nesnelerden gelen ışık uzun yol aldığı için onları gözlemek geçmişe bakmaktır; Webb en erken galaksileri incelemeyi amaçlar.", source: brit, checkedOn: "2026-11-23" },
  ] },
};
