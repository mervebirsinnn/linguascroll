import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["No{hiç} one{kimse} has{} ever{hiç} seen{görmek} dark{karanlık} matter{madde}.", "Karanlık maddeyi hiç kimse görmedi."],
    ["Its{} existence{varlık} is{} inferred{çıkarsanmak}, and{} the{} inference{çıkarım} deserves{hak etmek} scrutiny{dikkatli inceleme} because{çünkü} it{} rests{dayanmak} on{} an{} assumption{varsayım} that{ki} usually{genellikle} goes{kalmak (go unstated)} unstated{dile getirilmemiş}: that{ki} the{} gravity{kütle çekimi} we{} understand{anlamak} from{-den} the{} solar{güneş} system{sistem} behaves{davranmak} the{} same{aynı} way{biçim} across{boyunca} entire{koca} galaxies{gökadalar}.", "Varlığı çıkarsanır ve bu çıkarım dikkatli incelemeyi hak eder, çünkü genellikle dile getirilmeyen bir varsayıma dayanır: Güneş sisteminden anladığımız kütle çekiminin koca gökadalar boyunca da aynı biçimde davrandığı."],
  ],
  [
    ["The{} first{ilk} hints{ipuçları} came{gelmek} in{} the{} nineteen{on dokuz} thirties{otuzlar}, when{-dığında} Fritz{Fritz} Zwicky{Zwicky} studied{incelemek} the{} Coma{Coma} cluster{küme} and{} found{bulmak} its{} galaxies{gökadalar} moving{hareket etmek} too{fazla} fast{hızlı} to{-mek} be{} held{tutulmak} together{bir arada} by{tarafından} the{} visible{görünür} mass{kütle} alone{tek başına}.", "İlk ipuçları 1930'larda, Fritz Zwicky Coma kümesini inceleyip gökadalarının yalnızca görünür kütle tarafından bir arada tutulamayacak kadar hızlı hareket ettiğini bulduğunda geldi."],
    ["In{} the{} nineteen{on dokuz} seventies{yetmişler}, Vera{Vera} Rubin{Rubin} and{} her{} colleagues{meslektaşlar} measured{ölçmek} how{ne kadar} quickly{hızlı} stars{yıldızlar} orbit{yörüngede dolanmak} in{} spiral{sarmal} galaxies{gökadalar}.", "1970'lerde Vera Rubin ve meslektaşları sarmal gökadalarda yıldızların ne kadar hızlı dolandığını ölçtü."],
    ["Stars{yıldızlar} far{uzak} from{-den} the{} centre{merkez} moved{hareket etmek} roughly{aşağı yukarı} as{} fast{hızlı} as{} those{onlar} nearer{daha yakın} in{içeride}, whereas{oysa} the{} visible{görünür} matter{madde} implied{ima etmek} they{} should{-meli} slow{yavaşlamak} down{yavaşlamak (slow down)}, much{tıpkı} as{} the{} outer{dış} planets{gezegenler} circle{dönmek} the{} Sun{Güneş} more{daha} slowly{yavaş} than{-den} the{} inner{iç} ones{olanlar}.", "Merkezden uzak yıldızlar, içeriye daha yakın olanlar kadar hızlı hareket ediyordu; oysa görünür madde, tıpkı dış gezegenlerin Güneş'in çevresinde iç gezegenlerden daha yavaş dönmesi gibi yavaşlamaları gerektiğini ima ediyordu."],
  ],
  [
    ["Faced{karşı karşıya kalmak} with{} such{böyle} a{} mismatch{uyumsuzluk}, physicists{fizikçiler} had{sahip olmak (geçmiş)} two{iki} broad{geniş} options{seçenekler}.", "Böyle bir uyumsuzlukla karşılaşan fizikçilerin iki geniş seçeneği vardı."],
    ["They{} could{-ebilirdi} add{eklemek} mass{kütle} that{ki} does{} not{} shine{parlamak}, keeping{korumak} the{} familiar{bilindik} law{yasa} intact{bozulmamış}, or{} they{} could{-ebilirdi} revise{gözden geçirmek} the{} law{yasa} and{} make{yetinmek (make do with)} do{yetinmek (make do with)} with{} the{} mass{kütle} they{} could{-ebilirdi} see{görmek}.", "Bilindik yasayı bozmadan parlamayan kütle ekleyebilirlerdi ya da yasayı gözden geçirip görebildikleri kütleyle yetinebilirlerdi."],
    ["Most{çoğu} chose{seçmek} the{} first{ilk} path{yol}, and{} the{} unseen{görünmeyen} mass{kütle} became{olmak} dark{karanlık} matter{madde}.", "Çoğu ilk yolu seçti ve görünmeyen kütle karanlık madde oldu."],
    ["A{} minority{azınlık}, following{izlemek} Mordehai{Mordehai} Milgrom's{Milgrom'un} proposal{önerisi} of{} modified{değiştirilmiş} Newtonian{Newton} dynamics{dinamiği}, chose{seçmek} the{} second{ikinci}.", "Bir azınlık, Mordehai Milgrom'un değiştirilmiş Newton dinamiği önerisini izleyerek ikincisini seçti."],
  ],
  [
    ["What{ne} persuades{ikna etmek} most{çoğu} astronomers{gökbilimciler} is{} not{} any{herhangi bir} single{tek} observation{gözlem} but{} convergence{yakınsama (kanıtların birleşmesi)}.", "Gökbilimcilerin çoğunu ikna eden, tek bir gözlem değil, kanıtların birleşmesidir."],
    ["In{} the{} Bullet{Mermi} Cluster{Kümesi}, where{-dığı yer} two{iki} clusters{kümeler} of{} galaxies{gökadalar} collided{çarpışmak}, gravitational{kütle çekimsel} lensing{merceklenme} places{yerleştirmek} most{çoğu} of{} the{} mass{kütle} apart{ayrı} from{-den} the{} hot{sıcak} gas{gaz} that{ki} holds{barındırmak} most{çoğu} of{} the{} ordinary{sıradan} matter{madde}.", "İki gökada kümesinin çarpıştığı Mermi Kümesi'nde kütle çekimsel merceklenme, kütlenin çoğunu sıradan maddenin çoğunu barındıran sıcak gazdan ayrı bir yere yerleştirir."],
    ["Each{her} line{çizgi (kanıt kolu)} of{} evidence{kanıt} might{-ebilir} be{} explained{açıklanmak} differently{farklı biçimde}; together{birlikte} they{} are{} far{çok} harder{daha zor} to{-mek} dismiss{reddetmek}.", "Her kanıt kolu farklı biçimde açıklanabilir; birlikte ise reddedilmeleri çok daha zordur."],
  ],
  [
    ["Still{yine de}, the{} case{dava (kanıt dosyası)} remains{kalmak} circumstantial{dolaylı (ipucuna dayalı)} in{} a{} precise{kesin} sense{anlam}.", "Yine de dava, kesin bir anlamda dolaylı kanıta dayalı kalır."],
    ["Laboratory{laboratuvar} searches{aramalar} for{} the{} particles{parçacıklar} proposed{önerilmek} as{} dark{karanlık} matter{madde} have{} not{} yet{henüz} produced{üretmek} a{} confirmed{doğrulanmış} detection{algılama}, so{bu yüzden} the{} substance{madde} is{} known{bilinmek} by{-den (by its effects)} its{} effects{etkiler} on{-e} what{ne} we{} can{-ebilir} see{görmek}.", "Karanlık madde olarak önerilen parçacıklar için yapılan laboratuvar aramaları henüz doğrulanmış bir algılama üretmedi; bu yüzden madde, görebildiğimiz şeyler üzerindeki etkilerinden tanınır."],
    ["That{bu} is{} no{hiç} scandal{skandal}; much{çoğu} of{} science{bilim} has{} worked{işlemek} this{} way{biçim}.", "Bu bir skandal değildir; bilimin çoğu bu biçimde işlemiştir."],
    ["It{} is{}, however{ancak}, a{} reason{neden} to{-mek} hold{tutmak} the{} conclusion{sonuç} firmly{sıkıca} and{} any{herhangi bir} particular{belirli} account{açıklama} of{} it{onun} more{daha} loosely{gevşekçe}.", "Ancak sonucu sıkıca, onun herhangi bir belirli açıklamasını ise daha gevşekçe tutmak için bir nedendir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-dark-matter-inference", rows);
const zwicky = "Encyclopaedia Britannica, Fritz Zwicky; https://www.britannica.com/biography/Fritz-Zwicky";
const rubin = "Encyclopaedia Britannica, Vera Rubin; https://www.britannica.com/biography/Vera-Rubin";
const bullet = "NASA Chandra X-ray Observatory, 1E 0657-56: NASA Finds Direct Proof of Dark Matter (2006); https://chandra.harvard.edu/photo/2006/1e0657/";
const darkMatter = "Encyclopaedia Britannica, Dark matter; https://www.britannica.com/science/dark-matter";
const nasa = "NASA Science, Dark Matter and Dark Energy; https://science.nasa.gov/universe/dark-matter-dark-energy/";

export default {
  slug: "c2-dark-matter-inference", level: "C2", title: "Weighing What Cannot Be Seen", topic: "Bilim", sortOrder: 35, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which best describes the author's stance on dark matter?", evidence: findEvidence(paragraphs, "a reason to hold the conclusion firmly and any particular account of it more loosely"), options: [
      option("o1", "Well supported, though its nature is unknown", true, null, "Yazar sonucu sıkı tutmayı, ama maddenin ne olduğuna dair açıklamaları gevşek tutmayı önerir."),
      option("o2", "Proven beyond doubt by direct detection", false, "reverse", "Metne göre doğrulanmış bir laboratuvar algılaması henüz yoktur."),
      option("o3", "Probably an error that will soon vanish", false, "reverse", "Yazar kanıtların birleşmesini reddedilmesi zor bulur."),
      option("o4", "Less convincing than modified gravity theories", false, "notstated", "Yazar değiştirilmiş dinamiği bir azınlık görüşü olarak anar, daha ikna edici bulmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Rubin's measurements show, according to the text?", evidence: findEvidence(paragraphs, "Stars far from the centre moved roughly as fast as those nearer in"), options: [
      option("o1", "Outer stars kept pace with inner ones", true, null, "Merkezden uzak yıldızlar içteki yıldızlar kadar hızlı hareket ediyordu."),
      option("o2", "Outer stars moved more slowly, as expected", false, "reverse", "Görünür madde yavaşlamayı öngörüyordu, ama ölçüm bunu göstermedi."),
      option("o3", "Galaxies in Coma moved too fast", false, "context", "Bu Zwicky'nin Coma kümesi bulgusudur, Rubin'inki değil."),
      option("o4", "Visible matter explained the speeds well", false, "reverse", "Uyumsuzluk tam olarak görünür maddenin hızları açıklayamamasıdır."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “circumstantial” mean in the final paragraph?", evidence: findEvidence(paragraphs, "the case remains circumstantial in a precise sense"), options: [
      option("o1", "Indirect, inferred from effects", true, null, "Circumstantial, doğrudan gözleme değil, etkilerden yapılan çıkarıma dayanan kanıt demektir."),
      option("o2", "Weak and probably mistaken", false, "extreme", "Yazar bunun bir skandal olmadığını, sonucun sıkı tutulabileceğini söyler."),
      option("o3", "Dependent on lucky circumstances", false, "context", "Sözcüğün kökü 'koşul' anlamı çağrıştırsa da şans kastedilmez."),
      option("o4", "Confirmed by laboratory detection", false, "reverse", "Laboratuvar algılaması henüz yoktur; dolaylılık buradan gelir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the third paragraph imply about the original cluster and rotation data?", evidence: findEvidence(paragraphs, "Faced with such a mismatch, physicists had two broad options"), options: [
      option("o1", "They could not by themselves decide the issue", true, null, "Aynı uyumsuzluk iki yolla da açıklanabiliyordu; karar için başka kanıtların birleşmesi gerekti."),
      option("o2", "They proved that Newtonian gravity was wrong everywhere", false, "extreme", "Metin yasayı değiştirmeyi yalnızca bir seçenek olarak sunar."),
      option("o3", "They were later shown to be measurement errors", false, "notstated", "Ölçümlerin hatalı çıktığından söz edilmez."),
      option("o4", "They directly revealed dark matter particles", false, "reverse", "Parçacıklar henüz doğrudan algılanmadı."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Fritz Zwicky 1930'larda Coma kümesindeki gökadaların görünür kütleyle bir arada tutulamayacak kadar hızlı hareket ettiğini buldu.", source: zwicky, checkedOn: "2026-11-23" },
    { claim: "Vera Rubin ve meslektaşları 1970'lerde sarmal gökadalarda merkezden uzak yıldızların beklenenden hızlı (yaklaşık sabit hızla) dolandığını ölçtü.", source: rubin, checkedOn: "2026-11-23" },
    { claim: "Mermi Kümesi'nde kütle çekimsel merceklenme kütlenin çoğunu, sıradan maddenin çoğunu barındıran sıcak gazdan ayrı konumlandırır.", source: bullet, checkedOn: "2026-11-23" },
    { claim: "Değiştirilmiş Newton dinamiği (MOND) Mordehai Milgrom'un önerisidir; karanlık madde parçacıkları henüz doğrudan algılanmamıştır.", source: darkMatter, checkedOn: "2026-11-23" },
    { claim: "Karanlık madde doğrudan görülmez; varlığı kütle çekimsel etkilerinden çıkarsanır.", source: nasa, checkedOn: "2026-11-23" },
  ] },
};
