import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Between{arasında} 1347 and{} 1352 the{} Black{Kara} Death{Ölüm}, carried{taşımak} by{tarafından} Genoese{Cenova} ships{gemiler}, swept{silip süpürmek} across{boyunca} Europe{Avrupa}, killing{öldürmek} at{} least{en az} a{} third{üçte bir} of{} its{} people{insanlar}.", "1347 ile 1352 arasında Cenova gemilerinin taşıdığı Kara Ölüm Avrupa'yı silip süpürdü ve insanlarının en az üçte birini öldürdü."],
    ["The{} human{insani} catastrophe{felaket} is{} well{iyi} documented{belgelenmiş}, but{} historians{tarihçiler} have{} long{uzun zamandır} been{} drawn{çekilmek (ilgisi)} to{-e} a{} quieter{daha sessiz} question{soru}: what{ne} happens{olmak} to{-e} an{} economy{ekonomi} when{-dığında} labour{emek, iş gücü} suddenly{aniden} becomes{olmak} scarce{kıt}?", "İnsani felaket iyi belgelenmiştir, ama tarihçilerin ilgisi uzun zamandır daha sessiz bir soruya yönelmiştir: İş gücü aniden kıtlaştığında bir ekonomiye ne olur?"],
    ["With{} fewer{daha az} hands{eller (işçiler)} to{-ecek} work{işlemek} the{} same{aynı} fields{tarlalar}, surviving{hayatta kalan} peasants{köylüler} and{} labourers{işçiler} found{bulmak} themselves{kendilerini} in{} an{} unfamiliar{alışılmadık} position{konum} of{} strength{güç}.", "Aynı tarlaları işleyecek daha az el kalınca, hayatta kalan köylüler ve işçiler kendilerini alışılmadık bir güç konumunda buldu."],
  ],
  [
    ["Landowners{toprak sahipleri} did{} not{} accept{kabul etmek} this{} shift{değişim} quietly{sessizce}.", "Toprak sahipleri bu değişimi sessizce kabul etmedi."],
    ["In{} England{İngiltere} a{} royal{kraliyet} ordinance{buyruk, kararname} of{} 1349 and{} the{} Statute{Yasa} of{} Labourers{İşçiler} passed{çıkarılan (yasa)} by{tarafından} Parliament{Parlamento} in{} 1351 tried{çalışmak (denemek)} to{-meye} hold{tutmak} wages{ücretler} at{} the{} levels{düzeyler} paid{ödenen} before{önce} the{} plague{veba} and{} to{-meye} stop{engellemek} workers{işçiler} from{-den} leaving{ayrılmak} their{} employers{işverenler} early{erken}.", "İngiltere'de 1349 tarihli bir kraliyet kararnamesi ve 1351'de Parlamento'nun çıkardığı İşçiler Yasası, ücretleri vebadan önce ödenen düzeylerde tutmaya ve işçilerin işverenlerinden erken ayrılmasını engellemeye çalıştı."],
    ["Enforcement{uygulama (yasanın)} proved{çıkmak (olduğu anlaşılmak)} patchy{düzensiz, yer yer işleyen}, however{ancak}, and{} wages{ücretler} for{} many{birçok} workers{işçiler} rose{yükselmek} in{} the{} decades{onlarca yıl} that{ki} followed{izlemek} despite{-e rağmen} the{} law{yasa}.", "Ancak yasanın uygulanması düzensiz kaldı ve izleyen onlarca yılda birçok işçinin ücreti yasaya rağmen yükseldi."],
    ["A{} poll{kişi başı (poll tax)} tax{vergi} of{} 1380 helped{yardım etmek} to{-mek} provoke{kışkırtmak} the{} Peasants{Köylüler}' Revolt{Ayaklanma} of{} 1381.", "1380 tarihli kişi başı bir vergi, 1381 Köylü Ayaklanması'nı kışkırtmaya yardım etti."],
  ],
  [
    ["It{} is{} tempting{cazip} to{-mek} conclude{sonuç çıkarmak} that{ki} scarcity{kıtlık} alone{tek başına} guaranteed{garanti etmek} a{} better{daha iyi} life{yaşam} for{} ordinary{sıradan} people{insanlar}, yet{oysa} the{} wider{daha geniş} European{Avrupa} picture{tablo} complicates{karmaşıklaştırmak} that{o} story{hikaye}.", "Kıtlığın tek başına sıradan insanlara daha iyi bir yaşam garanti ettiği sonucunu çıkarmak caziptir; oysa daha geniş Avrupa tablosu bu hikayeyi karmaşıklaştırır."],
    ["In{} England{İngiltere}, serfdom{serflik} weakened{zayıflamak} over{boyunca} the{} following{sonraki} generations{kuşaklar}, whereas{oysa} in{} other{başka} parts{bölgeler} of{} Europe{Avrupa} landlords{toprak ağaları} later{daha sonra} tightened{sıkılaştırmak} their{} hold{hakimiyet} over{üzerinde} peasants{köylüler}.", "İngiltere'de serflik sonraki kuşaklar boyunca zayıfladı; oysa Avrupa'nın başka bölgelerinde toprak ağaları daha sonra köylüler üzerindeki hakimiyetlerini sıkılaştırdı."],
    ["Historians{tarihçiler} still{hâlâ} debate{tartışmak} why{neden} the{} same{aynı} shock{sarsıntı} produced{üretmek} such{böylesine} different{farklı} outcomes{sonuçlar}, and{} the{} answer{cevap} may{olabilir} lie{yatmak} in{} the{} relative{göreli} power{güç} of{} lords{beyler, senyörler}, towns{kasabalar} and{} states{devletler} in{} each{her} region{bölge}.", "Tarihçiler aynı sarsıntının neden böylesine farklı sonuçlar ürettiğini hâlâ tartışıyor ve cevap her bölgedeki senyörlerin, kasabaların ve devletlerin göreli gücünde yatıyor olabilir."],
  ],
  [
    ["The{} plague{veba}, in{} other{başka} words{sözcükler}, created{yaratmak} pressure{baskı} for{} change{değişim} without{-meden} dictating{dikte etmek} its{} direction{yön}.", "Başka bir deyişle veba, değişimin yönünü dikte etmeden değişim için baskı yarattı."],
    ["Demographic{demografik} disaster{felaket} opened{açmak} a{} door{kapı}; whether{-ip -mediği} ordinary{sıradan} people{insanlar} could{-ebilmek} walk{yürümek} through{içinden} it{} depended{bağlı olmak} on{-e} institutions{kurumlar} that{ki} had{} existed{var olmak} long{çok} before{önce} the{} first{ilk} infected{enfekte} ships{gemiler} arrived{varmak}.", "Demografik felaket bir kapı açtı; sıradan insanların bu kapıdan geçip geçemeyeceği ise ilk enfekte gemiler gelmeden çok önce var olan kurumlara bağlıydı."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-black-death-economy", rows);
const camb = "University of Cambridge Apollo repository, Centralisation of Labour Regulation in Response to the Black Death: The Statute of Labourers and Contract Law; https://www.repository.cam.ac.uk/items/d22a04db-31bb-48cc-839e-a89ec1e5d0d5";
const yale = "Yale Law School Avalon Project, The Statute of Labourers, 1351; https://avalon.law.yale.edu/medieval/statlab.asp";
const pmcPlague = "PMC (NIH), History of the Plague: An Ancient Pandemic for the Age of COVID-19; https://pmc.ncbi.nlm.nih.gov/articles/PMC7513766/";
const oxtax = "Bodleian Libraries (Oxford), Taxation in England; https://libguides.bodleian.ox.ac.uk/law-histcom/tax";
const oxlacey = "University of Oxford ORA, Lacey, Grace for the rebels: the role of the royal pardon in the Peasants' Revolt of 1381; https://ora.ox.ac.uk/objects/uuid:7aa022f4-1326-4f07-afff-b36cce95f261/files/m5311f6579db5830f6c2a3303954c29d7";
const pmcBailey = "PMC (NIH), review of Mark Bailey, After the Black Death; https://pmc.ncbi.nlm.nih.gov/articles/PMC9427132/";

export default {
  slug: "c1-black-death-economy", level: "C1", title: "A Door Opened by the Plague", topic: "Tarih", sortOrder: 31, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central argument of the passage?", evidence: findEvidence(paragraphs, "created pressure for change without dictating its direction"), options: [
      option("o1", "The plague's effects hinged on local power", true, null, "Yazar vebanın değişim baskısı yarattığını ama sonucun kurumlara ve göreli güce bağlı olduğunu savunur."),
      option("o2", "Labour scarcity by itself made peasants richer", false, "extreme", "Yazar kıtlığın tek başına daha iyi yaşam garanti ettiği fikrini açıkça sorgular."),
      option("o3", "English wage laws successfully kept pay frozen", false, "reverse", "Metin uygulamanın düzensiz olduğunu ve ücretlerin yükseldiğini söyler."),
      option("o4", "Lords elsewhere lost most power after the plague", false, "reverse", "Avrupa'nın başka bölgelerinde toprak ağaları köylüler üzerindeki hakimiyetini sıkılaştırdı."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about the English wage laws does the passage support?", evidence: findEvidence(paragraphs, "wages for many workers rose in the decades that followed despite the law"), options: [
      option("o1", "Wages for many rose in spite of them", true, null, "Metin birçok işçinin ücretinin yasaya rağmen yükseldiğini söyler."),
      option("o2", "They were introduced after the 1381 revolt", false, "reverse", "Yasalar 1349 ve 1351 tarihlidir; ayaklanma 1381'de, onlardan sonra oldu."),
      option("o3", "They succeeded in holding pay at old levels", false, "reverse", "Amaç buydu ama uygulama düzensiz kaldı ve ücretler yükseldi."),
      option("o4", "They raised pay to attract scarce workers", false, "reverse", "Yasalar ücretleri yükseltmeyi değil, eski düzeyde tutmayı amaçladı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “patchy” mean in the second paragraph?", evidence: findEvidence(paragraphs, "Enforcement proved patchy"), options: [
      option("o1", "Inconsistent in practice", true, null, "Patchy, yer yer işleyen, düzensiz ve tutarsız demektir; ücretlerin yine de yükselmesi bunu destekler."),
      option("o2", "Harsh and strictly applied", false, "reverse", "Sıkı uygulama olsaydı ücretler yasaya rağmen yükselmezdi."),
      option("o3", "Popular among the workers", false, "context", "Metin işçilerin bu denetimleri sevdiğinden söz etmez; uygulama düzensiz kaldı ve ücretler yasaya rağmen yükseldi."),
      option("o4", "Quickly withdrawn by law", false, "context", "Yasanın geri çekildiğinden söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the image of an “opened door” suggest?", evidence: findEvidence(paragraphs, "Demographic disaster opened a door"), options: [
      option("o1", "Gains were possible, not guaranteed", true, null, "Kapı açıldı, ama içinden geçilip geçilemeyeceği kurumlara bağlıydı; kazanç bir olasılıktı."),
      option("o2", "Peasants were freed by a royal decree", false, "notstated", "Kraliyet kararnamesi işçileri özgürleştirmedi, tersine kısıtladı."),
      option("o3", "Trade with foreign ports quickly expanded", false, "context", "Gemiler yalnızca vebanın gelişiyle anılır; ticaret genişlemesi anlatılmaz."),
      option("o4", "Landlords happily welcomed the new conditions", false, "reverse", "Metin toprak sahiplerinin değişimi sessizce kabul etmediğini söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Veba Messina'ya 1347'de Cenova gemileriyle ulaştı; 1347-1352 arasında Avrupa nüfusunun en az üçte biri öldü (köylerin terk edilmesi iddiası kaynakta olmadığından metinden çıkarıldı).", source: pmcPlague, checkedOn: "2026-11-25" },
    { claim: "Kara Ölüm İngiliz nüfusunun tahminen üçte birini ila yarısını öldürdü ve tarım işçisi kıtlığı yarattı; 1349 Ordinance ve 1351 Statute of Labourers ücret artışlarını bastırmayı amaçladı, ancak uygulama altyapısı eksikliği gibi nedenlerle etkinliği sınırlı kaldı.", source: camb, checkedOn: "2026-11-25" },
    { claim: "1351 Statute metni: ücretler vebadan önceki yıllardaki (beş-altı yıl) düzeye bağlanır; hizmetkârın süre dolmadan izinsiz ayrılması cezalandırılır.", source: yale, checkedOn: "2026-11-25" },
    { claim: "1380 tarihli üçüncü poll tax (kişi başı 1 şilin) Köylü Ayaklanması'na yol açtı.", source: oxtax, checkedOn: "2026-11-25" },
    { claim: "Köylü Ayaklanması 1381 yazında gerçekleşti (13 Aralık 1381'de Parlamento af şeması). Not: 'işçi yasalarına duyulan öfke' ifadesi doğrulanamadığı için çıkarıldı.", source: oxlacey, checkedOn: "2026-11-25" },
    { claim: "İngiltere'de serfliğin çözülmesi Kara Ölüm sonrası incelenir ve Avrupa'nın başka yerlerindeki yeniden sıkılaşmayla karşılaştırılır (Bailey incelemesi); 'ikinci serflik' etiketi ve 'doğu Avrupa' ayrımı kaynakta bulunmadığından çıkarıldı. Bölgesel güç dengesi önerisi metinde 'olabilir' ile yazarın hipotezi olarak sunuluyor, doğrulanmış iddia değil.", source: pmcBailey, checkedOn: "2026-11-25" },
  ] },
};
