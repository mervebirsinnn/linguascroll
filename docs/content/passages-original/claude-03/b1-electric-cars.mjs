import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["An{} electric{elektrikli} car{araba} does{} not{} need{ihtiyaç duymak} petrol{benzin}.", "Elektrikli bir arabanın benzine ihtiyacı yoktur."],
    ["Instead{bunun yerine}, it{} has{vardır} a{} large{büyük} battery{batarya} and{} an{} electric{elektrikli} motor{motor}.", "Bunun yerine büyük bir bataryası ve elektrikli bir motoru vardır."],
    ["The{} driver{sürücü} charges{şarj eder} the{} battery{batarya} by{-erek} plugging{prize takmak} the{} car{araba} into{-e} a{} charger{şarj cihazı}.", "Sürücü, arabayı bir şarj cihazına takarak bataryayı şarj eder."],
    ["Electric{elektrikli} cars{arabalar} are{} not{} new{yeni}.", "Elektrikli arabalar yeni değildir."],
    ["Some{bazıları} were{} already{zaten} on{} the{} roads{yollar} more{daha} than{-den} a{} hundred{yüz} years{yıllar} ago{önce}, but{} petrol{benzin} cars{arabalar} soon{kısa sürede} became{oldu} more{daha} popular{popüler}.", "Bazıları yüz yıldan daha uzun süre önce zaten yollardaydı ama benzinli arabalar kısa sürede daha popüler oldu."],
  ],
  [
    ["Electric{elektrikli} cars{arabalar} have{sahip olmak} some{bazı} clear{açık} advantages{avantajlar}.", "Elektrikli arabaların bazı açık avantajları vardır."],
    ["They{} produce{üretmek} no{hiç} smoke{duman} from{-den} an{} exhaust{egzoz} pipe{boru}, so{bu yüzden} the{} air{hava} in{} busy{kalabalık} cities{şehirler} can{-ebilir} be{} cleaner{daha temiz}.", "Egzoz borusundan hiç duman çıkarmazlar, bu yüzden kalabalık şehirlerde hava daha temiz olabilir."],
    ["When{-dığında} the{} driver{sürücü} slows{yavaşlamak} down{(slow down) yavaşlamak}, many{birçok} electric{elektrikli} cars{arabalar} can{-ebilir} turn{dönüştürmek} some{bir kısmı} of{} the{} movement{hareket} back{geri} into{-e} electricity{elektrik}.", "Sürücü yavaşladığında birçok elektrikli araba hareketin bir kısmını yeniden elektriğe dönüştürebilir."],
  ],
  [
    ["However{ancak}, there{(there are) var} are{} problems{sorunlar} too{de}.", "Ancak sorunlar da vardır."],
    ["Charging{şarj etmek} a{} battery{batarya} usually{genellikle} takes{sürmek} much{çok} longer{daha uzun} than{-den} filling{doldurmak} a{} tank{depo} with{} petrol{benzin}.", "Bir bataryayı şarj etmek, genellikle bir depoyu benzinle doldurmaktan çok daha uzun sürer."],
    ["Finally{son olarak}, an{} electric{elektrikli} car{araba} is{} only{yalnızca} as{} clean{temiz} as{} the{} electricity{elektrik} it{} uses{kullanmak}.", "Son olarak, elektrikli bir araba ancak kullandığı elektrik kadar temizdir."],
    ["If{} that{o} electricity{elektrik} comes{gelmek} from{-den} coal{kömür}, the{} benefit{fayda} is{} smaller{daha küçük}.", "O elektrik kömürden geliyorsa fayda daha küçüktür."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-electric-cars", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const afdc = "U.S. Department of Energy, Alternative Fuels Data Center, Electric Vehicle Basics; https://afdc.energy.gov/vehicles/electric-basics-ev";
const brit = "Encyclopaedia Britannica, Electric automobile; https://www.britannica.com/technology/electric-automobile";

export default {
  slug: "b1-electric-cars", level: "B1", title: "Cars Without Petrol", topic: "Teknoloji", sortOrder: 40, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "Electric cars have some clear advantages."), options: [
      option("o1", "Good and bad points of electric cars", true, null, "Metin elektrikli arabaların avantajlarını ve sorunlarını birlikte anlatır."),
      option("o2", "How to drive an electric car safely in a city", false, "notstated", "Güvenli sürüş anlatılmaz."),
      option("o3", "Why petrol is cheaper than electricity", false, "notstated", "Benzin ve elektrik fiyatları karşılaştırılmaz."),
      option("o4", "The history of the first petrol cars", false, "context", "Geçmiş yalnızca bir cümlede ve elektrikli arabalar için anılır."),
    ] },
    { key: "q2", type: "detail", prompt: "What can many electric cars do when the driver slows down?", evidence: ev(1, "many electric cars can turn some of the movement back into electricity"), options: [
      option("o1", "Turn some movement into electricity", true, null, "Metin yavaşlarken hareketin bir kısmının yeniden elektriğe dönüştürüldüğünü söyler."),
      option("o2", "Stop the battery for a short while", false, "notstated", "Bataryanın durduğu söylenmez."),
      option("o3", "Make a loud warning sound", false, "notstated", "Böyle bir şey anlatılmaz."),
      option("o4", "Start to use petrol from a small extra tank", false, "reverse", "Elektrikli arabanın benzine ihtiyacı yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "advantages" mean in the second paragraph?', evidence: ev(1, "Electric cars have some clear advantages."), options: [
      option("o1", "Good points", true, null, "Advantage, avantaj, yani iyi yan demektir; ardından gelen cümleler bu iyi yanları sıralar."),
      option("o2", "Hidden costs", false, "context", "Maliyetler üçüncü paragrafta sorun olarak geçer."),
      option("o3", "Broken parts", false, "context", "Arıza parçalardan söz edilmez."),
      option("o4", "Rules for drivers", false, "context", "Sürücü kuralları anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer from the last paragraph?", evidence: findEvidence(paragraphs, "If that electricity comes from coal, the benefit is smaller."), options: [
      option("o1", "The source of the power matters for the planet.", true, null, "Elektrik kömürden gelirse fayda küçüldüğüne göre, elektriğin kaynağı çevre için önemlidir."),
      option("o2", "Coal makes electric cars much faster.", false, "notstated", "Hızdan söz edilmez."),
      option("o3", "Electric cars are cleaner when they use coal power.", false, "reverse", "Kömürle fayda küçülür, artmaz."),
      option("o4", "Electric cars cannot use any other kind of power.", false, "reverse", "Kömür yalnızca bir örnektir; elektriğin başka kaynaklardan da gelebileceği ima edilir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Elektrikli arabalar benzin yerine batarya ve elektrik motoru kullanır, prize takılarak şarj edilir ve egzozdan emisyon çıkarmaz.", source: afdc, checkedOn: "2026-11-23" },
    { claim: "Elektrikli otomobiller 19. yüzyılın sonu ve 20. yüzyılın başında yollardaydı; sonra benzinli arabalar yaygınlaştı.", source: brit, checkedOn: "2026-11-23" },
    { claim: "Birçok elektrikli araç rejeneratif frenleme ile yavaşlarken enerjinin bir kısmını geri kazanır.", source: afdc, checkedOn: "2026-11-23" },
    { claim: "Şarj, depo doldurmaktan uzun sürer; toplam emisyon faydası elektriğin üretildiği kaynağa bağlıdır.", source: afdc, checkedOn: "2026-11-23" },
  ] },
};
