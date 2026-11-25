import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Ada{Ada} Lovelace{Lovelace} was{} born{doğdu} in{} 1815.", "Ada Lovelace 1815'te doğdu."],
    ["Her{} father{baba} was{} the{} famous{ünlü} poet{şair} Lord{Lord} Byron{Byron}.", "Babası ünlü şair Lord Byron'dı."],
    ["Ada{Ada} studied{öğrendi} mathematics{matematik} and{} science{bilim}, and{} her{} mother{annesi} encouraged{teşvik etti} this{}.", "Ada matematik ve bilim öğrendi ve annesi bunu teşvik etti."],
  ],
  [
    ["As{} a{} young{genç} woman{kadın}, she{} met{tanıştı} Charles{Charles} Babbage{Babbage}, an{} inventor{mucit} and{} mathematician{matematikçi}.", "Genç bir kadınken bir mucit ve matematikçi olan Charles Babbage ile tanıştı."],
    ["Babbage{Babbage} planned{planladı} a{} large{büyük} machine{makine} called{adlı} the{} Analytical{Analitik} Engine{Makine}.", "Babbage, Analitik Makine adlı büyük bir makine planladı."],
    ["It{} was{} designed{tasarlandı} to{-mek için} follow{izlemek} instructions{talimatlar} and{} do{yapmak} many{birçok} kinds{türler} of{} calculations{hesaplamalar}.", "Talimatları izlemek ve birçok türde hesaplama yapmak için tasarlanmıştı."],
    ["Ada{Ada} wrote{yazdı} long{uzun} notes{notlar} about{hakkında} this{} machine{makine}.", "Ada bu makine hakkında uzun notlar yazdı."],
    ["In{} them{onlarda}, she{} explained{açıkladı} step{adım} by{-e} step{adım} how{nasıl} it{} could{-ebilirdi} work{hesaplamak} out{(work out) bulmak} a{} series{dizi} of{} special{özel} numbers{sayılar}.", "Bu notlarda makinenin özel bir sayı dizisini nasıl hesaplayabileceğini adım adım açıkladı."],
    ["Many{birçok} people{insanlar} call{adlandırmak} this{} the{} first{ilk} computer{bilgisayar} program{program}.", "Birçok insan buna ilk bilgisayar programı der."],
  ],
  [
    ["Ada{Ada} also{ayrıca} had{vardı} an{} idea{fikir} that{ki} was{} far{çok} ahead{ileride} of{} her{} time{zaman}.", "Ada'nın ayrıca zamanının çok ilerisinde bir fikri vardı."],
    ["She{} believed{inanıyordu} that{ki} such{böyle} a{} machine{makine} might{-ebilir} one{bir} day{gün} work{çalışmak} with{} music{müzik} and{} other{diğer} symbols{semboller}, not{} only{yalnızca} with{} numbers{sayılar}.", "Böyle bir makinenin bir gün yalnızca sayılarla değil, müzik ve başka sembollerle de çalışabileceğine inanıyordu."],
    ["Sadly{ne yazık ki}, the{} machine{makine} was{} never{asla} finished{tamamlandı}, and{} Ada{Ada} died{öldü} young{genç}.", "Ne yazık ki makine hiç tamamlanmadı ve Ada genç yaşta öldü."],
    ["Today{bugün}, people{insanlar} see{görmek} her{} as{} an{} early{erken} pioneer{öncü} of{} computing{bilişim}.", "Bugün insanlar onu bilişimin erken bir öncüsü olarak görür."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-ada-lovelace", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const natgeo = "National Geographic, This 'Countess of Computing' wrote the first computer program; https://www.nationalgeographic.com/history/history-magazine/article/this-countess-of-computing-wrote-the-first-computer-program";
const sciMuseum = "Science Museum Group, Women in computing; https://www.sciencemuseum.org.uk/objects-and-stories/women-computing";
const yale = "Yale University CS (TAP), Ada Lovelace - Notes; http://www.cs.yale.edu/homes/tap/Files/ada-lovelace-notes.html";

export default {
  slug: "b1-ada-lovelace", level: "B1", title: "The Woman Who Imagined Computers", topic: "Önemli insanlar", sortOrder: 37, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "Today, people see her as an early pioneer of computing."), options: [
      option("o1", "Ada Lovelace's early ideas about computers", true, null, "Metin Ada Lovelace'ın hayatını ve bilgisayarlarla ilgili erken fikirlerini anlatır."),
      option("o2", "How Babbage built and sold his big machine", false, "reverse", "Metin makinenin hiç tamamlanmadığını söyler."),
      option("o3", "Lord Byron's poems and his famous family life", false, "context", "Byron yalnızca Ada'nın babası olarak anılır."),
      option("o4", "Why maths was a hard subject in old London", false, "notstated", "Matematiğin zorluğu anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Ada explain in her notes?", evidence: ev(1, "she explained step by step how it could work out a series of special numbers"), options: [
      option("o1", "How the machine could find special numbers", true, null, "Notlarında makinenin özel bir sayı dizisini nasıl hesaplayabileceğini adım adım açıkladı."),
      option("o2", "How to build the machine with cheap parts", false, "notstated", "Ucuz parçalardan söz edilmez."),
      option("o3", "Why her father wrote poems about machines", false, "notstated", "Babasının makineler hakkında şiir yazdığı söylenmez."),
      option("o4", "How music was written by famous poets in London", false, "context", "Müzik, makinenin gelecekte çalışabileceği bir alan olarak geçer."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "pioneer" mean in the third paragraph?', evidence: ev(2, "an early pioneer of computing"), options: [
      option("o1", "One of the first people in a new field", true, null, "Pioneer, yeni bir alanda ilk adımları atan kişi, öncü demektir."),
      option("o2", "A person who builds big machines", false, "context", "Makineyi Ada değil Babbage planladı; kelime bunu anlatmaz."),
      option("o3", "A person who writes famous poems", false, "context", "Şiir babasıyla ilgilidir, bu kelimeyle değil."),
      option("o4", "A person who teaches music to young children", false, "context", "Öğretmenlik anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about Ada's ideas?", evidence: findEvidence(paragraphs, "Ada also had an idea that was far ahead of her time."), options: [
      option("o1", "Few people in her time thought like her.", true, null, "Fikri zamanının çok ilerisinde olduğuna göre, döneminde böyle düşünen pek az kişi vardı."),
      option("o2", "Her ideas were tested on a real machine.", false, "reverse", "Makine hiç tamamlanmadı, bu yüzden fikirleri gerçek bir makinede denenmedi."),
      option("o3", "She thought machines could not use music.", false, "reverse", "Makinenin bir gün müzikle çalışabileceğine inanıyordu."),
      option("o4", "Babbage disagreed with every idea she had about it.", false, "notstated", "Babbage'ın onunla anlaşmazlığı anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ada Lovelace 10 Aralık 1815'te doğdu; babası şair Lord Byron, annesi matematikçi Annabella Milbanke'ydi; annesi matematik eğitimini destekledi. (Doğum yeri kaynakta yok; metinden çıkarıldı.)", source: natgeo, checkedOn: "2026-11-25" },
    { claim: "Babbage ile tanıştı; Menabrea'nın Analitik Makine makalesini çevirdi, kendi notları çevirinin kendisinden uzundu; Not G Bernoulli sayıları dizisini nasıl üreteceğini anlatır ve yaygın olarak ilk bilgisayar programı sayılır.", source: natgeo, checkedOn: "2026-11-25" },
    { claim: "Notlar makinenin sayılar dışında sembol, harf ve müzik notalarını da işleyebileceğini öne sürer; Babbage tasarımı hiç tamamlamadı, yalnız deneme parçaları kaldı.", source: sciMuseum, checkedOn: "2026-11-25" },
    { claim: "Not G, motorun yalnızca emredildiği şeyi yapabileceğini ve Bernoulli sayıları için bir plan olduğunu belirtir.", source: yale, checkedOn: "2026-11-25" },
    { claim: "Ada 1852'de 36 yaşında öldü.", source: natgeo, checkedOn: "2026-11-25" },
  ] },
};
