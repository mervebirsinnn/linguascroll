import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} extinction{yok oluş} of{} the{} non{olmayan}-bird{kuş} dinosaurs{dinozorlar} about{yaklaşık} sixty{altmış}-six{altı} million{milyon} years{yıl} ago{önce} is{} often{sıklıkla} told{anlatılmak} as{olarak} a{} single{tek} dramatic{dramatik} event{olay}: a{} giant{dev} asteroid{asteroit} strikes{çarpmak}, and{} an{} age{çağ} ends{bitmek}.", "Kuş olmayan dinozorların yaklaşık altmış altı milyon yıl önceki yok oluşu sıklıkla tek bir dramatik olay olarak anlatılır: dev bir asteroit çarpar ve bir çağ biter."],
    ["The{} Natural{Doğal} History{Tarih} Museum{Müze} in{-de} London{Londra} supports{desteklemek} the{} impact{çarpma} theory{teori}, locating{konumlandırmak} the{} crater{krater} on{-de} the{} Yucatan{Yucatan} Peninsula{Yarımada} in{} Mexico{Meksika}, but{ama} it{} also{ayrıca} stresses{vurgulamak} that{ki} the{} last{son} dinosaurs{dinozorlar} lived{yaşamak} in{} a{} world{dünya} already{zaten} undergoing{geçirmek} environmental{çevresel} change{değişim}.", "Londra'daki Doğa Tarihi Müzesi çarpma teorisini destekler ve krateri Meksika'daki Yucatan Yarımadası'na yerleştirir; ancak son dinozorların zaten çevresel değişim geçiren bir dünyada yaşadığını da vurgular."],
    ["Some{bazı} of{} those{o} changes{değişimler} began{başlamak} millions{milyonlarca} of{} years{yıl} before{önce} the{} impact{çarpma}, which{ki bu} makes{yapar} the{} asteroid{asteroit} the{} final{son} blow{darbe} rather{yerine (rather than)} than{yerine (rather than)} the{} sole{tek} cause{neden}.", "Bu değişimlerin bir kısmı çarpmadan milyonlarca yıl önce başladı; bu da asteroidi tek neden değil, son darbe yapar."],
  ],
  [
    ["Not{değil} every{her} researcher{araştırmacı} agrees{aynı fikirde olmak} on{hakkında} emphasis{vurgu}.", "Her araştırmacı vurgu konusunda hemfikir değildir."],
    ["An{} article{makale} from{-den} the{} United{Birleşik} States{Devletler} National{Ulusal} Science{Bilim} Foundation{Vakıf} argues{savunmak} that{ki} the{} climate{iklim} upheavals{altüst oluşlar} following{izleyen} the{} impact{çarpma} did{yapmak} most{çoğu} of{} the{} killing{öldürme}, rather{yerine (rather than)} than{yerine (rather than)} the{} blast{patlama} itself{kendisi}.", "ABD Ulusal Bilim Vakfı'ndan bir makale, öldürmenin çoğunu çarpmanın patlamasının değil, onu izleyen iklim altüst oluşlarının yaptığını savunur."],
    ["An{bir} international{uluslararası} panel{panel} of{} scientists{bilim insanları}, reporting{bildirmek} in{-de} twenty{yirmi} ten{on}, concluded{sonuca varmak} by{(by contrast) tersine} contrast{(by contrast) tersine} that{ki} the{} impact{çarpma} was{} the{} best{en iyi} explanation{açıklama} for{için} the{} extinction{yok oluş}.", "2010'da rapor veren uluslararası bir bilim insanları paneli ise tersine, çarpmanın yok oluşun en iyi açıklaması olduğu sonucuna vardı."],
    ["Researchers{araştırmacılar} at{-de} the{} American{Amerikan} Museum{Müze} of{} Natural{Doğal} History{Tarih} add{eklemek} that{ki} some{bazı} paleontologists{paleontologlar} believe{inanmak} dinosaurs{dinozorlar} were{} already{zaten} declining{gerilemek} before{önce} the{} asteroid{asteroit} struck{çarpmak}.", "Amerikan Doğa Tarihi Müzesi'ndeki araştırmacılar, bazı paleontologların dinozorların asteroit çarpmadan önce zaten gerilemekte olduğuna inandığını ekler."],
    ["These{bu} positions{görüşler} differ{farklılaşmak} less{daha az} in{} the{} facts{olgular} they{} accept{kabul etmek} than{-den} in{} the{} weight{ağırlık} they{} give{vermek} to{-e} each{her} stage{aşama} of{} a{} chain{zincir} of{} events{olaylar}.", "Bu görüşler kabul ettikleri olgulardan çok, bir olay zincirinin her aşamasına verdikleri ağırlıkta ayrışır."],
  ],
  [
    ["What{ne} is{} beyond{ötesinde} dispute{tartışma}, however{ancak}, is{} that{ki} extinction{yok oluş} was{} not{} total{tam}.", "Ancak tartışmanın ötesinde olan şey, yok oluşun tam olmadığıdır."],
    ["Birds{kuşlar} are{} living{yaşayan} dinosaurs{dinozorlar}, the{} descendants{torunlar} of{} one{bir} branch{dal} of{} the{} theropods{theropodlar}, and{} their{onların} ancestors{atalar} survived{hayatta kalmak} the{} catastrophe{felaket}.", "Kuşlar yaşayan dinozorlardır; theropodların bir dalının torunlarıdır ve atalarının soyu felaketten sağ çıktı."],
    ["The{} same{aynı} event{olay} that{ki} ended{bitirmek} one{bir} dynasty{hanedan} of{} large{büyük} animals{hayvanlar} therefore{bu nedenle} opened{açmak} the{} ecological{ekolojik} space{alan} for{için} others{diğerleri}, including{dahil} the{} mammals{memeliler} from{-den} which{ki onlar} we{biz} descend{inmek}.", "Büyük hayvanların bir hanedanını bitiren aynı olay, bu nedenle, soyundan geldiğimiz memeliler dahil başkaları için ekolojik alan açtı."],
    ["Understanding{anlamak} extinction{yok oluş} thus{böylece} means{demek} understanding{anlamak} not{değil} only{yalnızca} what{ne} was{} lost{kaybetmek}, but{ama} what{ne} became{olmak} possible{mümkün} afterwards{sonrasında}.", "Yok oluşu anlamak böylece yalnızca neyin kaybedildiğini değil, sonrasında neyin mümkün olduğunu da anlamak demektir."],
    ["The{} question{soru} of{} proportion{oran} may{-ebilir} never{asla} be{olmak} settled{çözülmek} completely{tamamen}, but{ama} the{} broad{geniş} outline{taslak} is{} remarkably{dikkate değer biçimde} well{iyi} supported{desteklenmek}.", "Oran sorusu belki hiçbir zaman tamamen çözülmeyecek ama geniş taslak dikkate değer biçimde iyi desteklenmiş durumda."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-dinosaur-debate", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nhm = "Natural History Museum, Londra, How an asteroid caused the extinction of the dinosaurs; https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html";
const nsf = "U.S. National Science Foundation, A moment that changed Earth; https://www.nsf.gov/science-matters/moment-changed-earth";
const amnh = "American Museum of Natural History, Did an asteroid kill the dinosaurs? (Akinobu Watanabe); https://www.amnh.org/explore/videos/dinosaurs-and-fossils/did-asteroid-kill-dinosaurs";
const imperial = "Imperial College London, Asteroid killed off the dinosaurs, says international scientific panel (2010); https://www.imperial.ac.uk/news/86001/asteroid-killed-dinosaurs-says-international-scientific/";
const nhmB = "Natural History Museum, Londra, How dinosaurs evolved into birds; https://www.nhm.ac.uk/discover/how-dinosaurs-evolved-into-birds";

export default {
  slug: "c1-dinosaur-debate", level: "C1", title: "More Than One Blow", topic: "Dinozorlar", sortOrder: 20, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central point of the passage?", evidence: ev(1, "These positions differ less in the facts they accept than in the weight they give to each stage of a chain of events."), options: [
      option("o1", "The story is broader than one impact", true, null, "Metin yok oluşu tek olaydan çok bir zincir olarak sunar."),
      option("o2", "The asteroid theory has been abandoned", false, "reverse", "Metin teoriyi destekleyen kaynakları anlatır."),
      option("o3", "Birds replaced dinosaurs after the impact", false, "reverse", "Kuşların atalarının önceden var olduğu söylenir."),
      option("o4", "Climate before the impact was irrelevant", false, "reverse", "Metin çevresel değişimlerin önemini vurgular."),
    ] },
    { key: "q2", type: "detail", prompt: "What did the international panel conclude in twenty ten?", evidence: ev(1, "concluded by contrast that the impact was the best explanation for the extinction"), options: [
      option("o1", "That the impact best explains it", true, null, "Metin panelin çarpmanın en iyi açıklama olduğu sonucuna vardığını söyler."),
      option("o2", "That climate change did most of the killing", false, "reverse", "Bu, NSF makalesinin savunduğu görüştür; panelinki değil."),
      option("o3", "That volcanoes were the real cause of the end", false, "notstated", "Volkan iddiası metinde yoktur."),
      option("o4", "That dinosaurs could not have survived anyway", false, "notstated", "Böyle bir sonuç anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “beyond dispute” mean in the last paragraph?", evidence: findEvidence(paragraphs, "What is beyond dispute, however, is that extinction was not total."), options: [
      option("o1", "Not open to real argument", true, null, "Beyond dispute, tartışma götürmez demektir."),
      option("o2", "Supported by a single study", false, "context", "Tek çalışmayla ilgisi yoktur."),
      option("o3", "Likely but not yet agreed", false, "reverse", "Tartışma götürmez, 'henüz uzlaşılmamış'ın tersidir."),
      option("o4", "Hard to explain to others", false, "context", "Anlatma zorluğu değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage suggest about the extinction event?", evidence: findEvidence(paragraphs, "The same event that ended one dynasty of large animals therefore opened the ecological space for others"), options: [
      option("o1", "Its ending opened chances for others", true, null, "Metin bir hanedanın sonunun başkalarına alan açtığını söyler."),
      option("o2", "It left the ecological space unchanged", false, "reverse", "Metin alanın başkaları için açıldığını söyler."),
      option("o3", "It removed all large animals equally", false, "reverse", "Yok oluş tam değildi; kuşlar ayakta kaldı."),
      option("o4", "It marked the arrival of the first birds", false, "reverse", "Kuşların atalarının önceden var olduğu söylenir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kuş olmayan dinozorlar yaklaşık 66 milyon yıl önce yok oldu; kraterin Meksika'daki Yucatan Yarımadası'nda olduğu kabul edilir; son dinozorlar zaten çevresel değişim yaşayan bir dünyada yaşıyordu ve asteroit son darbeydi.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "NSF yazısı, öldürmenin çoğunu çarpmanın kendisinin değil, sonrasındaki iklim değişimlerinin yaptığını savunur.", source: nsf, checkedOn: "2026-11-23" },
    { claim: "2010'da uluslararası bir bilim insanları paneli, çarpmanın yok oluşun en iyi açıklaması olduğu sonucuna vardı.", source: imperial, checkedOn: "2026-11-23" },
    { claim: "AMNH (Akinobu Watanabe): bazı paleontologlar dinozorların çarpmadan önce zaten gerilediğini düşünür; çarpmanın yıkıcı bir etkisi olmuştur ve ayrıntılar hâlâ çalışılıyor.", source: amnh, checkedOn: "2026-11-23" },
    { claim: "Kuşlar canlı dinozorlardır (theropod soyundan) ve atalarının soyu yok oluştan sağ çıktı.", source: nhmB, checkedOn: "2026-11-23" },
  ] },
};
