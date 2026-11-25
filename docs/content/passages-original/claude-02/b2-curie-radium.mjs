import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Marie{Marie} Curie{Curie} was{} born{doğdu} in{} Warsaw{Varşova} in{} eighteen{on sekiz} sixty{altmış} seven{yedi}, at{-de} a{} time{zaman} when{ki o zaman} women{kadınlar} could{-ebilirdi} not{değil} study{okumak} at{-de} the{} university{üniversite} there{orada}.", "Marie Curie 1867'de, kadınların orada üniversitede okuyamadığı bir dönemde Varşova'da doğdu."],
    ["She{} moved{taşındı} to{-e} Paris{Paris} to{-mek için} continue{sürdürmek} her{} education{eğitim}, and{} in{-de} eighteen{on sekiz} ninety{doksan} four{dört} she{} met{tanıştı} Pierre{Pierre} Curie{Curie}, a{} physicist{fizikçi} whose{kimin} laboratory{laboratuvar} she{} began{başladı} to{-mek} use{kullanmak}.", "Eğitimini sürdürmek için Paris'e taşındı ve 1894'te laboratuvarını kullanmaya başladığı fizikçi Pierre Curie ile tanıştı."],
    ["They{} married{evlendi} the{} following{sonraki} year{yıl} and{} began{başladı} working{çalışmak} side{yan} by{yana} side{yana}.", "Ertesi yıl evlendiler ve yan yana çalışmaya başladılar."],
    ["Her{onun} determination{kararlılık} to{-mek} learn{öğrenmek} shaped{şekillendirdi} everything{her şey} that{ki} followed{izledi}.", "Öğrenme kararlılığı, ardından gelen her şeyi şekillendirdi."],
  ],
  [
    ["The{} couple{çift} became{oldu} interested{ilgili} in{} the{} spontaneous{kendiliğinden} radiation{ışıma} that{ki} Henri{Henri} Becquerel{Becquerel} had{} discovered{keşfetmişti}.", "Çift, Henri Becquerel'in keşfettiği kendiliğinden ışımayla ilgilenmeye başladı."],
    ["Working{çalışarak} with{ile} a{} heavy{ağır} ore{cevher} called{denen} pitchblende{uranit}, they{} noticed{fark etti} that{ki} it{} was{} more{daha} radioactive{radyoaktif} than{-den} uranium{uranyum} alone{tek başına} could{-ebilirdi} explain{açıklamak}.", "Uranit adlı ağır bir cevherle çalışırken onun, uranyumun tek başına açıklayabileceğinden daha radyoaktif olduğunu fark ettiler."],
    ["They{} concluded{sonuca vardı} that{ki} it{} must{-meli} contain{içermek} other{başka} radioactive{radyoaktif} substances{maddeler}, and{} they{} eventually{sonunda} extracted{çıkarmak} two{iki} new{yeni} elements{elementler}: polonium{polonyum}, named{adlandırılan} after{-nin adına} her{} native{doğduğu} Poland{Polonya}, and{} radium{radyum}.", "Başka radyoaktif maddeler içermesi gerektiği sonucuna vardılar ve sonunda iki yeni element ayırdılar: kendi doğduğu Polonya'nın adını taşıyan polonyum ve radyum."],
    ["Their{onların} work{çalışma} was{} slow{yavaş} and{} physically{fiziksel olarak} demanding{zorlu}.", "Çalışmaları yavaş ve fiziksel olarak zorluydu."],
  ],
  [
    ["In{-de} nineteen{on dokuz} oh{sıfır} three{üç}, Marie{Marie} and{} Pierre{Pierre} shared{paylaştı} the{} Nobel{Nobel} Prize{Ödül} in{} Physics{Fizik} with{ile} Becquerel{Becquerel}.", "1903'te Marie ve Pierre, Nobel Fizik Ödülü'nü Becquerel ile paylaştı."],
    ["After{sonra} Pierre's{Pierre'in} death{ölüm} in{-de} nineteen{on dokuz} oh{sıfır} six{altı}, she{} took{devralmak (take over)} over{devralmak (take over)} his{} professorship{profesörlük}, and{} in{-de} nineteen{on dokuz} eleven{on bir} she{} received{aldı} the{} Nobel{Nobel} Prize{Ödül} in{} Chemistry{Kimya} on{kendi başına (on one's own kalıbı)} her{} own{kendi başına (on one's own kalıbı)}.", "Pierre 1906'da ölünce profesörlüğünü devraldı ve 1911'de Nobel Kimya Ödülü'nü tek başına aldı."],
    ["To{-e} this{bu} day{gün}, she{} remains{kalır} the{} only{tek} person{kişi} to{-mek} have{} won{kazanmak} Nobel{Nobel} Prizes{Ödüller} in{} two{iki} different{farklı} scientific{bilimsel} fields{alanlar}.", "Bugüne dek iki farklı bilim alanında Nobel Ödülü kazanan tek kişi olmaya devam ediyor."],
    ["Her{onun} life{hayat} shows{gösterir} how{nasıl} curiosity{merak} and{} persistence{azim} can{-ebilir} change{değiştirmek} science{bilim}.", "Hayatı, merak ve azmin bilimi nasıl değiştirebileceğini gösterir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-curie-radium", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobelP = "Nobel Prize Outreach, Marie Curie - Biographical / Physics 1903; https://www.nobelprize.org/prizes/physics/1903/marie-curie/biographical/";
const nobelC = "Nobel Prize Outreach, Marie Curie - Facts / Chemistry 1911; https://www.nobelprize.org/prizes/chemistry/1911/marie-curie/facts";

export default {
  slug: "b2-curie-radium", level: "B2", title: "The Scientist Who Won Twice", topic: "Önemli insanlar", sortOrder: 19, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "she remains the only person to have won Nobel Prizes in two different scientific fields"), options: [
      option("o1", "Marie Curie's work and discoveries", true, null, "Metin Curie'nin çalışmalarını ve keşiflerini anlatır."),
      option("o2", "The politics of awarding Nobel Prizes", false, "notstated", "Ödül siyaseti anlatılmaz."),
      option("o3", "How uranium was first mined in Poland", false, "notstated", "Madencilik anlatılmaz."),
      option("o4", "Pierre Curie's career as a lone physicist", false, "reverse", "Pierre tek başına değil, Marie ile çalışır."),
    ] },
    { key: "q2", type: "detail", prompt: "Why did the Curies think pitchblende contained other substances?", evidence: ev(1, "it was more radioactive than uranium alone could explain"), options: [
      option("o1", "More radioactive than uranium", true, null, "Metin bunu açıkça söyler."),
      option("o2", "It was much heavier than any known metal", false, "detail", "Ağır olduğu geçer ama gerekçe bu değildir."),
      option("o3", "It was found only in the city of Paris", false, "notstated", "Bulunduğu yer söylenmez."),
      option("o4", "It had a strong smell in the laboratory", false, "notstated", "Koku anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “extracted” mean in the second paragraph?", evidence: ev(1, "they eventually extracted two new elements"), options: [
      option("o1", "Separated and took out", true, null, "Extract, bir şeyi ayırıp çıkarmak demektir."),
      option("o2", "Wrote a long report about", false, "context", "Rapor yazmak değildir."),
      option("o3", "Added to a mixture of acids", false, "reverse", "Eklemenin tersidir."),
      option("o4", "Carried carefully to another city", false, "context", "Taşıma anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage suggest about Marie's career?", evidence: ev(2, "After Pierre's death in nineteen oh six, she took over his professorship"), options: [
      option("o1", "She continued important work after loss.", true, null, "Pierre ölünce çalışmayı sürdürdü, profesörlüğü devraldı."),
      option("o2", "She stopped research after her husband died.", false, "reverse", "Devam etti, ikinci ödülünü aldı."),
      option("o3", "She left science to teach at school.", false, "notstated", "Okul öğretmenliği anlatılmaz."),
      option("o4", "She won both prizes together with Pierre.", false, "detail", "Kimya ödülünü tek başına aldı."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Marie Curie 1867'de Varşova'da doğdu; Paris'e taşındı, 1894'te Pierre Curie ile tanıştı, ertesi yıl evlendiler.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "Curie'ler uranyumdan daha radyoaktif bir cevherden polonyum (Polonya'nın adını taşır) ve radyum elementlerini ayırdı.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "1903 Nobel Fizik Ödülü Marie, Pierre Curie ve Henri Becquerel arasında paylaşıldı; Pierre 1906'da öldü, Marie profesörlüğünü devraldı; 1911 Nobel Kimya Ödülü'nü tek başına aldı; iki farklı bilim alanında Nobel kazanan tek kişidir.", source: nobelC, checkedOn: "2026-11-23" },
  ] },
};
