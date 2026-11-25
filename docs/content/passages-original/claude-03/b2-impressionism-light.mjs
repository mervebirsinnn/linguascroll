import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Impressionism{İzlenimcilik} began{başladı} in{} Paris{Paris} in{} the{} nineteenth{on dokuzuncu} century{yüzyıl}, when{-dığında} a{} group{grup} of{} painters{ressamlar} decided{karar verdi} to{-mek} leave{terk etmek} the{} studio{atölye} and{} work{çalışmak} outdoors{açık havada}.", "İzlenimcilik on dokuzuncu yüzyılda Paris'te, bir grup ressamın atölyeyi bırakıp açık havada çalışmaya karar vermesiyle başladı."],
    ["Instead{yerine} of{(instead of: yerine)} slowly{yavaşça} polishing{cilalamak} a{} scene{sahne} in{} the{} studio{atölye}, they{} tried{denedi} to{-mek} capture{yakalamak} the{} changing{değişen} light{ışık} of{} a{} single{tek} moment{an}.", "Atölyede bir sahneyi yavaş yavaş cilalamak yerine, tek bir anın değişen ışığını yakalamaya çalıştılar."],
    ["Their{} brushstrokes{fırça darbeleri} were{} quick{hızlı} and{} visible{görünür}, and{} their{} colours{renkler} often{sık sık} looked{görünüyordu} bright{parlak} and{} fresh{taze}.", "Fırça darbeleri hızlı ve görünürdü; renkleri sık sık parlak ve taze görünürdü."],
    ["A{} reviewer{eleştirmen} of{} their{} first{ilk} exhibition{sergi} even{hatta} described{nitelendirdi} the{} painters{ressamlar} as{} lunatics{deliler}.", "İlk sergilerini değerlendiren bir eleştirmen, ressamları hatta deli olarak nitelendirdi."],
  ],
  [
    ["Practical{pratik} inventions{icatlar} made{yaptı (made possible: mümkün kıldı)} this{} new{yeni} way{yol} of{} working{çalışma} possible{mümkün}.", "Pratik icatlar bu yeni çalışma biçimini mümkün kıldı."],
    ["Ready{hazır}-made{yapılmış} paint{boya} sold{satılan} in{} tubes{tüpler} meant{demekti} that{ki} artists{sanatçılar} could{-ebilirdi} work{çalışmak} outdoors{açık havada}, and{} they{} could{-ebilirdi} also{ayrıca} work{çalışmak} much{çok} faster{daha hızlı}.", "Tüplerde satılan hazır boya, sanatçıların açık havada çalışabilmesi demekti ve onlar ayrıca çok daha hızlı çalışabilirdi."],
    ["Landscapes{manzaralar} and{} scenes{sahneler} of{} modern{modern} city{şehir} life{yaşam}, painted{boyanmış} in{} bright{parlak}, pure{saf} colours{renkler}, became{oldu} typical{tipik}.", "Parlak, saf renklerle boyanmış manzaralar ve modern şehir hayatı sahneleri tipik hale geldi."],
    ["Speed{hız} mattered{önemliydi}, because{çünkü} the{} light{ışık} outdoors{açık havada} changes{değişir} quickly{hızla}.", "Hız önemliydi, çünkü açık havadaki ışık hızla değişir."],
  ],
  [
    ["The{} name{ad} of{} the{} movement{akım} came{geldi} from{-den} the{} title{başlık} of{} a{} painting{tablo} by{tarafından} Claude{Claude} Monet{Monet}, which{ki o} was{} shown{gösterilmişti} in{} 1874.", "Akımın adı, 1874'te gösterilen Claude Monet'nin bir tablosunun başlığından geldi."],
    ["After{-den sonra} an{} exhibition{sergi} in{} 1874, the{} word{sözcük} Impressionist{İzlenimci} was{} first{ilk} used{kullanıldı} as{} an{} insult{hakaret} against{karşı} the{} whole{bütün} group{grup}.", "1874'teki bir sergiden sonra 'İzlenimci' sözcüğü ilk kez bütün gruba karşı bir hakaret olarak kullanıldı."],
    ["Over{-boyunca} time{zaman}, the{} painters{ressamlar} became{oldu} known{tanınan} by{tarafından} that{o} name{ad}.", "Zamanla ressamlar bu adla tanındı."],
    ["Their{} search{arayış} for{} light{ışık} and{} the{} passing{geçip giden} moment{an} still{hâlâ} shows{görünür} in{} their{} work{eser}.", "Işık ve geçip giden an arayışları eserlerinde hâlâ görülür."],
    ["Today{bugün}, their{} paintings{tablolar} are{} widely{geniş çapta} admired{hayranlıkla izlenen}.", "Bugün tabloları geniş çapta hayranlıkla izleniyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-impressionism-light", rows);
const ev = (t) => findEvidence(paragraphs, t);
const ng = "The National Gallery, London, Guide to Impressionism; https://nationalgallery.org.uk/paintings/learn-about-art/guide-to-impressionism";
const ngGlossary = "The National Gallery, London, Glossary: Impressionism; https://www.nationalgallery.org.uk/paintings/glossary/impressionism";

export default {
  slug: "b2-impressionism-light", level: "B2", title: "Painting the Moment", topic: "Sanat", sortOrder: 34, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("they tried to capture the changing light of a single moment"), options: [
      option("o1", "A hidden technique that erased every brushstroke", false, "reverse", "Metne göre fırça darbeleri hızlı ve görünürdü; silinmiyordu."),
      option("o2", "Painters who left the studio to capture light", true, null, "Metin, ressamların atölyeden çıkıp ışığı ve anı yakalamaya çalışmasını ve bunu mümkün kılan etkenleri anlatır."),
      option("o3", "The long history of portable camera design", false, "notstated", "Metinde kamera tasarımından söz edilmez."),
      option("o4", "Critics who refused to visit any museum", false, "extreme", "Metin yalnızca bir eleştirmenin sert sözünden ve hakaret olarak kullanılan bir sözcükten bahseder; bu abartılı bir genellemedir."),
    ] },
    { key: "q2", type: "detail", prompt: "Which invention helped artists work outdoors?", evidence: ev("Ready-made paint sold in tubes meant that artists could work outdoors"), options: [
      option("o1", "A new type of camera used outdoors", false, "notstated", "Metinde kameradan söz edilmez."),
      option("o2", "Heavy glass bottles of liquid paint", false, "detail", "Metin cam şişelerden değil, metal tüplerden söz eder."),
      option("o3", "Ready-made paint sold in tubes", true, null, "Metin, tüplerde satılan hazır boyanın sanatçıların açık havada çalışmasını sağladığını söyler."),
      option("o4", "Large studio lamps for night work", false, "context", "Metin gece çalışmasından değil, gün ışığında çalışmaktan söz eder."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does \"capture\" mean in paragraph 1?", evidence: ev("they tried to capture the changing light"), options: [
      option("o1", "Catch and put in prison", false, "context", "Capture'ın 'yakalayıp hapse atmak' anlamı vardır, ama burada ışıktan söz ediliyor; bağlama uymaz."),
      option("o2", "Ignore and forget about", false, "reverse", "Ressamlar ışığı görmezden gelmedi, tam tersine onu resmetmeye çalıştı."),
      option("o3", "Sell at a high price", false, "notstated", "Metinde satış fiyatından söz edilmez."),
      option("o4", "Record in a picture", true, null, "Burada capture, ışığı ve anı bir resimde kaydetmek anlamındadır."),
    ] },
    { key: "q4", type: "inference", prompt: 'What can be inferred about the people who first used the word "Impressionist"?', evidence: ev("the word Impressionist was first used as an insult against the whole group"), options: [
      option("o1", "They wanted to praise the group warmly", false, "reverse", "Hakaret etmek övmenin tersidir."),
      option("o2", "They did not respect the new style", true, null, "Sözcük hakaret olarak kullanıldı; bu, yeni üsluba saygı duymadıklarını gösterir."),
      option("o3", "They belonged to the painters' own group", false, "notstated", "Metin böyle bir şey söylemez; sözcük gruba karşı kullanıldı."),
      option("o4", "They felt every painter should give up", false, "extreme", "Metin böyle aşırı bir görüş belirtmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ressamlar atölye dışında, çoğu kez açık havada çalıştı; fırça darbeleri hızlı ve çoğunlukla görünürdü, değişen ışığın geçici niteliğini yakalamaya çalıştılar. 'İzlenimci' terimi 1874'te Paris'te açılan bir sergiye tepki olarak kullanıldı.", source: ng + "; " + ngGlossary, checkedOn: "2026-11-25" },
    { claim: "Manzaralar ve modern kent yaşamı sahneleri parlak, saf renklerle boyanmak tipikti; ilk sergiyi değerlendiren bir eleştirmen ressamları 'deli' diye niteledi.", source: ng, checkedOn: "2026-11-25" },
    { claim: "Tüplerde satılan hazır boya, sanatçıların atölye yerine açık havada çalışmasını ve çok daha hızlı çalışmasını sağladı.", source: ng, checkedOn: "2026-11-25" },
    { claim: "Terim Monet'nin 1874'te sergilenen bir tablosunun başlığından türedi ve ilk kez hakaret olarak kullanıldı; sergileyen ressamlar sonradan 'İzlenimciler' diye tanındı.", source: ngGlossary + "; " + ng, checkedOn: "2026-11-25" },
  ] },
};
