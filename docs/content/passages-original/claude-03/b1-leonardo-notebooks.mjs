import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Leonardo{Leonardo} da{da} Vinci{Vinci} is{} famous{ünlü} for{ile} paintings{tablolar} like{gibi} the{} Mona{Mona} Lisa{Lisa}.", "Leonardo da Vinci, Mona Lisa gibi tablolarıyla ünlüdür."],
    ["But{} he{} was{} also{ayrıca} a{} careful{dikkatli} thinker{düşünür} who{ki} wanted{istedi} to{-meyi} understand{anlamak} everything{her şey} around{çevresinde} him{onun}.", "Ama aynı zamanda çevresindeki her şeyi anlamak isteyen dikkatli bir düşünürdü."],
    ["He{} wrote{yazdı} his{} ideas{fikirler} in{} notebooks{defterler}, and{} thousands{binlerce} of{} these{} pages{sayfalar} still{hâlâ} exist{var olmak} today{bugün}.", "Fikirlerini defterlere yazdı ve bu sayfaların binlercesi bugün hâlâ duruyor."],
  ],
  [
    ["The{} notebooks{defterler} are{} full{dolu} of{} drawings{çizimler} and{} notes{notlar}.", "Defterler çizimler ve notlarla doludur."],
    ["Leonardo{Leonardo} drew{çizdi} the{} bones{kemikler} and{} muscles{kaslar} of{} the{} human{insan} body{vücut}.", "Leonardo insan vücudunun kemiklerini ve kaslarını çizdi."],
    ["He{} watched{izledi} birds{kuşlar} closely{yakından} and{} drew{çizdi} machines{makineler} that{ki} he{} hoped{umdu} could{-ebilir} help{yardım etmek} people{insanlar} fly{uçmak}.", "Kuşları yakından izledi ve insanların uçmasına yardım edebileceğini umduğu makineler çizdi."],
    ["He{} also{ayrıca} studied{inceledi} water{su}, plants{bitkiler}, rocks{kayalar} and{} light{ışık}.", "Ayrıca suyu, bitkileri, kayaları ve ışığı inceledi."],
  ],
  [
    ["One{bir} unusual{alışılmadık} thing{şey} about{hakkında} the{} notebooks{defterler} is{} his{} handwriting{el yazısı}.", "Defterlerle ilgili alışılmadık bir şey onun el yazısıdır."],
    ["Leonardo{Leonardo} often{sık sık} wrote{yazdı} from{-den} right{sağ} to{-e} left{sol}, with{} the{} letters{harfler} turned{çevrilmiş} backwards{ters}.", "Leonardo sık sık sağdan sola, harfleri ters çevrilmiş olarak yazardı."],
    ["To{-mek için} read{okumak} it{} easily{kolayca}, you{} need{gerekir} to{-meye} hold{tutmak} the{} page{sayfa} up{yukarı} to{-e} a{} mirror{ayna}.", "Onu kolayca okumak için sayfayı bir aynaya tutmanız gerekir."],
    ["Nobody{hiç kimse} knows{bilir} for{tam} sure{emin} why{neden} he{} did{yaptı} this{}.", "Bunu neden yaptığını kimse tam olarak bilmiyor."],
    ["Some{bazı} experts{uzmanlar} think{düşünür} it{} was{} simply{sadece} easier{daha kolay} for{} him{onun için}, because{çünkü} he{} used{kullandı} his{} left{sol} hand{el}.", "Bazı uzmanlar, sol elini kullandığı için bunun ona sadece daha kolay geldiğini düşünür."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-leonardo-notebooks", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const leonardo = "Encyclopaedia Britannica, Leonardo da Vinci; https://www.britannica.com/biography/Leonardo-da-Vinci";
const rct = "Royal Collection Trust (Leonardo da Vinci drawings collection); https://www.rct.uk/";

export default {
  slug: "b1-leonardo-notebooks", level: "B1", title: "The Secret Pages of Leonardo", topic: "Sanat", sortOrder: 35, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "He wrote his ideas in notebooks, and thousands of these pages still exist today."), options: [
      option("o1", "Leonardo's notebooks and his way of writing", true, null, "Metin defterlerin içeriğini ve Leonardo'nun ayna yazısını anlatır."),
      option("o2", "How the Mona Lisa was painted and later sold", false, "context", "Mona Lisa yalnız girişte anılır; nasıl yapıldığı anlatılmaz."),
      option("o3", "Why Leonardo stopped painting when he grew old", false, "notstated", "Resmi bırakmasından söz edilmez."),
      option("o4", "How mirrors were made in old Italian towns", false, "context", "Ayna yalnız yazıyı okumak için anılır."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Leonardo hope some of his machines could do?", evidence: ev(1, "drew machines that he hoped could help people fly"), options: [
      option("o1", "Help people fly", true, null, "Metin bu makinelerin insanların uçmasına yardım etmesini umduğunu söyler."),
      option("o2", "Carry water up to farms", false, "context", "Suyu incelediği söylenir ama böyle bir makineden söz edilmez."),
      option("o3", "Paint pictures faster", false, "notstated", "Resim yapan makineden söz edilmez."),
      option("o4", "Measure the bones of birds", false, "context", "Kuşları izledi, kemikleri insan vücudu için çizdi; ölçüm makinesi yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “backwards” mean in the third paragraph?", evidence: ev(2, "with the letters turned backwards"), options: [
      option("o1", "Facing the opposite way", true, null, "Harfler sağdan sola, ters yönde yazılmıştır; bu yüzden ayna gerekir."),
      option("o2", "Written very large and bold", false, "context", "Harflerin büyüklüğünden söz edilmez."),
      option("o3", "Painted in bright colours", false, "context", "Renkten söz edilmez."),
      option("o4", "Hidden under other words", false, "context", "Harflerin saklandığı söylenmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about Leonardo's notes?", evidence: findEvidence(paragraphs, "To read it easily, you need to hold the page up to a mirror."), options: [
      option("o1", "His notes can be hard for others to read", true, null, "Kolay okumak için ayna gerekmesi, notların başkaları için zor okunduğunu gösterir."),
      option("o2", "He wrote backwards to keep his ideas secret", false, "notstated", "Metin nedeni kimsenin kesin bilmediğini söyler."),
      option("o3", "Leonardo always wrote from left to right", false, "reverse", "Metin sık sık sağdan sola yazdığını söyler."),
      option("o4", "Mirrors were used to paint the Mona Lisa", false, "notstated", "Tabloda ayna kullanıldığı söylenmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Leonardo da Vinci Mona Lisa gibi tablolarıyla ünlüdür; fikirlerini defterlere yazdı ve binlerce sayfası günümüze ulaştı.", source: leonardo, checkedOn: "2026-11-23" },
    { claim: "Defterlerde insan anatomisi, kuşların uçuşu ve uçan makineler, su, bitkiler, kayalar ve ışık üzerine çizim ve notlar vardır.", source: leonardo, checkedOn: "2026-11-23" },
    { claim: "Leonardo'nun anatomi çizimlerinin önemli bir bölümü Royal Collection'dadır.", source: rct, checkedOn: "2026-11-23" },
    { claim: "Leonardo çoğunlukla sağdan sola ayna yazısıyla yazdı; solak olduğu bir açıklama olarak öne sürülür, kesin neden bilinmez.", source: leonardo, checkedOn: "2026-11-23" },
  ] },
};
