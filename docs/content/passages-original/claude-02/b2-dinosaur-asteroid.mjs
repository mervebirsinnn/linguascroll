import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["About{yaklaşık} sixty{altmış}-six{altı} million{milyon} years{yıl} ago{önce}, the{} last{son} of{} the{} non{olmayan}-bird{kuş} dinosaurs{dinozorlar} disappeared{yok oldu} from{-den} Earth{Dünya}.", "Yaklaşık altmış altı milyon yıl önce kuş olmayan dinozorların sonuncusu Dünya'dan yok oldu."],
    ["For{için} decades{on yıllar}, scientists{bilim insanları} argued{tartıştı} about{hakkında} the{} cause{neden}, proposing{önermek} everything{her şey} from{-den} volcanic{volkanik} eruptions{patlamalar} to{-e} changes{değişimler} in{} climate{iklim}.", "Onlarca yıl boyunca bilim insanları, volkanik patlamalardan iklim değişimlerine kadar her şeyi önererek nedeni tartıştı."],
    ["The{} theory{teori} that{ki} has{} gained{kazandı} the{} most{en çok} support{destek} blames{suçlar} a{} huge{dev} asteroid{asteroit} that{ki} struck{çarptı} what{ne} is{} now{şimdi} the{} Yucatan{Yucatan} Peninsula{Yarımada} in{-de} Mexico{Meksika}.", "En çok destek kazanan teori, bugünkü Meksika'daki Yucatan Yarımadası'na çarpan dev bir asteroidi suçlar."],
  ],
  [
    ["The{} impact{çarpma} would{-ecekti} have{} thrown{fırlatmak} enormous{muazzam} amounts{miktarlar} of{} dust{toz} and{} debris{enkaz} into{içine} the{} atmosphere{atmosfer}.", "Çarpma, atmosfere muazzam miktarda toz ve enkaz fırlatmış olmalı."],
    ["Sunlight{güneş ışığı} would{-ecekti} have{} been{} blocked{engellenmiş}, plants{bitkiler} would{-ecekti} have{} struggled{zorlanmak}, and{} the{} food{yiyecek} chains{zincirler} that{ki} depended{bağlı} on{-e} them{onlar} would{-ecekti} have{} begun{başlamak} to{-mek} collapse{çökmek}.", "Güneş ışığı engellenmiş, bitkiler zorlanmış ve onlara bağlı besin zincirleri çökmeye başlamış olmalı."],
    ["The{} Natural{Doğal} History{Tarih} Museum{Müze} in{-de} London{Londra} points{dikkat çeker (point out)} out{dikkat çeker (point out)} that{ki} dinosaurs{dinozorlar} were{} already{zaten} living{yaşamak} in{} a{} changing{değişen} world{dünya}, since{çünkü} some{bazı} environmental{çevresel} changes{değişimler} had{} begun{başlamak} millions{milyonlarca} of{} years{yıl} earlier{daha önce}.", "Londra'daki Doğa Tarihi Müzesi, bazı çevresel değişimler milyonlarca yıl önce başladığı için dinozorların zaten değişen bir dünyada yaşadığına dikkat çeker."],
    ["In{-de} that{o} view{görüş}, the{} asteroid{asteroit} was{} the{} final{son} blow{darbe} rather{yerine (rather than)} than{yerine (rather than)} the{} only{tek} cause{neden}.", "Bu görüşe göre asteroit tek neden değil, son darbeydi."],
  ],
  [
    ["Not{değil} everything{her şey} died{öldü}, however{ancak}.", "Ancak her şey ölmedi."],
    ["Birds{kuşlar} are{} the{} living{yaşayan} descendants{torunlar} of{} one{bir} group{grup} of{} dinosaurs{dinozorlar}, and{} their{onların} ancestors{atalar} survived{hayatta kaldı} the{} catastrophe{felaket}.", "Kuşlar bir dinozor grubunun yaşayan torunlarıdır ve atalarının soyu felaketten sağ çıktı."],
    ["So{bu yüzden}, the{} extinction{yok oluş} was{} an{} ending{son} for{için} some{bazı} lineages{soylar}, but{ama} a{} beginning{başlangıç} for{için} others{diğerleri}, including{dahil} the{} mammals{memeliler} that{ki} eventually{sonunda} gave{vermek} rise{yükselme} to{-e} humans{insanlar}.", "Bu nedenle yok oluş bazı soylar için bir son, başka soylar için bir başlangıçtı; sonunda insanlara yol açan memeliler de buna dahildi."],
    ["Without{olmadan} that{o} disaster{felaket}, the{} world{dünya} we{biz} know{bilmek} today{bugün} might{-ebilirdi} look{görünmek} very{çok} different{farklı}.", "O felaket olmasaydı bugün bildiğimiz dünya çok farklı görünebilirdi."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-dinosaur-asteroid", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nhm = "Natural History Museum, Londra, How an asteroid caused the extinction of the dinosaurs; https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html";
const nhmB = "Natural History Museum, Londra, How dinosaurs evolved into birds; https://www.nhm.ac.uk/discover/how-dinosaurs-evolved-into-birds";

export default {
  slug: "b2-dinosaur-asteroid", level: "B2", title: "The Day the Dinosaurs Vanished", topic: "Dinozorlar", sortOrder: 20, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "The theory that has gained the most support blames a huge asteroid that struck what is now the Yucatan Peninsula in Mexico."), options: [
      option("o1", "A top theory about the end", true, null, "Metin yok oluşun öne çıkan teorisini anlatır."),
      option("o2", "A debate over warm-blooded dinosaurs", false, "notstated", "Kan sıcaklığı tartışması yoktur."),
      option("o3", "A survey of fossils found in Mexico", false, "context", "Meksika yalnızca çarpma yeridir."),
      option("o4", "A history of how birds learned to fly", false, "notstated", "Uçuşun evrimi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the museum, how did the asteroid fit the bigger picture?", evidence: ev(1, "In that view, the asteroid was the final blow rather than the only cause."), options: [
      option("o1", "It was the final blow, not sole cause", true, null, "Metin son darbe olduğunu söyler."),
      option("o2", "It was the very first sign of change", false, "reverse", "Değişimler daha önce başlamıştı."),
      option("o3", "It was unrelated to the dust in the air", false, "reverse", "Toz çarpmanın sonucudur."),
      option("o4", "It happened millions of years before the others", false, "reverse", "Diğer değişimler daha önce başladı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “collapse” mean in the second paragraph?", evidence: ev(1, "food chains that depended on them would have begun to collapse"), options: [
      option("o1", "Break down and fail", true, null, "Collapse, çökmek, işlevini yitirmek demektir."),
      option("o2", "Grow stronger very quickly", false, "reverse", "Tersini anlatır."),
      option("o3", "Move to a warmer region", false, "context", "Göç anlatılmaz."),
      option("o4", "Become a source of new energy", false, "notstated", "Enerji kaynağı anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about birds?", evidence: ev(2, "Birds are the living descendants of one group of dinosaurs, and their ancestors survived the catastrophe."), options: [
      option("o1", "Some dinosaurs continued as birds.", true, null, "Kuşlar bir dinozor grubunun torunlarıdır; atalar felaketten sağ çıktı."),
      option("o2", "Birds were created after the asteroid.", false, "reverse", "Kuşların atalarının önceden var olduğu söylenir."),
      option("o3", "Birds were the main cause of the end.", false, "reverse", "Böyle bir iddia yoktur."),
      option("o4", "Birds have never lived near mammals.", false, "extreme", "Metin bunu söylemez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kuş olmayan dinozorlar yaklaşık 66 milyon yıl önce yok oldu; en çok destek gören teori, Meksika'daki Yucatan Yarımadası'na çarpan bir asteroidi suçlar.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "Son kuş olmayan dinozorlar zaten değişen bir çevrede yaşıyordu; bu değişimlerin bir kısmı yok oluştan milyonlarca yıl önce başlamıştı ve asteroit son darbeydi.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "Kuşlar canlı dinozorlardır; kuşlara giden soylar yok oluştan sağ çıktı.", source: nhmB, checkedOn: "2026-11-23" },
  ] },
};
