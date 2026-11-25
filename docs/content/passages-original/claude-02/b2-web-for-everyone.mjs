import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} March{Mart} nineteen{on dokuz} eighty{seksen} nine{dokuz}, a{} young{genç} British{İngiliz} scientist{bilim insanı} named{adlı} Tim{Tim} Berners{Berners}-Lee{Lee} wrote{yazdı} a{} proposal{öneri} for{için} a{} distributed{dağıtık} information{bilgi} system{sistem} at{-de} CERN{CERN}, the{} European{Avrupa} particle{parçacık} physics{fizik} laboratory{laboratuvar} near{yakınında} Geneva{Cenevre}.", "Mart 1989'da Tim Berners-Lee adlı genç bir İngiliz bilim insanı, Cenevre yakınlarındaki Avrupa parçacık fiziği laboratuvarı CERN'de dağıtık bir bilgi sistemi için bir öneri yazdı."],
    ["His{onun} colleagues{meslektaşlar} kept{tuttu} documents{belgeler} on{üzerinde} many{birçok} incompatible{uyumsuz} computers{bilgisayarlar}, so{bu yüzden} finding{bulmak} and{} sharing{paylaşmak} information{bilgi} was{} slow{yavaş} and{} frustrating{sinir bozucu}.", "Meslektaşları belgelerini birbiriyle uyumsuz birçok bilgisayarda tutuyordu; bu yüzden bilgiyi bulmak ve paylaşmak yavaş ve sinir bozucuydu."],
    ["His{onun} idea{fikir} was{} to{-mek} link{bağlamak} documents{belgeler} together{birlikte} so{öyle ki} that{ki} a{} reader{okuyucu} could{-ebilirdi} jump{atlamak} from{-den} one{bir} to{-e} another{diğer} with{ile} a{} click{tıklama}.", "Fikri, bir okuyucunun tek bir tıklamayla birinden diğerine geçebilmesi için belgeleri birbirine bağlamaktı."],
  ],
  [
    ["By{-e kadar} the{} end{son} of{} nineteen{on dokuz} ninety{doksan}, the{} first{ilk} Web{Web} server{sunucu} and{} browser{tarayıcı} were{} running{çalışıyor} at{-de} CERN{CERN}.", "1990'ın sonuna kadar ilk Web sunucusu ve tarayıcısı CERN'de çalışıyordu."],
    ["The{} first{ilk} website{web sitesi} lived{bulunmak (barındırılmak)} on{üzerinde} Berners{Berners}-Lee's{Lee'nin} own{kendi} computer{bilgisayar} and{} described{tanımladı} the{} project{proje} itself{kendisi}.", "İlk web sitesi Berners-Lee'nin kendi bilgisayarında bulunuyordu ve projenin kendisini anlatıyordu."],
    ["At{-de} first{önce}, however{ancak}, it{} was{} mostly{çoğunlukla} used{kullanıldı} by{tarafından} physicists{fizikçiler}, and{} few{az} people{insanlar} outside{dışında} the{} laboratory{laboratuvar} had{} heard{duymuş} of{} it{}.", "Ancak başlangıçta çoğunlukla fizikçiler tarafından kullanıldı ve laboratuvarın dışındaki az kişi onu duymuştu."],
    ["Everything{her şey} changed{değişti} on{-de} thirty{otuz} April{Nisan} nineteen{on dokuz} ninety{doksan} three{üç}.", "Her şey 30 Nisan 1993'te değişti."],
  ],
  [
    ["On{-de} that{o} date{tarih}, CERN{CERN} released{serbest bıraktı} the{} Web{Web} software{yazılım} into{-e} the{} public{kamu} domain{alan}, which{ki bu} meant{demekti} that{ki} anyone{herkes} could{-ebilirdi} use{kullanmak} it{} freely{özgürce}.", "O tarihte CERN, Web yazılımını kamu malı olarak serbest bıraktı; bu, herkesin onu özgürce kullanabileceği anlamına geliyordu."],
    ["Without{olmadan} that{o} decision{karar}, the{} technology{teknoloji} might{-ebilirdi} have{} remained{kalmak} a{} specialist{uzman} tool{araç} or{ya da} become{olmak} the{} property{mülk} of{} a{} single{tek} company{şirket}.", "O karar olmasaydı teknoloji uzmanlara özgü bir araç olarak kalabilir ya da tek bir şirketin malı olabilirdi."],
    ["Instead{bunun yerine}, it{} spread{yayıldı} quickly{hızla}, and{} within{içinde} a{} few{birkaç} years{yıl} millions{milyonlarca} of{} people{insanlar} were{} using{kullanmak} it{}.", "Bunun yerine hızla yayıldı ve birkaç yıl içinde milyonlarca kişi onu kullanıyordu."],
    ["Today{bugün} the{} Web{Web} is{} part{parça} of{} everyday{gündelik} life{hayat}.", "Bugün Web gündelik hayatın bir parçasıdır."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-web-for-everyone", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cern = "CERN, A short history of the Web; https://home.cern/science/computing/birth-web/short-history-web";

export default {
  slug: "b2-web-for-everyone", level: "B2", title: "A Web for Everyone", topic: "Teknoloji", sortOrder: 18, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main idea of the passage?", evidence: ev(2, "CERN released the Web software into the public domain, which meant that anyone could use it freely."), options: [
      option("o1", "A free release helped the Web spread", true, null, "Metin serbest bırakılmanın Web'in yayılmasındaki rolünü anlatır."),
      option("o2", "A laboratory that refused to share code", false, "reverse", "CERN yazılımı serbest bıraktı."),
      option("o3", "A company that sold the first browser", false, "notstated", "Şirket anlatılmaz."),
      option("o4", "A scientist who left CERN to teach", false, "notstated", "Öğretmenlik anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "When did CERN release the Web software into the public domain?", evidence: ev(1, "Everything changed on thirty April nineteen ninety three."), options: [
      option("o1", "On thirty April nineteen ninety three", true, null, "Metin bu tarihi söyler."),
      option("o2", "In March nineteen eighty nine, with the proposal", false, "detail", "Mart 1989 öneri tarihidir."),
      option("o3", "At the end of nineteen ninety, with the server", false, "detail", "1990 sonu ilk sunucunun çalıştığı zamandır."),
      option("o4", "Two years after the browser was invented", false, "notstated", "Böyle bir süre verilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “incompatible” mean in the first paragraph?", evidence: ev(0, "many incompatible computers"), options: [
      option("o1", "Not able to work together", true, null, "Incompatible, birlikte çalışamayan demektir."),
      option("o2", "Very old and expensive to repair", false, "notstated", "Yaş ve maliyet anlatılmaz."),
      option("o3", "Easy to move between rooms quickly", false, "context", "Taşınabilirlik anlamı yoktur."),
      option("o4", "Owned by several different companies", false, "context", "Sahiplik anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage imply about technical success and public impact?", evidence: findEvidence(paragraphs, "At first, however, it was mostly used by physicists, and few people outside the laboratory had heard of it."), options: [
      option("o1", "Technical success alone did not ensure reach.", true, null, "Çalışan sunucu ve tarayıcıya rağmen Web'i başlangıçta az kişi duymuştu."),
      option("o2", "A working server guaranteed millions of users.", false, "reverse", "Metin tersini ima eder."),
      option("o3", "Physicists wanted the Web to stay private.", false, "notstated", "Böyle bir istek anlatılmaz."),
      option("o4", "The browser was released before the server.", false, "notstated", "Sıra anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Tim Berners-Lee Mart 1989'da CERN'de dağıtık bir bilgi sistemi öneren ilk öneriyi yazdı; 1990 sonuna kadar CERN'de ilk Web sunucusu ve tarayıcı çalışıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "İlk web sitesi Berners-Lee'nin NeXT bilgisayarında barındırıldı ve Web projesini anlatıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "30 Nisan 1993'te CERN, Web yazılımını kamu malı olarak serbest bıraktı.", source: cern, checkedOn: "2026-11-23" },
  ] },
};
