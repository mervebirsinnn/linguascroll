import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["An{} algorithm{algoritma} is{} often{sıklıkla} imagined{hayal edilmek} as{} a{} neutral{tarafsız} referee{hakem}, free{arınmış (free of)} of{-den (free of)} the{} prejudices{önyargılar} that{ki} cloud{bulandırmak} human{insan} judgement{yargı}.", "Bir algoritma sıklıkla insan yargısını bulandıran önyargılardan arınmış, tarafsız bir hakem olarak hayal edilir."],
    ["The{} difficulty{zorluk} is{} that{-dığı} most{çoğu} modern{modern} systems{sistemler} learn{öğrenmek} from{-den} historical{tarihsel} data{veri}, and{} history{tarih} is{} not{} neutral{tarafsız}.", "Sorun, çoğu modern sistemin tarihsel verilerden öğrenmesi ve tarihin tarafsız olmamasıdır."],
    ["If{} past{geçmiş} decisions{kararlar} reflected{yansıtmak} unequal{eşitsiz} treatment{muamele}, a{} model{model} trained{eğitilmiş} to{-mek için} reproduce{yeniden üretmek} those{o} decisions{kararlar} can{-ebilir} absorb{içselleştirmek, emmek} the{} pattern{örüntü} and{} apply{uygulamak} it{} with{} mechanical{mekanik} consistency{tutarlılık}, at{} a{} scale{ölçek} no{hiçbir} individual{bireysel} official{yetkili} could{-ebilirdi} match{denk gelmek, yetişmek}.", "Geçmiş kararlar eşitsiz muameleyi yansıtıyorsa, bu kararları yeniden üretmek için eğitilmiş bir model örüntüyü içselleştirip onu hiçbir bireysel yetkilinin yetişemeyeceği bir ölçekte, mekanik bir tutarlılıkla uygulayabilir."],
  ],
  [
    ["The{} problem{sorun} is{} rarely{nadiren} announced{duyurulmak} by{tarafından} an{} explicitly{açıkça} prejudiced{önyargılı} rule{kural}.", "Sorun nadiren açıkça önyargılı bir kuralla kendini belli eder."],
    ["More{daha} often{sıklıkla} it{} enters{girmek} through{aracılığıyla} a{} proxy{vekil değişken}, a{} variable{değişken} that{ki} seems{görünmek} innocent{masum} but{} is{} correlated{ilişkili} with{} something{bir şey} else{başka}.", "Daha sık olarak, masum görünen ama başka bir şeyle ilişkili olan bir değişken, yani bir vekil aracılığıyla girer."],
    ["A{} widely{yaygın olarak} cited{alıntılanan} study{çalışma} published{yayımlanmış} in{} Science{Science (dergi)} in{} 2019 examined{incelemek} an{} algorithm{algoritma} used{kullanılan} in{} US{ABD} health{sağlık} care{hizmet (health care: sağlık hizmeti)} to{-mek için} identify{belirlemek} patients{hastalar} who{ki onlar} needed{ihtiyaç duymak} extra{ek} care{bakım}.", "Science dergisinde 2019'da yayımlanan ve sıkça alıntılanan bir çalışma, ABD sağlık hizmetlerinde ek bakıma ihtiyaç duyan hastaları belirlemek için kullanılan bir algoritmayı inceledi."],
    ["Because{çünkü} it{} predicted{tahmin etmek} future{gelecek} health{sağlık} spending{harcama} rather{yerine (rather than)} than{yerine (rather than)} illness{hastalık} itself{kendisi}, and{} because{çünkü} less{daha az} money{para} had{} historically{tarihsel olarak} been{} spent{harcanmak} on{-e} Black{siyahi} patients{hastalar} with{} the{} same{aynı} level{düzey} of{} need{ihtiyaç}, it{} underestimated{olduğundan az tahmin etmek} how{ne kadar} sick{hasta} those{o} patients{hastalar} were{}.", "Hastalığın kendisi yerine gelecekteki sağlık harcamasını tahmin ettiği ve aynı ihtiyaç düzeyindeki siyahi hastalara tarihsel olarak daha az para harcandığı için, bu hastaların ne kadar hasta olduğunu olduğundan az tahmin ediyordu."],
    ["When{-dığında} the{} researchers{araştırmacılar} reworked{yeniden düzenlemek} the{} target{hedef}, the{} disparity{eşitsizlik} fell{düşmek} substantially{önemli ölçüde}.", "Araştırmacılar hedef değişkeni yeniden düzenlediğinde eşitsizlik önemli ölçüde azaldı."],
  ],
  [
    ["Measurement{ölçüm} can{-ebilir} expose{ortaya çıkarmak} such{böyle} failures{başarısızlıklar}.", "Ölçüm bu tür başarısızlıkları ortaya çıkarabilir."],
    ["A{} 2018 audit{denetim} of{} commercial{ticari} facial{yüz}-analysis{analiz} tools{araçlar} found{bulmak} that{-dığını} they{} classified{sınıflandırmak} the{} gender{cinsiyet} of{} darker{daha koyu}-skinned{tenli} women{kadınlar} far{çok} less{daha az} accurately{doğru biçimde} than{-den} that{-ninki (that of)} of{-ninki (that of)} lighter{daha açık}-skinned{tenli} men{erkekler}, and{} a{} 2019 evaluation{değerlendirme} by{tarafından} the{} US{ABD} National{ulusal} Institute{enstitü} of{} Standards{standartlar} and{} Technology{teknoloji} reported{bildirmek} demographic{demografik} differences{farklar} in{} many{birçok} face{yüz} recognition{tanıma} algorithms{algoritmalar}, while{-irken} noting{belirtmek} that{-dığını} their{} size{büyüklük} varied{değişmek} considerably{önemli ölçüde} from{-den} one{bir} system{sistem} to{-e} another{diğeri}.", "Ticari yüz analizi araçlarına yönelik 2018 tarihli bir denetim, bu araçların koyu tenli kadınların cinsiyetini açık tenli erkeklerinkinden çok daha az doğru sınıflandırdığını buldu; ABD Ulusal Standartlar ve Teknoloji Enstitüsü'nün 2019 tarihli bir değerlendirmesi de birçok yüz tanıma algoritmasında demografik farklar bildirirken bunların büyüklüğünün sistemden sisteme önemli ölçüde değiştiğini belirtti."],
  ],
  [
    ["Correcting{düzeltmek} bias{önyargı}, however{ancak}, is{} not{} simply{yalnızca} a{} matter{mesele} of{} better{daha iyi} engineering{mühendislik}.", "Ancak önyargıyı düzeltmek yalnızca daha iyi mühendislik meselesi değildir."],
    ["Researchers{araştırmacılar} have{} shown{göstermek} that{-dığını} several{birkaç} intuitive{sezgisel} definitions{tanımlar} of{} fairness{hakkaniyet, adalet} cannot{-amaz}, in{} general{genel olarak}, be{} satisfied{karşılanmak} at{} the{} same{aynı} time{zaman} when{-dığında} groups{gruplar} differ{farklılaşmak} in{} their{} underlying{temeldeki} rates{oranlar} of{} the{} outcome{sonuç} being{olmakta olan} predicted{tahmin edilmek}.", "Araştırmacılar, gruplar tahmin edilen sonucun temel oranlarında farklılaştığında, birkaç sezgisel adalet tanımının genel olarak aynı anda karşılanamayacağını gösterdi."],
    ["Choosing{seçmek} among{arasından} them{} is{} therefore{bu nedenle} a{} question{soru} of{} values{değerler} as{} well{kadar (as well as)} as{} of{} technique{teknik}, and{} it{} is{} one{bir tane} that{ki} the{} people{insanlar} affected{etkilenen} arguably{savunulabilir biçimde} have{sahip olmak} a{} right{hak} to{-meye} help{yardım etmek} answer{yanıtlamak}.", "Bu nedenle bunlar arasında seçim yapmak teknik kadar bir değerler meselesidir ve savunulabilir biçimde, etkilenen insanların yanıtlanmasına katkıda bulunma hakkına sahip olduğu bir sorudur."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-algorithmic-bias", rows);
const obermeyer = "Obermeyer Z, Powers B, Vogeli C, Mullainathan S (2019), Dissecting racial bias in an algorithm used to manage the health of populations, Science 366(6464): 447-453; https://doi.org/10.1126/science.aax2342";
const gender = "Buolamwini J, Gebru T (2018), Gender Shades: Intersectional Accuracy Disparities in Commercial Gender Classification, Proceedings of Machine Learning Research 81; https://proceedings.mlr.press/v81/buolamwini18a.html";
const nist = "NIST, NIST Study Evaluates Effects of Race, Age, Sex on Face Recognition Software (Aralık 2019); https://www.nist.gov/news-events/news/2019/12/nist-study-evaluates-effects-race-age-sex-face-recognition-software";
const kleinberg = "Kleinberg J, Mullainathan S, Raghavan M (2016), Inherent Trade-Offs in the Fair Determination of Risk Scores; https://arxiv.org/abs/1609.05807";

export default {
  slug: "c1-algorithmic-bias", level: "C1", title: "When Data Inherits the Past", topic: "Yapay Zekâ", sortOrder: 38, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main point of the passage?", evidence: findEvidence(paragraphs, "Choosing among them is therefore a question of values as well as of technique"), options: [
      option("o1", "Algorithms may inherit bias, and fixing it involves values", true, null, "Metin önyargının tarihsel veriden miras alındığını ve düzeltmenin teknik kadar değer seçimi gerektirdiğini savunur."),
      option("o2", "Algorithms are more biased than human officials are", false, "reverse", "Metin algoritmaların ölçek ve tutarlılığını vurgular; insanlardan daha önyargılı olduklarını söylemez."),
      option("o3", "Bias in algorithms comes from openly prejudiced rules", false, "reverse", "Metne göre sorun nadiren açıkça önyargılı bir kuraldan gelir; çoğunlukla vekil değişkenlerden girer."),
      option("o4", "Better engineering will soon remove bias from software entirely", false, "extreme", "Yazar önyargıyı düzeltmenin yalnızca daha iyi mühendislik meselesi olmadığını söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, why did the hospital algorithm underestimate some patients' needs?", evidence: findEvidence(paragraphs, "Because it predicted future health spending rather than illness itself"), options: [
      option("o1", "It used past spending as a stand-in for illness", true, null, "Algoritma hastalığın yerine sağlık harcamasını tahmin ediyordu; siyahi hastalara tarihsel olarak daha az harcandığı için ihtiyaçları düşük görünüyordu."),
      option("o2", "It was programmed to treat Black patients differently", false, "reverse", "Metin sorunun açık bir kuraldan değil, masum görünen bir vekil değişkenden geldiğini anlatır."),
      option("o3", "It relied on doctors' notes that contained prejudice", false, "notstated", "Doktor notlarından söz edilmez."),
      option("o4", "It predicted illness, but too little money was available", false, "reverse", "Algoritma hastalığı değil harcamayı tahmin ediyordu; para yetersizliği bir bütçe sorunu olarak anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "cloud" mean in the first paragraph?', evidence: findEvidence(paragraphs, "free of the prejudices that cloud human judgement"), options: [
      option("o1", "Make less clear", true, null, "Burada fiil olarak kullanılan cloud, yargıyı bulandırmak, berraklığını bozmak anlamındadır."),
      option("o2", "Gather above", false, "context", "İsim olarak 'bulut' anlamı bağlama uymaz; önyargılar yargıyı etkiler."),
      option("o3", "Store online", false, "context", "Bilişimdeki 'bulut' anlamı bu cümlede geçerli değildir."),
      option("o4", "Make more confident", false, "context", "Önyargıların yargıyı güçlendirdiği değil, bulandırdığı söylenir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred from the final paragraph?", evidence: findEvidence(paragraphs, "it is one that the people affected arguably have a right to help answer"), options: [
      option("o1", "Fairness choices should not be left to engineers alone", true, null, "Seçim bir değer meselesidir ve etkilenen insanların da yanıta katkı hakkı olduğu ileri sürülür; bu, kararın yalnız teknik uzmanlara bırakılmaması gerektiğini ima eder."),
      option("o2", "A perfectly fair algorithm is simple to build", false, "reverse", "Adalet tanımlarının aynı anda karşılanamayabileceği söylenir; bu kolaylık iddiasının tersidir."),
      option("o3", "Values matter less than technique in fixing bias", false, "reverse", "Metin değerlerin teknik kadar önemli olduğunu söyler."),
      option("o4", "Engineers have already settled which definition is correct", false, "notstated", "Hangi tanımın doğru olduğunun belirlendiği söylenmez; tam tersine seçim açık bırakılır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Science'ta 2019'da yayımlanan çalışma, ABD sağlık sisteminde yaygın kullanılan bir algoritmanın ihtiyaç yerine sağlık harcamasını tahmin ettiği için siyahi hastaların hastalık düzeyini olduğundan düşük gösterdiğini; hedef değişken değiştirildiğinde eşitsizliğin önemli ölçüde azaldığını buldu.", source: obermeyer, checkedOn: "2026-11-23" },
    { claim: "2018 Gender Shades denetimi, ticari cinsiyet sınıflandırma sistemlerinin koyu tenli kadınlarda açık tenli erkeklere göre çok daha yüksek hata oranına sahip olduğunu buldu.", source: gender, checkedOn: "2026-11-23" },
    { claim: "NIST'in 2019 değerlendirmesi, incelenen yüz tanıma algoritmalarının çoğunda demografik farklar bulduğunu ve bu farkların algoritmadan algoritmaya büyük ölçüde değiştiğini bildirdi.", source: nist, checkedOn: "2026-11-23" },
    { claim: "Gruplar arasında temel oranlar farklı olduğunda birkaç sezgisel adalet ölçütü genel olarak aynı anda karşılanamaz.", source: kleinberg, checkedOn: "2026-11-23" },
  ] },
};
