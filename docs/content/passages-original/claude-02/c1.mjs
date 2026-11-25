import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["When{-dığında} a{bir} lending{borç verme} algorithm{algoritma} rejects{reddeder} an{bir} application{başvuru}, the{belirli tanımlık} applicant{başvuran} rarely{nadiren} wants{ister} a{bir} lecture{ders, nutuk} on{üzerine} mathematics{matematik}.", "Bir borç verme algoritması bir başvuruyu reddettiğinde, başvuran kişi nadiren matematik üzerine bir nutuk ister."],
    ["What{ne} they{onlar} want{ister} is{-dır} a{bir} reason{gerekçe} they{onlar} can{-ebilir} understand{anlamak}, challenge{itiraz etmek} and{ve}, if{eğer} necessary{gerekirse}, correct{düzeltmek}.", "İstedikleri, anlayabilecekleri, itiraz edebilecekleri ve gerekirse düzeltebilecekleri bir gerekçedir."],
    ["That{o} ordinary{olağan} demand{talep} has{-miştir} turned{çevirdi} the{belirli tanımlık} explanation{açıklama} of{-nin} machine{makine} decisions{kararlar} into{-e dönüştürmek} a{bir} serious{ciddi} research{araştırma} field{alan}, and{ve} a{bir} surprisingly{şaşırtıcı biçimde} slippery{kaygan, kavranması zor} one{olan}.", "Bu olağan talep, makine kararlarının açıklanmasını ciddi bir araştırma alanına ve şaşırtıcı biçimde kavranması zor bir alana dönüştürdü."],
  ],
  [
    ["In{-de} two{iki} thousand{bin} twenty{yirmi} one{bir}, the{belirli tanımlık} United{Birleşik} States{Devletler} National{Ulusal} Institute{Enstitü} of{-nin} Standards{Standartlar} and{ve} Technology{Teknoloji} published{yayımladı} four{dört} principles{ilkeler} that{ki} any{herhangi bir} explainable{açıklanabilir} system{sistem} should{-meli} respect{uymak (ilkelere)}.", "2021'de Amerika Birleşik Devletleri Ulusal Standartlar ve Teknoloji Enstitüsü, açıklanabilir her sistemin uyması gereken dört ilke yayımladı."],
    ["The{belirli tanımlık} first{ilk} is{-dır} that{ki} a{bir} system{sistem} should{-meli} supply{sağlamak} evidence{kanıt} or{ya da} reasons{gerekçeler} for{için} its{onun} outputs{çıktılar}.", "İlki, bir sistemin çıktıları için kanıt ya da gerekçe sunması gerektiğidir."],
    ["The{belirli tanımlık} second{ikinci} is{-dır} that{ki} those{o} explanations{açıklamalar} should{-meli} be{olmak} meaningful{anlamlı}, which{ki bu} means{demektir} that{ki} the{belirli tanımlık} intended{hedeflenen} recipient{alıcı}, whether{ister} an{bir} expert{uzman} or{ya da} a{bir} customer{müşteri}, can{-ebilir} actually{gerçekten} understand{anlamak} them{onları}.", "İkincisi, bu açıklamaların anlamlı olması, yani hedeflenen alıcının, ister uzman ister müşteri olsun, onları gerçekten anlayabilmesidir."],
    ["The{belirli tanımlık} third{üçüncü} concerns{ilgilendirir} accuracy{doğruluk}: an{bir} explanation{açıklama} must{-malı} correctly{doğru biçimde} reflect{yansıtmak} how{nasıl} the{belirli tanımlık} system{sistem} produced{üretti} its{onun} result{sonuç}, rather{yerine (rather than)} than{yerine (rather than)} offering{sunmak} a{bir} comforting{teselli edici} story{hikâye}.", "Üçüncüsü doğrulukla ilgilidir: bir açıklama, teselli edici bir hikâye sunmak yerine sistemin sonucunu nasıl ürettiğini doğru biçimde yansıtmalıdır."],
    ["The{belirli tanımlık} fourth{dördüncü} is{-dır} that{ki} a{bir} system{sistem} should{-meli} recognise{fark etmek} its{onun} knowledge{bilgi} limits{sınırlar} and{ve} operate{çalışmak} only{yalnızca} under{altında} the{belirli tanımlık} conditions{koşullar} it{o} was{idi} designed{tasarlandı} for{için}, and{ve} only{yalnızca} when{-dığında} it{o} is{-dır} sufficiently{yeterince} confident{emin}.", "Dördüncüsü, bir sistemin bilgi sınırlarını fark etmesi ve yalnızca tasarlandığı koşullarda ve yalnızca yeterince emin olduğunda çalışmasıdır."],
  ],
  [
    ["The{belirli tanımlık} principles{ilkeler} are{-dır} modest{mütevazı}, yet{yine de} they{onlar} expose{açığa çıkarmak} a{bir} tension{gerilim}.", "İlkeler mütevazı ama bir gerilimi açığa çıkarıyor."],
    ["An{bir} explanation{açıklama} that{ki} is{-dır} easy{kolay} to{-mek} grasp{kavramak} is{-dır} often{sık sık} a{bir} simplification{basitleştirme}, and{ve} a{bir} simplification{basitleştirme} may{-ebilir} sacrifice{feda etmek} accuracy{doğruluk}.", "Kolay kavranan bir açıklama çoğu zaman bir basitleştirmedir ve basitleştirme doğruluktan taviz verebilir."],
    ["Conversely{tersine}, a{bir} perfectly{mükemmel biçimde} faithful{sadık} account{anlatım} of{-nin} millions{milyonlarca} of{-nin} calculations{hesaplamalar} may{-ebilir} be{olmak} technically{teknik olarak} correct{doğru} but{ama} meaningless{anlamsız} to{-e} the{belirli tanımlık} person{kişi} affected{etkilenen}.", "Tersine, milyonlarca hesaplamanın mükemmel biçimde sadık bir anlatımı teknik olarak doğru ama etkilenen kişi için anlamsız olabilir."],
    ["Designers{tasarımcılar} must{-malı} therefore{bu nedenle} decide{karar vermek} whom{kimi} an{bir} explanation{açıklama} is{-dır} for{için} before{önce} they{onlar} decide{karar vermek} what{ne} it{o} should{-meli} say{söylemek}.", "Bu nedenle tasarımcılar, bir açıklamanın ne söylemesi gerektiğine karar vermeden önce kimin için olduğuna karar vermelidir."],
  ],
  [
    ["The{belirli tanımlık} report{rapor} also{ayrıca} holds{değerlendirmek (hold up to)} human{insan} explanations{açıklamalar} up{değerlendirmek (hold up to)} to{değerlendirmek (hold up to)} the{belirli tanımlık} same{aynı} four{dört} principles{ilkeler} as{olarak} a{bir} baseline{temel ölçüt}, which{ki bu} is{-dır} a{bir} useful{yararlı} reminder{hatırlatma} that{ki} people{insanlar} are{-dır} not{değil} always{her zaman} accurate{doğru} narrators{anlatıcılar} of{-nin} their{onların} own{kendi} reasoning{akıl yürütme}.", "Rapor, insan açıklamalarını da temel ölçüt olarak aynı dört ilkeye göre tartar; bu, insanların kendi akıl yürütmelerinin her zaman doğru anlatıcıları olmadığının yararlı bir hatırlatmasıdır."],
    ["If{eğer} so{öyleyse}, the{belirli tanımlık} goal{hedef} may{-ebilir} not{değil} be{olmak} to{-mek} build{inşa etmek} machines{makineler} that{ki} explain{açıklamak} perfectly{mükemmel biçimde}, but{ama} to{-mek} build{inşa etmek} ones{olanlar} whose{kimin} explanations{açıklamalar} we{biz} can{-ebilir} fairly{adil biçimde} test{sınamak}.", "Öyleyse hedef, kusursuz açıklayan makineler kurmak değil, açıklamalarını adil biçimde sınayabileceğimiz makineler kurmak olabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-ai-explanations-that-hold-up", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nist = "NIST (ABD Ulusal Standartlar ve Teknoloji Enstitüsü), NISTIR 8312, Four Principles of Explainable Artificial Intelligence, 2021 (P. Jonathon Phillips ve diğerleri); https://nvlpubs.nist.gov/nistpubs/ir/2021/NIST.IR.8312.pdf";

export default {
  slug: "c1-ai-explanations-that-hold-up", level: "C1", title: "Explanations That Hold Up", topic: "Yapay zeka", sortOrder: 11, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best summarises the passage?", evidence: findEvidence(paragraphs, "An explanation that is easy to grasp is often a simplification, and a simplification may sacrifice accuracy."), options: [
      option("o1", "Good explanations of machine decisions must balance clarity and accuracy.", true, null, "Metin anlaşılırlık ile doğruluk arasındaki gerilimi ve dengeyi anlatır."),
      option("o2", "Explaining machine decisions is a problem that researchers have largely solved.", false, "reverse", "Alan 'kaygan' olarak anılır; çözülmüş değildir."),
      option("o3", "Human explanations are always more reliable than those of machines.", false, "extreme", "Metin insanların da her zaman doğru anlatıcı olmadığını söyler."),
      option("o4", "Companies should avoid using algorithms to make decisions at all.", false, "extreme", "Metin algoritmayı yasaklamaz; açıklamanın niteliğini tartışır."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the principle of knowledge limits require?", evidence: findEvidence(paragraphs, "a system should recognise its knowledge limits and operate only under the conditions it was designed for, and only when it is sufficiently confident"), options: [
      option("o1", "That it acts within its design and confidence", true, null, "Metin sistemin yalnızca tasarlandığı koşullarda VE yalnızca yeterince emin olduğunda çalışması gerektiğini söyler; iki şart birlikte aranır."),
      option("o2", "That it explains every calculation it performs in full detail", false, "copy", "Her hesaplamanın anlatılması bu ilkeyle ilgili değildir; metin bunu anlamsız bulur."),
      option("o3", "That it refuses to answer whenever a customer asks a question", false, "notstated", "Müşteri sorularını reddetmek anlatılmaz."),
      option("o4", "That it keeps its reasoning private to protect trade secrets", false, "reverse", "İlk ilke sistemin gerekçe sunmasını ister."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “slippery” mean in the first paragraph?", evidence: ev(0, "a serious research field, and a surprisingly slippery one"), options: [
      option("o1", "Dangerous for the public", false, "context", "Metin alanı tehlikeli değil, kavraması zor olarak niteler."),
      option("o2", "Covered with water", false, "sound", "Sözcüğün gerçek anlamıdır; burada mecaz kullanılmıştır."),
      option("o3", "Difficult to handle", true, null, "Slippery burada tutması, tam olarak kavraması zor demektir."),
      option("o4", "Moving very quickly", false, "notstated", "Alanın hızından söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the last paragraph suggest?", evidence: ev(3, "people are not always accurate narrators of their own reasoning"), options: [
      option("o1", "Machines already explain themselves better than people.", false, "extreme", "Metin böyle bir karşılaştırma sonucu vermez."),
      option("o2", "Testing explanations is unnecessary for human beings.", false, "notstated", "Metinde insanlar için sınama gereksiz sayılmaz."),
      option("o3", "Researchers want machines to copy human mistakes.", false, "reverse", "Amaç hataları kopyalamak değil, açıklamaları adil biçimde sınamaktır."),
      option("o4", "People can be unreliable explainers too.", true, null, "Metin insanların kendi akıl yürütmelerinin her zaman doğru anlatıcısı olmadığını söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "NIST'in açıklanabilir yapay zeka raporu (NISTIR 8312, 2021) dört ilke tanımlar: açıklama (explanation), anlamlılık (meaningful), açıklama doğruluğu (explanation accuracy) ve bilgi sınırları (knowledge limits: sistem yalnızca tasarlandığı koşullarda ve yalnızca çıktısında yeterli güvene ulaştığında çalışmalıdır).", source: nist, checkedOn: "2026-11-23" },
    { claim: "Rapor, insanların verdiği açıklamaları aynı dört ilkeye göre temel ölçüt olarak değerlendirir.", source: nist, checkedOn: "2026-11-23" },
  ] },
};
