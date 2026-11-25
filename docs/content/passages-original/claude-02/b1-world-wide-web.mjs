import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} nineteen{on dokuz} eighty{seksen} nine{dokuz}, a{} young{genç} scientist{bilim insanı} named{adlı} Tim{Tim} Berners{Berners}-Lee{Lee} worked{çalışıyordu} at{-de} CERN{CERN}, a{} big{büyük} research{araştırma} centre{merkez} in{} Switzerland{İsviçre}.", "1989'da Tim Berners-Lee adlı genç bir bilim insanı, İsviçre'deki büyük bir araştırma merkezi olan CERN'de çalışıyordu."],
    ["Many{birçok} scientists{bilim insanları} there{orada} had{vardı} documents{belgeler} on{üzerinde} different{farklı} computers{bilgisayarlar}, and{} sharing{paylaşmak} them{onları} was{} slow{yavaş}.", "Oradaki birçok bilim insanının belgeleri farklı bilgisayarlardaydı ve onları paylaşmak yavaştı."],
    ["So{bu yüzden} he{} wrote{yazdı} a{} proposal{öneri} for{için} a{} better{daha iyi} way{yol} to{-mek} connect{bağlamak} information{bilgi}.", "Bu yüzden bilgiyi bağlamanın daha iyi bir yolu için bir öneri yazdı."],
    ["He{} wanted{istedi} everyone{herkes} to{-mesini} find{bulmak} information{bilgi} easily{kolayca}.", "Herkesin bilgiyi kolayca bulmasını istedi."],
  ],
  [
    ["By{-e kadar} the{} end{son} of{} nineteen{on dokuz} ninety{doksan}, the{} first{ilk} Web{Web} server{sunucu} and{} the{} first{ilk} browser{tarayıcı} were{} working{çalışıyor} at{-de} CERN{CERN}.", "1990'ın sonuna kadar ilk Web sunucusu ve ilk tarayıcı CERN'de çalışıyordu."],
    ["The{} first{ilk} website{web sitesi} was{} kept{tutuldu} on{üzerinde} Berners{Berners}-Lee's{Lee'nin} own{kendi} computer{bilgisayar}, and{} it{} explained{açıkladı} the{} project{proje} itself{kendisi}.", "İlk web sitesi Berners-Lee'nin kendi bilgisayarında tutuldu ve projenin kendisini anlatıyordu."],
    ["At{-de} first{önce}, mostly{çoğunlukla} scientists{bilim insanları} used{kullandı} it{}.", "Önce onu çoğunlukla bilim insanları kullandı."],
  ],
  [
    ["In{-de} nineteen{on dokuz} ninety{doksan} three{üç}, CERN{CERN} said{söyledi} that{ki} anyone{herkes} could{-ebilir} use{kullanmak} the{} Web{Web} software{yazılım} for{için} free{ücretsiz}.", "1993'te CERN, herkesin Web yazılımını ücretsiz kullanabileceğini söyledi."],
    ["This{} decision{karar} helped{yardım etti} the{} Web{Web} spread{yayılmak} quickly{hızla} around{çevresinde} the{} world{dünya}.", "Bu karar Web'in dünya çapında hızla yayılmasına yardım etti."],
    ["Today{bugün}, billions{milyarlarca} of{} people{insanlar} use{kullanır} it{} every{her} day{gün}.", "Bugün milyarlarca insan onu her gün kullanıyor."],
    ["People{insanlar} can{-ebilir} now{şimdi} read{okumak} news{haberler}, watch{izlemek} films{filmler} and{} talk{konuşmak} with{ile} friends{arkadaşlar} online{çevrimiçi}.", "İnsanlar artık çevrimiçi haber okuyabilir, film izleyebilir ve arkadaşlarıyla konuşabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-world-wide-web", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cern = "CERN, A short history of the Web; https://home.cern/science/computing/birth-web/short-history-web";

export default {
  slug: "b1-world-wide-web", level: "B1", title: "The Web Starts at CERN", topic: "Teknoloji", sortOrder: 18, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main idea of the passage?", evidence: ev(0, "he wrote a proposal for a better way to connect information"), options: [
      option("o1", "How the Web began and became free", true, null, "Metin Web'in doğuşunu ve ücretsiz hâle gelişini anlatır."),
      option("o2", "How CERN builds computers for schools", false, "notstated", "Okul bilgisayarları anlatılmaz."),
      option("o3", "Why scientists stopped sharing documents", false, "reverse", "Sorun paylaşımın yavaşlığıdır; bırakılması değil."),
      option("o4", "How browsers came before servers", false, "notstated", "Sıra anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Where was the first website kept?", evidence: findEvidence(paragraphs, "The first website was kept on Berners-Lee's own computer"), options: [
      option("o1", "On his own computer", true, null, "Metin Berners-Lee'nin kendi bilgisayarını söyler."),
      option("o2", "On a computer in a school", false, "notstated", "Okul anlatılmaz."),
      option("o3", "On a computer in a library", false, "notstated", "Kütüphane anlatılmaz."),
      option("o4", "On a computer in a shop", false, "notstated", "Dükkân anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “proposal” mean in the first paragraph?", evidence: findEvidence(paragraphs, "he wrote a proposal for a better way to connect information"), options: [
      option("o1", "A plan put forward", true, null, "Proposal, önerilen yazılı bir plandır."),
      option("o2", "A report of past results", false, "context", "Geçmiş sonuç raporu değildir."),
      option("o3", "A permission to use software", false, "context", "Yazılım sonraki paragrafta geçer."),
      option("o4", "A list of computer parts", false, "context", "Parça listesi anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why did the Web spread quickly after nineteen ninety three?", evidence: ev(2, "CERN said that anyone could use the Web software for free. This decision helped the Web spread quickly around the world."), options: [
      option("o1", "Its software cost a lot of money.", false, "reverse", "Yazılım ücretsiz hâle geldi."),
      option("o2", "Only scientists were allowed to use it.", false, "reverse", "Herkes kullanabilecekti."),
      option("o3", "Anyone could use it without paying.", true, null, "Ücretsiz olması yayılmayı kolaylaştırdı."),
      option("o4", "CERN closed the project in Switzerland.", false, "reverse", "Proje kapatılmadı, serbest bırakıldı."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Tim Berners-Lee CERN'de çalışırken 1989'da dağıtık bir bilgi sistemi öneren ilk öneriyi yazdı; 1990 sonuna kadar CERN'de ilk Web sunucusu ve tarayıcı çalışıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "İlk web sitesi Berners-Lee'nin NeXT bilgisayarında barındırıldı ve Web projesini anlatıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "30 Nisan 1993'te CERN, Web yazılımını kamu malı olarak serbest bıraktı; bu karar Web'in hızla yayılmasına katkı yaptı.", source: cern, checkedOn: "2026-11-23" },
  ] },
};
