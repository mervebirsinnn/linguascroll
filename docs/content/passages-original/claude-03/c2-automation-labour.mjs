import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Every{her} wave{dalga} of{} automation{otomasyon} arrives{gelmek} with{} two{iki} confident{kendinden emin} stories{hikayeler}.", "Her otomasyon dalgası kendinden emin iki hikayeyle gelir."],
    ["In{-de} one{biri}, machines{makineler} will{-ecek} free{kurtarmak} people{insanlar} from{-den} drudgery{angarya}; in{-de} the{} other{diğeri}, they{} will{-ecek} leave{bırakmak} people{insanlar} with{} nothing{hiçbir şey} to{-ecek} do{yapmak}.", "Birinde makineler insanları angaryadan kurtaracak; diğerinde insanları yapacak hiçbir şeyi olmadan bırakacak."],
    ["Both{her ikisi} stories{hikayeler} treat{ele almak} technology{teknoloji} as{olarak} the{} main{ana} actor{aktör} and{} workers{işçiler} as{olarak} an{} audience{seyirci}, which{ki bu} is{} precisely{tam olarak} the{} assumption{varsayım} the{} historical{tarihsel} record{kayıt} makes{kılmak} hardest{en zor} to{-mek} defend{savunmak}.", "Her iki hikaye de teknolojiyi ana aktör, işçileri seyirci olarak ele alır; tarihsel kaydın savunulmasını en zor kıldığı varsayım tam olarak budur."],
  ],
  [
    ["Consider{düşünmek} the{} Luddites{Ludditler}, the{} English{İngiliz} textile{tekstil} workers{işçiler} who{ki onlar} smashed{parçalamak} machinery{makineler} in{} the{} early{erken} nineteenth{on dokuzuncu} century{yüzyıl}.", "On dokuzuncu yüzyılın başında makineleri parçalayan İngiliz tekstil işçilerini, Ludditleri düşünün."],
    ["Their{} name{ad} now{şimdi} serves{işlev görmek} as{olarak} shorthand{kısaltma} for{} anyone{herkes} who{ki} fears{korkmak} new{yeni} technology{teknoloji}, yet{yine de} many{birçok} historians{tarihçiler} argue{savunmak} that{ki} their{} grievance{şikayet} was{} less{daha az} with{ile} machines{makineler} as{kendi başına (as such)} such{kendi başına (as such)} than{-den} with{ile} the{} way{biçim} machines{makineler} were{} being{olmakta (sürerlik)} used{kullanılmak} to{-mek için} cut{düşürmek} wages{ücretler} and{} undermine{zayıflatmak} skilled{vasıflı} trades{zanaatlar}.", "Adları bugün yeni teknolojiden korkan herkes için bir kısaltma işlevi görür; yine de birçok tarihçi, şikayetlerinin makinelerin kendisinden çok makinelerin ücretleri düşürmek ve vasıflı zanaatları zayıflatmak için kullanılma biçimiyle ilgili olduğunu savunur."],
    ["Read{okunmak} that{o} way{şekilde}, the{} protests{protestolar} were{} a{} dispute{anlaşmazlık} about{hakkında} who{kimin} would{-ecek} capture{ele geçirmek} the{} gains{kazanımlar}, not{} a{} refusal{reddetme} of{} progress{ilerleme}.", "Bu şekilde okununca protestolar ilerlemenin reddi değil, kazanımları kimin ele geçireceğine dair bir anlaşmazlıktı."],
  ],
  [
    ["Economists{ekonomistler} have{} since{o zamandan beri} added{eklemek} a{} second{ikinci} complication{karmaşıklık}.", "Ekonomistler o zamandan beri ikinci bir karmaşıklık ekledi."],
    ["Machines{makineler} rarely{nadiren} take{devralmak (take over)} over{devralmak (take over)} whole{bütün} jobs{işler}; they{} take{devralmak (take over)} over{devralmak (take over)} tasks{görevler}, and{} a{} job{iş} is{} a{} bundle{demet} of{} tasks{görevler}.", "Makineler nadiren bütün işleri devralır; görevleri devralırlar ve bir iş, görevlerden oluşan bir demettir."],
    ["When{-dığında} automated{otomatik} teller{veznedar} machines{makineler} spread{yayılmak} across{genelinde} American{Amerikan} banks{bankalar}, the{} number{sayı} of{} human{insan} tellers{veznedarlar} did{} not{} collapse{çökmek} as{-diği gibi} many{birçokları} expected{beklemek}, partly{kısmen} because{çünkü} cheaper{daha ucuz} branches{şubeler} encouraged{teşvik etmek} banks{bankalar} to{-meye} open{açmak} more{daha fazla} of{} them{onlardan} and{} tellers{veznedarlar} shifted{kaymak} towards{-e doğru} building{kurmak} relationships{ilişkiler} with{} customers{müşteriler}.", "Otomatik vezne makineleri Amerikan bankalarına yayıldığında insan veznedarların sayısı birçoklarının beklediği gibi çökmedi; kısmen daha ucuz şubeler bankaları daha fazla şube açmaya teşvik ettiği ve veznedarlar müşterilerle ilişki kurmaya kaydığı için."],
    ["The{} example{örnek} is{} often{sıklıkla} overused{aşırı kullanılmak}, but{} its{} point{ana fikir} is{} sound{sağlam}: the{} effect{etki} of{} a{} technology{teknoloji} depends{bağlı olmak} on{-e} which{hangi} tasks{görevler} it{} replaces{yerini almak} and{} which{hangilerini} it{} makes{kılmak} more{daha} valuable{değerli}.", "Örnek sıklıkla aşırı kullanılır ama ana fikri sağlamdır: bir teknolojinin etkisi hangi görevlerin yerini aldığına ve hangilerini daha değerli kıldığına bağlıdır."],
  ],
  [
    ["None{hiçbiri} of{} this{} guarantees{garanti etmek} a{} happy{mutlu} ending{son}.", "Bunların hiçbiri mutlu bir sonu garanti etmez."],
    ["In{} nineteen{on dokuz} thirty{otuz} John{John} Maynard{Maynard} Keynes{Keynes} warned{uyarmak} of{-e karşı} what{-eni} he{} called{adlandırmak} technological{teknolojik} unemployment{işsizlik}, while{-ken} suggesting{öne sürmek} that{ki} within{içinde} a{} century{yüzyıl} people{insanlar} might{-ebilir} need{ihtiyaç duymak} to{-mek} work{çalışmak} as{kadar az (as little as)} little{kadar az (as little as)} as{kadar az (as little as)} fifteen{on beş} hours{saat} a{başına} week{hafta}.", "1930'da John Maynard Keynes teknolojik işsizlik dediği şeye karşı uyarırken, bir yüzyıl içinde insanların haftada on beş saat kadar az çalışmasının yetebileceğini öne sürdü."],
    ["That{o} shorter{daha kısa} week{hafta} has{} not{} arrived{gelmek} for{} most{çoğu} workers{işçiler}, and{} plausible{akla yatkın} explanations{açıklamalar} point{işaret etmek} as{kadar (as much as)} much{kadar (as much as)} to{-e} how{nasıl} the{} gains{kazanımlar} from{-den} productivity{verimlilik} were{} shared{paylaşılmak} as{kadar (as much as)} to{-e} anything{herhangi bir şey} engineers{mühendisler} did{yapmak} or{} failed{başaramamak} to{-mek} do{yapmak}.", "Bu daha kısa hafta çoğu işçi için gelmedi ve akla yatkın açıklamalar, mühendislerin yaptığı ya da yapamadığı herhangi bir şey kadar verimlilik kazanımlarının nasıl paylaşıldığına da işaret eder."],
    ["Arguably{denebilir ki}, then{o halde}, the{} decisive{belirleyici} questions{sorular} about{hakkında} automation{otomasyon} are{} political{siyasi} before{önce} they{} are{} technical{teknik}.", "O halde denebilir ki otomasyon hakkındaki belirleyici sorular teknik olmadan önce siyasidir."],
  ],
  [
    ["Treating{ele almak} workers{işçiler} as{olarak} an{} audience{seyirci}, in{başka bir deyişle (in other words)} other{başka bir deyişle (in other words)} words{başka bir deyişle (in other words)}, is{} not{} a{} neutral{tarafsız} simplification{basitleştirme}.", "Başka bir deyişle, işçileri seyirci olarak ele almak tarafsız bir basitleştirme değildir."],
    ["It{} quietly{sessizce} removes{çıkarmak} from{-den} view{görüş alanı} the{} very{tam da} people{insanlar} whose{ki onların} bargaining{pazarlık} power{güç} determines{belirlemek} whether{-ip -mediğini} a{} labour{emek}-saving{tasarruf eden} machine{makine} saves{tasarruf ettirmek} labour{emek} for{} them{onlar} or{} merely{yalnızca} saves{kısmak (save on)} on{-den (save on: kısmak)} them{onlar}.", "Pazarlık gücü, emek tasarrufu sağlayan bir makinenin onlar için emek mi tasarruf ettireceğini yoksa yalnızca onlardan mı kısacağını belirleyen insanları tam da görüş alanından sessizce çıkarır."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-automation-labour", rows);
const luddite = "Encyclopaedia Britannica, Luddite; https://www.britannica.com/event/Luddite";
const autor = "Autor DH (2015), Why Are There Still So Many Jobs? The History and Future of Workplace Automation, Journal of Economic Perspectives 29(3): 3-30 (MIT-hosted PDF; bkz. ATM/veznedar paragrafı, Bessen 2015 aktarımı); https://shapingwork.mit.edu/wp-content/uploads/2023/10/autor-2015-why-are-there-still-so-many-jobs-the-history-and-future-of-workplace-automation.pdf";
const keynes = "Keynes JM (1930), Economic Possibilities for our Grandchildren (Yale ders metni PDF); http://www.econ.yale.edu/smith/econ116a/keynes1.pdf";

export default {
  slug: "c2-automation-labour", level: "C2", title: "Who Saves the Labour?", topic: "Teknoloji", sortOrder: 38, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central argument?", evidence: findEvidence(paragraphs, "the decisive questions about automation are political before they are technical"), options: [
      option("o1", "Who gains from automation shapes its effects", true, null, "Yazar kazanımların paylaşımının ve pazarlık gücünün sonucu belirlediğini savunur."),
      option("o2", "Automation inevitably destroys most jobs", false, "extreme", "Metin veznedar örneğiyle bunun zorunlu olmadığını gösterir."),
      option("o3", "The Luddites simply feared new machines", false, "reverse", "Metin Ludditlerin şikayetinin makinelerin kullanım biçimiyle ilgili olduğunu söyler."),
      option("o4", "The speed of invention decides automation's outcome", false, "reverse", "Yazar soruların teknik olmadan önce siyasi olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "Why, according to the third paragraph, did teller numbers not collapse?", evidence: findEvidence(paragraphs, "partly because cheaper branches encouraged banks to open more of them"), options: [
      option("o1", "Cheaper branches led banks to open more", true, null, "Metin daha ucuz şubelerin bankaları daha fazla şube açmaya teşvik ettiğini söyler."),
      option("o2", "Machines absorbed every task tellers once did", false, "reverse", "Veznedarlar müşteri ilişkilerine kaydı; tüm görevler makinelere devredilmedi."),
      option("o3", "Banks were legally barred from cutting tellers", false, "notstated", "Yasal bir engelden söz edilmez."),
      option("o4", "Customers refused to use the new machines", false, "notstated", "Müşteri tepkisi anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the final paragraph, what does a machine that “saves on them” do?", evidence: findEvidence(paragraphs, "saves labour for them or merely saves on them"), options: [
      option("o1", "Reduces spending on workers", true, null, "'Save on' bir şeyden tasarruf etmek, kısmak demektir; yazar işçilere yapılan harcamanın kısılmasını kastediyor."),
      option("o2", "Protects workers from harm", false, "context", "'Save' kurtarmak anlamına da gelir ama 'save on' bu anlamda değildir."),
      option("o3", "Gives workers more free time", false, "reverse", "Bu, karşıtlığın öbür tarafı olan 'saves labour for them' anlamıdır."),
      option("o4", "Stores data about workers", false, "context", "Bilgisayardaki 'save' (kaydetmek) anlamı bu bağlama uymaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author concede that the ATM example is “often overused”?", evidence: findEvidence(paragraphs, "The example is often overused, but its point is sound"), options: [
      option("o1", "To admit a weakness while keeping its point", true, null, "Yazar örneğin sık tekrarlandığını kabul eder ama ana fikrini sağlam bulur."),
      option("o2", "To show the example is factually false", false, "reverse", "Yazar örneğin ana fikrini sağlam bulur."),
      option("o3", "To claim that tellers have disappeared", false, "notstated", "Metin tersine sayının çökmediğini söyler."),
      option("o4", "To prove that automation creates jobs everywhere", false, "extreme", "Yazar mutlu bir sonun garanti olmadığını vurgular."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ludditler 19. yüzyılın başında İngiltere'de tekstil makinelerini parçalayan işçilerdi; şikayetleri ücretler ve vasıflı işin zayıflatılmasıyla ilişkilendirilir.", source: luddite, checkedOn: "2026-11-23" },
    { claim: "ABD'de ATM'ler yayıldıktan sonra veznedar istihdamı 1980-2010 arasında yaklaşık 500 binden 550 bine çıktı (işgücü payı düştü); ATM'ler şube işletme maliyetini düşürdü, şube başına veznedar sayısı 1988-2004'te üçte birden fazla azaldı ama kentsel şube sayısı %40'tan fazla arttı (kısmen bankacılık deregülasyonuyla da teşvik edildi); rutin nakit işleri azalırken veznedarlar 'ilişki bankacılığı' ve satışa yöneldi. Not: 'makinelerin kötü hallettiği işler' ifadesi kaynakta olmadığı için 'müşteri ilişkileri kurma' olarak yumuşatıldı. Autor örneğin paradigmatik alınmaması gerektiğini de belirtir.", source: autor, checkedOn: "2026-11-25" },
    { claim: "Keynes 1930 tarihli denemesinde 'teknolojik işsizlik' kavramını kullandı ve bir yüzyıl içinde haftada on beş saatlik çalışmanın yetebileceğini öne sürdü.", source: keynes, checkedOn: "2026-11-23" },
  ] },
};
