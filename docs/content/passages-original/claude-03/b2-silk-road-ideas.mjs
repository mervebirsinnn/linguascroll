import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} name{ad} Silk{İpek} Road{Yolu} suggests{akla getirir} a{} single{tek} highway{ana yol}, but{} the{} reality{gerçek} was{} a{} wide{geniş} network{ağ} of{} land{kara} and{} sea{deniz} routes{yollar} connecting{bağlayan} China{Çin} with{} Central{Orta} Asia{Asya}, the{} Middle{Orta} East{Doğu} and{} the{} Mediterranean{Akdeniz}.", "İpek Yolu adı tek bir ana yolu akla getirir, ama gerçekte Çin'i Orta Asya, Orta Doğu ve Akdeniz'e bağlayan geniş bir kara ve deniz yolları ağıydı."],
    ["The{} term{terim} itself{kendisi} is{} modern{modern}; a{} German{Alman} geographer{coğrafyacı}, Ferdinand{Ferdinand} von{von} Richthofen{Richthofen}, made{yaptı} it{} popular{popüler} in{} the{} nineteenth{on dokuzuncu} century{yüzyıl}.", "Terimin kendisi moderndir; onu on dokuzuncu yüzyılda Alman coğrafyacı Ferdinand von Richthofen yaygınlaştırdı."],
    ["Goods{mallar} often{sık sık} passed{geçti} through{içinden} many{birçok} hands{eller} on{} their{} way{yol} between{arasında} towns{kasabalar} and{} markets{pazarlar}.", "Mallar kasabalar ve pazarlar arasındaki yolda çoğu zaman birçok elden geçti."],
  ],
  [
    ["Silk{ipek}, spices{baharatlar} and{} glass{cam} were{} valuable{değerli}, yet{yine de} some{bazıları} of{} the{} most{en} important{önemli} things{şeyler} that{ki} travelled{yol aldı} these{} routes{yollar} could{-ebildi} not{} be{} packed{paketlenmek} into{içine} a{} bag{çanta}.", "İpek, baharat ve cam değerliydi; yine de bu yollarda taşınan en önemli şeylerin bazıları bir çantaya konamazdı."],
    ["Buddhist{Budist} monks{keşişler} and{} teachers{öğretmenler} carried{taşıdı} their{} beliefs{inançlar} from{-den} India{Hindistan} into{-e} Central{Orta} Asia{Asya} and{} China{Çin}, where{orada} new{yeni} temples{tapınaklar} and{} translations{çeviriler} followed{ardından geldi}.", "Budist keşişler ve öğretmenler inançlarını Hindistan'dan Orta Asya'ya ve Çin'e taşıdı; orada ardından yeni tapınaklar ve çeviriler geldi."],
    ["Papermaking{kağıt yapımı}, first{ilk olarak} developed{geliştirilen} in{} China{Çin}, slowly{yavaşça} moved{ilerledi} west{batıya} into{-e} the{} Islamic{İslam} world{dünyası} and{} much{çok} later{daha sonra} reached{ulaştı} Europe{Avrupa}.", "İlk olarak Çin'de geliştirilen kağıt yapımı yavaşça batıya, İslam dünyasına ilerledi ve çok daha sonra Avrupa'ya ulaştı."],
    ["Musical{müzik} instruments{aletleri}, artistic{sanatsal} styles{üsluplar} and{} farming{tarım} techniques{teknikleri} spread{yayıldı} in{} similar{benzer} ways{yollar}.", "Müzik aletleri, sanatsal üsluplar ve tarım teknikleri de benzer yollarla yayıldı."],
  ],
  [
    ["Because{çünkü} ideas{fikirler} moved{ilerledi} through{aracılığıyla} so{o kadar} many{çok} people{insan}, they{} rarely{nadiren} arrived{vardı} unchanged{değişmeden}.", "Fikirler o kadar çok insanın elinden geçtiği için nadiren değişmeden ulaştı."],
    ["Each{her} community{topluluk} adapted{uyarladı} what{-i (ne)} it{} received{aldı} to{-e} its{} own{kendi} language{dil}, art{sanat} and{} needs{ihtiyaçlar}.", "Her topluluk aldığını kendi diline, sanatına ve ihtiyaçlarına uyarladı."],
    ["Historians{tarihçiler} therefore{bu nedenle} see{görür} the{} routes{yollar} less{daha az} as{} a{} simple{basit} trade{ticaret} line{hat} and{} more{daha çok} as{} a{} long{uzun} conversation{sohbet} between{arasında} cultures{kültürler}.", "Bu nedenle tarihçiler bu yolları basit bir ticaret hattından çok, kültürler arasında uzun bir sohbet olarak görür."],
    ["In{} that{o} sense{anlam}, the{} most{en} lasting{kalıcı} cargo{yük} of{} the{} Silk{İpek} Road{Yolu} was{} not{} silk{ipek} at{(at all: hiç)} all{(at all: hiç)}, but{} knowledge{bilgi}.", "Bu anlamda İpek Yolu'nun en kalıcı yükü hiç de ipek değil, bilgiydi."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-silk-road-ideas", rows);
const ev = (t) => findEvidence(paragraphs, t);
const unesco = "UNESCO, About the Silk Roads; https://www.unesco.org/en/silk-roads/about-silk-roads";
const yale = "YaleGlobal Online, The Silk Road: Old and New; https://archive-yaleglobal.yale.edu/content/silk-road-old-and-new";
const paper = "University of Utah Marriott Library, Paper is Fundamental (rare books exhibit); https://lib.utah.edu/collections/rarebooks/exhibits/past/Paper.php";
const buddhism = "Smithsonian Folklife Festival 2002, The Silk Road: Crossroads and Encounters of Faith; https://festival.si.edu/2002/the-silk-road/the-silk-road-crossroads-and-encounters-of-faith/smithsonian";

export default {
  slug: "b2-silk-road-ideas", level: "B2", title: "Cargo You Cannot Pack", topic: "Tarih", sortOrder: 37, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("the most lasting cargo of the Silk Road was not silk at all, but knowledge"), options: [
      option("o1", "The routes spread ideas as well as goods", true, null, "Metin İpek Yolu'nda mallarla birlikte inanç, teknik ve bilginin de yayıldığını anlatır."),
      option("o2", "The Silk Road was a single paved highway", false, "reverse", "Metin bunun tek bir yol değil, geniş bir ağ olduğunu söyler."),
      option("o3", "Goods never changed hands on the routes", false, "reverse", "Metne göre mallar çoğu zaman birçok elden geçti."),
      option("o4", "Silk was the cheapest product on the routes", false, "notstated", "Metin ipeği değerli sayar; fiyat karşılaştırması yapmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage say about papermaking?", evidence: ev("Papermaking, first developed in China, slowly moved west into the Islamic world and much later reached Europe."), options: [
      option("o1", "It began in China and moved west", true, null, "Metin kağıt yapımının Çin'de geliştiğini ve batıya yayıldığını söyler."),
      option("o2", "It began in Europe and moved east", false, "reverse", "Yön tam tersidir; Avrupa'ya en son ulaştı."),
      option("o3", "It was carried to India by Buddhist monks", false, "context", "Budist keşişler inançlarını Hindistan'dan taşıdı; kağıtla ilişkilendirilmez."),
      option("o4", "It reached Europe before the Islamic world", false, "reverse", "Metne göre önce İslam dünyasına, çok sonra Avrupa'ya ulaştı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “adapted” mean in paragraph 3?", evidence: ev("Each community adapted what it received to its own language, art and needs."), options: [
      option("o1", "Changed to suit new needs", true, null, "Adapt, bir şeyi yeni koşullara uygun hâle getirmek demektir."),
      option("o2", "Refused to accept something new", false, "reverse", "Topluluklar fikirleri reddetmedi, kendilerine göre değiştirdi."),
      option("o3", "Copied something without any change", false, "reverse", "Metin fikirlerin nadiren değişmeden ulaştığını söyler."),
      option("o4", "Sold something at a higher price", false, "context", "Ticaret bağlamı var ama kelime satışla ilgili değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about an idea that reached a distant city along the routes?", evidence: ev("they rarely arrived unchanged"), options: [
      option("o1", "It had likely changed along the way", true, null, "Fikirler pek çok insandan geçip her toplulukça uyarlandığı için uzak bir şehre değişmiş olarak ulaşmış olması beklenir."),
      option("o2", "It arrived in exactly its original form", false, "reverse", "Metin fikirlerin nadiren değişmeden ulaştığını söyler."),
      option("o3", "It was carried there by a single merchant", false, "context", "Metne göre mallar çoğu zaman birçok elden geçti; fikirler de birçok insanın aracılığıyla ilerledi."),
      option("o4", "Local people usually refused to accept it", false, "notstated", "Topluluklar fikirleri reddetmedi, uyarladı."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "İpek Yolları, doğu ile batıyı bağlayan kara ve deniz yollarından oluşan bir ağdı; yollar bilgi, fikir, kültür ve inançların yayılmasını sağladı.", source: unesco, checkedOn: "2026-11-25" },
    { claim: "'Die Seidenstrasse' terimini 1877'de Alman coğrafyacı Ferdinand von Richthofen ortaya attı; Çin'i Akdeniz'e bağlayan yol ağı iki bin yıl boyunca özel bir ad taşımadı; ticaret araçılar eliyle yürüyordu.", source: yale, checkedOn: "2026-11-25" },
    { claim: "İpek Yolu Buda'nın öğretilerinin yayılması için bir ağ sağladı; keşişler ve tüccarlar Orta Asya'da Budizm'in yerleşmesine katkıda bulundu; Budizm'in en büyük başarısı Çin'e yayılmasıyla geldi.", source: buddhism, checkedOn: "2026-11-25" },
    { claim: "Kağıt Çin'de Han hanedanı döneminde geliştirildi; 751 Talas Savaşı'ndan sonra İslam dünyasına (Semerkant, Bağdat) ulaştı; Avrupa'ya on birinci yüzyıla kadar ulaşmadı.", source: paper, checkedOn: "2026-11-25" },
  ] },
};
