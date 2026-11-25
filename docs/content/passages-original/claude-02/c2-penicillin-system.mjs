import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["The{} legend{efsane} of{} penicillin{penisilin} attributes{atfetmek} a{} medical{tıbbi} revolution{devrim} to{-e} a{} single{tek} accident{kaza}, and{} the{} attribution{atıf} is{} not{değil} entirely{tamamen} false{yanlış}.", "Penisilin efsanesi tıbbi bir devrimi tek bir kazaya atfeder ve bu atıf tamamen yanlış değildir."],
    ["Between{arasında} them{onlar}, these{bu} two{iki} facts{olgular} frame{çerçevelemek} the{} whole{bütün} story{hikâye}.", "Bu iki olgu birlikte tüm hikâyeyi çerçeveler."],
    ["In{-de} nineteen{on dokuz} twenty{yirmi} eight{sekiz}, Alexander{Alexander} Fleming{Fleming} returned{dönmek} from{-den} a{} holiday{tatil} to{-e} find{bulmak} that{ki} a{} mould{küf} had{} contaminated{bulaştırmak} a{} staphylococcus{stafilokok} culture{kültür} and{} that{ki} the{} bacteria{bakteriler} around{çevresinde} it{} had{} died{ölmek}.", "1928'de Alexander Fleming bir tatilden dönünce bir küfün bir stafilokok kültürüne bulaştığını ve çevresindeki bakterilerin ölmüş olduğunu gördü."],
    ["But{ama} an{} observation{gözlem} is{} not{değil} yet{henüz} a{} treatment{tedavi}, and{} the{} distance{mesafe} between{arasında} the{} two{iki} was{} considerable{hatırı sayılır}.", "Ama bir gözlem henüz bir tedavi değildir ve ikisi arasındaki mesafe hatırı sayılırdı."],
  ],
  [
    ["Fleming{Fleming} published{yayımlamak} his{onun} findings{bulgular} in{-de} nineteen{on dokuz} twenty{yirmi} nine{dokuz}, but{ama} his{onun} laboratory{laboratuvar} notebooks{defterler} are{} sketchy{özensiz} and{} his{onun} later{daha sonraki} recollections{hatıralar} do{} not{} always{her zaman} agree{aynı fikirde olmak}.", "Fleming bulgularını 1929'da yayımladı; ancak laboratuvar defterleri özensizdir ve sonraki hatıraları her zaman birbiriyle uyuşmaz."],
    ["For{boyunca} roughly{kabaca} a{} decade{on yıl} he{} regarded{görmek} the{} substance{madde} mainly{esas olarak} as{olarak} a{} possible{olası} topical{yerel} antiseptic{antiseptik}, and{} he{} did{} not{} fully{tamamen} grasp{kavramak} its{onun} wider{daha geniş} promise{vaat}.", "Yaklaşık on yıl boyunca maddeyi esas olarak olası bir yerel antiseptik olarak gördü ve daha geniş vaadini tam olarak kavramadı."],
    ["Such{böyle} caution{temkin} was{} not{} unreasonable{makul olmayan} for{için} its{onun} time{zaman}, but{ama} it{} delayed{geciktirmek} progress{ilerleme} by{kadar} years{yıllar}.", "Böyle bir temkin kendi zamanı için makul olmayan değildi ama ilerlemeyi yıllarca geciktirdi."],
  ],
  [
    ["The{} decisive{belirleyici} labour{emek} fell{düşmek (görev ...e düştü)} to{düşmek (görev ...e düştü)} others{başkaları}.", "Belirleyici emek başkalarına düştü."],
    ["At{-de} Oxford{Oxford}, Howard{Howard} Florey{Florey} and{} Ernst{Ernst} Chain{Chain} assembled{bir araya getirmek} a{} team{ekip} that{ki} learned{öğrenmek} to{-mek} purify{arıtmak} the{} drug{ilaç}, tested{denemek} it{} against{karşı} bacterial{bakteriyel} disease{hastalık}, and{} by{-e kadar} nineteen{on dokuz} forty{kırk} showed{göstermek} that{ki} it{} could{-ebilirdi} work{işlemek} as{olarak} a{} therapy{tedavi}.", "Oxford'da Howard Florey ve Ernst Chain, ilacı arıtmayı öğrenen, bakteriyel hastalığa karşı deneyen ve 1940'a gelindiğinde bir tedavi olarak işleyebileceğini gösteren bir ekip kurdu."],
    ["Norman{Norman} Heatley{Heatley}, whose{kimin} extraction{çıkarma} methods{yöntemler} helped{yardım etmek} make{yapmak} production{üretim} practical{pratik}, belonged{ait olmak} to{-e} that{o} group{grup} too{de}.", "Çıkarma yöntemleriyle üretimi pratik kılmaya yardım eden Norman Heatley de o gruba aitti."],
    ["Without{olmadan} their{onların} patient{sabırlı} experiments{deneyler}, penicillin{penisilin} might{-ebilirdi} have{} remained{kalmak} a{} footnote{dipnot} in{} a{} laboratory{laboratuvar} notebook{defter}.", "Onların sabırlı deneyleri olmasaydı penisilin bir laboratuvar defterinde dipnot olarak kalabilirdi."],
  ],
  [
    ["When{-dığında} the{} Nobel{Nobel} Prize{Ödül} in{} Physiology{Fizyoloji} or{} Medicine{Tıp} was{} awarded{ödüllendirmek} in{-de} nineteen{on dokuz} forty{kırk} five{beş}, it{} was{} shared{paylaşmak} by{tarafından} Fleming{Fleming}, Florey{Florey} and{} Chain{Chain}, but{ama} not{değil} by{tarafından} Heatley{Heatley}.", "1945'te Nobel Fizyoloji veya Tıp Ödülü verildiğinde Fleming, Florey ve Chain tarafından paylaşıldı ama Heatley tarafından paylaşılmadı."],
    ["Oxford{Oxford} would{-ecekti} not{değil} award{vermek} him{ona} an{} honorary{fahri} doctorate{doktora} until{-e kadar} nineteen{on dokuz} ninety{doksan}.", "Oxford ona fahri doktorayı ancak 1990'da verdi."],
    ["The{} omission{eksik bırakma} illustrates{göstermek} a{} general{genel} difficulty{zorluk}: prizes{ödüller} reward{ödüllendirmek} identifiable{tanımlanabilir} individuals{bireyler}, whereas{oysa} discoveries{keşifler} are{} produced{üretmek} by{tarafından} systems{sistemler}.", "Bu eksik bırakma genel bir zorluğu gösterir: ödüller tanımlanabilir bireyleri ödüllendirir, keşifler ise sistemlerce üretilir."],
  ],
  [
    ["A{} more{daha} accurate{doğru} story{hikâye} of{} penicillin{penisilin} would{-ecekti} therefore{bu nedenle} replace{yerine koymak} the{} lone{yalnız} genius{deha} with{ile} a{} sequence{dizi}: an{} alert{uyanık} observer{gözlemci}, a{} stalled{durmuş} idea{fikir}, and{} a{} team{ekip} willing{istekli} to{-mek} do{yapmak} the{} unglamorous{gösterişsiz} work{iş}.", "Penisilinin daha doğru bir hikâyesi bu nedenle yalnız deha yerine bir diziyi koyardı: uyanık bir gözlemci, durmuş bir fikir ve gösterişsiz işi yapmaya istekli bir ekip."],
    ["It{} is{} a{} less{daha az} romantic{romantik} story{hikâye}, but{ama} it{} is{} the{} one{olan} that{ki} best{en iyi} explains{açıklamak} how{nasıl} a{} curiosity{merak konusu} became{olmak} a{} medicine{ilaç}.", "Daha az romantik bir hikâyedir ama bir merak konusunun nasıl ilaca dönüştüğünü en iyi açıklayan hikâyedir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-penicillin-system", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobel = "Nobel Prize Outreach, The Nobel Prize in Physiology or Medicine 1945 (Fleming, Chain, Florey); https://www.nobelprize.org/prizes/medicine/1945/summary/";
const pbs = "PBS NewsHour, The real story behind the world's first antibiotic; https://www.pbs.org/newshour/health/the-real-story-behind-the-worlds-first-antibiotic";
const sciHist = "Science History Institute, Alexander Fleming; https://sciencehistory.org/education/scientific-biographies/alexander-fleming/";

export default {
  slug: "c2-penicillin-system", level: "C2", title: "A System, Not a Hero", topic: "Tıp", sortOrder: 16, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central argument?", evidence: ev(4, "A more accurate story of penicillin would therefore replace the lone genius with a sequence"), options: [
      option("o1", "Penicillin came from collective effort", true, null, "Metin keşfin bir ekip ve dizi sonucu olduğunu savunur."),
      option("o2", "Fleming made no contribution to penicillin", false, "extreme", "Metin Fleming'in gözlemini kabul eder."),
      option("o3", "Prizes are always shared fairly among teams", false, "reverse", "Metin Heatley'nin dışarıda kaldığını söyler."),
      option("o4", "Moulds are a reliable source of medicines", false, "extreme", "Metin böyle bir genelleme yapmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Fleming mainly think of the substance for about a decade?", evidence: ev(1, "he regarded the substance mainly as a possible topical antiseptic"), options: [
      option("o1", "A local antiseptic", true, null, "Metin bunu söyler."),
      option("o2", "A cure for every illness", false, "extreme", "Metin böyle bir görüş söylemez."),
      option("o3", "A harmless food ingredient", false, "notstated", "Gıda anlatılmaz."),
      option("o4", "A tool for making cultures", false, "notstated", "Böyle bir kullanım yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “unglamorous” mean in the last paragraph?", evidence: ev(4, "a team willing to do the unglamorous work"), options: [
      option("o1", "Ordinary and unexciting", true, null, "Unglamorous, gösterişsiz, heyecan uyandırmayan, sıradan demektir."),
      option("o2", "Dangerous and unpredictable", false, "context", "Tehlike ve belirsizlik anlamı yoktur; metin işin gösterişsiz olduğunu söyler."),
      option("o3", "Paid for by a famous prize", false, "context", "Ödül metinde geçer ama sözcüğün anlamı bu değildir."),
      option("o4", "Done by one lonely genius", false, "reverse", "Metin bunun tersini, ekip çalışmasını vurgular."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage imply about Heatley's treatment?", evidence: ev(3, "Oxford would not award him an honorary doctorate until nineteen ninety"), options: [
      option("o1", "His role was recognised late", true, null, "Fahri doktorası ancak 1990'da verildi."),
      option("o2", "He refused to share in the work", false, "notstated", "Böyle bir bilgi yoktur."),
      option("o3", "His methods were never used again", false, "reverse", "Metin yöntemlerin üretimi pratik kıldığını söyler."),
      option("o4", "He received the Nobel Prize alone", false, "reverse", "Ödül Fleming, Florey ve Chain'e verildi."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Fleming 1928'de bir stafilokok kültürünü bulaştıran küfün çevresindeki bakterileri öldürdüğünü gördü; 1929'da yayımladı, laboratuvar defterleri özensiz ve sonraki anlatımları çelişkilidir; yaklaşık on yıl boyunca maddeyi esas olarak yerel antiseptik olarak düşündü.", source: sciHist, checkedOn: "2026-11-23" },
    { claim: "Howard Florey ve Ernst Chain Oxford'daki ekipleriyle penisilini arıtıp denedi ve 1940'a gelindiğinde tedavi olarak işleyebileceğini gösterdi; Norman Heatley çıkarma yöntemleriyle katkı yaptı.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "1945 Nobel Fizyoloji veya Tıp Ödülü Fleming, Chain ve Florey arasında paylaşıldı; Heatley ödüle dahil edilmedi ve Oxford ona 1990'da ilk fahri tıp doktorasını verdi.", source: nobel, checkedOn: "2026-11-23" },
  ] },
};
