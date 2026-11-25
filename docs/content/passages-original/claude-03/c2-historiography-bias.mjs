import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Leopold{Leopold} von{von} Ranke{Ranke}, the{} nineteenth{on dokuzuncu} century{yüzyıl} German{Alman} historian{tarihçi}, famously{ünlü biçimde} urged{teşvik etmek} historians{tarihçiler} to{-meye} show{göstermek} the{} past{geçmiş} as{} it{} actually{gerçekten} was{}.", "On dokuzuncu yüzyıl Alman tarihçisi Leopold von Ranke, tarihçileri geçmişi gerçekte olduğu gibi göstermeye ünlü biçimde teşvik etti."],
    ["The{} phrase{ifade} is{} often{sıklıkla} quoted{alıntılanmak} as{} if{} it{} were{-mış gibi (were)} naive{saf}, but{} Ranke{Ranke} was{} arguing{savunmak (argue against: karşı çıkmak)} against{karşı} a{} specific{belirli} habit{alışkanlık}: treating{ele almak} history{tarih} chiefly{başlıca} as{} a{} source{kaynak} of{} moral{ahlaki} lessons{dersler}.", "İfade sık sık safmış gibi alıntılanır, ama Ranke belirli bir alışkanlığa karşı çıkıyordu: tarihi başlıca bir ahlak dersleri kaynağı olarak ele almak."],
    ["His{} insistence{ısrar} on{-de} archives{arşivler} and{} original{özgün} documents{belgeler} helped{yardım etmek} shape{biçimlendirmek} the{} modern{modern} discipline{disiplin}.", "Arşivler ve özgün belgeler konusundaki ısrarı modern disiplinin biçimlenmesine yardım etti."],
  ],
  [
    ["Yet{yine de} archives{arşivler} are{} not{} neutral{tarafsız} either{de (olumsuzda)}.", "Yine de arşivler de tarafsız değildir."],
    ["Someone{biri} decided{karar vermek} which{hangi} letters{mektuplar} were{} kept{saklanmak} and{} which{hangileri} were{} burned{yakılmak}, which{hangi} voices{sesler} were{} recorded{kaydedilmek} and{} which{hangileri} were{} never{hiç} written{yazılmak} down{yazıya geçirmek (write down)} at{hiç (at all)} all{hiç (at all)}.", "Hangi mektupların saklanıp hangilerinin yakılacağına, hangi seslerin kaydedilip hangilerinin hiç yazıya geçirilmeyeceğine biri karar verdi."],
    ["A{} historian{tarihçi} who{ki o} reads{okumak} only{yalnızca} what{ne} survives{günümüze kalmak} may{-ebilir} reproduce{yeniden üretmek}, with{} impeccable{kusursuz} footnotes{dipnotlar}, the{} priorities{öncelikler} of{} the{} people{insanlar} who{ki onlar} did{yapmak} the{} preserving{koruma}.", "Yalnızca günümüze kalanı okuyan bir tarihçi, kusursuz dipnotlarla, korumayı yapan insanların önceliklerini yeniden üretebilir."],
    ["The{} bias{yanlılık}, in{} such{böyle} cases{durumlar}, lies{yatmak} not{} in{} the{} method{yöntem} but{} upstream{akış yukarısında (daha önceki aşamada)} of{} it{onun}.", "Böyle durumlarda yanlılık yöntemde değil, ondan önceki aşamada yatar."],
  ],
  [
    ["In{} the{} early{erken} nineteen{on dokuz} sixties{altmışlar}, E{E}. H{H}. Carr{Carr} pushed{itmek} the{} point{nokta} further{daha ileri}.", "1960'ların başında E. H. Carr bu noktayı daha ileri taşıdı."],
    ["In{} his{} book{kitap} What{ne} Is{-dır (olmak fiili)} History{Tarih}?, he{} compared{karşılaştırmak} facts{olgular} to{-e} fish{balık} swimming{yüzmek} in{} a{} vast{uçsuz bucaksız} ocean{okyanus}: what{ne} the{} historian{tarihçi} catches{yakalamak} depends{bağlı olmak} partly{kısmen} on{-e} chance{şans}, but{} mainly{esas olarak} on{-e} where{nerede} he{} chooses{seçmek} to{-meyi} fish{balık tutmak} and{} what{hangi} tackle{olta takımı} he{} uses{kullanmak}.", "Tarih Nedir? adlı kitabında olguları uçsuz bucaksız bir okyanusta yüzen balıklara benzetti: tarihçinin yakaladığı şey kısmen şansa, ama esas olarak nerede balık tutmayı seçtiğine ve hangi olta takımını kullandığına bağlıdır."],
    ["On{-e göre} this{} view{görüş}, selection{seçme} is{} not{} a{} regrettable{üzücü} lapse{sapma} from{-den} objectivity{nesnellik}; it{} is{} the{} very{tam} thing{şey} that{ki} turns{dönüştürmek} a{} heap{yığın} of{} facts{olgular} into{-e} history{tarih}.", "Bu görüşe göre seçme, nesnellikten üzücü bir sapma değildir; bir olgu yığınını tarihe dönüştüren tam da odur."],
  ],
  [
    ["The{} danger{tehlike} is{} that{ki} this{} insight{kavrayış} can{-ebilir} be{} stretched{zorlanmak (esnetilmek)} into{-e} something{bir şey} Carr{Carr} did{} not{} intend{amaçlamak}.", "Tehlike, bu kavrayışın Carr'ın amaçlamadığı bir şeye doğru esnetilebilmesidir."],
    ["If{} every{her} account{anlatı} is{} merely{yalnızca} one{bir} perspective{bakış açısı}, then{o halde} a{} careful{dikkatli} study{inceleme} of{} census{nüfus sayımı} records{kayıtlar} and{} a{} piece{parça} of{} wartime{savaş dönemi} propaganda{propaganda} become{olmak} equally{eşit derecede} valid{geçerli} stories{öyküler}, and{} the{} historian's{tarihçinin} training{eğitim} counts{sayılmak} for{olarak (count for)} nothing{hiçbir şey}.", "Her anlatı yalnızca bir bakış açısıysa, nüfus sayımı kayıtlarının dikkatli bir incelemesi ile bir parça savaş propagandası eşit derecede geçerli öyküler olur ve tarihçinin eğitimi hiçbir şey sayılmaz."],
    ["Carr{Carr} himself{kendisi} resisted{direnmek} that{o} slide{kayma}, observing{gözlemlemek} that{ki} a{} mountain{dağ} which{ki o} looks{görünmek} different{farklı} from{-den} different{farklı} angles{açılar} does{} not{} therefore{bu nedenle} have{sahip olmak} no{hiç} shape{biçim}, or{} infinitely{sonsuz} many{çok}.", "Carr'ın kendisi bu kaymaya direndi; farklı açılardan farklı görünen bir dağın bu yüzden hiç biçimi olmadığını ya da sonsuz sayıda biçimi olduğunu söylemenin yanlış olduğunu gözlemledi."],
  ],
  [
    ["What{ne} emerges{ortaya çıkmak} is{} a{} discipline{disiplin} that{ki} is{} neither{ne ... ne de} a{} mirror{ayna} nor{ne de} a{} mere{salt} opinion{görüş}.", "Ortaya çıkan, ne bir ayna ne de salt bir görüş olan bir disiplindir."],
    ["Perspective{bakış açısı} cannot{-emez} be{} removed{kaldırılmak}, but{} it{} can{-ebilir} be{} declared{açıkça belirtilmek}, tested{sınanmak} against{karşısında} evidence{kanıt} and{} corrected{düzeltilmek} by{tarafından} other{diğer} historians{tarihçiler} working{çalışmak} from{-den} other{diğer} archives{arşivler}.", "Bakış açısı kaldırılamaz, ama açıkça belirtilebilir, kanıta karşı sınanabilir ve başka arşivlerden çalışan başka tarihçilerce düzeltilebilir."],
    ["The{} familiar{bilindik} slogan{slogan} that{ki} history{tarih} is{} written{yazılmak} by{tarafından} the{} victors{galipler}, repeated{tekrarlanmak} so{öylesine} often{sık} that{ki} few{az kişi} pause{durmak} to{-mek için} ask{sormak} who{kim} first{ilk} said{söylemek} it{onu}, captures{yakalamak} only{yalnızca} half{yarı} of{} this{}: the{} victors{galipler} write{yazmak} first{ilk}, but{} they{} rarely{nadiren} write{yazmak} last{son}.", "Tarihi galiplerin yazdığına dair, ilk kimin söylediğini sormak için pek az kişinin durduğu kadar sık tekrarlanan bilindik slogan bunun yalnızca yarısını yakalar: galipler ilk yazar, ama nadiren son yazan olurlar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-historiography-bias", rows);
const ranke = "Encyclopaedia Britannica, Leopold von Ranke; https://www.britannica.com/biography/Leopold-von-Ranke";
const carrBio = "Encyclopaedia Britannica, E.H. Carr; https://www.britannica.com/biography/E-H-Carr";
const carrBook = "E. H. Carr, What Is History? (Macmillan, 1961), Bolum 1: The Historian and His Facts";

export default {
  slug: "c2-historiography-bias", level: "C2", title: "Who Keeps the Archive?", topic: "Tarih", sortOrder: 31, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best captures the author's view of perspective in history?", evidence: findEvidence(paragraphs, "Perspective cannot be removed, but it can be declared, tested against evidence and corrected by other historians working from other archives"), options: [
      option("o1", "It is unavoidable but open to correction", true, null, "Yazar bakış açısının kaldırılamayacağını, ama sınanıp düzeltilebileceğini söyler."),
      option("o2", "It makes all historical accounts equally valid", false, "extreme", "Yazar ve Carr bu göreceliğe açıkça karşı çıkar."),
      option("o3", "It can be removed by careful archival work", false, "reverse", "Metin arşivlerin de tarafsız olmadığını ve bakış açısının kaldırılamayacağını söyler."),
      option("o4", "It matters mainly in wartime propaganda", false, "context", "Propaganda yalnızca bir örnektir; konu tüm tarih yazımıdır."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the text, what was Ranke's famous phrase directed against?", evidence: findEvidence(paragraphs, "Ranke was arguing against a specific habit: treating history chiefly as a source of moral lessons"), options: [
      option("o1", "Using history mainly to teach morals", true, null, "Ranke, tarihi başlıca ahlak dersi kaynağı olarak kullanma alışkanlığına karşı çıkıyordu."),
      option("o2", "Relying too heavily on original archives", false, "reverse", "Ranke tam tersine arşivlerde ve özgün belgelerde ısrar etti."),
      option("o3", "Historians who admitted their own bias", false, "notstated", "Metin Ranke'nin böyle bir hedefi olduğunu söylemez."),
      option("o4", "The naive belief in objective facts", false, "reverse", "İfade safça bulunur, ama Ranke nesnelliğe değil ahlak dersciliğine karşıydı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the second paragraph, what does the bias lying “upstream of it” mean?", evidence: findEvidence(paragraphs, "lies not in the method but upstream of it"), options: [
      option("o1", "Earlier, in what was preserved", true, null, "Upstream burada mecazdır: yanlılık yöntemden önceki aşamada, neyin saklandığında yatar."),
      option("o2", "Hidden inside the historian's method", false, "reverse", "Metin yanlılığın yöntemde olmadığını açıkça söyler."),
      option("o3", "Beside a river near the archive", false, "context", "Akarsu anlamı mecaz kullanımın gerçek anlamıdır; bağlama uymaz."),
      option("o4", "Added later by careless readers", false, "reverse", "Upstream sonrası değil, öncesini anlatır."),
    ] },
    { key: "q4", type: "inference", prompt: "What irony lies in the remark that few people “pause to ask who first said it”?", evidence: findEvidence(paragraphs, "repeated so often that few pause to ask who first said it"), options: [
      option("o1", "A claim about sources goes unexamined", true, null, "Kaynakların yanlılığını anlatan bir slogan, kendi kaynağı sorgulanmadan tekrarlanır; ironi budur."),
      option("o2", "Most people know exactly who coined it", false, "reverse", "Metin pek az kişinin bunu sorduğunu söyler."),
      option("o3", "The slogan was first said by Carr himself", false, "notstated", "Metin sloganı Carr'a bağlamaz."),
      option("o4", "Victors never write any history at all", false, "extreme", "Metin galiplerin ilk yazdığını söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Leopold von Ranke 19. yüzyıl Alman tarihçisidir; geçmişi gerçekte olduğu gibi gösterme ilkesi ve arşivlere/özgün belgelere dayanması modern tarih disiplinini etkiledi; ilkeyi geçmişi yargılayıp gelecek için ders verme iddiasına karşı koydu.", source: ranke, checkedOn: "2026-11-23" },
    { claim: "E. H. Carr'ın What Is History? kitabı 1961'de yayımlanan derslerine dayanır.", source: carrBio, checkedOn: "2026-11-23" },
    { claim: "Carr olguları okyanusta yüzen balıklara benzetir (tarihçinin yakaladığı kısmen şansa, esas olarak nerede ve hangi takımla avlandığına bağlıdır) ve farklı açılardan farklı görünen bir dağın biçimsiz ya da sonsuz biçimli olmadığını söyleyerek aşırı göreceliği reddeder.", source: carrBook, checkedOn: "2026-11-23" },
  ] },
};
