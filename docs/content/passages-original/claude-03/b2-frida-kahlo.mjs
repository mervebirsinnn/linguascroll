import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Frida{Frida} Kahlo{Kahlo} was{} born{doğdu} in{} Mexico{Meksiko} City{Şehri} in{} 1907, in{} a{} house{ev} that{ki} is{} now{şimdi} a{} museum{müze} dedicated{adanmış} to{-e} her{} life{yaşam}, and{} she{} always{her zaman} came{geldi} back{geri} to{-e} it{}.", "Frida Kahlo 1907'de Mexico City'de, bugün yaşamına adanmış bir müze olan bir evde doğdu ve hep oraya geri döndü."],
    ["As{} a{} child{çocuk} she{} survived{atlattı} polio{çocuk felci}, which{ki bu} left{bıraktı} one{bir} leg{bacak} shorter{daha kısa} than{-den} the{} other{diğeri}.", "Çocukken çocuk felcini atlattı; hastalık bir bacağını diğerinden daha kısa bıraktı."],
    ["At{} eighteen{on sekiz}, she{} was{} badly{ağır şekilde} injured{yaralandı} when{-dığında} the{} bus{otobüs} she{} was{} riding{biniyordu} in{içinde} collided{çarpıştı} with{} a{} streetcar{tramvay}.", "On sekiz yaşında, bindiği otobüs bir tramvayla çarpıştığında ağır yaralandı."],
    ["During{sırasında} the{} long{uzun} months{aylar} she{} spent{geçirdi} in{} bed{yatak}, she{} began{başladı} to{-meye} paint{resim yapmak}, using{kullanarak} a{} mirror{ayna} placed{yerleştirilmiş} above{üstüne} her{onun (ona)} so{böylece} that{ki} she{} could{-ebildi} study{incelemek} her{} own{kendi} face{yüz}.", "Yatakta geçirdiği uzun aylar boyunca resim yapmaya başladı; kendi yüzünü inceleyebilmek için üstüne yerleştirilmiş bir ayna kullandı."],
  ],
  [
    ["Her{} self{öz}-portraits{portreler} are{} among{arasında} the{} most{en} outstanding{dikkat çekici} parts{bölümler} of{} her{} work{eser}, and{} their{} style{üslup} was{} influenced{etkilendi} by{tarafından} the{} portrait{portre} photography{fotoğrafçılık} she{} learned{öğrendi} from{-den} her{} father{baba}.", "Otoportreleri eserinin en dikkat çekici bölümleri arasındadır ve üslupları, babasından öğrendiği portre fotoğrafçılığından etkilenmiştir."],
    ["In{} her{} clothing{giysi} and{} her{} paintings{resimler} alike{aynı şekilde}, she{} tried{çalıştı} to{-meye} reclaim{yeniden sahiplenmek} the{} roots{kökler} of{} Mexican{Meksika} folk{halk} art{sanatı}.", "Hem giysilerinde hem resimlerinde Meksika halk sanatının köklerini yeniden sahiplenmeye çalıştı."],
    ["She{} explained{açıkladı} that{ki} she{} painted{resmetti} self{öz}-portraits{portreler} because{çünkü} she{} was{} often{sık sık} alone{yalnız} and{} because{çünkü} she{} was{} the{} person{kişi} she{} knew{tanıdığı} best{en iyi}.", "Otoportreler yaptığını, çünkü sık sık yalnız olduğunu ve en iyi tanıdığı kişinin kendisi olduğunu açıkladı."],
    ["She{} married{evlendi} the{} muralist{duvar resmi sanatçısı} Diego{Diego} Rivera{Rivera} in{} 1929, divorced{boşandı} him{ondan} in{} 1939 and{} remarried{yeniden evlendi} him{onunla} a{} year{yıl} later{sonra}.", "1929'da duvar resmi sanatçısı Diego Rivera ile evlendi, 1939'da ondan boşandı ve bir yıl sonra onunla yeniden evlendi."],
    ["Some{bazı} people{insanlar} thought{düşündü} she{} was{} a{} surrealist{gerçeküstücü}, but{} she{} rejected{reddetti} the{} term{terim} and{} said{söyledi} she{} painted{resmetti} her{} own{kendi} reality{gerçeklik}, not{} dreams{rüyalar}.", "Bazı insanlar onun gerçeküstücü olduğunu düşündü, ama o bu terimi reddetti ve rüyalarını değil, kendi gerçekliğini resmettiğini söyledi."],
  ],
  [
    ["She{} died{öldü} in{} 1954, and{} in{} 1958 her{} family{aile} home{ev} was{} opened{açıldı} to{-e} the{} public{halk} as{} the{} Frida{Frida} Kahlo{Kahlo} Museum{Müzesi}, now{şimdi} one{bir} of{} the{} most{en} popular{popüler} museums{müzeler} in{} the{} Mexican{Meksika} capital{başkent}.", "1954'te öldü; 1958'de aile evi Frida Kahlo Müzesi olarak halka açıldı ve bugün Meksika başkentinin en popüler müzelerinden biridir."],
    ["The{} museum{müze} describes{tanımlar} her{} as{} a{} reference{referans} that{ki} goes{gider} beyond{ötesine} the{} myth{efsane} she{} created{yarattı} around{çevresinde} herself{kendisi}.", "Müze onu, kendi çevresinde yarattığı efsanenin ötesine geçen bir referans olarak tanımlıyor."],
    ["Inside{içinde} the{} house{ev}, her{} crutches{koltuk değnekleri}, corsets{korseler} and{} medicines{ilaçlar} still{hâlâ} show{gösterir} the{} physical{fiziksel} suffering{acı} and{} many{birçok} operations{ameliyat} she{} endured{katlandı}.", "Evin içinde koltuk değnekleri, korseleri ve ilaçları, katlandığı fiziksel acıyı ve birçok ameliyatı hâlâ gösteriyor."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-frida-kahlo", rows);
const ev = (t) => findEvidence(paragraphs, t);
const bio = "Museo Frida Kahlo, Biography of Frida Kahlo (resmi PDF, 2020); https://www.museofridakahlo.org.mx/wp/wp-content/uploads/2022/08/Biografias-Frida-Kahlo-ingles.pdf";
const house = "Museo Frida Kahlo, The Blue House: Frida Kahlo's Intimate Universe (resmi PDF); https://www.museofridakahlo.org.mx/wp/wp-content/uploads/2022/08/The-Blue-House.pdf";
const pompidou = "Centre Pompidou, Frida Kahlo kaynak sayfasi; https://www.centrepompidou.fr/en/ressources/personne/cGE5K89";

export default {
  slug: "b2-frida-kahlo", level: "B2", title: "A Life Painted in Self-Portraits", topic: "Sanat", sortOrder: 41, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("she painted self-portraits because she was often alone"), options: [
      option("o1", "How Kahlo turned her experiences into art", true, null, "Metin hastalık ve kazanın ardından otoportreler yapan Kahlo'nun yaşamını ve mirasını anlatır."),
      option("o2", "How Diego Rivera taught Kahlo to paint murals", false, "notstated", "Rivera yalnızca eşi olarak anılır; ona resim öğrettiği söylenmez."),
      option("o3", "Why Kahlo called herself a surrealist", false, "reverse", "Kahlo gerçeküstücü terimini reddetti."),
      option("o4", "The history of Mexico City's museums", false, "context", "Müze yalnızca doğduğu ev için tek cümlede geçer."),
    ] },
    { key: "q2", type: "detail", prompt: "How did Kahlo study her own face while recovering?", evidence: ev("using a mirror placed above her so that she could study her own face"), options: [
      option("o1", "She used a mirror placed above her bed", true, null, "Metin yatakta yatarken üstüne yerleştirilmiş bir ayna kullandığını söyler."),
      option("o2", "She asked Diego Rivera to describe it", false, "notstated", "Metinde böyle bir bilgi yoktur."),
      option("o3", "She copied photographs taken by friends", false, "notstated", "Fotoğraflardan söz edilmez."),
      option("o4", "She painted from memory in a studio", false, "reverse", "Metne göre o dönemde yataktaydı ve ayna kullandı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “rejected” mean in paragraph 2?", evidence: ev("she rejected the term"), options: [
      option("o1", "Refused to accept", true, null, "Reject, bir şeyi kabul etmemek, reddetmek demektir."),
      option("o2", "Happily agreed with", false, "reverse", "Tam ters anlamdır; terimi benimsemedi."),
      option("o3", "Invented for herself", false, "notstated", "Terimi eleştirmenler kullandı; o icat etmedi."),
      option("o4", "Painted in bright colours", false, "context", "Cümle resimle ilgili ama kelime boyamak demek değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final paragraph suggest about how Kahlo is seen today?", evidence: ev("a reference that goes beyond the myth she created around herself"), options: [
      option("o1", "She is seen as more than her own myth", true, null, "Müze onu kendi yarattığı efsanenin ötesine geçen bir referans olarak tanımlar."),
      option("o2", "She is remembered only through her own myth", false, "extreme", "Metin tam tersini söyler: efsanenin ötesine geçen bir referanstır."),
      option("o3", "Her fame ended when the museum opened", false, "reverse", "Müze 1958'de açıldı ve bugün en popüler müzelerden biridir."),
      option("o4", "Her work is mainly known through her husband", false, "notstated", "Metinde böyle bir bilgi yoktur; Rivera yalnızca eşi olarak anılır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Frida Kahlo 6 Temmuz 1907'de Mexico City'de, ailesinin bugün Mavi Ev (Casa Azul) olarak bilinen evinde doğdu; altı yaşında çocuk felci geçirdi ve bir bacağı diğerinden kısa kaldı.", source: bio, checkedOn: "2026-11-25" },
    { claim: "18 yaşında, 17 Eylül 1925'te bindiği otobüse bir tramvay çarptı; aylarca hareketsiz kaldığı dönemde resim yapmaya başladı.", source: bio, checkedOn: "2026-11-25" },
    { claim: "Mavi Ev, Kahlo'nun doğduğu ve öldüğü yerdir; evlendikten sonra başka yerlerde yaşasa da hep aile evine döndü. Ev 1958'de, ölümünden dört yıl sonra müze yapıldı ve bugün Meksika başkentinin en popüler müzelerinden biridir.", source: house, checkedOn: "2026-11-25" },
    { claim: "Ev müzesinde aynalı yatak (kazadan sonra annesi kurmuştur), koltuk değnekleri, korseler ve ilaçlar sergilenir; bunlar fiziksel acılarına ve geçirdiği çok sayıda ameliyata tanıklık eder.", source: house, checkedOn: "2026-11-25" },
    { claim: "Otoportreleri, babasından öğrendiği fotoğraf portreciliğinden etkilenmiştir; giyiminde ve yaşamında Meksika halk sanatının köklerini yeniden sahiplenmeye çalıştı.", source: bio, checkedOn: "2026-11-25" },
    { claim: "1929'da Diego Rivera ile evlendi, 1939'da boşandı, bir yıl sonra yeniden evlendi.", source: bio, checkedOn: "2026-11-25" },
    { claim: "Sürrealistlerin aksine rüyalarını değil gerçekliğini resmettiğini söyledi.", source: bio, checkedOn: "2026-11-25" },
    { claim: "Otoportre yapmasını sık sık yalnız olmasına ve en iyi tanıdığı kişinin kendisi olmasına bağladı; gerçeküstücü etiketini reddetti, 'Rüya resmetmedim, kendi gerçekliğimi resmettim' dedi; Casa Azul 1958'den beri halka açıktır.", source: pompidou, checkedOn: "2026-11-25" },
    { claim: "Kahlo 13 Temmuz 1954'te Mavi Ev'de öldü; müzenin metni onu kendi yarattığı efsanenin ötesine geçen bir referans olarak tanımlar.", source: bio, checkedOn: "2026-11-25" },
  ] },
};
