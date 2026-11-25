import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Archives{arşivler} present{sunmak} themselves{kendilerini} as{olarak} neutral{tarafsız} storehouses{depolar}, places{yerler} where{-dığı} the{} past{geçmiş} simply{sadece} waits{beklemek} to{-mek} be{} consulted{başvurulmak}.", "Arşivler kendilerini tarafsız depolar, geçmişin sadece başvurulmayı beklediği yerler olarak sunar."],
    ["The{} image{imge} is{} comforting{rahatlatıcı} and{} misleading{yanıltıcı}.", "Bu imge rahatlatıcı ve yanıltıcıdır."],
    ["Every{her} archive{arşiv} is{} the{} residue{kalıntı} of{} earlier{önceki} decisions{kararlar} about{hakkında} what{neyin} was{} worth{değer} writing{yazmak (write down)} down{yazmak (write down)}, what{neyin} was{} worth{değer} keeping{saklamak}, and{} who{kimin} was{} entitled{hakkı olmak} to{-mek} do{yapmak} either{ikisinden birini}, so{bu yüzden} its{} gaps{boşluklar} are{} not{} accidents{kazalar} of{} time{zaman} so{-den çok (not so much as)} much{-den çok (not so much as)} as{-den çok (not so much as)} traces{izler} of{} power{iktidar, güç}.", "Her arşiv, neyin yazmaya değer olduğu, neyin saklamaya değer olduğu ve bunlardan birini yapmaya kimin hakkı olduğu hakkındaki önceki kararların kalıntısıdır; bu yüzden boşlukları zamanın kazalarından çok iktidarın izleridir."],
  ],
  [
    ["The{} Haitian{Haitili} anthropologist{antropolog} Michel{Michel}-Rolph{Rolph} Trouillot{Trouillot} gave{vermek} this{} intuition{sezgi} a{} precise{kesin} form{biçim}.", "Haitili antropolog Michel-Rolph Trouillot bu sezgiye kesin bir biçim verdi."],
    ["In{} Silencing{Silencing (kitap adı: susturmak)} the{} Past{Past (kitap adı: geçmiş)}, published{yayımlanmak} in{-de} nineteen{on dokuz} ninety{doksan} five{beş}, he{} argued{savunmak} that{ki} silences{sessizlikler} enter{girmek} history{tarih} at{} several{birkaç} distinct{ayrı} moments{anlar}, including{dahil} when{-dığında} sources{kaynaklar} are{} created{yaratılmak} and{} when{-dığında} they{} are{} assembled{bir araya getirilmek} into{-e} archives{arşivler}.", "1995'te yayımlanan Silencing the Past'te sessizliklerin tarihe birkaç ayrı anda girdiğini savundu; bunların arasında kaynakların yaratıldığı ve arşivlerde bir araya getirildiği anlar da vardır."],
    ["The{} scheme{şema} matters{önemli olmak} because{çünkü} it{} denies{esirgemek} historians{tarihçiler} an{} easy{kolay} alibi{mazeret}.", "Şema önemlidir çünkü tarihçilere kolay bir mazeret bırakmaz."],
    ["A{} gap{boşluk} cannot{-emez} be{} blamed{suçlanmak, yüklenmek} solely{yalnızca} on{-e} careless{dikkatsiz} clerks{katipler} or{} lost{kayıp} boxes{kutular} if{} it{} was{} already{zaten} built{yerleşik (built into)} into{-e} what{-eni} the{} clerks{katipler} were{} asked{istenmek} to{-mek} record{kaydetmek}.", "Bir boşluk, katiplerden kaydetmeleri istenen şeye zaten yerleşmişse yalnızca dikkatsiz katiplere ya da kayıp kutulara yüklenemez."],
  ],
  [
    ["His{} own{kendi} central{merkezi} example{örnek} was{} the{} Haitian{Haiti} Revolution{Devrimi}, which{ki onu}, he{} argued{savunmak}, Western{Batılı} observers{gözlemciler} at{} the{} time{dönem} found{bulmak} hard{zor} to{-mek} conceive{tasavvur etmek} within{içinde} the{} categories{kategoriler} available{elde olan} to{-e} them{}: a{} successful{başarılı} uprising{ayaklanma} of{} enslaved{köleleştirilmiş} people{insanlar} did{} not{} fit{uymak} those{o} categories{kategoriler}.", "Kendi merkezi örneği Haiti Devrimi'ydi; savunduğuna göre dönemin Batılı gözlemcileri onu ellerindeki kategoriler içinde tasavvur etmekte zorlandı: köleleştirilmiş insanların başarılı bir ayaklanması bu kategorilere uymuyordu."],
    ["The{} silence{sessizlik}, on{-e göre (on this account)} this{} account{açıklama}, was{} not{} simply{yalnızca} imposed{dayatılmak} afterwards{sonradan} by{tarafından} forgetful{unutkan} historians{tarihçiler}.", "Bu açıklamaya göre sessizlik yalnızca sonradan unutkan tarihçiler tarafından dayatılmadı."],
    ["It{} could{-ebilmek} already{zaten} lie{yer almak} in{} the{} documents{belgeler} themselves{kendileri}, written{yazılmış} into{-e} the{} vocabulary{söz dağarcığı} of{} the{} people{insanlar} producing{üretmek} them{}.", "Belgelerin kendisinde zaten yer alabilirdi; onları üreten insanların söz dağarcığına yazılmıştı."],
  ],
  [
    ["It{} would{-erdi} be{} easy{kolay} to{-mek} draw{çıkarmak} a{} romantic{romantik} conclusion{sonuç} from{-den} this{}, namely{yani} that{ki} the{} truly{gerçekten} important{önemli} past{geçmiş} is{} whatever{her ne ise} the{} archive{arşiv} omits{atlamak}.", "Bundan romantik bir sonuç çıkarmak kolay olurdu: gerçekten önemli geçmişin, arşivin atladığı her şey olduğu."],
    ["That{o} conclusion{sonuç} is{} as{kadar} careless{dikkatsiz} as{kadar} the{} naivety{saflık} it{} replaces{yerini almak}.", "Bu sonuç, yerini aldığı saflık kadar dikkatsizdir."],
    ["An{} absence{yokluk} is{} not{} evidence{kanıt} of{} anything{herhangi bir şey} in{özellikle (in particular)} particular{özellikle (in particular)} until{-e kadar} a{} historian{tarihçi} can{-ebilmek} show{göstermek} what{hangi} pressures{baskılar} produced{üretmek} it{onu}, and{} reading{okumak} against{karşı} the{} grain{doku, akış yönü} of{} a{} document{belge} still{yine de} requires{gerektirmek} reading{okumak} the{} document{belge} closely{dikkatle}.", "Bir yokluk, bir tarihçi onu hangi baskıların ürettiğini gösterene kadar özellikle hiçbir şeyin kanıtı değildir ve bir belgeyi tersinden okumak yine de belgeyi dikkatle okumayı gerektirir."],
    ["Silence{sessizlik} has{zorunda olmak (have to)} to{zorunda olmak (have to)} be{} argued{gerekçelendirilmek (argue for)} for{gerekçelendirilmek (argue for)}, not{} merely{yalnızca} invoked{anılmak}.", "Sessizlik yalnızca anılmamalı, gerekçelendirilmelidir."],
  ],
  [
    ["What{-en şey} the{} archive{arşiv} offers{sunmak}, then{o halde}, is{} neither{ne} a{} transparent{şeffaf} window{pencere} nor{ne de} a{} wall{duvar} of{} lies{yalanlar} but{} a{} record{kayıt} of{} who{kimin} was{} listening{dinlemek}, and{} to{-i} whom{kimi}.", "O halde arşivin sunduğu şey ne şeffaf bir pencere ne de bir yalanlar duvarıdır; kimin dinlediğinin ve kimi dinlediğinin kaydıdır."],
    ["Treating{ele almak} it{onu} that{o} way{şekilde} makes{kılmak} history{tarih} harder{daha zor} to{-mek} write{yazmak} and{} considerably{epeyce} more{daha} honest{dürüst}.", "Onu bu şekilde ele almak tarihi yazmayı daha zor ve epeyce daha dürüst kılar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-archive-silences", rows);
const trouillot = "Wikipedia, Michel-Rolph Trouillot; https://en.wikipedia.org/wiki/Michel-Rolph_Trouillot";
const silencing = "Wikipedia, Silencing the Past; https://en.wikipedia.org/wiki/Silencing_the_Past";

export default {
  slug: "c2-archive-silences", level: "C2", title: "What the Archive Heard", topic: "Tarih", sortOrder: 37, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best captures the author's position?", evidence: findEvidence(paragraphs, "Silence has to be argued for, not merely invoked."), options: [
      option("o1", "Gaps reflect power yet must be argued for", true, null, "Yazar boşlukların iktidarın izi olduğunu ama sessizliğin gerekçelendirilmesi gerektiğini savunur."),
      option("o2", "Archives are neutral records of the past", false, "reverse", "Yazar bu imgeyi yanıltıcı bulur."),
      option("o3", "Whatever archives omit is the most important past", false, "reverse", "Yazar bu 'romantik sonucu' dikkatsiz diye reddeder."),
      option("o4", "Historians should stop relying on archives entirely", false, "extreme", "Yazar belgeyi dikkatle okumayı hâlâ gerekli görür."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage say about a gap that cannot be blamed solely on careless clerks or lost boxes?", evidence: findEvidence(paragraphs, "A gap cannot be blamed solely on careless clerks or lost boxes if it was already built into what the clerks were asked to record."), options: [
      option("o1", "It was already embedded in what clerks were told to record", true, null, "Metin, boşluğun katiplerden kaydetmeleri istenen şeye zaten yerleşmiş olabileceğini söyler."),
      option("o2", "It arose only once sources were assembled into archives afterwards", false, "detail", "Sessizlikler kaynakların hem yaratıldığı hem de arşivlerde toplandığı anlarda girer; yalnızca toplama aşamasına bağlanamaz."),
      option("o3", "It was imposed later by forgetful historians reading the documents", false, "reverse", "Metin sessizliğin yalnızca sonradan unutkan tarihçilerce dayatılmadığını söyler."),
      option("o4", "It came from clerks' categories that could not conceive an uprising", false, "detail", "Kategorilerin tasavvur edememesi dönemin Batılı gözlemcileri için söylenir ve Haiti örneğine aittir, bu koşulun açıklaması değildir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the third paragraph, what does “grain” mean in “reading against the grain of a document”?", evidence: findEvidence(paragraphs, "reading against the grain of a document still requires reading the document closely"), options: [
      option("o1", "The usual direction of meaning", true, null, "'Grain' burada odun lifi gibi bir akış yönüdür: belgenin alışılmış yorum doğrultusu; tersinden okumak buna karşı okumaktır."),
      option("o2", "A small trace of surviving proof", false, "context", "'A grain of truth' gibi 'zerre' anlamıdır; bağlamda 'against' ile uyumsuzdur."),
      option("o3", "Its finest details of wording", false, "context", "Yakın okuma sonraki yarıda geçer ama 'grain' ayrıntı demek değildir; 'against' ayrıntıya karşı okumayı anlatmaz."),
      option("o4", "The physical texture of its paper", false, "context", "Gerçek anlam olan doku, bir belgenin okunuş biçimi için kullanılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author suggest about the silence surrounding the Haitian Revolution?", evidence: findEvidence(paragraphs, "It could already lie in the documents themselves, written into the vocabulary of the people producing them."), options: [
      option("o1", "It arose from the observers' own categories", true, null, "Sessizlik, dönemin gözlemcilerinin kategorilerinden ve söz dağarcığından doğmuştu."),
      option("o2", "Later historians deliberately deleted the records", false, "reverse", "Metin sessizliğin yalnızca sonradan dayatılmadığını söyler."),
      option("o3", "No documents about it were ever produced", false, "extreme", "Belgeler vardı; sessizlik onların içindeydi."),
      option("o4", "It was well understood but deliberately hidden", false, "notstated", "Metin olayın düşünülemez bulunduğunu, yani anlaşılmadığını söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Michel-Rolph Trouillot Haitili bir antropologdur ve 1995'te Silencing the Past: Power and the Production of History kitabını yayımlamıştır.", source: trouillot, checkedOn: "2026-11-23" },
    { claim: "Trouillot'ya göre sessizlikler tarihe birkaç ayrı anda girer; bunlar arasında kaynakların yaratılması ve arşivlerin oluşturulması vardır; kitabın merkezi örneği, dönemin Batılı gözlemcilerinin mevcut kategoriler içinde tasavvur etmekte zorlandığı Haiti Devrimi'dir.", source: silencing, checkedOn: "2026-11-23" },
  ] },
};
