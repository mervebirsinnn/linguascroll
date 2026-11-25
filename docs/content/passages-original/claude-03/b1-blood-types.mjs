import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Everyone's{herkesin} blood{kan} looks{görünmek} red{kırmızı}, but{} it{} is{} not{} all{hepsi} the{} same{aynı}.", "Herkesin kanı kırmızı görünür ama hepsi aynı değildir."],
    ["Doctors{doktorlar} divide{ayırmak} blood{kan} into{-e} four{dört} main{ana} groups{gruplar}: A{A grubu}, B{B grubu}, AB{AB grubu}, and{} O{0 grubu}.", "Doktorlar kanı dört ana gruba ayırır: A, B, AB ve 0."],
    ["The{} group{grup} depends{bağlı olmak} on{-e} tiny{minicik} markers{işaretler} on{} the{} surface{yüzey} of{} red{kırmızı} blood{kan} cells{hücreler}.", "Grup, kırmızı kan hücrelerinin yüzeyindeki minicik işaretlere bağlıdır."],
    ["Your{} blood{kan} group{grup} comes{gelmek} from{-den} your{} parents{ebeveynler}.", "Kan grubunuz ebeveynlerinizden gelir."],
    ["A{} scientist{bilim insanı} called{adlı} Karl{Karl} Landsteiner{Landsteiner} first{ilk kez} discovered{keşfetti} blood{kan} groups{gruplar} in{} 1901.", "Karl Landsteiner adlı bir bilim insanı kan gruplarını ilk kez 1901'de keşfetti."],
  ],
  [
    ["Blood{kan} groups{gruplar} are{} very{çok} important{önemli} when{-dığında} a{} patient{hasta} needs{ihtiyaç duymak} blood{kan} from{-den} another{başka} person{kişi}.", "Bir hastanın başka birinden kana ihtiyacı olduğunda kan grupları çok önemlidir."],
    ["If{} a{} patient{hasta} gets{almak} the{} wrong{yanlış} type{tür}, the{} body{vücut} may{-ebilir} attack{saldırmak} the{} new{yeni} blood{kan} cells{hücreler}.", "Bir hasta yanlış türü alırsa vücut yeni kan hücrelerine saldırabilir."],
    ["This{} can{-ebilir} make{etmek} the{} patient{hasta} very{çok} ill{hasta}.", "Bu, hastayı çok hasta edebilir."],
    ["For{} this{} reason{neden}, hospitals{hastaneler} usually{genellikle} check{kontrol etmek} blood{kan} groups{gruplar} carefully{dikkatlice} before{önce} they{} give{vermek} blood{kan}.", "Bu nedenle hastaneler kan vermeden önce kan gruplarını genellikle dikkatlice kontrol eder."],
  ],
  [
    ["There{(there is) var} is{} also{ayrıca} a{} second{ikinci} system{sistem}, called{adlı} the{} Rh{Rh} factor{faktör}.", "Rh faktörü adlı ikinci bir sistem de vardır."],
    ["Blood{kan} can{-ebilir} be{} Rh{Rh} positive{pozitif} or{} Rh{Rh} negative{negatif}.", "Kan Rh pozitif ya da Rh negatif olabilir."],
    ["People{insanlar} with{} group{grup} O{0} negative{negatif} blood{kan} can{-ebilir} usually{genellikle} give{vermek} red{kırmızı} blood{kan} cells{hücreler} to{-e} almost{neredeyse} anyone{herkes}.", "0 negatif kanı olan insanlar genellikle neredeyse herkese kırmızı kan hücresi verebilir."],
    ["Because{çünkü} of{(because of) -den dolayı} this{}, their{} blood{kan} is{} very{çok} useful{yararlı} in{} emergencies{acil durumlar}.", "Bu yüzden onların kanı acil durumlarda çok yararlıdır."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-blood-types", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nhs = "NHS, Blood groups; https://www.nhs.uk/conditions/blood-groups/";
const nobel = "The Nobel Prize, Karl Landsteiner - Facts (Physiology or Medicine 1930); https://www.nobelprize.org/prizes/medicine/1930/landsteiner/facts/";

export default {
  slug: "b1-blood-types", level: "B1", title: "Not All Blood Is the Same", topic: "Tıp", sortOrder: 38, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "Blood groups are very important when a patient needs blood from another person."), options: [
      option("o1", "What blood groups are and why they matter", true, null, "Metin kan gruplarını tanıtır ve kan naklinde neden önemli olduklarını açıklar."),
      option("o2", "How red blood cells carry oxygen in the body", false, "notstated", "Oksijen taşınması anlatılmaz."),
      option("o3", "Why some people are born with blue blood", false, "notstated", "Mavi kandan söz edilmez."),
      option("o4", "How hospitals train new doctors and nurses", false, "notstated", "Doktor ve hemşire eğitimi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What decides a person's blood group?", evidence: ev(0, "The group depends on tiny markers on the surface of red blood cells."), options: [
      option("o1", "Small markers on red blood cells", true, null, "Metin grubun kırmızı kan hücrelerinin yüzeyindeki işaretlere bağlı olduğunu söyler."),
      option("o2", "The colour of the person's blood", false, "reverse", "Metin herkesin kanının kırmızı göründüğünü söyler."),
      option("o3", "The food that a person eats every day", false, "notstated", "Beslenmeden söz edilmez."),
      option("o4", "The hospital where the person was born", false, "notstated", "Doğulan hastane grubu belirlemez; grup ebeveynlerden gelir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "emergencies" mean in the third paragraph?', evidence: ev(2, "their blood is very useful in emergencies"), options: [
      option("o1", "Sudden, dangerous situations", true, null, "Emergency, hemen müdahale gereken ani ve tehlikeli durumdur."),
      option("o2", "Quiet, normal days at work", false, "reverse", "Acil durum sakin, olağan bir günün tersidir."),
      option("o3", "Long lessons about science", false, "context", "Kelime dersle ilgili değildir."),
      option("o4", "Small tests at the doctor's office", false, "context", "Basit muayene testleri acil durum değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about group O negative blood?", evidence: findEvidence(paragraphs, "Because of this, their blood is very useful in emergencies."), options: [
      option("o1", "It can help when there is no time to test.", true, null, "Neredeyse herkese verilebildiği için grubu test etmeye vakit olmayan durumlarda işe yarar."),
      option("o2", "It is the least useful group of the four.", false, "reverse", "Metin bu kanın çok yararlı olduğunu söyler."),
      option("o3", "It can be given to no other people.", false, "reverse", "Neredeyse herkese verilebilir."),
      option("o4", "It makes patients ill much more often than others.", false, "notstated", "Böyle bir şey söylenmez; hastalık yanlış türün verilmesiyle ilişkilidir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "ABO sisteminde dört ana kan grubu vardır (A, B, AB, 0); grup kırmızı kan hücrelerinin yüzeyindeki antijenlere bağlıdır ve ebeveynlerden kalıtılır.", source: nhs, checkedOn: "2026-11-23" },
    { claim: "Karl Landsteiner kan gruplarını 1901'de keşfetti ve 1930 Nobel Fizyoloji veya Tıp Ödülü'nü aldı.", source: nobel, checkedOn: "2026-11-23" },
    { claim: "Yanlış ABO grubundan kan almak hayati tehlike yaratabilir; alıcının antikorları verilen hücrelere saldırır.", source: nhs, checkedOn: "2026-11-25" },
    { claim: "Rh faktörü pozitif ya da negatif olabilir; 0 negatif kırmızı hücreler neredeyse herkese verilebildiği için acil durumlarda kullanılır.", source: nhs, checkedOn: "2026-11-23" },
  ] },
};
