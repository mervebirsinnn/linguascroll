import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["When{-diğinde} a{} honeybee{bal arısı} finds{bulur} good{iyi} flowers{çiçekler}, it{} flies{uçar} back{geri} to{-e} its{} hive{kovan}.", "Bir bal arısı iyi çiçekler bulduğunda kovanına geri uçar."],
    ["It{} cannot{-amaz} speak{konuşmak}, but{} it{} can{-ebilir} still{yine de} share{paylaşmak} the{} news{haber}.", "Konuşamaz ama yine de haberi paylaşabilir."],
    ["It{} does{yapar} this{} with{} a{} special{özel} dance{dans} on{} the{} wall{duvar} of{} the{} hive{kovan}.", "Bunu kovanın duvarında özel bir dansla yapar."],
    ["Other{diğer} bees{arılar} stand{durmak} close{yakın} and{} follow{takip etmek} every{her} move{hareket}.", "Diğer arılar yakında durur ve her hareketi takip eder."],
  ],
  [
    ["The{} most{en} famous{ünlü} dance{dans} is{} called{adlandırılır} the{} waggle{sallanma} dance{dans}.", "En ünlü dansa sallanma dansı denir."],
    ["The{} bee{arı} walks{yürür} in{} a{} straight{düz} line{çizgi} and{} shakes{sallar} its{} body{vücut} from{-den} side{yan} to{-e} side{yan}.", "Arı düz bir çizgide yürür ve vücudunu iki yana sallar."],
    ["Then{sonra} it{} walks{yürür} back{geri} in{} a{} curve{kavis} and{} does{yapar} the{} straight{düz} walk{yürüyüş} again{tekrar}.", "Sonra bir kavis çizerek geri yürür ve düz yürüyüşü tekrar yapar."],
    ["The{} direction{yön} of{} the{} straight{düz} walk{yürüyüş} shows{gösterir} where{nerede} the{} food{besin} is{}, compared{karşılaştırıldığında} with{} the{} sun{güneş}.", "Düz yürüyüşün yönü, besinin güneşe göre nerede olduğunu gösterir."],
    ["The{} time{süre} the{} bee{arı} spends{harcar} shaking{sallanarak} shows{gösterir} how{ne kadar} far{uzak} away{uzakta} the{} food{besin} is{}.", "Arının sallanarak geçirdiği süre, besinin ne kadar uzakta olduğunu gösterir."],
    ["A{} longer{daha uzun} waggle{sallanma} usually{genellikle} means{anlamına gelir} a{} longer{daha uzun} flight{uçuş}.", "Daha uzun bir sallanma genellikle daha uzun bir uçuş anlamına gelir."],
  ],
  [
    ["A{} scientist{bilim insanı} named{adlı} Karl{Karl} von{von} Frisch{Frisch} studied{inceledi} these{} dances{danslar} for{boyunca} many{birçok} years{yıl}.", "Karl von Frisch adlı bir bilim insanı bu dansları uzun yıllar inceledi."],
    ["He{} showed{gösterdi} that{-dığını} bees{arılar} use{kullanır} them{} to{-mek için} guide{yönlendirmek} each{birbirini} other{birbirini} to{-e} food{besin}.", "Arıların bu dansları birbirlerini besine yönlendirmek için kullandığını gösterdi."],
    ["In{} 1973, he{} won{kazandı} a{} Nobel{Nobel} Prize{Ödülü} for{} this{} work{çalışma}.", "1973'te bu çalışması için bir Nobel Ödülü kazandı."],
    ["Today{bugün}, scientists{bilim insanları} still{hâlâ} watch{izlemek} bee{arı} dances{danslar} to{-mek için} learn{öğrenmek} how{nasıl} small{küçük} animals{hayvanlar} work{çalışmak} together{birlikte}.", "Bugün bilim insanları küçük hayvanların nasıl birlikte çalıştığını öğrenmek için arı danslarını hâlâ izliyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-honeybee-dance", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const ncsu = "NC State Extension, Honey Bee Dance Language; https://content.ces.ncsu.edu/honey-bee-dance-language";

export default {
  slug: "b1-honeybee-dance", level: "B1", title: "The Dance That Shows the Way", topic: "Biyoloji", sortOrder: 30, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "It does this with a special dance on the wall of the hive."), options: [
      option("o1", "How honeybees use dance to share food news", true, null, "Metin arıların dansla besin haberini nasıl paylaştığını anlatır."),
      option("o2", "How bees make honey from the flowers they find", false, "notstated", "Bal yapımı metinde anlatılmaz."),
      option("o3", "Why bees stay away from the sun on hot days", false, "notstated", "Güneş yalnız yön için bir referanstır; arıların ondan kaçtığı söylenmez."),
      option("o4", "How one scientist trained bees to obey his voice", false, "notstated", "Metinde böyle bir eğitimden söz edilmez; bilim insanı dansları incelemiştir."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the time a bee spends shaking show?", evidence: ev(1, "The time the bee spends shaking shows how far away the food is."), options: [
      option("o1", "How far away the food is", true, null, "Metin sallanma süresinin uzaklığı gösterdiğini söyler."),
      option("o2", "Which way the food is from the sun", false, "context", "Yönü sallanma süresi değil, düz yürüyüşün yönü gösterir."),
      option("o3", "How many flowers the bee has visited", false, "notstated", "Çiçek sayısından söz edilmez."),
      option("o4", "How much honey is left in the hive", false, "notstated", "Kovandaki bal miktarı anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “waggle” most likely mean in the second paragraph?", evidence: ev(1, "The bee walks in a straight line and shakes its body from side to side."), options: [
      option("o1", "Move quickly from side to side", true, null, "Metin bu dansta arının vücudunu iki yana salladığını açıklar."),
      option("o2", "Carry food back to the young bees", false, "context", "Besin taşımak bu kelimenin anlamı değildir."),
      option("o3", "Fly very high above the flowers", false, "context", "Dans kovanın duvarında yapılır, uçarak değil."),
      option("o4", "Sleep quietly in a dark corner", false, "context", "Uyumakla ilgisi yoktur; arı hareket eder."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer from the waggle dance?", evidence: findEvidence(paragraphs, "A longer waggle usually means a longer flight."), options: [
      option("o1", "A short waggle suggests nearby food", true, null, "Uzun sallanma uzak besin demekse kısa sallanma yakın besine işaret eder."),
      option("o2", "Bees dance longer when they feel very tired", false, "notstated", "Yorgunluktan söz edilmez; süre uzaklığı gösterir."),
      option("o3", "The sun plays no part in the dance at all", false, "reverse", "Metin yönün güneşe göre gösterildiğini söyler."),
      option("o4", "Bees find food by smell and ignore the dance", false, "reverse", "Metin diğer arıların dansı yakından takip ettiğini söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Toplayıcı bal arısı kovanda petek yüzeyinde dans ederek diğer arıları besin kaynağına yönlendirir; dansın açısı güneş açısının yerçekimi açısına çevrilmiş halidir (yön), düz koşu süresi uzaklığın en güvenilir göstergesidir (uzun sallanma = uzak besin).", source: ncsu, checkedOn: "2026-11-25" },
    { claim: "Dansı yıllarca süren araştırmalarla yorumlayan bilim insanı Karl von Frisch'tir ve bu çalışma ona 1973 Nobel Fizyoloji veya Tıp Ödülü'nü kazandırmıştır.", source: ncsu, checkedOn: "2026-11-25" },
  ] },
};
