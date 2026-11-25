import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} nineteen{on dokuz} twenty{yirmi} eight{sekiz}, the{} Scottish{İskoç} bacteriologist{bakteriyolog} Alexander{Alexander} Fleming{Fleming} returned{döndü} from{-den} a{} holiday{tatil} to{-e} find{bulmak} that{ki} a{} mould{küf} had{} contaminated{bulaşmış} one{biri} of{} his{} dishes{kaplar}.", "1928'de İskoç bakteriyolog Alexander Fleming bir tatilden dönünce kaplarından birine küf bulaştığını gördü."],
    ["Instead{yerine} of{} throwing{atmak} the{} dish{kap} away{uzağa}, he{} noticed{fark etti} that{ki} the{} bacteria{bakteriler} near{yakınında} the{} mould{küf} had{} been{} destroyed{yok edilmiş}.", "Kabı atmak yerine, küfün yanındaki bakterilerin yok olduğunu fark etti."],
    ["He{} concluded{sonuca vardı} that{ki} the{} mould{küf} released{salgıladı} a{} substance{madde} able{yetenekli} to{-mek} kill{öldürmek} bacteria{bakteriler}, and{} he{} named{adlandırdı} it{} penicillin{penisilin}.", "Küfün bakterileri öldürebilen bir madde salgıladığı sonucuna vardı ve ona penisilin adını verdi."],
    ["The{} dish{kap} could{-ebilirdi} easily{kolayca} have{} been{} thrown{atılmış} away{uzağa}, and{} the{} discovery{keşif} lost{kaybolmuş}.", "Kap kolayca atılabilirdi ve keşif kaybolabilirdi."],
  ],
  [
    ["Fleming{Fleming} published{yayımladı} his{} findings{bulgular} in{-de} nineteen{on dokuz} twenty{yirmi} nine{dokuz}, yet{yine de} for{boyunca} about{yaklaşık} a{} decade{on yıl} he{} treated{ele aldı} the{} substance{madde} mainly{esas olarak} as{olarak} a{} possible{olası} antiseptic{antiseptik}.", "Fleming bulgularını 1929'da yayımladı; ancak yaklaşık on yıl boyunca maddeyi esas olarak olası bir antiseptik olarak ele aldı."],
    ["Turning{dönüştürmek} penicillin{penisilin} into{-e} a{} usable{kullanılabilir} drug{ilaç} required{gerektirdi} a{} different{farklı} kind{tür} of{} effort{çaba}.", "Penisilini kullanılabilir bir ilaca dönüştürmek farklı türden bir çaba gerektirdi."],
    ["At{-de} Oxford{Oxford} University{Üniversite}, Howard{Howard} Florey{Florey} and{} Ernst{Ernst} Chain{Chain} led{yönetti} a{} team{ekip} that{ki} learned{öğrendi} how{nasıl} to{-mek} produce{üretmek} and{} test{denemek} the{} drug{ilaç}.", "Oxford Üniversitesi'nde Howard Florey ve Ernst Chain, ilacı nasıl üreteceğini ve test edeceğini öğrenen bir ekibe önderlik etti."],
    ["By{-e kadar} nineteen{on dokuz} forty{kırk}, they{} had{} shown{göstermek} that{ki} it{} could{-ebilirdi} fight{savaşmak} many{birçok} bacterial{bakteriyel} diseases{hastalıklar}.", "1940'a gelindiğinde bunun birçok bakteriyel hastalıkla savaşabileceğini göstermişlerdi."],
  ],
  [
    ["The{} Nobel{Nobel} Prize{Ödül} in{} Physiology{Fizyoloji} or{} Medicine{Tıp} for{için} nineteen{on dokuz} forty{kırk} five{beş} was{} shared{paylaşıldı} by{tarafından} all{hepsi} three{üç} men{adamlar}.", "1945 Nobel Fizyoloji veya Tıp Ödülü üç kişi arasında paylaşıldı."],
    ["The{} story{hikâye} shows{gösterir} that{ki} a{} lucky{şanslı} observation{gözlem} matters{önemli} only{yalnızca} when{-dığında} someone{biri} is{} prepared{hazır} to{-mek} notice{fark etmek} it{} and{} others{diğerleri} are{} willing{istekli} to{-mek} finish{bitirmek} the{} work{iş}.", "Hikâye, şanslı bir gözlemin ancak biri onu fark etmeye hazırsa ve başkaları işi bitirmeye istekliyse önem kazandığını gösterir."],
    ["It{} also{ayrıca} shows{gösterir} how{ne kadar} slow{yavaş} and{} shared{ortak} scientific{bilimsel} progress{ilerleme} often{sıklıkla} is{}.", "Ayrıca bilimsel ilerlemenin çoğu zaman ne kadar yavaş ve ortak olduğunu gösterir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-penicillin-chance", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobel = "Nobel Prize Outreach, The Nobel Prize in Physiology or Medicine 1945 (Fleming, Chain, Florey); https://www.nobelprize.org/prizes/medicine/1945/summary/";
const pbs = "PBS NewsHour, The real story behind the world's first antibiotic; https://www.pbs.org/newshour/health/the-real-story-behind-the-worlds-first-antibiotic";

export default {
  slug: "b2-penicillin-chance", level: "B2", title: "Chance Favours the Prepared Mind", topic: "Tıp", sortOrder: 16, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "a lucky observation matters only when someone is prepared to notice it and others are willing to finish the work"), options: [
      option("o1", "How a chance finding became a usable drug", true, null, "Metin şans eseri bir gözlemin ilaca dönüşmesini anlatır."),
      option("o2", "Why Fleming alone deserves every prize", false, "reverse", "Ödül üç kişi arasında paylaşıldı."),
      option("o3", "How moulds are cleaned from laboratories", false, "reverse", "Metin küfün yararını anlatır."),
      option("o4", "Why bacteria became harmless in the forties", false, "notstated", "Böyle bir iddia yoktur."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Fleming notice about the dish?", evidence: ev(0, "he noticed that the bacteria near the mould had been destroyed"), options: [
      option("o1", "Nearby bacteria had been destroyed", true, null, "Metin bunu açıkça söyler."),
      option("o2", "The dish had been broken into pieces", false, "context", "Kap geçer ama kırıldığı söylenmez."),
      option("o3", "Bacteria had grown faster around the mould", false, "reverse", "Tam tersi olmuştu."),
      option("o4", "The mould had changed colour overnight", false, "notstated", "Renk değişimi anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “contaminated” mean in the first paragraph?", evidence: ev(0, "a mould had contaminated one of his dishes"), options: [
      option("o1", "Spoiled by something bad", true, null, "Contaminate, istenmeyen bir şeyle bulaştırıp bozmak demektir."),
      option("o2", "Carefully cleaned before use", false, "reverse", "Temizlemenin tersidir."),
      option("o3", "Carried to a holiday place", false, "context", "Tatil geçer ama kelime bunu demez."),
      option("o4", "Written about in a paper", false, "context", "Makale sonradan geçer."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final paragraph imply about luck in science?", evidence: findEvidence(paragraphs, "a lucky observation matters only when someone is prepared to notice it and others are willing to finish the work"), options: [
      option("o1", "Luck needs people ready to use it", true, null, "Şans, onu fark etmeye ve işi bitirmeye hazır insanlarla anlam kazanır."),
      option("o2", "Luck matters only to famous scientists", false, "reverse", "Metin böyle bir sınırlama yapmaz."),
      option("o3", "Luck is shared out evenly among teams", false, "notstated", "Şansın paylaşımı anlatılmaz."),
      option("o4", "Luck matters more than later experiments", false, "reverse", "Sonraki deneyler olmadan keşif ilaca dönüşmedi."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Fleming 1928'de stafilokok kültürünü bulaştıran bir küfün çevresindeki bakterileri yok ettiğini fark etti; 1929'da yayımladı ancak yaklaşık on yıl boyunca maddeyi esas olarak antiseptik olarak düşündü.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Howard Florey ve Ernst Chain, Oxford'daki ekipleriyle penisilini üretilebilir ve tedavide kullanılabilir hâle getirdi; 1940'ta birçok bakteriyel hastalığa karşı etkili olduğunu gösterdiler.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "1945 Nobel Fizyoloji veya Tıp Ödülü Fleming, Chain ve Florey arasında paylaşıldı.", source: nobel, checkedOn: "2026-11-23" },
  ] },
};
