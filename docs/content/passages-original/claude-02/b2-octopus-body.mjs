import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["An{} octopus{ahtapot} is{} built{inşa edilmiş} differently{farklı} from{-den} almost{neredeyse} any{herhangi} animal{hayvan} we{biz} know{bilmek}, and{} its{onun} circulation{dolaşım} is{} a{} good{iyi} example{örnek}.", "Bir ahtapot, bildiğimiz hemen her hayvandan farklı yapılmıştır ve dolaşım sistemi bunun iyi bir örneğidir."],
    ["That{o} makes{yapar} it{} one{biri} of{} the{} strangest{en garip} bodies{vücutlar} in{} the{} animal{hayvan} kingdom{alem}.", "Bu onu hayvanlar âlemindeki en garip vücutlardan biri yapar."],
    ["It{} has{sahiptir} three{üç} hearts{kalpler}: two{iki} pump{pompalamak} blood{kan} through{içinden} the{} gills{solungaçlar}, where{ki orada} it{} picks{almak} up{yukarı} oxygen{oksijen}, while{iken} the{} third{üçüncü} sends{göndermek} that{o} oxygen{oksijen}-rich{zengin} blood{kan} around{çevresine} the{} rest{geri kalan} of{} the{} body{vücut}.", "Üç kalbi vardır: ikisi kanı oksijen aldığı solungaçlardan geçirir, üçüncüsü ise bu oksijen bakımından zengin kanı vücudun geri kalanına gönderir."],
    ["Its{onun} blood{kan} is{} blue{mavi}, because{çünkü} it{} relies{güvenir} on{-e} a{} copper{bakır}-based{temelli} protein{protein} to{-mek için} carry{taşımak} oxygen{oksijen}, whereas{oysa} human{insan} blood{kan} uses{kullanır} an{} iron{demir}-based{temelli} one{olan}.", "Kanı mavidir, çünkü oksijeni taşımak için bakır temelli bir proteine güvenir; insan kanı ise demir temelli olanı kullanır."],
  ],
  [
    ["The{} nervous{sinir} system{sistem} is{} just{tam olarak} as{kadar} unusual{sıra dışı}.", "Sinir sistemi de aynı derecede sıra dışıdır."],
    ["Roughly{kabaca} two{iki} thirds{üçte} of{} an{} octopus's{ahtapotun} neurons{sinir hücreleri} are{} located{yerleşmiş} in{} its{onun} arms{kollar} rather{yerine (rather than)} than{yerine (rather than)} in{} its{} central{merkezi} brain{beyin}.", "Bir ahtapotun sinir hücrelerinin kabaca üçte ikisi merkezi beyninde değil, kollarında bulunur."],
    ["As{sonuç olarak (as a result)} a{sonuç olarak (as a result)} result{sonuç olarak (as a result)}, each{her} arm{kol} can{-ebilir} explore{keşfetmek}, grasp{kavramak} and{} react{tepki vermek} with{ile} a{} high{yüksek} degree{derece} of{} independence{bağımsızlık}.", "Sonuç olarak her kol yüksek derecede bağımsızlıkla keşfedebilir, kavrayabilir ve tepki verebilir."],
    ["This{bu} arrangement{düzen} helps{yardım eder} the{} animal{hayvan} react{tepki vermek} quickly{hızla}.", "Bu düzen hayvanın hızla tepki vermesine yardım eder."],
    ["Some{bazı} researchers{araştırmacılar} even{hatta} describe{tanımlamak} the{} animal{hayvan} as{olarak} having{sahip} nine{dokuz} brains{beyinler}, although{rağmen} that{o} phrase{ifade} is{} a{} simplification{basitleştirme}.", "Bazı araştırmacılar hayvanı hatta dokuz beyni olan bir hayvan olarak tanımlar, ancak bu ifade bir basitleştirmedir."],
  ],
  [
    ["Such{böyle} figures{rakamlar} vary{değişir} between{arasında} sources{kaynaklar}, so{bu yüzden} they{} are{} best{en iyi} read{okunmak} as{olarak} approximate{yaklaşık}.", "Bu rakamlar kaynaklara göre değişir; bu yüzden yaklaşık olarak okunmaları en iyisidir."],
    ["What{ne} remains{kalır} clear{açık} is{} that{ki} the{} octopus{ahtapot} solves{çözer} everyday{gündelik} problems{sorunlar} with{ile} a{} body{vücut} plan{plan} very{çok} unlike{-den farklı} our{bizim} own{kendi}.", "Açık olan şey, ahtapotun gündelik sorunları bizimkinden çok farklı bir vücut planıyla çözdüğüdür."],
    ["Scientists{bilim insanları} keep{sürdürmek} studying{incelemek} octopuses{ahtapotlar} because{çünkü} their{onların} bodies{vücutlar} suggest{düşündürmek} that{ki} intelligence{zeka} can{-ebilir} evolve{evrimleşmek} in{} very{çok} different{farklı} ways{yollar}.", "Bilim insanları ahtapotları incelemeyi sürdürüyor, çünkü vücutları zekânın çok farklı yollarla evrimleşebileceğini düşündürüyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-octopus-body", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const pbs = "PBS Nature, Octopus (other species); https://www.pbs.org/wnet/nature/group/other-species/octopus/";
const smith = "Smithsonian Magazine, Ten wild facts about octopuses: they have three hearts, big brains and blue blood; https://www.smithsonianmag.com/science-nature/ten-wild-facts-about-octopuses-they-have-three-hearts-big-brains-and-blue-blood-7625828/";

export default {
  slug: "b2-octopus-body", level: "B2", title: "A Body Plan Unlike Our Own", topic: "Biyoloji", sortOrder: 17, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "the octopus solves everyday problems with a body plan very unlike our own"), options: [
      option("o1", "An octopus's unusual body", true, null, "Metin ahtapotun olağandışı vücut yapısını anlatır."),
      option("o2", "How octopuses hunt in deep, cold water", false, "notstated", "Avlanma anlatılmaz."),
      option("o3", "Why octopuses prefer shallow reefs", false, "notstated", "Yaşam alanı anlatılmaz."),
      option("o4", "How blood differs across all animals", false, "extreme", "Metin yalnızca ahtapot ve insanı karşılaştırır."),
    ] },
    { key: "q2", type: "detail", prompt: "What do two of the octopus's hearts do?", evidence: ev(0, "two pump blood through the gills, where it picks up oxygen"), options: [
      option("o1", "Pump blood through the gills", true, null, "Metin iki kalbin kanı solungaçlara pompaladığını söyler."),
      option("o2", "Send blood to the arms only", false, "reverse", "Vücuda kanı üçüncü kalp gönderir."),
      option("o3", "Control the movement of each arm", false, "context", "Kolların kontrolü sinir sistemine aittir."),
      option("o4", "Store oxygen for use during the night", false, "notstated", "Depolama anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “approximate” mean in the last paragraph?", evidence: ev(2, "they are best read as approximate"), options: [
      option("o1", "Close but not exact", true, null, "Approximate, kesin olmayan ama yakın demektir."),
      option("o2", "Completely certain and fixed", false, "reverse", "Tersini anlatır."),
      option("o3", "Very large and surprising", false, "context", "Büyüklükle ilgili değildir."),
      option("o4", "Written in a scientific journal", false, "notstated", "Yayın türüyle ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does calling “nine brains” a simplification imply?", evidence: findEvidence(paragraphs, "Some researchers even describe the animal as having nine brains, although that phrase is a simplification."), options: [
      option("o1", "It is a loose way of speaking.", true, null, "Basitleştirme, ifadenin kesin bir sayı değil gevşek bir anlatım olduğunu ima eder."),
      option("o2", "It means each arm is a full brain.", false, "extreme", "Metin kollardaki sinir hücresi kümelerinden söz eder; tam beyinden değil."),
      option("o3", "It means there is no central brain.", false, "reverse", "Merkezi bir beyin vardır."),
      option("o4", "It was found by counting neurons.", false, "notstated", "Sayım yöntemi anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ahtapotun üç kalbi vardır: ikisi kanı solungaçlara, üçüncüsü vücuda pompalar.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Kanı bakır temelli hemosiyanin yüzünden mavidir; insan kanı demirli hemoglobin kullanır.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Sinir hücrelerinin yaklaşık üçte ikisi kollardadır; 'dokuz beyin' ifadesi bir basitleştirmedir ve rakamlar kaynaklara göre değişir.", source: pbs, checkedOn: "2026-11-23" },
  ] },
};
