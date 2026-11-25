import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{} 1929 Edwin{Edwin} Hubble{Hubble} published{yayımlamak} evidence{kanıt} that{ki} galaxies{gökadalar} beyond{ötesindeki} our{} own{kendi} are{}, on{ortalamada (on average)} average{ortalamada (on average)}, moving{hareket etmek} away{uzağa} from{-den} us{}, and{} that{ki} the{} more{daha} distant{uzak} a{} galaxy{gökada} is{}, the{} faster{daha hızlı} it{} appears{görünmek} to{-mek} recede{uzaklaşmak}.", "Edwin Hubble 1929'da, kendi gökadamızın ötesindeki gökadaların ortalamada bizden uzaklaştığına ve bir gökada ne kadar uzaksa o kadar hızlı uzaklaşıyor göründüğüne dair kanıt yayımladı."],
    ["The{} relationship{ilişki} is{} roughly{kabaca} proportional{orantılı}: a{} galaxy{gökada} twice{iki kat} as{} far{uzak} away{uzakta} recedes{uzaklaşmak} about{yaklaşık} twice{iki kat} as{} fast{hızlı}.", "İlişki kabaca orantılıdır: İki kat uzaktaki bir gökada yaklaşık iki kat hızlı uzaklaşır."],
    ["Hubble{Hubble} relied{dayanmak} on{-e} measurements{ölçümler} of{} redshift{kırmızıya kayma}, many{birçoğu} of{} them{} made{yapılmak} earlier{daha önce} by{tarafından} Vesto{Vesto} Slipher{Slipher}, and{} combined{birleştirmek} them{} with{} his{} own{kendi} estimates{tahminler} of{} distance{uzaklık}.", "Hubble, birçoğu daha önce Vesto Slipher tarafından yapılmış kırmızıya kayma ölçümlerine dayandı ve bunları kendi uzaklık tahminleriyle birleştirdi."],
  ],
  [
    ["The{} finding{bulgu} is{} often{sıklıkla} misread{yanlış okumak} as{olarak} a{} picture{tablo, resim} of{} galaxies{gökadalar} flying{uçmak} outward{dışa doğru} from{-den} a{} central{merkezi} explosion{patlama}.", "Bulgu sıklıkla, merkezi bir patlamadan dışa doğru uçan gökadaların tablosu olarak yanlış okunur."],
    ["In{} the{} standard{standart} interpretation{yorum}, based{dayanmak} on{-e} general{genel} relativity{görelilik}, it{} is{} space{uzay} itself{kendisi} that{ki} expands{genişlemek}, so{bu yüzden} observers{gözlemciler} in{} any{herhangi bir} galaxy{gökada} would{-irdi} see{görmek} the{} same{aynı} pattern{örüntü} of{} recession{uzaklaşma} and{} none{hiçbiri} occupies{işgal etmek, bulunmak} a{} privileged{ayrıcalıklı} centre{merkez}.", "Genel göreliliğe dayanan standart yoruma göre genişleyen uzayın kendisidir; bu yüzden herhangi bir gökadadaki gözlemciler aynı uzaklaşma örüntüsünü görür ve hiçbiri ayrıcalıklı bir merkezde bulunmaz."],
    ["The{} light{ışık} from{-den} distant{uzak} galaxies{gökadalar} arrives{varmak} shifted{kaymış} towards{-e doğru} the{} red{kırmızı} end{uç} of{} the{} spectrum{tayf}, and{} the{} shift{kayma} grows{büyümek} with{} distance{uzaklık}.", "Uzak gökadalardan gelen ışık tayfın kırmızı ucuna doğru kaymış olarak varır ve bu kayma uzaklıkla birlikte büyür."],
  ],
  [
    ["Credit{itibar, pay} for{} the{} discovery{keşif} has{} also{de} been{} revisited{yeniden ele alınmak}.", "Keşfin kime ait olduğu da yeniden ele alındı."],
    ["The{} Belgian{Belçikalı} priest{rahip} and{} physicist{fizikçi} Georges{Georges} Lemaitre{Lemaitre} had{} predicted{öngörmek} a{} link{bağlantı} between{arasında} distance{uzaklık} and{} recession{uzaklaşma} speed{hız} and{} estimated{tahmin etmek} the{} rate{hız, oran} of{} expansion{genişleme} in{} a{} paper{makale} of{} 1927, two{iki} years{yıl} before{önce} Hubble's{Hubble'ınki}.", "Belçikalı rahip ve fizikçi Georges Lemaitre, Hubble'ınkinden iki yıl önce, 1927 tarihli bir makalede uzaklık ile uzaklaşma hızı arasındaki bağlantıyı öngörmüş ve genişleme hızını tahmin etmişti."],
    ["It{} appeared{yayımlanmak, çıkmak} in{} French{Fransızca} in{} a{} Belgian{Belçikalı} journal{dergi} and{} attracted{çekmek} scant{pek az, yetersiz} attention{ilgi} for{} years{yıllar}.", "Fransızca olarak Belçika'da bir dergide yayımlandı ve yıllarca pek az ilgi çekti."],
    ["In{} 2018 members{üyeler} of{} the{} International{Uluslararası} Astronomical{Astronomi} Union{Birliği} voted{oy vermek} to{-meye} recommend{önermek} calling{adlandırmak} the{} relation{ilişki} the{} Hubble{Hubble}-Lemaitre{Lemaitre} law{yasa}.", "2018'de Uluslararası Astronomi Birliği üyeleri ilişkinin Hubble-Lemaitre yasası diye adlandırılmasını önermek için oy verdi."],
  ],
  [
    ["The{} rate{hız, oran} of{} expansion{genişleme}, known{bilinmek} as{olarak} the{} Hubble{Hubble} constant{sabit}, remains{kalmak} surprisingly{şaşırtıcı biçimde} hard{zor} to{-mek} pin{kesin olarak belirlemek (pin down)} down{kesin olarak belirlemek (pin down)}.", "Hubble sabiti olarak bilinen genişleme hızını kesin olarak belirlemek şaşırtıcı biçimde zor olmayı sürdürüyor."],
    ["Measurements{ölçümler} based{dayanmak} on{-e} nearby{yakındaki} stars{yıldızlar} and{} supernovae{süpernovalar} give{vermek} a{} noticeably{belirgin biçimde} higher{daha yüksek} value{değer} than{-den} those{onlar} inferred{çıkarsanmak} from{-den} the{} cosmic{kozmik} microwave{mikrodalga} background{arka plan}, the{} faint{soluk} afterglow{art ışıma} of{} the{} early{erken} universe{evren}.", "Yakındaki yıldızlara ve süpernovalara dayanan ölçümler, erken evrenin soluk art ışıması olan kozmik mikrodalga arka plandan çıkarsananlardan belirgin biçimde daha yüksek bir değer verir."],
    ["Whether{-ip -mediği} this{} gap{fark, boşluk} reflects{yansıtmak} hidden{gizli} errors{hatalar} or{} physics{fizik} missing{eksik} from{-den} current{güncel} models{modeller} is{} unresolved{çözümsüz}, which{ki bu} suggests{düşündürmek} that{ki} even{bile} a{} result{sonuç} nearly{neredeyse} a{} century{yüzyıl} old{yaşında} can{-ebilir} still{hâlâ} yield{vermek, doğurmak} surprises{sürprizler}.", "Bu farkın gizli hataları mı yoksa güncel modellerde eksik olan fiziği mi yansıttığı çözümsüz kalıyor; bu da neredeyse yüz yaşındaki bir sonucun bile hâlâ sürprizler doğurabileceğini düşündürüyor."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-hubble-expansion", rows);
const osu = "Ohio State University Astronomy (D. Weinberg), Lecture 23: Expansion of the Universe; https://www.astronomy.ohio-state.edu/weinberg.21/Intro/lec23.html";
const nasaCosmic = "NASA Cosmic Times, 1929: Universe is Expanding; https://imagine.gsfc.nasa.gov/educators/programs/cosmictimes/online_edition/1929/expanding.html";
const kragh = "H. Kragh, Hubble Law or Hubble-Lemaitre Law? The IAU Resolution (Niels Bohr Institute / University of Copenhagen), arXiv:1809.02557; https://arxiv.org/pdf/1809.02557";
const iau = "International Astronomical Union, IAU members vote to recommend renaming the Hubble law as the Hubble-Lemaitre law (2018); https://www.iau.org/IAU/Iau/News/PR2018/hubble-lemaitre-law-renamed.aspx";
const riess = "A. Riess et al., A 2.4% Determination of the Local Value of the Hubble Constant (hosted by NASA Science / STScI); https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2016/06/STScI-01EVSR43GFM7J29RNZX7ER1WQW.pdf";
const tension = "Freedman, Measurements of the Hubble Constant: Tensions in Perspective (arXiv:2106.15656); https://arxiv.org/abs/2106.15656";

export default {
  slug: "c1-hubble-expansion", level: "C1", title: "An Old Result, Still Moving", topic: "Bilim", sortOrder: 35, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central point of the passage?", evidence: findEvidence(paragraphs, "even a result nearly a century old can still yield surprises"), options: [
      option("o1", "A famous result is still being refined", true, null, "Metin genişleme bulgusunun yorumunun, kime ait olduğunun ve ölçümünün hâlâ yeniden ele alındığını anlatır."),
      option("o2", "Hubble alone discovered cosmic expansion", false, "reverse", "Metin Lemaitre'nin daha önce aynı sonuca vardığını ve Slipher'ın ölçümlerini anlatır."),
      option("o3", "Galaxies fly out from a central blast", false, "reverse", "Metin bunun yaygın bir yanlış okuma olduğunu söyler."),
      option("o4", "The expansion rate is now precisely known", false, "reverse", "Hubble sabitini kesin belirlemek hâlâ zordur."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about Lemaitre's work does the passage support?", evidence: findEvidence(paragraphs, "in a paper of 1927, two years before Hubble's"), options: [
      option("o1", "It came out two years before Hubble's", true, null, "Lemaitre'nin makalesi 1927'de, Hubble'ınkinden iki yıl önce çıktı."),
      option("o2", "It was published in English for experts", false, "reverse", "Makale Belçika'da bir dergide Fransızca yayımlandı."),
      option("o3", "It measured the cosmic microwave background", false, "reverse", "Mikrodalga arka plan bugünkü Hubble sabiti ölçümleriyle ilgilidir, Lemaitre'yle değil."),
      option("o4", "It won immediate and wide recognition", false, "reverse", "Yıllarca pek az ilgi gördü."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “scant” mean in the third paragraph?", evidence: findEvidence(paragraphs, "attracted scant attention for years"), options: [
      option("o1", "Very little", true, null, "Scant, çok az ve yetersiz demektir; makale yıllarca pek ilgi çekmedi."),
      option("o2", "A great deal of", false, "reverse", "Bu scant kelimesinin tersidir."),
      option("o3", "Harsh and unfair", false, "context", "Eleştirinin sertliğinden söz edilmez; konu ilginin miktarıdır."),
      option("o4", "Slow but steady", false, "context", "Yavaş ama düzenli artan bir ilgi anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about the position of our own galaxy?", evidence: findEvidence(paragraphs, "none occupies a privileged centre"), options: [
      option("o1", "It is not at a special centre", true, null, "Her gökadadan aynı örüntü görüldüğüne göre bizim gökadamız da ayrıcalıklı bir merkezde değildir."),
      option("o2", "It lies at the centre of the expansion", false, "reverse", "Metin hiçbir gökadanın ayrıcalıklı bir merkezde olmadığını söyler."),
      option("o3", "It moves faster than distant galaxies", false, "reverse", "Hız uzaklıkla artar; uzak gökadalar daha hızlı uzaklaşır."),
      option("o4", "It sends out the most redshifted light", false, "context", "Kırmızıya kayma uzak gökadaların ışığı için anlatılır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Hubble 1929'da uzak nebulaların daha hızlı uzaklaştığını buldu (kırmızıya kayma uzaklıkla artar); Vesto Slipher 1912'den itibaren spiral nebulaların tayflarını kaydetti ve çoğunda belirgin kırmızıya kayma buldu; uzayın kendisi genişlemektedir.", source: nasaCosmic, checkedOn: "2026-11-25" },
    { claim: "v = Hd: hız uzaklıkla orantılı; genişlemenin bir 'merkezi' yoktur, 'uzaya doğru değil uzayın genişlemesi' söz konusudur; diğer gökadalardaki gözlemciler de aynı örüntüyü görür. Not: 'ışığın yolculukta gerilmesi' ifadesi doğrulanamadığı için metinden çıkarıldı.", source: osu, checkedOn: "2026-11-25" },
    { claim: "Lemaitre 1927'de Annales de la Societe Scientifique de Bruxelles'te Fransızca makalesinde hız-uzaklık yasasını öngördü ve genişleme sabitini tahmin etti, Hubble'dan iki yıl önce; katkısı uzun süre ihmal edildi. 'az okunan dergi' ve 'Einstein denklemlerinden türetme' ayrıntıları doğrulanamadığı için çıkarıldı/yumuşatıldı (Belçika dergisi, öngörü).", source: kragh, checkedOn: "2026-11-25" },
    { claim: "IAU üyeleri 2018'de Hubble yasasının Hubble-Lemaitre yasası olarak adlandırılması önerisini oyladı (oyların %78'i lehte).", source: iau, checkedOn: "2026-11-25" },
    { claim: "Basamaklı (Cepheid/süpernova) yerel Hubble sabiti ölçümü, Planck/CMB tabanlı tahminden yüksektir (73.24 vs 66.93, 3.4 sigma); fark sistematik hatalar ya da yeni fizikle açıklanabilir.", source: riess, checkedOn: "2026-11-25" },
    { claim: "Yerel ve CMB tabanlı Hubble sabiti arasındaki uyumsuzluğun çözülmesi hâlâ tartışmalıdır; gelecek Gaia/HST/JWST gözlemleri bekleniyor.", source: tension, checkedOn: "2026-11-25" },
  ] },
};
