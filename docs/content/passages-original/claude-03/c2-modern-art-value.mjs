import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{} nineteen{on dokuz} seventeen{on yedi}, Marcel{Marcel} Duchamp{Duchamp} submitted{sunmak} a{} porcelain{porselen} urinal{pisuvar}, signed{imzalanmış} R{R}. Mutt{Mutt} and{} titled{adlandırılmış} Fountain{Çeşme}, to{-e} a{} New{New} York{York} exhibition{sergi} that{ki} promised{söz vermek} to{-meyi} show{sergilemek} any{herhangi bir} work{eser} whose{ki onun} artist{sanatçı} paid{ödemek} the{} fee{ücret}.", "1917'de Marcel Duchamp, R. Mutt imzalı ve Çeşme adlı porselen bir pisuvarı, ücretini ödeyen sanatçının her eserini sergileme sözü veren bir New York sergisine sundu."],
    ["It{} was{} not{} displayed{sergilenmek}.", "Eser sergilenmedi."],
    ["The{} original{asıl} was{} later{sonra} lost{kaybolmak}, and{} the{} versions{sürümler} now{şimdi} held{bulundurulmak} by{tarafından} museums{müzeler} are{} replicas{kopyalar} that{ki} Duchamp{Duchamp} authorised{onaylamak} decades{onyıllar} afterwards{sonra}.", "Asıl eser daha sonra kayboldu; bugün müzelerde bulunan sürümler, Duchamp'ın onyıllar sonra onayladığı kopyalardır."],
  ],
  [
    ["The{} episode{olay} is{} usually{genellikle} told{anlatılmak} as{} a{} story{öykü} about{hakkında} the{} definition{tanım} of{} art{sanat}, but{} it{} is{} equally{aynı ölçüde} a{} story{öykü} about{hakkında} value{değer}.", "Olay genellikle sanatın tanımı hakkında bir öykü olarak anlatılır, ama aynı ölçüde değer hakkında bir öyküdür."],
    ["Nothing{hiçbir şey} in{} the{} urinal's{pisuvarın} material{malzeme} or{} craftsmanship{zanaat} explains{açıklamak} why{neden} its{} replicas{kopyalar} are{} now{şimdi} treasured{değerli tutulmak} by{tarafından} major{büyük} museums{müzeler}.", "Pisuvarın malzemesinde ya da zanaatında hiçbir şey, kopyalarının bugün neden büyük müzelerce değerli tutulduğunu açıklamaz."],
    ["Whatever{her ne} value{değer} it{} has{sahip olmak} was{} conferred{verilmek (bahşedilmek)}, not{} manufactured{üretilmek}, and{} the{} interesting{ilginç} question{soru} is{} who{kim} did{yapmak} the{} conferring{bahşetme}.", "Sahip olduğu değer her neyse üretilmemiş, bahşedilmiştir ve ilginç soru, bu bahşetmeyi kimin yaptığıdır."],
  ],
  [
    ["Philosophers{filozoflar} have{} tried{denemek} to{-meyi} name{adlandırmak} the{} conferrers{bahşedenler}.", "Filozoflar bahşedenleri adlandırmayı denediler."],
    ["In{} the{} nineteen{on dokuz} sixties{altmışlar}, Arthur{Arthur} Danto{Danto} argued{savunmak} that{ki} seeing{görmek} something{bir şey} as{} art{sanat} requires{gerektirmek} an{} artworld{sanat dünyası}: an{} atmosphere{atmosfer} of{} theory{kuram} and{} a{} knowledge{bilgi} of{} art's{sanatın} history{tarih}.", "1960'larda Arthur Danto, bir şeyi sanat olarak görmenin bir sanat dünyası gerektirdiğini savundu: bir kuram atmosferi ve sanatın tarihine dair bir bilgi."],
    ["George{George} Dickie{Dickie} later{sonra} developed{geliştirmek} an{} institutional{kurumsal} theory{kuram}, on{-e göre} which{ki ona} an{} artwork{sanat eseri} is{}, roughly{kabaca}, an{} artifact{yapıt} presented{sunulmak} to{-e} an{} artworld{sanat dünyası} public{kamu}.", "George Dickie daha sonra kurumsal bir kuram geliştirdi; buna göre sanat eseri kabaca bir sanat dünyası kamusuna sunulan bir yapıttır."],
    ["Both{her iki} views{görüşler} explain{açıklamak} how{nasıl} an{} ordinary{sıradan} object{nesne} can{-ebilir} become{olmak} art{sanat}; neither{hiçbiri}, taken{alınmak} alone{tek başına}, explains{açıklamak} why{neden} one{bir} such{böyle} object{nesne} should{-meli} be{} worth{değerinde} more{daha fazla} than{-den} another{bir başkası}.", "Her iki görüş de sıradan bir nesnenin nasıl sanat olabileceğini açıklar; hiçbiri tek başına, böyle bir nesnenin neden bir başkasından daha değerli olması gerektiğini açıklamaz."],
  ],
  [
    ["The{} market{piyasa} supplies{sağlamak} a{} blunter{daha kaba (daha dolaysız)} answer{yanıt}.", "Piyasa daha dolaysız bir yanıt sağlar."],
    ["Prices{fiyatlar} for{} contemporary{çağdaş} work{eser} are{} shaped{biçimlenmek} by{tarafından} dealers{galericiler}, collectors{koleksiyoncular}, auction{müzayede} houses{evler} and{} critics{eleştirmenler} whose{ki onların} judgements{yargılar} can{-ebilir} reinforce{pekiştirmek} one{bir} another{diğeri (one another: birbirini)}, so{böylece} that{ki} a{} reputation{ün} may{-ebilir} become{olmak} valuable{değerli} partly{kısmen} because{çünkü} it{} is{} already{zaten} valuable{değerli}.", "Çağdaş eserlerin fiyatları, yargıları birbirini pekiştirebilen galericiler, koleksiyoncular, müzayede evleri ve eleştirmenlerce biçimlenir; böylece bir ün kısmen zaten değerli olduğu için değerli hale gelebilir."],
    ["Sceptics{kuşkucular} call{adlandırmak} this{} a{} bubble{balon}; defenders{savunucular} call{adlandırmak} it{} a{} conversation{sohbet}.", "Kuşkucular buna balon der; savunucular sohbet der."],
    ["The{} two{iki} descriptions{betimlemeler} may{-ebilir} fit{uymak} exactly{tam olarak} the{} same{aynı} facts{olgular}, which{ki bu} is{} precisely{tam da} what{ne} makes{kılmak} the{} argument{tartışma} so{bu kadar} hard{zor} to{-mek} settle{çözmek}.", "İki betimleme tam olarak aynı olgulara uyabilir; tartışmayı bu kadar zor çözülür kılan da tam olarak budur."],
  ],
  [
    ["None{hiçbiri} of{} this{} proves{kanıtlamak} that{ki} modern{modern} art{sanat} is{} a{} confidence{güven} trick{hile (confidence trick: dolandırıcılık)}.", "Bunların hiçbiri modern sanatın bir dolandırıcılık olduğunu kanıtlamaz."],
    ["It{} suggests{düşündürmek} instead{bunun yerine} that{ki} artistic{sanatsal} value{değer} has{} long{uzun zamandır} been{} partly{kısmen} social{toplumsal}, and{} that{ki} Duchamp's{Duchamp'ın} gesture{jest} did{} not{} create{yaratmak} this{} condition{durum} so{o kadar (not so much as)} much{çok} as{} make{kılmak} it{onu} impossible{imkânsız} to{-mek} ignore{görmezden gelmek}.", "Bunun yerine sanatsal değerin uzun zamandır kısmen toplumsal olduğunu ve Duchamp'ın jestinin bu durumu yaratmaktan çok, görmezden gelinmesini imkânsız kıldığını düşündürür."],
    ["Those{onlar} who{ki onlar} dismiss{küçümsemek} a{} work{eser} because{çünkü} 'anyone{herkes} could{-ebilirdi} have{} made{yapmak} it{onu}' are{}, in{} a{} sense{anlam}, agreeing{katılmak} with{} him{ona}: the{} making{yapım} was{} never{asla} the{} whole{bütün} point{amaç}.", "Bir eseri 'bunu herkes yapabilirdi' diye küçümseyenler, bir anlamda ona katılıyorlar: yapım hiçbir zaman asıl amacın tamamı değildi."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-modern-art-value", rows);
const tate = "Tate, Marcel Duchamp, Fountain (1917, replica 1964); https://www.tate.org.uk/art/artworks/duchamp-fountain-t07573";
const sepArt = "Stanford Encyclopedia of Philosophy, The Definition of Art; https://plato.stanford.edu/entries/art-definition/";

export default {
  slug: "c2-modern-art-value", level: "C2", title: "Who Decides What a Urinal Is Worth?", topic: "Sanat", sortOrder: 34, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main claim about value in art?", evidence: findEvidence(paragraphs, "artistic value has long been partly social"), options: [
      option("o1", "It is partly set by social judgement", true, null, "Yazar değerin üretilmediğini, toplumsal olarak bahşedildiğini savunur."),
      option("o2", "Modern art is basically a confidence trick", false, "reverse", "Yazar bunun kanıtlanmadığını açıkça söyler."),
      option("o3", "Market prices reveal the true worth of art", false, "notstated", "Yazar piyasanın yanıtını balon ile sohbet arasında belirsiz bırakır."),
      option("o4", "It depends on skill and materials", false, "reverse", "Metin malzeme ve zanaatın değeri açıklamadığını söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about the theories of Danto and Dickie is supported by the text?", evidence: findEvidence(paragraphs, "neither, taken alone, explains why one such object should be worth more than another"), options: [
      option("o1", "Neither alone accounts for why one artwork outprices another", true, null, "Metin, ikisinin de bir nesnenin neden diğerinden değerli olduğunu tek başına açıklamadığını söyler."),
      option("o2", "Danto defined art as an artifact presented to an artworld public", false, "detail", "Bu tanım Dickie'nin kurumsal kuramına aittir; Danto'ya atfedilmiş."),
      option("o3", "Dickie held that seeing art requires an atmosphere of theory", false, "detail", "Kuram atmosferi Danto'nundur; Dickie'ye atfedilmiş."),
      option("o4", "Both explain price differences but not how objects become art", false, "reverse", "Tam tersi: nesnenin sanata nasıl dönüştüğünü açıklarlar, fiyat farkını açıklamazlar."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “conferred” mean in “was conferred, not manufactured”?", evidence: findEvidence(paragraphs, "Whatever value it has was conferred, not manufactured"), options: [
      option("o1", "Granted by outside recognition", true, null, "Confer burada 'bahşetmek, tanıyıp vermek' demektir; değer nesnede üretilmedi, dışarıdan verildi."),
      option("o2", "Debated in a formal meeting", false, "context", "Confer'in 'görüşmek, danışmak' anlamıdır; değer görüşülmez, verilir."),
      option("o3", "Passed down through inheritance", false, "notstated", "Miras yoluyla geçiş metinde yoktur."),
      option("o4", "Negotiated between buyers and sellers", false, "context", "Pazarlık anlamı cümleye uymaz; değer üretimin karşıtı olarak 'verilen' bir şeydir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about critics who say “anyone could have made it”?", evidence: findEvidence(paragraphs, "are, in a sense, agreeing with him: the making was never the whole point"), options: [
      option("o1", "They share his premise unknowingly", true, null, "Yapımın asıl mesele olmadığını söyleyerek farkında olmadan Duchamp'ın öncülünü paylaşırlar."),
      option("o2", "They have correctly exposed modern art", false, "reverse", "Yazar modern sanatın bir hile olduğunun kanıtlanmadığını söyler."),
      option("o3", "They should learn to make art themselves", false, "notstated", "Metinde böyle bir öneri yoktur."),
      option("o4", "They are usually trained art historians", false, "notstated", "Eleştirenlerin kimliği hakkında bilgi verilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Duchamp 1917'de R. Mutt imzalı Fountain adlı pisuvarı, ücreti ödeyen herkesin eserini sergileyeceğini duyuran New York'taki Society of Independent Artists sergisine sundu; eser sergilenmedi; asıl nesne kayboldu, müzelerdeki sürümler Duchamp'ın sonradan onayladığı kopyalardır.", source: tate, checkedOn: "2026-11-23" },
    { claim: "Arthur Danto 1964'te bir şeyi sanat olarak görmenin bir sanat dünyası (kuram atmosferi ve sanat tarihi bilgisi) gerektirdiğini savundu; George Dickie, sanat eserini kabaca bir sanat dünyası kamusuna sunulmak üzere yapılmış bir yapıt olarak tanımlayan kurumsal kuramı geliştirdi.", source: sepArt, checkedOn: "2026-11-23" },
  ] },
};
