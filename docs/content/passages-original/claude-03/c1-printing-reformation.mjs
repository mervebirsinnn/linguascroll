import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["It{} is{} tempting{cazip} to{-mek} tell{anlatmak} the{} story{hikâye} of{} the{} Reformation{Reform (Protestan Reformu)} as{} a{} simple{basit} chain{zincir} of{} cause{neden} and{} effect{sonuç}: a{} new{yeni} machine{makine} appeared{ortaya çıkmak}, and{} a{} religious{dinî} revolution{devrim} followed{ardından gelmek}.", "Reform'un hikâyesini basit bir neden-sonuç zinciri olarak anlatmak caziptir: yeni bir makine ortaya çıktı ve ardından dinî bir devrim geldi."],
    ["Johannes{Johannes} Gutenberg's{Gutenberg'in} system{sistem} of{} movable{hareketli} metal{metal} type{harf (matbaa harfi)}, developed{geliştirilmiş} in{} Mainz{Mainz} in{} the{} middle{orta} of{} the{} fifteenth{on beşinci} century{yüzyıl}, certainly{kesinlikle} made{kılmak} texts{metinler} cheaper{daha ucuz} and{} far{çok} quicker{daha hızlı} to{-mek} reproduce{çoğaltmak} than{-den} copying{kopyalama} by{ile} hand{el}.", "Johannes Gutenberg'in on beşinci yüzyılın ortasında Mainz'da geliştirilen hareketli metal harf sistemi, metinleri elle kopyalamaya göre kesinlikle daha ucuz ve çok daha hızlı çoğaltılır kıldı."],
    ["Yet{yine de} the{} Church{Kilise} was{} among{arasında} the{} early{erken} customers{müşteriler} of{} the{} new{yeni} presses{baskı makineleri}, and{} among{arasında} the{} earliest{en erken} dated{tarihli} printed{basılmış} items{öğeler}, attributed{atfedilmiş} to{-e} Gutenberg's{Gutenberg'in} press{baskı makinesi}, were{} letters{mektuplar} of{} indulgence{endülijans (günah bağışı belgesi)}, the{} very{ta kendisi} documents{belgeler} whose{ki onların} sale{satış} would{-ecekti} later{daha sonra} provoke{kışkırtmak} Martin{Martin} Luther{Luther}.", "Yine de Kilise yeni baskı makinelerinin ilk müşterileri arasındaydı ve Gutenberg'in baskı makinesine atfedilen en eski tarihli basılı öğeler arasında endülijans mektupları vardı; satışları daha sonra Martin Luther'i kışkırtacak olan belgelerin ta kendisi."],
  ],
  [
    ["When{-dığında} Luther{Luther} set{ortaya koymak (set out)} out{ortaya koymak (set out)} his{} Ninety{doksan}-five{beş} Theses{tezler} in{} 1517, he{} wrote{yazmak} them{} in{} Latin{Latince} as{} propositions{önermeler} for{} academic{akademik} debate{tartışma}.", "Luther 1517'de Doksan Beş Tez'ini ortaya koyduğunda, onları akademik tartışma için önermeler olarak Latince yazdı."],
    ["Tradition{gelenek} holds{kabul etmek (hold: ileri sürmek)} that{-dığını} he{} posted{asmak} them{} on{} a{} church{kilise} door{kapı} in{} Wittenberg{Wittenberg}, although{-e rağmen} historians{tarihçiler} still{hâlâ} disagree{anlaşamamak} about{hakkında} whether{-ip -mediği} that{o} scene{sahne} took{yer almak (take place)} place{yer almak (take place)}.", "Geleneğe göre onları Wittenberg'de bir kilise kapısına astı; ancak tarihçiler bu sahnenin yaşanıp yaşanmadığı konusunda hâlâ anlaşamıyor."],
    ["What{-en şey} is{} far{çok} less{daha az} disputed{tartışmalı} is{} that{-dığı} printers{matbaacılar} soon{kısa sürede} reproduced{çoğaltmak} the{} theses{tezler}, and{} that{-dığı} Luther{Luther} went{devam etmek (go on to)} on{devam etmek (go on to)} to{-meye} write{yazmak} short{kısa} pamphlets{broşürler} in{} German{Almanca}, which{ki bunlar} could{-ebilirdi} reach{ulaşmak} readers{okurlar} well{çok} beyond{ötesinde} the{} universities{üniversiteler}.", "Çok daha az tartışmalı olan, matbaacıların tezleri kısa sürede çoğalttığı ve Luther'in ardından üniversitelerin çok ötesindeki okurlara ulaşabilen kısa Almanca broşürler yazdığıdır."],
  ],
  [
    ["A{} comparison{karşılaştırma} sharpens{keskinleştirmek} the{} point{nokta}.", "Bir karşılaştırma bu noktayı keskinleştirir."],
    ["A{} century{yüzyıl} earlier{önce}, the{} Czech{Çek} reformer{reformcu} Jan{Jan} Hus{Hus} had{} raised{dile getirmek} criticisms{eleştiriler} of{} the{} Church{Kilise} that{ki} resembled{benzemek} Luther's{Luther'inkiler} in{} several{birkaç} respects{bakımlar}, and{} he{} was{} burned{yakılmak} at{} the{} stake{kazık (yakılma direği)} in{} 1415.", "Bir yüzyıl önce Çek reformcu Jan Hus, Kilise'ye birkaç bakımdan Luther'inkine benzeyen eleştiriler yöneltmişti ve 1415'te kazıkta yakıldı."],
    ["His{} ideas{fikirler} survived{hayatta kalmak} in{} Bohemia{Bohemya}, but{} without{olmadan} presses{baskı makineleri} they{} travelled{yayılmak (yol almak)} slowly{yavaşça}.", "Fikirleri Bohemya'da yaşamaya devam etti, ancak baskı makineleri olmadan yavaş yayıldı."],
    ["Printing{matbaacılık} did{} not{} create{yaratmak} the{} grievances{şikâyetler (yakınma nedenleri)}; it{} changed{değiştirmek} how{ne kadar} quickly{hızla} they{} could{-ebilirdi} circulate{dolaşmak} and{} how{ne kadar} difficult{zor} they{} were{} to{-mek} suppress{bastırmak}.", "Matbaa şikâyetleri yaratmadı; onların ne kadar hızlı dolaşabileceğini ve bastırılmalarının ne kadar zor olacağını değiştirdi."],
  ],
  [
    ["Historians{tarihçiler} nonetheless{yine de} disagree{anlaşamamak} about{hakkında} how{ne kadar} much{çok} weight{ağırlık (önem)} the{} press{matbaa} deserves{hak etmek}.", "Tarihçiler yine de matbaanın ne kadar önemi hak ettiği konusunda anlaşamıyor."],
    ["Elizabeth{Elizabeth} Eisenstein{Eisenstein} argued{savunmak} in{} 1979 that{-dığını} print{basım} was{} a{} genuine{gerçek} agent{etken} of{} change{değişim}, while{-iken} her{} critics{eleştirmenler} warned{uyarmak} against{karşı} treating{ele almak} technology{teknoloji} as{} destiny{kader}, arguing{savunmak} that{-dığını} print{basım} mostly{çoğunlukla} carried{taşımak} messages{mesajlar} shaped{şekillendirilmiş} by{tarafından} wider{daha geniş} social{toplumsal} forces{güçler}.", "Elizabeth Eisenstein 1979'da basımın gerçek bir değişim etkeni olduğunu savundu; eleştirmenleri ise teknolojiyi kader gibi görmeye karşı uyardı ve basımın çoğunlukla daha geniş toplumsal güçlerce şekillendirilmiş mesajlar taşıdığını savundu."],
    ["The{} more{daha} defensible{savunulabilir} view{görüş} is{} that{-dığı} printing{matbaacılık} was{} a{} necessary{gerekli} condition{koşul} for{} the{} speed{hız} of{} the{} Reformation{Reform} rather{-den çok (rather than)} than{-den çok (rather than)} a{} sufficient{yeterli} explanation{açıklama} for{} it{}.", "Daha savunulabilir görüş, matbaanın Reform'un hızı için yeterli bir açıklamadan çok gerekli bir koşul olduğudur."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-printing-reformation", rows);
const gutenberg = "Encyclopaedia Britannica, Johannes Gutenberg; https://www.britannica.com/biography/Johannes-Gutenberg";
const theses = "Encyclopaedia Britannica, Ninety-five Theses; https://www.britannica.com/event/Ninety-five-Theses";
const luther = "Encyclopaedia Britannica, Martin Luther; https://www.britannica.com/biography/Martin-Luther";
const hus = "Encyclopaedia Britannica, Jan Hus; https://www.britannica.com/biography/Jan-Hus";
const eisenstein = "Elizabeth L. Eisenstein, The Printing Press as an Agent of Change, Cambridge University Press (1979)";

export default {
  slug: "c1-printing-reformation", level: "C1", title: "The Press and the Protest", topic: "Tarih", sortOrder: 37, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central argument?", evidence: findEvidence(paragraphs, "Printing did not create the grievances; it changed how quickly they could circulate and how difficult they were to suppress."), options: [
      option("o1", "Printing sped up the spread of existing grievances", true, null, "Yazar matbaanın şikâyetleri yaratmadığını, var olan şikâyetlerin yayılma hızını ve bastırılma güçlüğünü değiştirdiğini savunur."),
      option("o2", "Printing alone caused the Reformation to happen", false, "extreme", "Yazar matbaayı yeterli bir açıklama değil, gerekli bir koşul olarak görür."),
      option("o3", "Luther's theses mattered less than Hus's ideas", false, "notstated", "Metin iki reformcunun önemini kıyaslamaz; Hus örneğini yayılma hızı için kullanır."),
      option("o4", "The Church tried to ban printing from the very beginning", false, "reverse", "Metne göre Kilise baskı makinelerinin ilk müşterileri arasındaydı."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage say about letters of indulgence?", evidence: findEvidence(paragraphs, "were letters of indulgence"), options: [
      option("o1", "Among the earliest dated items to come off a press", true, null, "Metne göre en eski tarihli basılı ürünler arasında indulgence mektupları vardı."),
      option("o2", "Documents Luther had printed to spread his theses widely", false, "detail", "Luther'i kışkırtan şey bu belgelerin satışıydı; onları çoğaltan Luther değildi."),
      option("o3", "Texts that Gutenberg refused to print for the Church", false, "reverse", "Kilise matbaanın ilk müşterilerindendi; reddedilmediler."),
      option("o4", "Items Hus circulated in Bohemia before his death in 1415", false, "detail", "Hus ve Bohemya başka bir bağlamda anılır; indulgence mektuplarıyla ilgisi kurulmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “agent” mean in “print was a genuine agent of change”?", evidence: findEvidence(paragraphs, "print was a genuine agent of change"), options: [
      option("o1", "Force that causes change", true, null, "Agent burada bir şeyi doğuran etken, güç anlamındadır."),
      option("o2", "Representative acting for a client", false, "context", "Temsilci anlamı gerçektir ama matbaa bir kişi değildir."),
      option("o3", "Substance that causes a reaction", false, "context", "Kimyasal madde anlamı bu bağlamda geçerli değildir."),
      option("o4", "Secret informer for a state", false, "context", "Casus anlamı bağlama uymaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author most likely mention Jan Hus?", evidence: findEvidence(paragraphs, "His ideas survived in Bohemia, but without presses they travelled slowly."), options: [
      option("o1", "To show similar criticism spread slowly without print", true, null, "Benzer eleştiriler matbaa olmadan yavaş yayıldı; bu karşılaştırma matbaanın hızlandırıcı rolünü gösterir."),
      option("o2", "To prove that Hus influenced Luther directly", false, "notstated", "Metin yalnızca eleştirilerin benzediğini söyler; doğrudan bir etkiden söz etmez."),
      option("o3", "To argue that Bohemia resisted the Church more strongly", false, "notstated", "Bohemya'nın direnişinin gücü kıyaslanmaz."),
      option("o4", "To suggest that printing made reformers safer from harm", false, "reverse", "Bastırılması zorlaşan şey fikirlerdir; reformcuların kişisel güvenliğinden söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Johannes Gutenberg hareketli metal harfle baskıyı 15. yüzyılın ortasında Mainz'da geliştirdi; baskı makinesine atfedilen en eski tarihli basılı öğeler arasında endülijans mektupları vardır.", source: gutenberg, checkedOn: "2026-11-23" },
    { claim: "Luther Doksan Beş Tez'i 1517'de Latince, akademik tartışma önermeleri olarak yazdı; Wittenberg kilise kapısına asıldığı geleneği tarihçilerce tartışılır; tezler kısa sürede basılıp yayıldı.", source: theses, checkedOn: "2026-11-23" },
    { claim: "Luther sonraki yıllarda geniş okur kitlesine ulaşan Almanca broşürler yazdı.", source: luther, checkedOn: "2026-11-23" },
    { claim: "Çek reformcu Jan Hus Kilise'yi eleştirdi (endülijanslar dahil) ve 1415'te Konstanz'da kazıkta yakıldı.", source: hus, checkedOn: "2026-11-23" },
    { claim: "Elizabeth Eisenstein 1979'da matbaayı bir değişim etkeni olarak ele alan eserini yayımladı; bu tez tarihçiler arasında tartışılmıştır.", source: eisenstein, checkedOn: "2026-11-23" },
  ] },
};
