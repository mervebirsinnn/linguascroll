import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Technologies{teknolojiler} are{} rarely{nadiren} judged{yargılamak} by{tarafından} the{} circumstances{koşullar} of{} their{onların} release{serbest bırakma}, yet{yine de} those{o} circumstances{koşullar} often{sıklıkla} determine{belirlemek} what{ne} the{} technology{teknoloji} becomes{olmak}.", "Teknolojiler nadiren serbest bırakılma koşullarına göre yargılanır; oysa bu koşullar çoğu zaman teknolojinin neye dönüşeceğini belirler."],
    ["The{} World{Dünya} Wide{Geniş} Web{Ağ} offers{sunmak} a{} clear{net} case{örnek}.", "Dünya Çapında Ağ net bir örnek sunar."],
    ["The{} history{tarih} of{} its{onun} release{serbest bırakma} therefore{bu nedenle} deserves{hak etmek} more{daha fazla} attention{dikkat} than{-den} it{} usually{genellikle} receives{almak}.", "Serbest bırakılma tarihi bu nedenle genellikle aldığından daha fazla dikkati hak eder."],
  ],
  [
    ["Its{onun} origins{kökenler} were{} modest{mütevazı}.", "Kökenleri mütevazıydı."],
    ["In{-de} March{Mart} nineteen{on dokuz} eighty{seksen} nine{dokuz}, Tim{Tim} Berners{Berners}-Lee{Lee} proposed{önermek} at{-de} CERN{CERN} a{} distributed{dağıtık} information{bilgi} system{sistem} to{-mek} ease{kolaylaştırmak} the{} sharing{paylaşma} of{} documents{belgeler} among{arasında} physicists{fizikçiler}; he{} resubmitted{yeniden sunmak} a{} lightly{hafifçe} edited{düzenlenmek} version{sürüm} in{-de} May{Mayıs} nineteen{on dokuz} ninety{doksan}, and{} by{-e kadar} the{} end{son} of{} that{o} year{yıl} a{} server{sunucu} and{} a{} browser{tarayıcı} were{} running{çalışıyor}.", "Mart 1989'da Tim Berners-Lee, fizikçiler arasında belge paylaşımını kolaylaştırmak için CERN'de dağıtık bir bilgi sistemi önerdi; Mayıs 1990'da hafifçe düzenlenmiş bir sürümü yeniden sundu ve o yılın sonuna kadar bir sunucu ve bir tarayıcı çalışıyordu."],
    ["The{} first{ilk} website{web sitesi}, hosted{barındırılmak} on{üzerinde} Berners{Berners}-Lee's{Lee'nin (iyelik)} own{kendi} computer{bilgisayar}, described{tanımlamak} the{} project{proje} itself{kendisi}.", "Berners-Lee'nin kendi bilgisayarında barındırılan ilk web sitesi projenin kendisini tanımlıyordu."],
    ["In{-de} hindsight{geriye bakış}, the{} modest{mütevazı} scale{ölçek} of{} the{} project{proje} concealed{gizlemek} its{onun} eventual{sonunda ortaya çıkan} importance{önem}.", "Geriye bakıldığında projenin mütevazı ölçeği, sonunda ortaya çıkan önemini gizliyordu."],
  ],
  [
    ["Nothing{hiçbir şey} in{} those{o} early{erken} achievements{başarılar} settled{karara bağlamak} who{kim} would{-ecekti} control{denetlemek} the{} result{sonuç}.", "O erken başarıların hiçbiri sonucu kimin denetleyeceğini belirlemedi."],
    ["Many{birçok} contemporary{çağdaş} networked{ağlı} services{hizmetler} were{} owned{sahip olunmak} and{} governed{yönetmek} by{tarafından} single{tek} organisations{kuruluşlar}, and{} the{} Web{Web} could{-ebilirdi} readily{kolayca} have{} joined{katılmak} them{onlar}.", "Çağdaş ağlı hizmetlerin birçoğu tek kuruluşlara aitti ve onlar tarafından yönetiliyordu; Web de kolayca onlara katılabilirdi."],
    ["The{} decisive{belirleyici} act{eylem} came{gelmek} on{-de} thirty{otuz} April{Nisan} nineteen{on dokuz} ninety{doksan} three{üç}, when{-dığında} CERN's{CERN (iyelik)} directors{müdürler} signed{imzalamak} a{} statement{bildiri} placing{yerleştirmek} the{} Web{Web} software{yazılım} in{-e} the{} public{kamu} domain{alan}; a{} later{daha sonraki} release{sürüm} in{-de} nineteen{on dokuz} ninety{doksan} four{dört} adopted{benimsemek} an{} open{açık} source{kaynak} licence{lisans}.", "Belirleyici eylem, CERN yöneticilerinin Web yazılımını kamu malı kılan bir bildiriyi imzaladığı 30 Nisan 1993'te geldi; 1994'teki sonraki sürüm ise açık kaynak lisansını benimsedi."],
    ["A{} different{farklı} decision{karar} that{o} day{gün} would{-ecekti} have{} changed{değiştirmek} the{} lives{hayatlar} of{} millions{milyonlar} of{} later{daha sonraki} users{kullanıcılar}.", "O gün alınacak farklı bir karar, sonraki milyonlarca kullanıcının hayatını değiştirirdi."],
  ],
  [
    ["The{} consequences{sonuçlar} of{} that{o} choice{seçim} are{} difficult{zor} to{-mek} measure{ölçmek} but{ama} easy{kolay} to{-mek} imagine{hayal etmek}.", "O seçimin sonuçlarını ölçmek zor ama hayal etmek kolaydır."],
    ["Because{çünkü} no{hiçbir} one{kişi} needed{ihtiyaç duymak} permission{izin}, a{} student{öğrenci}, a{} hobbyist{meraklı}, or{ya da} a{} start{başlangıç}-up{yukarı} could{-ebilirdi} publish{yayımlamak}, experiment{denemek} and{} compete{rekabet etmek} with{ile} established{yerleşik} institutions{kurumlar}.", "Kimsenin izne ihtiyacı olmadığı için bir öğrenci, bir meraklı ya da yeni bir girişim yayımlayabilir, deneyebilir ve yerleşik kurumlarla rekabet edebilirdi."],
    ["That{o} openness{açıklık} did{} not{} guarantee{garanti etmek} quality{kalite}, honesty{dürüstlük} or{ya da} fairness{adalet}; it{} guaranteed{garanti etmek} only{yalnızca} access{erişim}.", "O açıklık kaliteyi, dürüstlüğü ya da adaleti garanti etmedi; yalnızca erişimi garanti etti."],
    ["Freedom{özgürlük} to{-mek} publish{yayımlamak} is{} not{değil} the{} same{aynı} as{} freedom{özgürlük} from{-den} harm{zarar}, and{} the{} difference{fark} has{} become{olmak} a{} permanent{kalıcı} theme{tema}.", "Yayımlama özgürlüğü zarardan korunma özgürlüğüyle aynı şey değildir ve bu fark kalıcı bir tema hâline geldi."],
  ],
  [
    ["Access{erişim}, however{ancak}, proved{çıkmak (prove to be: ... olduğu anlaşıldı)} to{-mek} be{olmak} an{} extraordinarily{olağanüstü biçimde} powerful{güçlü} foundation{temel}.", "Ancak erişimin olağanüstü biçimde güçlü bir temel olduğu anlaşıldı."],
    ["It{} is{} one{bir} reason{neden} why{neden} the{} Web{Web} is{} often{sıklıkla} described{tanımlamak} as{olarak} a{} commons{ortak alan}: a{} shared{ortak} resource{kaynak} whose{kimin} value{değer} grows{büyümek} with{ile} use{kullanım}.", "Bu, Web'in çoğu zaman ortak bir alan olarak, yani değeri kullanımla artan paylaşılmış bir kaynak olarak tanımlanmasının bir nedenidir."],
    ["Whether{-ip -mediği} it{} remains{kalmak} one{bir} depends{bağlı olmak} on{-e} choices{seçimler} as{kadar} deliberate{kasıtlı} as{} the{} one{olan} made{yapmak} in{-de} nineteen{on dokuz} ninety{doksan} three{üç}.", "Bunun öyle kalıp kalmayacağı, 1993'te yapılan kadar kasıtlı seçimlere bağlıdır."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-web-commons", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cern = "CERN, A short history of the Web; https://home.cern/science/computing/birth-web/short-history-web";

export default {
  slug: "c2-web-commons", level: "C2", title: "A Commons by Decision", topic: "Teknoloji", sortOrder: 18, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central thesis?", evidence: ev(0, "those circumstances often determine what the technology becomes"), options: [
      option("o1", "Release terms shaped the Web", true, null, "Metin serbest bırakma koşullarının Web'in kaderini belirlediğini savunur."),
      option("o2", "Open release guaranteed quality and fairness", false, "reverse", "Metin açıklığın bunları garanti etmediğini söyler."),
      option("o3", "CERN profited from controlling the Web", false, "reverse", "CERN yazılımı serbest bıraktı."),
      option("o4", "Browsers alone decided the Web's future", false, "notstated", "Böyle bir iddia yoktur."),
    ] },
    { key: "q2", type: "detail", prompt: "What did the statement signed on thirty April nineteen ninety three do?", evidence: ev(2, "CERN's directors signed a statement placing the Web software in the public domain"), options: [
      option("o1", "It freed the software", true, null, "Metin bunu söyler."),
      option("o2", "It created the first browser at CERN", false, "detail", "Tarayıcı 1990 sonuna kadar çalışıyordu."),
      option("o3", "It sold the software to a company", false, "notstated", "Satış anlatılmaz."),
      option("o4", "It closed the project to outsiders", false, "reverse", "Tam tersini yaptı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “commons” mean in the final paragraph?", evidence: ev(4, "described as a commons: a shared resource whose value grows with use"), options: [
      option("o1", "A shared resource", true, null, "Metin açıkça 'paylaşılmış kaynak' diye tanımlar."),
      option("o2", "A group of lawyers", false, "context", "Hukuk geçmez."),
      option("o3", "A private laboratory", false, "reverse", "Tersini anlatır."),
      option("o4", "A type of licence fee", false, "context", "Lisans geçer ama kelime ücret değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What assumption does the final paragraph quietly challenge?", evidence: findEvidence(paragraphs, "Whether it remains one depends on choices as deliberate as the one made in nineteen ninety three."), options: [
      option("o1", "That openness, once won, stays secure", true, null, "Açıklığın kalıcı olduğu varsayımı, kasıtlı seçimlere bağlı olduğu söylenerek sorgulanır."),
      option("o2", "That the Web was owned by Berners-Lee", false, "notstated", "Sahiplik anlatılmaz."),
      option("o3", "That nobody can publish without approval", false, "reverse", "Metin bunun tersini, izinsiz yayımlamayı anlatır."),
      option("o4", "That CERN still controls the software today", false, "notstated", "Böyle bir iddia yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Berners-Lee Mart 1989'da CERN'de dağıtık bilgi sistemi önerdi, Mayıs 1990'da hafif düzenlenmiş sürümü yeniden sundu; 1990 sonunda CERN'de bir sunucu ve tarayıcı çalışıyordu; ilk web sitesi onun bilgisayarında barındırıldı ve projeyi anlatıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "30 Nisan 1993'te CERN yönetimi Web yazılımını kamu malı kılan bildiriyi imzaladı; 1994'teki sonraki sürüm açık kaynak lisansına geçti.", source: cern, checkedOn: "2026-11-23" },
  ] },
};
