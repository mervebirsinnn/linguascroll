import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Bacteria{Bakteriler} are{} tiny{minik} living{canlı} things{varlıklar}, yet{ancak} they{} have{} a{} long{uzun} history{geçmiş} of{} fighting{savaşmak} viruses{virüsler}.", "Bakteriler minik canlılardır, ancak virüslerle savaşmanın uzun bir geçmişi vardır."],
    ["Researchers{Araştırmacılar} discovered{keşfetti} that{ki} some{bazı} bacteria{bakteriler} store{saklar} small{küçük} pieces{parçalar} of{} a{} virus's{virüsün} genetic{genetik} code{kod} in{} their{} own{kendi} DNA{DNA}.", "Araştırmacılar, bazı bakterilerin bir virüsün genetik kodundan küçük parçaları kendi DNA'larında sakladığını keşfetti."],
    ["If{} the{} same{aynı} virus{virüs} attacks{saldırır} again{tekrar}, the{} bacterium{bakteri} uses{kullanır} these{} stored{saklanan} pieces{parçalar} to{-mek için} recognise{tanımak} the{} invader{istilacı} and{} cut{kesmek} its{} DNA{DNA}.", "Aynı virüs tekrar saldırırsa bakteri, istilacıyı tanımak ve DNA'sını kesmek için bu saklanan parçaları kullanır."],
    ["In{} this{} way{yol}, the{} cell{hücre} works{çalışır} like{gibi} a{} simple{basit} immune{bağışıklık} system{sistem}.", "Bu şekilde hücre, basit bir bağışıklık sistemi gibi çalışır."],
  ],
  [
    ["Scientists{Bilim insanları} later{daha sonra} realised{fark etti} that{ki} this{} natural{doğal} process{süreç} could{-ebilirdi} be{} copied{kopyalanmak} in{} the{} laboratory{laboratuvar}.", "Bilim insanları daha sonra bu doğal sürecin laboratuvarda kopyalanabileceğini fark etti."],
    ["The{} method{yöntem}, called{denilen} CRISPR{CRISPR}, uses{kullanır} a{} protein{protein} named{adlı} Cas{Cas9 proteini}9, which{ki o} is{} often{sıklıkla} described{tanımlanır} as{} molecular{moleküler} scissors{makas}.", "CRISPR adlı yöntem, sıklıkla moleküler makas olarak tanımlanan Cas9 adlı bir protein kullanır."],
    ["Guided{Yönlendirilmiş} by{tarafından} a{} short{kısa} RNA{RNA} sequence{dizi}, it{} finds{bulur} one{bir} exact{tam} spot{nokta} in{} a{} genome{genom} and{} cuts{keser} the{} DNA{DNA} there{orada}.", "Kısa bir RNA dizisi tarafından yönlendirilen protein, genomda tam bir noktayı bulur ve DNA'yı orada keser."],
    ["The{} cell{hücre} then{sonra} repairs{onarır} the{} cut{kesik}, and{} researchers{araştırmacılar} can{-ebilir} change{değiştirmek} the{} gene{gen} during{sırasında} this{} repair{onarım}.", "Hücre daha sonra kesiği onarır ve araştırmacılar bu onarım sırasında geni değiştirebilir."],
  ],
  [
    ["Doctors{Doktorlar} hope{umut eder} that{ki} CRISPR{CRISPR} will{-ecek} help{yardım etmek} treat{tedavi etmek} certain{bazı} inherited{kalıtsal} diseases{hastalıklar}, and{} some{bazı} early{erken} treatments{tedaviler} have{} already{zaten} been{} tested{test edildi} in{} patients{hastalar}.", "Doktorlar CRISPR'ın bazı kalıtsal hastalıkların tedavisine yardımcı olacağını umuyor ve bazı erken tedaviler zaten hastalarda test edildi."],
    ["However{Ancak}, changes{değişiklikler} made{yapılan} to{-e} reproductive{üreme} cells{hücreler} or{} embryos{embriyolar} would{-irdi} be{} passed{aktarılmak} on{(pass on: aktarmak)} to{-e} future{gelecek} generations{nesiller}.", "Ancak üreme hücrelerinde veya embriyolarda yapılan değişiklikler gelecek nesillere aktarılırdı."],
    ["For{} this{} reason{neden}, many{birçok} people{insanlar} argue{savunur} that{ki} editing{düzenleme} human{insan} embryos{embriyolar} raises{doğurur} serious{ciddi} ethical{etik} questions{sorular}.", "Bu nedenle birçok kişi, insan embriyolarını düzenlemenin ciddi etik sorular doğurduğunu savunur."],
    ["Strict{Katı} rules{kurallar} and{} open{açık} public{kamusal} discussion{tartışma} are{} therefore{bu nedenle} needed{gerekli} before{önce} the{} technology{teknoloji} is{} used{kullanılmak} widely{yaygın olarak}.", "Bu nedenle teknoloji yaygın olarak kullanılmadan önce katı kurallara ve açık bir kamusal tartışmaya ihtiyaç vardır."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-crispr-editing", rows);
const ev = (t) => findEvidence(paragraphs, t);
const nhgri = "NIH Intramural Research Program, Next Big Thing in Genome Modification: the CRISPR/Cas9 System; https://irp.nih.gov/blog/post/2015/04/next-big-thing-in-genome-modification-the-crispr-cas9-system; NIGMS, CRISPR; https://www.nigms.nih.gov/biobeat/tag/crispr";
const who = "World Health Organization (WHO); https://www.who.int/";
const britannica = "NIH Intramural Research Program, Next Big Thing in Genome Modification: the CRISPR/Cas9 System; https://irp.nih.gov/blog/post/2015/04/next-big-thing-in-genome-modification-the-crispr-cas9-system";

export default {
  slug: "b2-crispr-editing", level: "B2", title: "Molecular Scissors", topic: "Biyoloji", sortOrder: 32, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("Scientists later realised that this natural process could be copied in the laboratory."), options: [
      option("o1", "How a bacterial defence became a gene-editing tool", true, null, "Metin bakterilerin doğal savunmasını, bunun laboratuvarda gen düzenleme aracına dönüşmesini ve etik sorunları anlatır."),
      option("o2", "Why viruses are far more dangerous than bacteria are today", false, "context", "Virüsler ve bakteriler yalnızca konunun arka planıdır; metin virüslerin tehlikesini karşılaştırmaz."),
      option("o3", "A complete ban on every kind of medical research", false, "extreme", "Metin kurallar ve tartışma ister; tüm tıbbi araştırmaların yasaklanmasını önermez."),
      option("o4", "A record of the diseases CRISPR has already cured", false, "notstated", "Metin hangi hastalıkların iyileştirildiğini listelemez."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, what does the protein do once it finds its exact spot?", evidence: ev("it finds one exact spot in a genome and cuts the DNA there"), options: [
      option("o1", "It cuts the DNA at that place", true, null, "Metin proteinin tam noktayı bulup DNA'yı orada kestiğini söyler."),
      option("o2", "It copies the entire genome into a new virus", false, "notstated", "Metinde böyle bir şey yoktur."),
      option("o3", "It repairs the cut without any help from the cell", false, "detail", "Kesiği onaran hücredir, protein değildir."),
      option("o4", "It stores the virus's code for use in later attacks", false, "context", "Kodu saklayanlar bakterilerdir; bu birinci paragraftaki doğal süreçtir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does \"invader\" mean in paragraph 1?", evidence: ev("recognise the invader"), options: [
      option("o1", "Something that enters to attack", true, null, "Invader, saldırmak için içeri giren şey, istilacı demektir; burada virüstür."),
      option("o2", "A scientist who studies viruses closely in a laboratory", false, "context", "Laboratuvar ve bilim insanları ikinci paragrafın konusudur; kelime bunu anlatmaz."),
      option("o3", "A protein that fixes damaged DNA after a cut", false, "detail", "DNA onarımı başka bir bilgidir; kelimenin anlamıyla ilgisi yoktur."),
      option("o4", "A helper that protects the cell from harm", false, "reverse", "Tam tersi: istilacı hücreye zarar vermeye çalışandır."),
    ] },
    { key: "q4", type: "inference", prompt: "Why are changes to embryos seen as more serious than other edits?", evidence: ev("changes made to reproductive cells or embryos would be passed on to future generations"), options: [
      option("o1", "The changes could affect people not yet born", true, null, "Embriyodaki değişiklikler gelecek nesillere geçer; bu da henüz doğmamış insanları etkileyebileceği anlamına gelir."),
      option("o2", "Embryos are too small for scientists to examine at all", false, "notstated", "Metin embriyoların boyutundan söz etmez."),
      option("o3", "CRISPR is unable to cut the DNA of human cells", false, "reverse", "Metin yöntemin hastalarda test edildiğini söyler; kesemediğini değil."),
      option("o4", "Doctors have already edited a large number of embryos", false, "extreme", "Metin böyle bir sayı veya uygulama bildirmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Bazı bakteriler virüslerin genetik kodundan küçük parçaları kendi DNA'larında saklar ve aynı virüs tekrar saldırdığında bu parçalarla onu tanıyıp DNA'sını keser; CRISPR doğal bir bakteriyel bağışıklık sistemidir.", source: nhgri, checkedOn: "2026-11-25" },
    { claim: "CRISPR gen düzenleme yöntemi bu doğal süreçten uyarlanmıştır; Cas9 proteini kısa bir kılavuz RNA ile belirli bir DNA noktasına yönlendirilir ve orada keser (moleküler makas benzetmesi).", source: britannica, checkedOn: "2026-11-25" },
    { claim: "Kesilen DNA'yı hücre kendi onarım mekanizmalarıyla onarır; araştırmacılar bu onarım sırasında geni değiştirebilir.", source: nhgri, checkedOn: "2026-11-25" },
    { claim: "CRISPR tabanlı bazı erken tedaviler hastalarda denenmiştir; kalıtsal hastalıkların tedavisi için umut vaat eder.", source: who, checkedOn: "2026-11-25" },
    { claim: "Üreme hücrelerinde veya embriyolarda yapılan genetik değişiklikler sonraki nesillere aktarılır; bu nedenle insan embriyosu düzenleme ciddi etik tartışmalara yol açar ve sıkı kurallar ile kamusal tartışma gerektirir.", source: who, checkedOn: "2026-11-25" },
  ] },
};
