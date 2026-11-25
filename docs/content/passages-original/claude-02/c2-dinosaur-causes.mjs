import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Questions{sorular} about{hakkında} mass{kitlesel} extinction{yok oluş} invite{davet etmek} a{} single{tek} culprit{suçlu}, and{} the{} end{son} of{} the{} non{olmayan}-bird{kuş} dinosaurs{dinozorlar} sixty{altmış}-six{altı} million{milyon} years{yıl} ago{önce} has{} long{uzun süredir} been{olmak} pinned{atfetmek} on{-e} an{} asteroid{asteroit}.", "Kitlesel yok oluşa dair sorular tek bir suçlu ister ve kuş olmayan dinozorların altmış altı milyon yıl önceki sonu uzun süredir bir asteroide atfedilir."],
    ["The{} evidence{kanıt} for{için} the{} impact{çarpma} is{} strong{güçlü}, with{ile} the{} crater{krater} centred{merkezli} on{-de} the{} Yucatan{Yucatan} Peninsula{Yarımada} in{} Mexico{Meksika}, yet{yine de} the{} question{soru} of{} how{nasıl} an{} impact{çarpma} translates{dönüşmek} into{-e} a{} global{küresel} extinction{yok oluş} is{} considerably{hatırı sayılır biçimde} more{daha} delicate{hassas}.", "Çarpmaya dair kanıt güçlüdür; krater Meksika'daki Yucatan Yarımadası'nda merkezlenmiştir; ancak bir çarpmanın küresel bir yok oluşa nasıl dönüştüğü sorusu hatırı sayılır biçimde daha hassastır."],
  ],
  [
    ["The{} Natural{Doğal} History{Tarih} Museum{Müze} in{-de} London{Londra} treats{ele almak} the{} asteroid{asteroit} as{olarak} the{} final{son} blow{darbe}, not{değil} the{} sole{tek} cause{neden}.", "Londra'daki Doğa Tarihi Müzesi asteroidi tek neden değil, son darbe olarak ele alır."],
    ["Its{onun} account{anlatım} stresses{vurgulamak} that{ki} the{} last{son} dinosaurs{dinozorlar} lived{yaşamak} in{} an{} already{zaten} changing{değişen} world{dünya}, some{bazı} of{} whose{kimin} environmental{çevresel} shifts{kaymalar} began{başlamak} millions{milyonlarca} of{} years{yıl} before{önce} the{} collision{çarpışma}.", "Anlatımı, son dinozorların zaten değişen bir dünyada yaşadığını ve bu dünyadaki çevresel kaymaların bir kısmının çarpışmadan milyonlarca yıl önce başladığını vurgular."],
    ["On{üzerinde} this{bu} view{görüş}, a{} stressed{stres altındaki} ecosystem{ekosistem} was{} pushed{itmek} past{ötesine} its{onun} limit{sınır} by{tarafından} a{} catastrophe{felaket} it{} might{-ebilirdi} have{} survived{hayatta kalmak} in{} better{daha iyi} health{sağlık}.", "Bu görüşe göre stres altındaki bir ekosistem, daha sağlıklı olsaydı atlatabileceği bir felaket tarafından sınırının ötesine itildi."],
  ],
  [
    ["Other{diğer} experts{uzmanlar} locate{konumlandırmak} the{} decisive{belirleyici} mechanism{mekanizma} elsewhere{başka yerde}.", "Diğer uzmanlar belirleyici mekanizmayı başka yerde konumlandırır."],
    ["An{} article{makale} from{-den} the{} United{Birleşik} States{Devletler} National{Ulusal} Science{Bilim} Foundation{Vakıf} argues{savunmak} that{ki} the{} climate{iklim} changes{değişimler} following{izleyen} the{} impact{çarpma}, rather{yerine (rather than)} than{yerine (rather than)} the{} blast{patlama} itself{kendisi}, most{en çok} likely{muhtemelen} caused{neden olmak} the{} mass{kitle} death{ölüm}.", "ABD Ulusal Bilim Vakfı'ndan bir makale, kitlesel ölüme büyük olasılıkla çarpmanın patlamasının değil, onu izleyen iklim değişimlerinin neden olduğunu savunur."],
    ["An{bir} international{uluslararası} panel{panel}, reporting{bildirmek} in{-de} twenty{yirmi} ten{on}, concluded{sonuca varmak} by{(by contrast) tersine} contrast{(by contrast) tersine} that{ki} the{} impact{çarpma} best{en iyi} explains{açıklamak} the{} extinction{yok oluş}, while{iken} the{} American{Amerikan} Museum{Müze} of{} Natural{Doğal} History{Tarih} notes{belirtmek} that{ki} some{bazı} paleontologists{paleontologlar} think{düşünmek} dinosaurs{dinozorlar} were{} already{zaten} declining{gerilemek} beforehand{önceden}.", "2010'da rapor veren uluslararası bir panel ise tersine, çarpmanın yok oluşu en iyi açıkladığı sonucuna vardı; Amerikan Doğa Tarihi Müzesi ise bazı paleontologların dinozorların önceden zaten gerilediğini düşündüğünü belirtir."],
    ["Such{böyle} disagreements{anlaşmazlıklar} are{} less{daha az} a{} sign{işaret} of{} confusion{kafa karışıklığı} than{-den} of{} a{} field{alan} still{hâlâ} refining{inceltmek} its{onun} causal{nedensel} story{hikâye}.", "Bu tür anlaşmazlıklar bir kafa karışıklığından çok, nedensel hikâyesini hâlâ inceltmekte olan bir alanın işaretidir."],
  ],
  [
    ["It{} would{-ecekti} be{olmak} a{} mistake{hata}, however{ancak}, to{-mek} conclude{sonuca varmak} that{ki} nothing{hiçbir şey} survived{hayatta kalmak}.", "Ancak hiçbir şeyin hayatta kalmadığı sonucuna varmak bir hata olurdu."],
    ["Birds{kuşlar} descend{inmek} from{-den} one{bir} branch{dal} of{} the{} theropod{theropod} dinosaurs{dinozorlar}, and{} the{} lineages{soylar} that{ki} led{götürmek} to{-e} them{onlar} came{gelmek} through{içinden} the{} catastrophe{felaket}.", "Kuşlar theropod dinozorların bir dalından gelir ve onlara giden soylar felaketin içinden geçerek ayakta kaldı."],
    ["The{} extinction{yok oluş} was{} therefore{bu nedenle} selective{seçici}, removing{ortadan kaldırmak} some{bazı} large{büyük} animals{hayvanlar} entirely{tamamen} while{iken} leaving{bırakmak} others{diğerleri} to{-mek} flourish{gelişmek}.", "Yok oluş bu nedenle seçiciydi; bazı büyük hayvanları tamamen ortadan kaldırırken diğerlerinin gelişmesine izin verdi."],
  ],
  [
    ["What{ne} the{} debate{tartışma} ultimately{nihayetinde} teaches{öğretmek} is{} humility{alçakgönüllülük}.", "Tartışmanın nihayetinde öğrettiği şey alçakgönüllülüktür."],
    ["The{} wiser{daha akıllıca} course{yol} is{} to{-mek} hold{tutmak} each{her} explanation{açıklama} loosely{gevşekçe} while{iken} the{} measurements{ölçümler} continue{sürmek} and{} new{yeni} data{veri} arrive{gelmek}.", "Daha akıllıca yol, ölçümler sürerken ve yeni veriler gelirken her açıklamayı gevşekçe tutmaktır."],
    ["A{} neat{düzenli} story{hikâye} of{} one{bir} rock{kaya} and{} one{bir} bad{kötü} day{gün} is{} satisfying{tatmin edici}, but{ama} the{} evidence{kanıt} points{işaret etmek} to{-e} a{} tangled{karmakarışık} chain{zincir} of{} stress{stres}, impact{çarpma} and{} aftermath{sonrası}, and{} we{biz} understand{anlamak} the{} past{geçmiş} best{en iyi} when{-dığında} we{biz} accept{kabul etmek} that{ki} complexity{karmaşıklık}.", "Tek bir kayanın ve tek bir kötü günün düzenli hikâyesi tatmin edicidir, ama kanıt stres, çarpma ve sonrasından oluşan karmakarışık bir zincire işaret eder; geçmişi bu karmaşıklığı kabul ettiğimizde en iyi anlarız."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-dinosaur-causes", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nhm = "Natural History Museum, Londra, How an asteroid caused the extinction of the dinosaurs; https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html";
const nsf = "U.S. National Science Foundation, A moment that changed Earth; https://www.nsf.gov/science-matters/moment-changed-earth";
const amnh = "American Museum of Natural History, Did an asteroid kill the dinosaurs? (Akinobu Watanabe); https://www.amnh.org/explore/videos/dinosaurs-and-fossils/did-asteroid-kill-dinosaurs";
const imperial = "Imperial College London, Asteroid killed off the dinosaurs, says international scientific panel (2010); https://www.imperial.ac.uk/news/86001/asteroid-killed-dinosaurs-says-international-scientific/";
const nhmB = "Natural History Museum, Londra, How dinosaurs evolved into birds; https://www.nhm.ac.uk/discover/how-dinosaurs-evolved-into-birds";

export default {
  slug: "c2-dinosaur-causes", level: "C2", title: "One Rock, Many Causes", topic: "Dinozorlar", sortOrder: 20, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What does the author mainly argue?", evidence: ev(4, "the evidence points to a tangled chain of stress, impact and aftermath"), options: [
      option("o1", "The extinction had interacting causes", true, null, "Metin yok oluşu stres, çarpma ve sonrasından oluşan bir zincir olarak sunar."),
      option("o2", "One asteroid is proved to be the sole cause", false, "reverse", "Metin tek nedenin kanıtlanmadığını vurgular."),
      option("o3", "Climate before the impact was irrelevant", false, "reverse", "Metin önceki çevresel değişimlerin önemini söyler."),
      option("o4", "Dinosaurs could not have survived anyway", false, "extreme", "Metin böyle bir iddia taşımaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the National Science Foundation article suggest?", evidence: ev(2, "the climate changes following the impact, rather than the blast itself, most likely caused the mass death"), options: [
      option("o1", "Later climate change was key", true, null, "Metin bunu söyler."),
      option("o2", "The blast alone was enough to cause it", false, "reverse", "NSF makalesi tersini savunur: ölümlerin çoğundan çarpmanın patlaması değil, onu izleyen iklim değişimleri sorumludur."),
      option("o3", "Dinosaurs died out long before the impact", false, "notstated", "Böyle bir iddia yoktur."),
      option("o4", "Volcanic ash was the only real cause", false, "notstated", "Volkan iddiası yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “selective” mean in the fourth paragraph?", evidence: ev(3, "The extinction was therefore selective"), options: [
      option("o1", "Hitting some groups harder", true, null, "Selective, bazı grupları diğerlerinden fazla etkileyen demektir."),
      option("o2", "Chosen deliberately by scientists", false, "context", "Bilim insanlarının seçimi anlatılmaz."),
      option("o3", "Happening very slowly over time", false, "notstated", "Hız anlatılmaz."),
      option("o4", "Limited to a single country", false, "context", "Ülke sınırı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply the experts' disagreements are about?", evidence: findEvidence(paragraphs, "The evidence for the impact is strong, with the crater centred on the Yucatan Peninsula in Mexico, yet the question of how an impact translates into a global extinction is considerably more delicate."), options: [
      option("o1", "How the impact led to extinction", true, null, "Çarpmaya dair kanıt güçlüdür; hassas olan, çarpmanın küresel yok oluşa nasıl dönüştüğüdür."),
      option("o2", "Whether an impact occurred at all", false, "reverse", "Metin çarpma kanıtını güçlü bulur."),
      option("o3", "Where the crater is located", false, "notstated", "Kraterin yeri tartışma konusu değildir."),
      option("o4", "Whether birds descend from dinosaurs", false, "notstated", "Bu, tartışma olarak sunulmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kuş olmayan dinozorlar yaklaşık 66 milyon yıl önce yok oldu; krater Meksika'daki Yucatan Yarımadası'nda merkezlenmiştir; son dinozorlar zaten değişen bir dünyada yaşıyordu ve bu değişimlerin bir kısmı çarpmadan milyonlarca yıl önce başlamıştı; asteroit son darbeydi.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "NSF yazısı, kitlesel ölümün muhtemelen çarpmanın kendisinin değil, sonrasındaki iklim değişimlerinin sonucu olduğunu savunur.", source: nsf, checkedOn: "2026-11-23" },
    { claim: "2010'da uluslararası bir bilim insanları paneli, çarpmanın yok oluşu en iyi açıkladığı sonucuna vardı.", source: imperial, checkedOn: "2026-11-23" },
    { claim: "AMNH (Akinobu Watanabe): bazı paleontologlar dinozorların çarpmadan önce zaten gerilediğini düşünür.", source: amnh, checkedOn: "2026-11-23" },
    { claim: "Kuşlar theropod dinozorların bir dalından gelir; kuşlara giden soylar yok oluştan sağ çıktı.", source: nhmB, checkedOn: "2026-11-23" },
  ] },
};
