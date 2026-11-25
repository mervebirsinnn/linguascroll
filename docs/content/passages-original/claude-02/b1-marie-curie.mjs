import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Marie{Marie} Curie{Curie} was{} born{doğdu} in{} Warsaw{Varşova} in{} eighteen{on sekiz} sixty{altmış} seven{yedi}.", "Marie Curie 1867'de Varşova'da doğdu."],
    ["As{olarak} a{} young{genç} woman{kadın}, she{} moved{taşındı} to{-e} Paris{Paris} to{-mek için} study{eğitim görmek} science{bilim}.", "Genç bir kadın olarak bilim okumak için Paris'e taşındı."],
    ["There{orada}, she{} met{tanıştı} a{} scientist{bilim insanı} named{adlı} Pierre{Pierre} Curie{Curie}, and{} they{} married{evlendi} and{} worked{çalıştı} together{birlikte}.", "Orada Pierre Curie adlı bir bilim insanıyla tanıştı; evlendiler ve birlikte çalıştılar."],
    ["She{} worked{çalıştı} very{çok} hard{sıkı} and{} rarely{nadiren} took{almak} a{} day{gün} off{izin}.", "Çok sıkı çalıştı ve nadiren bir gün izin aldı."],
  ],
  [
    ["The{} Curies{Curie'ler} studied{inceledi} a{} strange{garip} kind{tür} of{} energy{enerji} that{ki} comes{gelir} from{-den} some{bazı} materials{maddeler}.", "Curie'ler bazı maddelerden gelen garip bir enerji türünü inceledi."],
    ["From{-den} a{} dark{koyu} rock{kaya}, they{} found{buldu} two{iki} new{yeni} elements{elementler}: polonium{polonyum} and{} radium{radyum}.", "Koyu renkli bir kayadan iki yeni element buldular: polonyum ve radyum."],
    ["Marie{Marie} named{adlandırdı} polonium{polonyum} after{-nin adına} her{} home{ev} country{ülke}, Poland{Polonya}.", "Marie polonyuma kendi ülkesi Polonya'nın adını verdi."],
    ["Their{onların} laboratory{laboratuvar} was{} small{küçük}, but{ama} their{onların} ideas{fikirler} were{} big{büyük}.", "Laboratuvarları küçüktü ama fikirleri büyüktü."],
  ],
  [
    ["In{-de} nineteen{on dokuz} oh{sıfır} three{üç}, she{} shared{paylaştı} the{} Nobel{Nobel} Prize{Ödül} in{} Physics{Fizik} with{ile} her{} husband{koca} and{} another{başka} scientist{bilim insanı}.", "1903'te kocası ve başka bir bilim insanıyla Nobel Fizik Ödülü'nü paylaştı."],
    ["In{-de} nineteen{on dokuz} eleven{on bir}, she{} won{kazandı} the{} Nobel{Nobel} Prize{Ödül} in{} Chemistry{Kimya} on{kendi başına (on one's own kalıbı)} her{} own{kendi başına (on one's own kalıbı)}.", "1911'de Nobel Kimya Ödülü'nü tek başına kazandı."],
    ["She{} is{} still{hâlâ} the{} only{tek} person{kişi} to{-mek (mastar)} win{kazanmak} Nobel{Nobel} Prizes{Ödüller} in{} two{iki} different{farklı} sciences{bilimler}.", "İki farklı bilim dalında Nobel Ödülü kazanan tek kişi hâlâ o."],
    ["Many{birçok} young{genç} scientists{bilim insanları} still{hâlâ} look{hayranlık duymak (look up to)} up{hayranlık duymak (look up to)} to{hayranlık duymak (look up to)} her{}.", "Birçok genç bilim insanı hâlâ ona hayranlıkla bakıyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-marie-curie", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobelP = "Nobel Prize Outreach, Marie Curie - Biographical / Physics 1903; https://www.nobelprize.org/prizes/physics/1903/marie-curie/biographical/";
const nobelC = "Nobel Prize Outreach, Marie Curie - Facts / Chemistry 1911; https://www.nobelprize.org/prizes/chemistry/1911/marie-curie/facts";

export default {
  slug: "b1-marie-curie", level: "B1", title: "Two Prizes, Two Sciences", topic: "Önemli insanlar", sortOrder: 19, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "She is still the only person to win Nobel Prizes in two different sciences."), options: [
      option("o1", "A great scientist's life", true, null, "Metin Marie Curie'nin yaşamını ve keşiflerini anlatır."),
      option("o2", "How radioactive rocks are used at home", false, "notstated", "Evde kullanım anlatılmaz."),
      option("o3", "Why Poland became famous for its prizes", false, "notstated", "Polonya'nın ödülleri konu değildir."),
      option("o4", "How Paris built its first laboratory", false, "notstated", "Paris'in ilk laboratuvarı anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Which two elements did the Curies find?", evidence: findEvidence(paragraphs, "they found two new elements: polonium and radium"), options: [
      option("o1", "Polonium and radium", true, null, "Metin polonyum ve radyum der."),
      option("o2", "Uranium and radium", false, "copy", "Radyum doğru ama uranyum bulunan elementlerden değildir."),
      option("o3", "Polonium and uranium", false, "copy", "Polonyum doğru ama uranyum bulunan elementlerden değildir."),
      option("o4", "Radium and carbon", false, "notstated", "Karbon anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “shared” mean in the last paragraph?", evidence: findEvidence(paragraphs, "she shared the Nobel Prize in Physics with her husband and another scientist"), options: [
      option("o1", "Received along with others", true, null, "Shared, başkalarıyla birlikte almak demektir."),
      option("o2", "Divided into smaller pieces", false, "context", "Bölmek anlamı vardır ama cümlede ödül başkalarıyla birlikte alınmıştır."),
      option("o3", "Kept secret from other people", false, "reverse", "Paylaşmak gizlemenin tersidir."),
      option("o4", "Given back to the committee", false, "notstated", "İade edilmesi anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why did Marie name an element polonium?", evidence: ev(1, "Marie named polonium after her home country, Poland."), options: [
      option("o1", "To honour her own country.", true, null, "Element ülkesinin adını taşır."),
      option("o2", "Poland paid for her studies.", false, "notstated", "Para konusu geçmez."),
      option("o3", "The element came from Paris.", false, "context", "Paris yaşadığı şehirdir."),
      option("o4", "Pierre asked her to choose a name.", false, "notstated", "Böyle bir istek geçmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Marie Curie 1867'de Varşova'da doğdu; Paris'te okudu; Pierre Curie ile evlenip birlikte çalıştı.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "Curie'ler uranyumdan daha radyoaktif bir cevherden polonyum ve radyum elementlerini ayırdı; polonyum Marie'nin ülkesi Polonya'nın adını taşır.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "1903 Nobel Fizik Ödülü Marie ve Pierre Curie ile Henri Becquerel'e verildi; 1911 Nobel Kimya Ödülü'nü Marie tek başına aldı; iki farklı bilim dalında Nobel kazanan tek kişidir.", source: nobelC, checkedOn: "2026-11-23" },
  ] },
};
