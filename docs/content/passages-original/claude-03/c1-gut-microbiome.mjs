import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} most{çoğu} of{} the{} twentieth{yirminci} century{yüzyıl}, the{} bacteria{bakteriler} living{yaşayan} in{} the{} human{insan} gut{bağırsak} were{} regarded{kabul edilmek} chiefly{başlıca} as{olarak} passengers{yolcular}, tolerated{hoş görülen} rather{-den çok (rather than)} than{-den çok (rather than)} studied{incelenen}.", "Yirminci yüzyılın büyük bölümünde insan bağırsağında yaşayan bakteriler başlıca yolcu olarak görüldü; incelenmekten çok hoş görüldüler."],
    ["That{o} view{görüş} has{} shifted{değişmek} dramatically{çarpıcı biçimde} since{-den beri} the{} United{Birleşik} States{Devletler} National{Ulusal} Institutes{Enstitüler} of{} Health{Sağlık} launched{başlatmak} the{} Human{İnsan} Microbiome{Mikrobiyom} Project{Proje} in{} 2007, an{} effort{çaba} to{-mek için} catalogue{kataloglamak} the{} microbes{mikroplar} that{ki} inhabit{yaşamak (bir yerde)} healthy{sağlıklı} people{insanlar}.", "Bu görüş, ABD Ulusal Sağlık Enstitüleri'nin 2007'de sağlıklı insanlarda yaşayan mikropları kataloglamaya yönelik İnsan Mikrobiyom Projesi'ni başlatmasından beri çarpıcı biçimde değişti."],
    ["Researchers{araştırmacılar} now{artık} know{bilmek} that{ki} these{} communities{topluluklar} help{yardım etmek} break{parçalamak (break down)} down{parçalamak (break down)} dietary{besinsel} fibre{lif} that{ki} our{} own{kendi} enzymes{enzimler} cannot{-amaz} digest{sindirmek}, producing{üretmek} short{kısa}-chain{zincirli} fatty{yağ} acids{asitler} that{ki} the{} body{vücut} can{-ebilmek} use{kullanmak} as{olarak} a{} source{kaynak} of{} energy{enerji}.", "Araştırmacılar artık bu toplulukların kendi enzimlerimizin sindiremediği besinsel lifi parçalamaya yardım ettiğini ve vücudun bir enerji kaynağı olarak kullanabildiği kısa zincirli yağ asitleri ürettiğini biliyor."],
  ],
  [
    ["Popular{popüler} accounts{anlatımlar} often{sıklıkla} add{eklemek} that{ki} microbial{mikrobiyal} cells{hücreler} outnumber{sayıca geçmek} human{insan} ones{olanlar} by{oranında} ten{on} to{-e} one{bir}, a{} figure{rakam} repeated{tekrarlanan} for{} decades{onlarca yıl}.", "Popüler anlatımlar sıklıkla mikrobiyal hücrelerin insan hücrelerini ona bir oranında sayıca geçtiğini ekler; bu rakam onlarca yıl tekrarlandı."],
    ["Yet{yine de} a{} 2016 analysis{analiz} by{tarafından} Ron{Ron} Sender{Sender}, Shai{Shai} Fuchs{Fuchs} and{} Ron{Ron} Milo{Milo} concluded{sonucuna varmak} that{ki} the{} ratio{oran} is{} closer{daha yakın} to{-e} one{bir} to{-e} one{bir}, with{} roughly{kabaca} as{} many{çok} bacteria{bakteriler} as{} human{insan} cells{hücreler} in{} a{} reference{referans} adult{yetişkin} man{erkek}.", "Yine de Ron Sender, Shai Fuchs ve Ron Milo'nun 2016 tarihli analizi oranın bire bire daha yakın olduğu sonucuna vardı; referans bir yetişkin erkekte kabaca insan hücresi kadar bakteri vardır."],
    ["The{} correction{düzeltme} did{} not{} diminish{azaltmak} the{} importance{önem} of{} gut{bağırsak} microbes{mikroplar}, but{} it{} illustrated{göstermek} how{ne kadar} readily{kolayca} a{} striking{çarpıcı} number{sayı} can{-ebilir} harden{katılaşmak} into{-e dönüşerek} accepted{kabul görmüş} fact{gerçek}.", "Düzeltme bağırsak mikroplarının önemini azaltmadı, ama çarpıcı bir sayının ne kadar kolayca kabul görmüş bir gerçeğe dönüşüp katılaşabileceğini gösterdi."],
  ],
  [
    ["A{} similar{benzer} caution{ihtiyat} applies{geçerli olmak} to{-e} the{} flood{sel, yığın} of{} studies{çalışmalar} linking{bağlamak} particular{belirli} microbial{mikrobiyal} profiles{profiller} to{-e} obesity{obezite}, depression{depresyon} or{} autoimmune{otoimmün} disease{hastalık}.", "Benzer bir ihtiyat, belirli mikrobiyal profilleri obezite, depresyon ya da otoimmün hastalıkla ilişkilendiren çalışma selinde de geçerlidir."],
    ["Many{çoğu} of{} these{} findings{bulgular} are{} associations{ilişkiler} observed{gözlenen} at{} a{} single{tek} moment{an}, and{} it{} is{} easy{kolay} to{-mek} conflate{birbirine karıştırmak} such{böyle} a{} pattern{örüntü} with{} a{} cause{neden}.", "Bu bulguların çoğu tek bir anda gözlenen ilişkilerdir ve böyle bir örüntüyü bir nedenle karıştırmak kolaydır."],
    ["An{} illness{hastalık} might{-abilir} alter{değiştirmek} the{} microbiome{mikrobiyom} rather{-den çok (rather than)} than{-den çok (rather than)} the{} reverse{tersi}, or{} diet{beslenme} and{} medication{ilaç} might{-abilir} shape{biçimlendirmek} both{ikisini de} at{aynı anda (at once)} once{aynı anda (at once)}.", "Tersinin değil, bir hastalığın mikrobiyomu değiştirmesi mümkündür; ya da beslenme ve ilaçlar ikisini aynı anda biçimlendirebilir."],
    ["Disentangling{ayrıştırmak} these{} possibilities{olasılıklar} usually{genellikle} requires{gerektirmek} controlled{kontrollü} experiments{deneyler}, which{ki bunlar} are{} slow{yavaş} and{} expensive{pahalı} to{-mek} run{yürütmek} in{} people{insanlar}.", "Bu olasılıkları ayrıştırmak genellikle kontrollü deneyler gerektirir; bunları insanlarda yürütmek ise yavaş ve pahalıdır."],
  ],
  [
    ["There{vardır (there are)} are{}, nonetheless{yine de}, cases{durumlar} in{} which{ki onlarda} manipulating{müdahale etmek} the{} microbiome{mikrobiyom} has{} proved{kanıtlamak} its{} worth{değer}.", "Yine de mikrobiyoma müdahalenin değerini kanıtladığı durumlar vardır."],
    ["In{} 2022 the{} US{ABD} Food{Gıda} and{} Drug{İlaç} Administration{İdaresi} approved{onaylamak} the{} first{ilk} faecal{dışkı} microbiota{mikrobiyota} product{ürün}, intended{amaçlanan} to{-mek} prevent{önlemek} recurrence{tekrarlama} of{} Clostridioides{Clostridioides (bakteri cinsi)} difficile{difficile (tür adı)} infection{enfeksiyon} in{} adults{yetişkinler} after{sonra} antibiotic{antibiyotik} treatment{tedavi}.", "2022'de ABD Gıda ve İlaç İdaresi, antibiyotik tedavisinden sonra yetişkinlerde Clostridioides difficile enfeksiyonunun tekrarlamasını önlemeyi amaçlayan ilk dışkı mikrobiyotası ürününü onayladı."],
    ["The{} lesson{ders} is{} not{} that{ki} microbial{mikrobiyal} science{bilim} has{} been{} oversold{abartılmak (gereğinden çok övülmek)} in{} every{her} respect{bakım}, but{} that{ki} its{} strongest{en güçlü} claims{iddialar} are{} those{onlar} tested{sınanan} against{-e karşı} a{} specific{belirli} outcome{sonuç}.", "Ders, mikrobiyal bilimin her bakımdan abartıldığı değil; en güçlü iddialarının belirli bir sonuca karşı sınananlar olduğudur."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-gut-microbiome", rows);
const hmp = "NIH Common Fund, Human Microbiome Project; https://commonfund.nih.gov/hmp";
const harvard = "Harvard T.H. Chan School of Public Health, The Nutrition Source: The Microbiome; https://nutritionsource.hsph.harvard.edu/microbiome/";
const plos = "Sender R, Fuchs S, Milo R (2016), Revised Estimates for the Number of Human and Bacteria Cells in the Body, PLOS Biology 14(8): e1002533; https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002533";
const fda = "U.S. Food and Drug Administration, FDA Approves First Fecal Microbiota Product (2022); https://www.fda.gov/news-events/press-announcements/fda-approves-first-fecal-microbiota-product";

export default {
  slug: "c1-gut-microbiome", level: "C1", title: "The Gut and the Hype", topic: "Tıp", sortOrder: 30, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main argument?", evidence: findEvidence(paragraphs, "its strongest claims are those tested against a specific outcome"), options: [
      option("o1", "Gut microbes matter, yet bold claims need testing", true, null, "Yazar mikropların önemini kabul eder ama en güçlü iddiaların belirli bir sonuçla sınananlar olduğunu savunur."),
      option("o2", "Microbiome research has been largely exaggerated", false, "extreme", "Yazar bilimin her bakımdan abartılmadığını açıkça söyler."),
      option("o3", "Gut bacteria vastly outnumber the body's own cells", false, "reverse", "Metin bu ona bir iddiasının düzeltildiğini anlatır."),
      option("o4", "Diet is the main cause of most chronic illness", false, "notstated", "Beslenme yalnızca olası bir ortak etken olarak anılır; böyle bir iddia yoktur."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about the bacteria-to-human-cell ratio does the passage support?", evidence: findEvidence(paragraphs, "concluded that the ratio is closer to one to one"), options: [
      option("o1", "A 2016 analysis put the two cell counts at roughly equal", true, null, "2016 analizi oranın bire bire yakın olduğunu, yani bakteri ve insan hücresi sayısının kabaca eşit olduğunu buldu."),
      option("o2", "A 2016 analysis confirmed ten bacterial cells for each human cell", false, "reverse", "On'a bir rakamı onlarca yıldır tekrarlanıyordu; 2016 analizi onu doğrulamadı, düzeltti."),
      option("o3", "The Human Microbiome Project, launched in 2016, corrected the ten-to-one figure", false, "detail", "Proje 2007'de başladı ve mikropları kataloglamayı amaçladı; oranı Sender, Fuchs ve Milo'nun 2016 analizi düzeltti."),
      option("o4", "A 2022 FDA approval concerned a product to treat obesity after antibiotics", false, "detail", "2022 onayı antibiyotik sonrası C. difficile enfeksiyonunun nüksünü önleyen bir ürüne aittir, obeziteye değil."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does \"harden\" mean in \"a striking number can harden into accepted fact\"?", evidence: findEvidence(paragraphs, "can harden into accepted fact"), options: [
      option("o1", "Settle into an unquestioned belief", true, null, "Harden into accepted fact, çarpıcı bir rakamın zamanla sorgulanmayan, yerleşik bir bilgiye dönüşmesini anlatır."),
      option("o2", "Turn physically solid, as concrete does", false, "context", "Harden'ın fiziksel sertleşme anlamıdır; bir rakam için uymaz."),
      option("o3", "Become emotionally callous or unfeeling", false, "context", "Duygusal olarak nasırlaşmak gerçek bir anlamdır ama bir rakam için geçerli değildir."),
      option("o4", "Be made stronger against attack", false, "context", "Sistemi saldırıya karşı güçlendirmek gerçek bir anlamdır ama burada anlatılan yerleşme sürecine uymaz."),
    ] },
    { key: "q4", type: "inference", prompt: "The author would most likely agree that a new microbiome claim...", evidence: findEvidence(paragraphs, "The lesson is not that microbial science has been oversold in every respect"), options: [
      option("o1", "earns trust when tested on a clear outcome", true, null, "Yazar en güçlü iddiaların belirli bir sonuca karşı sınananlar olduğunu söyler."),
      option("o2", "should simply be dismissed as passing fashion", false, "extreme", "Yazar alanı toptan reddetmez; işe yarayan örnekler verir."),
      option("o3", "becomes reliable once it is widely repeated", false, "reverse", "Ona bir örneği, sık tekrarın bir rakamı doğru yapmadığını gösterir."),
      option("o4", "matters chiefly when it concerns digestion", false, "notstated", "Yazar önemi sindirimle sınırlamaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "ABD Ulusal Sağlık Enstitüleri (NIH) İnsan Mikrobiyom Projesi'ni 2007'de sağlıklı insanlardaki mikropları tanımlamak için başlattı.", source: hmp, checkedOn: "2026-11-23" },
    { claim: "Bağırsak mikropları insan enzimlerinin sindiremediği lifi fermente ederek kısa zincirli yağ asitleri üretir; vücut bunları enerji kaynağı olarak kullanabilir. Mikrobiyom ile hastalık arasındaki bağların çoğu ilişkiseldir.", source: harvard, checkedOn: "2026-11-23" },
    { claim: "Sender, Fuchs ve Milo (2016) referans erkekte bakteri/insan hücresi oranının eski 10:1 tahmini yerine yaklaşık 1:1 olduğunu hesapladı.", source: plos, checkedOn: "2026-11-23" },
    { claim: "FDA 2022'de, antibiyotik tedavisi sonrası yetişkinlerde tekrarlayan Clostridioides difficile enfeksiyonunu önlemeye yönelik ilk dışkı mikrobiyota ürününü onayladı.", source: fda, checkedOn: "2026-11-23" },
  ] },
};
