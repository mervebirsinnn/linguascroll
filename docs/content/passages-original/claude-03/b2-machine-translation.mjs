import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Machine{makine} translation{çeviri} is{} the{} use{kullanım} of{} computers{bilgisayarlar} to{-mek için} turn{dönüştürmek} text{metin} from{-den} one{bir} language{dil} into{-e} another{başka}.", "Makine çevirisi, metni bir dilden başka bir dile dönüştürmek için bilgisayarların kullanılmasıdır."],
    ["Early{erken dönem} programs{programlar} relied{güvendi} on{(rely on: -e güvenmek)} rules{kurallar} written{yazılmış} by{tarafından} linguists{dilbilimciler}.", "İlk dönem programlar dilbilimciler tarafından yazılmış kurallara dayanıyordu."],
    ["Experts{uzmanlar} listed{listeledi} grammar{dilbilgisi} patterns{kalıplar} and{} bilingual{iki dilli} dictionaries{sözlükler}, and{} the{} computer{bilgisayar} applied{uyguladı} them{} step{adım} by{(step by step: adım adım)} step{adım}.", "Uzmanlar dilbilgisi kalıplarını ve iki dilli sözlükleri listeledi, bilgisayar da bunları adım adım uyguladı."],
    ["This{} approach{yaklaşım} worked{işe yaradı} for{} a{} small{küçük} set{küme} of{} simple{basit} sentences{cümleler}, but{} it{} could{-ebildi} not{} be{} expanded{genişletmek} to{-mek için} cover{kapsamak} ordinary{sıradan} language{dil}.", "Bu yaklaşım küçük bir basit cümle kümesinde işe yaradı ama sıradan dili kapsayacak şekilde genişletilemedi."],
  ],
  [
    ["Later{daha sonra}, researchers{araştırmacılar} tried{denedi} a{} statistical{istatistiksel} method{yöntem}.", "Daha sonra araştırmacılar istatistiksel bir yöntem denedi."],
    ["Instead{yerine} of{(instead of: yerine)} following{izlemek} rules{kurallar}, programs{programlar} studied{inceledi} large{büyük} collections{koleksiyonlar} of{} texts{metinler} that{ki onları} humans{insanlar} had{} already{zaten} translated{çevirmişti}.", "Kuralları izlemek yerine programlar, insanların zaten çevirmiş olduğu büyük metin koleksiyonlarını inceledi."],
    ["With{(with: ile)} enough{yeterli} examples{örnekler}, a{} program{program} can{-ebilir} find{bulmak} patterns{kalıplar} without{-meden} a{} person{kişi} describing{tarif etmek} them{onları}.", "Yeterli örnekle bir program, bir kişinin tarif etmesine gerek kalmadan kalıpları bulabilir."],
    ["The{} method{yöntem} was{} simple{basit} in{} linguistic{dilbilimsel} terms{açıdan}, because{çünkü} it{} only{yalnızca} estimated{tahmin etti} how{nasıl} likely{olası} one{bir} word{sözcük} was{} to{-mek} follow{izlemek} others{diğerleri}.", "Yöntem dilbilimsel açıdan basitti, çünkü yalnızca bir sözcüğün diğerlerini ne kadar olasılıkla izlediğini tahmin ediyordu."],
  ],
  [
    ["Today{bugün}, many{birçok} systems{sistemler} use{kullanır} neural{sinir ağı tabanlı} networks{ağlar}, which{ki bunlar} learn{öğrenir} to{-mek} turn{dönüştürmek} one{bir} sequence{dizi} of{} words{sözcükler} into{-e} another{başka} and{} treat{ele alır} a{} whole{bütün} sentence{cümle} as{} one{bir} unit{birim}.", "Bugün birçok sistem sinir ağı kullanır; bunlar bir sözcük dizisini başka bir diziye dönüştürmeyi öğrenir ve bütün bir cümleyi tek bir birim olarak ele alır."],
    ["As{(as a result: sonuç olarak)} a{(as a result: sonuç olarak)} result{(as a result: sonuç olarak)}, translated{çevrilmiş} paragraphs{paragraflar} are{} often{sık sık} smoother{daha akıcı} and{} easier{daha kolay} to{-mek} read{okumak}.", "Sonuç olarak çevrilmiş paragraflar çoğu zaman daha akıcı ve okunması daha kolaydır."],
    ["However{ancak}, context{bağlam} and{} rare{nadir} words{sözcükler} remain{hâlâ ... kalır} difficult{zor}.", "Ancak bağlam ve nadir sözcükler hâlâ zordur."],
    ["Systems{sistemler} often{sık sık} translate{çevirir} each{her} sentence{cümle} in{-de} isolation{yalnız başına}, without{-meden} using{kullanarak} the{} rest{geri kalan} of{} the{} paragraph{paragraf} or{} page{sayfa}, and{} they{} can{-ebilir} still{hâlâ} drop{atlamak} words{sözcükler} or{} mistranslate{yanlış çevirmek} names{isimler} and{} rare{nadir} terms{terimler}.", "Sistemler çoğu zaman her cümleyi paragrafın ya da sayfanın geri kalanını kullanmadan tek başına çevirir ve yine de sözcükleri atlayabilir ya da isimleri ve nadir terimleri yanlış çevirebilir."],
    ["They{} can{-ebilir} also{ayrıca} make{yapmak} errors{hatalar} that{ki onları} a{} human{insan} translator{çevirmen} would{-irdi} never{asla} make{yapmak}, so{bu yüzden} important{önemli} texts{metinler} still{hâlâ} deserve{hak eder} a{} human{insan} check{kontrol}.", "Ayrıca bir insan çevirmenin asla yapmayacağı hatalar yapabilirler; bu yüzden önemli metinler hâlâ bir insan kontrolünü hak eder."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-machine-translation", rows);
const ev = (t) => findEvidence(paragraphs, t);
const hutchins = "W. John Hutchins, The Georgetown-IBM experiment demonstrated in January 1954 (AMTA 2004, ACL Anthology archive); https://aclanthology.org/www.mt-archive.info/00/AMTA-2004-Hutchins.pdf";
const brown = "Brown et al., A Statistical Approach to Machine Translation, Computational Linguistics 16(2), 1990 (ACL Anthology); https://aclanthology.org/J90-2002.pdf";
const gnmt = "Google Research, A Neural Network for Machine Translation, at Production Scale (2016); https://www.research.google/blog/a-neural-network-for-machine-translation-at-production-scale/";
const gblog = "Google, Found in translation: More accurate, fluent sentences in Google Translate; https://blog.google/products/translate/found-translation-more-accurate-fluent-sentences-google-translate/";

export default {
  slug: "b2-machine-translation", level: "B2", title: "Machines That Translate", topic: "Teknoloji", sortOrder: 33, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("However, context and rare words remain difficult."), options: [
      option("o1", "How computer translation developed and why it still fails", true, null, "Metin kural tabanlı, istatistiksel ve sinir ağı yöntemlerini anlatır ve bağlam ile nadir sözcüklerin hâlâ zor olduğunu söyler."),
      option("o2", "Why human translators are no longer needed for any texts at all", false, "extreme", "Metne göre önemli metinleri insan çevirmenler hâlâ kontrol eder."),
      option("o3", "The history of printed bilingual dictionaries used in schools", false, "context", "Sözlükler yalnızca ilk yöntemin bir parçası olarak geçer, konu bu değildir."),
      option("o4", "A new program that understands meaning in the way a person does", false, "reverse", "Metin programların anlamı insan gibi anladığını söylemez; bağlamın hâlâ zor olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "What did the statistical programs study?", evidence: ev("large collections of texts that humans had already translated"), options: [
      option("o1", "Texts that humans had already translated", true, null, "Metin istatistiksel programların insanların zaten çevirdiği metinleri incelediğini söyler."),
      option("o2", "Rules that linguists had written for each language", false, "detail", "Bu, ilk dönem kural tabanlı programların yaklaşımıdır."),
      option("o3", "Dictionaries that the computer had compiled itself", false, "notstated", "Metinde bilgisayarın kendi sözlüğünü hazırladığı söylenmez."),
      option("o4", "Spoken recordings collected from native speakers", false, "notstated", "Metinde konuşma kayıtlarından söz edilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "in isolation" mean in paragraph 3?', evidence: ev("translate each sentence in isolation"), options: [
      option("o1", "On its own, apart from the rest", true, null, "In isolation, tek başına, çevresinden ayrı demektir; sistem cümleyi paragrafın geri kalanından ayrı çevirir."),
      option("o2", "Together with help from a human", false, "reverse", "Cümle insan yardımıyla değil, paragraftan ayrı çevrilir; bu anlamın tersidir."),
      option("o3", "In a quiet room without any noise", false, "context", "Kelimenin yalın anlamı sessiz yer çağrıştırır ama burada bağlamdan ayrılık anlatılır."),
      option("o4", "At a very high speed", false, "notstated", "Metinde hızdan söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about important texts today?", evidence: ev("so important texts still deserve a human check"), options: [
      option("o1", "Machine output may still need checking by people", true, null, "Sistemlerin insanın yapmayacağı hatalar yapabilmesi, önemli metinlerde insan kontrolünün hâlâ yararlı olduğunu gösterir."),
      option("o2", "Computers have made human translators unnecessary", false, "reverse", "Metin tam tersini söyler; önemli metinler hâlâ insan kontrolünü hak eder."),
      option("o3", "Neural systems now translate every sentence perfectly", false, "extreme", "Metne göre hatalar hâlâ olabilir."),
      option("o4", "Rule-based programs are preferred for these texts", false, "notstated", "Metinde böyle bir tercihten söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Makine çevirisi, bir makinenin metni bir dilden başka bir dile çevirmesidir (1954 Georgetown-IBM gösterisi 'bir makinenin anlamlı metinleri bir dilden diğerine çevirmesi' olarak haberleştirildi).", source: hutchins, checkedOn: "2026-11-25" },
    { claim: "İlk makine çevirisi, dilbilimcilerin yazdığı az sayıda kurala ve iki dilli bir sözlüğe (250 sözcük, altı kural) dayanıyordu; yöntem küçük bir cümle kümesinde çalıştı ama genel dile genişletilemedi.", source: hutchins, checkedOn: "2026-11-25" },
    { claim: "İstatistiksel yaklaşım, çok sayıda kaynak-hedef cümle çiftinden oluşan büyük bir veritabanından model parametrelerini otomatik tahmin eder; dil modeli bir sözcüğün diğerlerini izleme olasılığına dayanır ve dilbilimsel açıdan basittir.", source: brown, checkedOn: "2026-11-25" },
    { claim: "Sinir ağı tabanlı çeviri bütün giriş cümlesini tek bir birim olarak ele alır ve cümleyi parça parça değil bütün olarak çevirir; çevrilen paragraflar daha akıcı ve okunması kolaydır. Kaynaklar Google'ın 2016 sistemini anlatır; 'birçok sistem' genellemesi bu sistem ve türevlerine dayanır.", source: gnmt + "; " + gblog, checkedOn: "2026-11-25" },
    { claim: "Sinir ağı sistemleri cümleleri tek tek (paragraf ya da sayfa bağlamı olmadan) çevirir, sözcük atlayabilir, özel isimleri ve nadir terimleri yanlış çevirebilir ve bir insan çevirmenin yapmayacağı hatalar yapabilir.", source: gnmt, checkedOn: "2026-11-25" },
  ] },
};
