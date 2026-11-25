import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} popular{popüler} version{sürüm} of{} the{} penicillin{penisilin} story{hikâye} is{} tidy{düzenli}: a{} careless{dikkatsiz} holiday{tatil}, a{} stray{başıboş} mould{küf}, and{} a{} sudden{ani} flash{parıltı} of{} insight{kavrayış} that{ki} saved{kurtardı} millions{milyonlar}.", "Penisilin hikâyesinin popüler sürümü düzenlidir: dikkatsiz bir tatil, başıboş bir küf ve milyonları kurtaran ani bir kavrayış parıltısı."],
    ["The{} historical{tarihsel} record{kayıt} is{} messier{daha dağınık}.", "Tarihsel kayıt daha dağınıktır."],
    ["Alexander{Alexander} Fleming{Fleming} did{} observe{gözlemlemek} in{-de} nineteen{on dokuz} twenty{yirmi} eight{sekiz} that{ki} a{} mould{küf} contaminating{bulaşan} one{bir} of{} his{} staphylococcus{stafilokok} cultures{kültürler} had{} killed{öldürmek} the{} surrounding{çevredeki} bacteria{bakteriler}, but{ama} his{onun} laboratory{laboratuvar} notebooks{defterler} are{} sketchy{özensiz}, and{} his{onun} later{daha sonraki} accounts{anlatımlar} of{} the{} event{olay} contradict{çelişmek} one{bir} another{diğer}.", "Alexander Fleming 1928'de stafilokok kültürlerinden birine bulaşan bir küfün çevresindeki bakterileri öldürdüğünü gerçekten gözlemledi; ancak laboratuvar defterleri özensizdir ve olay hakkındaki sonraki anlatımları birbiriyle çelişir."],
    ["Such{böyle} inconsistencies{tutarsızlıklar} do{olumsuz yardımcı fiil} not{} cancel{iptal etmek} the{} discovery{keşif}, but{ama} they{} warn{uyarmak} against{karşı} treating{ele almak} any{herhangi bir} single{tek} version{sürüm} as{olarak} final{kesin}.", "Bu tür tutarsızlıklar keşfi geçersiz kılmaz ama tek bir sürümü kesin saymaya karşı uyarır."],
  ],
  [
    ["More{daha} importantly{daha önemlisi}, Fleming{Fleming} did{} not{} immediately{hemen} grasp{kavramak} what{ne} he{} had{} found{bulmak}.", "Daha önemlisi, Fleming ne bulduğunu hemen kavramadı."],
    ["He{} published{yayımladı} in{-de} nineteen{on dokuz} twenty{yirmi} nine{dokuz}, yet{yine de} for{boyunca} roughly{kabaca} a{} decade{on yıl} he{} treated{ele aldı} the{} substance{madde} as{olarak} a{} possible{olası} topical{yerel} antiseptic{antiseptik} rather{yerine (rather than)} than{yerine (rather than)} an{} injectable{enjekte edilebilir} treatment{tedavi}, and{} it{} proved{olduğu anlaşıldı (prove + sıfat)} difficult{zor} to{-mek} produce{üretmek} in{} quantity{miktar}.", "1929'da yayımladı; ancak yaklaşık on yıl boyunca maddeyi enjekte edilebilir bir tedaviden çok olası bir yerel antiseptik olarak ele aldı ve madde büyük miktarda üretmesi zor çıktı."],
    ["The{} decisive{belirleyici} work{çalışma} was{} done{yapılmak} at{-de} Oxford{Oxford}, where{ki orada} Howard{Howard} Florey{Florey} and{} Ernst{Ernst} Chain{Chain} assembled{bir araya getirmek} a{} team{ekip} that{ki} learned{öğrendi} to{-mek} purify{arıtmak} the{} drug{ilaç} and{} showed{göstermek} that{ki} it{} could{-ebilirdi} cure{iyileştirmek} bacterial{bakteriyel} infections{enfeksiyonlar}.", "Belirleyici çalışma, Howard Florey ve Ernst Chain'in ilacı arıtmayı öğrenen ve bakteriyel enfeksiyonları iyileştirebileceğini gösteren bir ekip kurduğu Oxford'da yapıldı."],
    ["The{} gap{boşluk} between{arasında} a{} laboratory{laboratuvar} curiosity{merak konusu} and{} a{} reliable{güvenilir} medicine{ilaç} was{} therefore{bu nedenle} wide{geniş}, and{} crossing{aşmak} it{} took{sürdü} years{yıllar} of{} collective{ortak} effort{çaba}.", "Bir laboratuvar merakı ile güvenilir bir ilaç arasındaki boşluk bu nedenle genişti ve onu aşmak yıllarca ortak çaba gerektirdi."],
  ],
  [
    ["The{} Nobel{Nobel} committee{komite} recognised{tanımak} this{bu} division{bölünme} of{} labour{emek} in{-de} nineteen{on dokuz} forty{kırk} five{beş}, awarding{ödüllendirmek} the{} prize{ödül} jointly{ortaklaşa} to{-e} all{hepsi} three{üç} men{adamlar}.", "Nobel komitesi bu iş bölümünü 1945'te, ödülü üç kişiye birlikte vererek tanıdı."],
    ["Even{bile} so{öyle olsa da}, the{} award{ödül} left{dışarıda bırakmak (leave out)} out{dışarıda bırakmak (leave out)} Norman{Norman} Heatley{Heatley}, whose{kimin} extraction{çıkarma} methods{yöntemler} made{yapmak} large{büyük} scale{ölçek} production{üretim} practical{pratik}, and{} Oxford{Oxford} did{} not{} award{vermek} him{ona} an{} honorary{fahri} doctorate{doktora} until{-e kadar} nineteen{on dokuz} ninety{doksan}.", "Yine de ödül, çıkarma yöntemleri büyük ölçekli üretimi mümkün kılan Norman Heatley'i dışarıda bıraktı ve Oxford ona fahri doktorayı ancak 1990'da verdi."],
    ["Credit{pay}, the{} episode{olay} reminds{hatırlatmak} us{bize}, is{} rarely{nadiren} distributed{dağıtılmak} as{kadar} evenly{eşit biçimde} as{} the{} work{iş} deserves{hak etmek}.", "Olay bize, payın nadiren işin hak ettiği kadar eşit dağıtıldığını hatırlatır."],
    ["Remembering{hatırlamak} the{} whole{bütün} team{ekip} gives{vermek} a{} more{daha} accurate{doğru} picture{resim} than{-den} remembering{hatırlamak} a{} single{tek} hero{kahraman}.", "Tüm ekibi hatırlamak, tek bir kahramanı hatırlamaktan daha doğru bir resim verir."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-penicillin-credit", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobel = "Nobel Prize Outreach, The Nobel Prize in Physiology or Medicine 1945 (Fleming, Chain, Florey); https://www.nobelprize.org/prizes/medicine/1945/summary/";
const pbs = "PBS NewsHour, The real story behind the world's first antibiotic; https://www.pbs.org/newshour/health/the-real-story-behind-the-worlds-first-antibiotic";
const sciHist = "Science History Institute, Alexander Fleming; https://sciencehistory.org/education/scientific-biographies/alexander-fleming/";

export default {
  slug: "c1-penicillin-credit", level: "C1", title: "Who Deserves the Credit?", topic: "Tıp", sortOrder: 15, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main point of the passage?", evidence: ev(0, "The historical record is messier."), options: [
      option("o1", "The story is less tidy than legend", true, null, "Metin popüler hikâyenin daha dağınık bir gerçeği gizlediğini anlatır."),
      option("o2", "Fleming did not really observe the mould", false, "extreme", "Metin gözlemi kabul eder; yalnızca anlatımların çeliştiğini söyler."),
      option("o3", "The Nobel committee made no mistakes", false, "reverse", "Heatley dışarıda bırakıldı."),
      option("o4", "Oxford rejected Fleming's discovery", false, "notstated", "Böyle bir ret anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Why did Fleming's own accounts cause problems?", evidence: findEvidence(paragraphs, "his laboratory notebooks are sketchy, and his later accounts of the event contradict one another"), options: [
      option("o1", "They contradicted one another", true, null, "Metin sonraki anlatımların birbiriyle çeliştiğini söyler."),
      option("o2", "They were never published", false, "reverse", "Fleming 1929'da yayımladı."),
      option("o3", "They described a different mould each time", false, "notstated", "Küf türü karşılaştırılmaz."),
      option("o4", "They were corrected later by Florey", false, "notstated", "Florey düzeltmesi anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “sketchy” mean in the first paragraph?", evidence: ev(0, "his laboratory notebooks are sketchy"), options: [
      option("o1", "Lacking complete detail", true, null, "Sketchy, ayrıntıdan yoksun, eksik demektir."),
      option("o2", "Beautifully drawn and clear", false, "sound", "Sketch sözcüğünden gelen yanıltıcı çağrışımdır."),
      option("o3", "Written in a hurry by students", false, "notstated", "Öğrenci anlatılmaz."),
      option("o4", "Kept in a locked cabinet", false, "notstated", "Dolap anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final sentence imply about the Nobel Prize?", evidence: findEvidence(paragraphs, "Credit, the episode reminds us, is rarely distributed as evenly as the work deserves."), options: [
      option("o1", "It left out one contributor", true, null, "Heatley ödülün dışında kaldı."),
      option("o2", "It rewarded only the first observer", false, "reverse", "Ödül üç kişiye verildi."),
      option("o3", "It was shared by five scientists", false, "reverse", "Ödül üç kişiye verildi."),
      option("o4", "It ignored the whole Oxford team", false, "reverse", "Florey ve Chain Oxford ekibindendi."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Fleming 1928'de bir stafilokok kültürünü bulaştıran küfün çevresindeki bakterileri öldürdüğünü gördü; laboratuvar defterleri özensizdir ve sonraki anlatımları çelişir.", source: sciHist, checkedOn: "2026-11-23" },
    { claim: "1929'da yayımladı ama yaklaşık on yıl boyunca esas olarak yerel antiseptik olarak düşündü; Florey ve Chain Oxford'daki ekipleriyle penisilini tedavide kullanılabilir hâle getirdi.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "1945 Nobel Fizyoloji veya Tıp Ödülü Fleming, Chain ve Florey arasında paylaşıldı; çıkarma yöntemleriyle katkı yapan Norman Heatley ödüle dahil edilmedi ve Oxford ona 1990'da ilk fahri tıp doktorasını verdi.", source: nobel, checkedOn: "2026-11-23" },
  ] },
};
