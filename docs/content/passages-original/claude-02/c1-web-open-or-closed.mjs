import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["It{} is{} easy{kolay} to{-mek} forget{unutmak} that{ki} the{} World{Dünya} Wide{Geniş} Web{Ağ} could{-ebilirdi} have{} turned{dönüşmek} out{çıkmak} very{çok} differently{farklı}.", "Dünya Çapında Ağ'ın çok farklı sonuçlanabileceğini unutmak kolaydır."],
    ["Many{birçok} early{erken} networked{ağlı} systems{sistemler} were{} controlled{denetlenmek} by{tarafından} a{} single{tek} organisation{kuruluş}, and{} the{} Web{Web} could{-ebilirdi} easily{kolayca} have{} followed{izlemek} that{o} pattern{örüntü}.", "Birçok erken ağlı sistem tek bir kuruluş tarafından denetleniyordu ve Web de kolayca o örüntüyü izleyebilirdi."],
    ["This{bu} essay{deneme} looks{bakmak} at{-e (bakmak)} why{neden} that{o} did{} not{} happen{olmak}.", "Bu deneme, bunun neden olmadığına bakar."],
    ["Tim{Tim} Berners{Berners}-Lee{Lee} wrote{yazdı} his{} first{ilk} proposal{öneri} for{için} a{} distributed{dağıtık} information{bilgi} system{sistem} at{-de} CERN{CERN} in{-de} March{Mart} nineteen{on dokuz} eighty{seksen} nine{dokuz}, resubmitted{yeniden sunmak} a{} lightly{hafifçe} edited{düzenlenmiş} version{sürüm} in{-de} May{Mayıs} nineteen{on dokuz} ninety{doksan}, and{} by{-e kadar} the{} end{son} of{} that{o} year{yıl} had{sahipti} a{} working{çalışan} server{sunucu} and{} browser{tarayıcı}.", "Tim Berners-Lee, CERN'de Mart 1989'da dağıtık bir bilgi sistemi için ilk önerisini yazdı, Mayıs 1990'da hafifçe düzenlenmiş bir sürümü yeniden sundu ve o yılın sonuna kadar çalışan bir sunucu ve tarayıcıya sahip oldu."],
    ["Nothing{hiçbir şey} about{hakkında} that{o} early{erken} success{başarı} guaranteed{garanti etmek} that{ki} the{} technology{teknoloji} would{-ecekti} become{olmak} a{} shared{ortak} public{kamu} resource{kaynak}.", "O erken başarının hiçbir yanı teknolojinin ortak bir kamu kaynağı olacağını garanti etmiyordu."],
  ],
  [
    ["The{} turning{dönüm} point{nokta} came{gelmek} on{-de} thirty{otuz} April{Nisan} nineteen{on dokuz} ninety{doksan} three{üç}, when{-dığında} CERN's{CERN (iyelik)} directors{müdürler} signed{imzalamak} a{} statement{bildiri} placing{yerleştirmek} the{} Web{Web} software{yazılım} in{-e} the{} public{kamu} domain{alan}.", "Dönüm noktası, CERN yöneticilerinin Web yazılımını kamu malı kılan bir bildiriyi imzaladığı 30 Nisan 1993'te geldi."],
    ["Anyone{herkes} could{-ebilirdi} now{şimdi} use{kullanmak}, copy{kopyalamak} and{} build{inşa etmek} on{üzerine} the{} code{kod} without{-meden} asking{sormak} permission{izin} or{ya da} paying{ödemek} a{} fee{ücret}.", "Artık herkes izin istemeden ya da ücret ödemeden kodu kullanabilir, kopyalayabilir ve üzerine inşa edebilirdi."],
    ["The{} next{sonraki} version{sürüm} of{} the{} software{yazılım} in{-de} nineteen{on dokuz} ninety{doksan} four{dört} moved{taşınmak} to{-e} an{} open{açık} source{kaynak} licence{lisans}, which{ki bu} preserved{korumak} that{o} freedom{özgürlük} in{} a{} more{daha} formal{resmi} way{biçim}.", "Yazılımın 1994'teki sonraki sürümü açık kaynak lisansına geçti; bu, o özgürlüğü daha resmî bir biçimde korudu."],
    ["That{o} single{tek} statement{bildiri} of{} permission{izin} removed{kaldırmak} a{} barrier{engel} that{ki} might{-ebilirdi} otherwise{aksi hâlde} have{} lasted{sürmek} for{boyunca} years{yıllar}.", "O tek izin bildirisi, aksi hâlde yıllarca sürebilecek bir engeli kaldırdı."],
  ],
  [
    ["Why{neden} does{} the{} decision{karar} still{hâlâ} matter{önemli olmak}?", "Karar neden hâlâ önemli?"],
    ["Because{çünkü} openness{açıklık} lowered{azaltmak} the{} cost{maliyet} of{} experimenting{denemek}: anyone{herkes} with{ile} a{} computer{bilgisayar} could{-ebilirdi} publish{yayımlamak} a{} page{sayfa} without{-meden} seeking{aramak} approval{onay} from{-den} a{} gatekeeper{kapı bekçisi}.", "Çünkü açıklık denemenin maliyetini düşürdü: bilgisayarı olan herkes bir kapı bekçisinden onay aramadan bir sayfa yayımlayabilirdi."],
    ["A{} closed{kapalı} system{sistem} might{-ebilirdi} still{hâlâ} have{} succeeded{başarılı olmak} commercially{ticari olarak}, but{ama} it{} would{-ecekti} probably{muhtemelen} have{} grown{büyümek} more{daha} slowly{yavaş} and{} reached{ulaşmak} fewer{daha az} people{insanlar}.", "Kapalı bir sistem ticari olarak yine de başarılı olabilirdi ama muhtemelen daha yavaş büyür ve daha az kişiye ulaşırdı."],
    ["Openness{açıklık} did{} not{} guarantee{garanti etmek} quality{kalite}, and{} the{} Web{Web} has{} since{o zamandan beri} filled{dolmak} with{ile} both{hem} brilliant{parlak} and{} worthless{değersiz} pages{sayfalar}.", "Açıklık kaliteyi garanti etmedi ve Web o zamandan beri hem parlak hem değersiz sayfalarla doldu."],
    ["Even{bile} so{öyle olsa da}, the{} freedom{özgürlük} to{-mek} publish{yayımlamak} remains{kalmak} its{onun} defining{belirleyici} feature{özellik}.", "Yine de yayımlama özgürlüğü onun belirleyici özelliği olmaya devam ediyor."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-web-open-or-closed", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cern = "CERN, A short history of the Web; https://home.cern/science/computing/birth-web/short-history-web";

export default {
  slug: "c1-web-open-or-closed", level: "C1", title: "The Web Could Have Been Closed", topic: "Teknoloji", sortOrder: 18, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main argument of the passage?", evidence: ev(2, "openness lowered the cost of experimenting"), options: [
      option("o1", "Open release helped the Web grow", true, null, "Metin açık serbest bırakmanın Web'in büyümesine yardım ettiğini savunur."),
      option("o2", "Commercial control would have sped growth", false, "reverse", "Metin kapalı sistemin daha yavaş büyüyeceğini söyler."),
      option("o3", "Browsers mattered more than servers", false, "notstated", "Böyle bir karşılaştırma yoktur."),
      option("o4", "Licences prevent all copying of code", false, "reverse", "Metin lisansın özgürlüğü koruduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "What happened in nineteen ninety four?", evidence: ev(1, "The next version of the software in nineteen ninety four moved to an open source licence"), options: [
      option("o1", "Software got an open licence", true, null, "Metin bunu söyler."),
      option("o2", "The first proposal was written at CERN", false, "detail", "İlk öneri 1989'dadır."),
      option("o3", "The software was placed in the public domain", false, "detail", "Kamu malı kararı 1993'tür."),
      option("o4", "The first server and browser were running", false, "detail", "Bunlar 1990 sonudur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “gatekeeper” mean in the final paragraph?", evidence: ev(2, "without seeking approval from a gatekeeper"), options: [
      option("o1", "Someone who controls access", true, null, "Gatekeeper, erişimi denetleyen kişidir."),
      option("o2", "A tool for building computers", false, "context", "Bilgisayar yapımı anlatılmaz."),
      option("o3", "A free piece of public software", false, "context", "Yazılım anlamı yoktur."),
      option("o4", "A guard at the laboratory door", false, "sound", "Kapı sözcüğüne dayalı yanıltıcı anlamdır; mecazi kullanılmıştır."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the last paragraph suggest about a closed system?", evidence: ev(2, "A closed system might still have succeeded commercially, but it would probably have grown more slowly and reached fewer people."), options: [
      option("o1", "It would have spread slowly", true, null, "Metin daha yavaş büyüyeceğini ve daha az kişiye ulaşacağını söyler."),
      option("o2", "It would have failed in all markets", false, "extreme", "Metin ticari başarı olasılığını kabul eder."),
      option("o3", "It would have been cheaper to join", false, "notstated", "Maliyet karşılaştırması yoktur."),
      option("o4", "It would have replaced email entirely", false, "notstated", "E-posta anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Berners-Lee Mart 1989'da ilk öneriyi yazdı, Mayıs 1990'da hafif düzenlenmiş sürümü yeniden sundu; 1990 sonunda CERN'de ilk Web sunucusu ve tarayıcı çalışıyordu.", source: cern, checkedOn: "2026-11-23" },
    { claim: "30 Nisan 1993'te CERN yönetimi Web yazılımını kamu malı kılan bildiriyi imzaladı; 1994'teki sonraki sürüm açık kaynak lisansına geçti.", source: cern, checkedOn: "2026-11-23" },
  ] },
};
