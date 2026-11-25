import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Few{az sayıda} philosophical{felsefi} questions{sorular} feel{hissettirmek} as{} personal{kişisel} as{} whether{-ip -mediği} we{} choose{seçmek} freely{özgürce}.", "Çok az felsefi soru, özgürce seçip seçmediğimiz kadar kişisel hissettirir."],
    ["If{} every{her} event{olay}, including{dahil} every{her} thought{düşünce}, follows{ortaya çıkmak} from{-den} earlier{daha önceki} causes{nedenler} according{göre (according to)} to{göre (according to)} natural{doğal} laws{yasalar}, it{} seems{görünmek} to{-mek} follow{sonucu çıkmak} that{-dığı} our{} decisions{kararlar} were{} fixed{belirlenmiş} long{çok} before{önce} we{} made{vermek (karar)} them{}.", "Her düşünce dahil her olay doğa yasalarına göre daha önceki nedenlerden ortaya çıkıyorsa, kararlarımızın biz onları vermeden çok önce belirlenmiş olduğu sonucu çıkıyor gibi görünür."],
    ["Those{olanlar} who{ki} accept{kabul etmek} this{} conclusion{sonuç} and{} deny{reddetmek} that{-dığını} we{} are{} free{özgür} are{} sometimes{bazen} called{adlandırılmak} free{özgür} will{irade} sceptics{şüpheciler}; those{olanlar} who{ki} insist{ısrar etmek} that{-dığında} we{} are{} free{özgür} precisely{tam da} because{çünkü} our{} choices{seçimler} escape{kurtulmak} such{böyle} necessity{zorunluluk} are{} known{bilinmek}, somewhat{biraz} confusingly{kafa karıştırıcı biçimde}, as{} libertarians{liberteryenler (özgür irade savunucuları)}.", "Bu sonucu kabul edip özgür olduğumuzu reddedenlere bazen özgür irade şüphecileri denir; tam da seçimlerimiz böyle bir zorunluluktan kurtulduğu için özgür olduğumuzda ısrar edenler ise biraz kafa karıştırıcı biçimde liberteryenler olarak bilinir."],
  ],
  [
    ["A{} third{üçüncü} camp{taraf, kamp}, compatibilism{bağdaşırcılık}, rejects{reddetmek} the{} dilemma{ikilem} itself{kendisi}.", "Üçüncü bir taraf olan bağdaşırcılık, ikilemin kendisini reddeder."],
    ["For{-e göre} compatibilists{bağdaşırcılar}, acting{davranmak} freely{özgürce} does{} not{} mean{anlamına gelmek} acting{davranmak} without{olmadan} causes{nedenler}; it{} means{anlamına gelmek} acting{davranmak} from{-den (kaynaklanarak)} one's{kişinin} own{kendi} reasons{gerekçeler} and{} desires{istekler}, without{olmadan} coercion{zorlama} or{} compulsion{karşı konulmaz dürtü}.", "Bağdaşırcılara göre özgürce davranmak nedensiz davranmak anlamına gelmez; zorlama ya da karşı konulmaz dürtü olmaksızın, kişinin kendi gerekçe ve isteklerinden hareketle davranmak demektir."],
    ["On{-e göre (on this account)} this{} account{görüş, açıklama}, a{} person{kişi} who{ki} hands{teslim etmek (hand over)} over{teslim etmek (hand over)} a{} wallet{cüzdan} at{-de (at gunpoint: silah zoruyla)} gunpoint{silah zoru} acts{davranmak} less{daha az} freely{özgürce} than{-den} one{biri} who{ki} donates{bağışlamak} the{} same{aynı} money{para} to{-e} charity{hayır kurumu}, even{bile} if{} both{her iki} actions{eylemler} are{} equally{eşit biçimde} determined{belirlenmiş}.", "Bu görüşe göre, silah zoruyla cüzdanını teslim eden biri, aynı parayı bir hayır kurumuna bağışlayan birinden daha az özgür davranır; her iki eylem de eşit biçimde belirlenmiş olsa bile."],
  ],
  [
    ["Neuroscience{sinirbilim} entered{girmek} the{} argument{tartışma} in{} 1983, when{-dığında} Benjamin{Benjamin} Libet{Libet} and{} his{} colleagues{meslektaşlar} reported{bildirmek} that{-dığını} a{} pattern{örüntü} of{} brain{beyin} activity{etkinlik} known{bilinen} as{} the{} readiness{hazırlık} potential{potansiyel} began{başlamak} a{} fraction{kesir, küçük bir kısım} of{} a{} second{saniye} before{önce} volunteers{gönüllüler} said{söylemek} they{} had{} become{olmak} aware{farkında} of{-in (aware of: -in farkında)} deciding{karar vermek} to{-meye} move{hareket etmek}.", "Sinirbilim tartışmaya 1983'te girdi; Benjamin Libet ve meslektaşları, hazırlık potansiyeli olarak bilinen bir beyin etkinliği örüntüsünün, gönüllülerin harekete karar verdiklerinin farkına vardıklarını söylemelerinden saniyenin bir kesri kadar önce başladığını bildirdi."],
    ["Some{bazı} commentators{yorumcular} treated{ele almak} this{} as{} proof{kanıt} that{-dığına} the{} brain{beyin} decides{karar vermek} before{önce} the{} mind{zihin} does{(önceki fiilin yerine) karar verir}.", "Bazı yorumcular bunu, beynin zihinden önce karar verdiğinin kanıtı olarak gördü."],
    ["Later{daha sonraki} work{çalışma} has{} complicated{karmaşıklaştırmak} that{o} reading{yorum, okuma}.", "Daha sonraki çalışmalar bu yorumu karmaşıklaştırdı."],
    ["In{} 2012, a{} team{ekip} led{yönetilen} by{tarafından} Aaron{Aaron} Schurger{Schurger} proposed{öne sürmek} that{-dığını} the{} signal{sinyal} might{-ebilir (olasılık)} reflect{yansıtmak} the{} build{birikme (build-up)}-up{birikme (build-up)} of{} random{rastgele} neural{sinirsel} fluctuations{dalgalanmalar} rather{yerine (rather than)} than{yerine (rather than)} a{} hidden{gizli} decision{karar} already{zaten} taken{alınmış}.", "2012'de Aaron Schurger liderliğindeki bir ekip, sinyalin önceden alınmış gizli bir karardan çok rastgele sinirsel dalgalanmaların birikimini yansıtıyor olabileceğini öne sürdü."],
  ],
  [
    ["Even{bile} a{} settled{kesinleşmiş} interpretation{yorum} of{} such{böyle} experiments{deneyler} would{-erdi} leave{bırakmak} much{çok şey} unresolved{çözümsüz}.", "Bu tür deneylerin kesinleşmiş bir yorumu bile pek çok şeyi çözümsüz bırakırdı."],
    ["Pressing{basmak} a{} button{düğme} at{} a{} moment{an} of{} one's{kişinin} own{kendi} choosing{seçim} is{} far{çok} removed{uzak} from{-den} deciding{karar vermek} whom{kimi} to{-ceğine} marry{evlenmek} or{} whether{-ip -meyeceği} to{-meye} break{bozmak} a{} promise{söz}, and{} it{} is{} precisely{tam da} in{} those{o} deliberate{bilinçli, düşünülmüş} choices{seçimler} that{ki} questions{sorular} of{} responsibility{sorumluluk} matter{önem taşımak} most{en çok}.", "Kişinin kendi seçtiği bir anda düğmeye basmak, kiminle evleneceğine ya da bir sözü bozup bozmayacağına karar vermekten çok uzaktır ve sorumluluk soruları tam da bu bilinçli seçimlerde en çok önem taşır."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-free-will-debate", rows);
const sepFree = "Stanford Encyclopedia of Philosophy, Free Will; https://plato.stanford.edu/entries/freewill/";
const sepCompat = "Stanford Encyclopedia of Philosophy, Compatibilism; https://plato.stanford.edu/entries/compatibilism/";
const libet = "Libet B, Gleason CA, Wright EW, Pearl DK (1983), Time of conscious intention to act in relation to onset of cerebral activity (readiness-potential), Brain 106(3): 623-642; https://doi.org/10.1093/brain/106.3.623";
const schurger = "Schurger A, Sitt JD, Dehaene S (2012), An accumulator model for spontaneous neural activity prior to self-initiated movement, PNAS 109(42): E2904-E2913; https://doi.org/10.1073/pnas.1210467109";

export default {
  slug: "c1-free-will-debate", level: "C1", title: "Caused, Yet Free?", topic: "Felsefe", sortOrder: 39, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: findEvidence(paragraphs, "Even a settled interpretation of such experiments would leave much unresolved."), options: [
      option("o1", "Rival views of free will and the limits of brain studies", true, null, "Metin üç felsefi tutumu tanıtır, ardından beyin deneylerinin tartışmayı neden çözemediğini anlatır."),
      option("o2", "Proof from brain studies that free will is an illusion", false, "reverse", "Yazar bu yorumun sonraki çalışmalarla karmaşıklaştığını ve deneylerin pek çok şeyi çözümsüz bıraktığını söyler."),
      option("o3", "Why compatibilism has finally ended the debate", false, "extreme", "Bağdaşırcılık yalnızca üç tutumdan biri olarak sunulur; tartışmanın bittiği söylenmez."),
      option("o4", "How the readiness potential shapes our everyday moral choices", false, "reverse", "Metin tam tersine düğmeye basma deneylerinin ahlaki seçimlerden çok uzak olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about Libet's 1983 findings does the passage support?", evidence: findEvidence(paragraphs, "began a fraction of a second before volunteers said they had become aware of deciding to move"), options: [
      option("o1", "A brain signal began just before people noticed deciding to move", true, null, "Hazırlık potansiyeli, gönüllülerin karar verdiklerinin farkına vardıklarını söyledikleri andan saniyenin bir kesri kadar önce başladı."),
      option("o2", "People reported deciding to move just before the readiness potential began", false, "reverse", "Sıra tersine çevrilmiş: beyin sinyali bildirilen farkındalıktan önce başladı."),
      option("o3", "A brain signal began just after people noticed deciding, as random fluctuations built up", false, "detail", "Rastgele dalgalanmalar 2012'de Schurger ekibinin yorumudur; Libet'in bulgusunun parçası değildir."),
      option("o4", "The team concluded that random neural fluctuations, not a decision, produced the signal", false, "detail", "Bu sonuç Schurger'in 2012 önerisidir, Libet ekibinin 1983 bulgusu değildir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does \"reading\" mean in \"Later work has complicated that reading\"?", evidence: findEvidence(paragraphs, "Later work has complicated that reading"), options: [
      option("o1", "A particular way of interpreting", true, null, "Reading burada bir verinin yorumu anlamındadır; sonraki çalışmalar bu yorumu karmaşıklaştırdı."),
      option("o2", "A figure shown on an instrument", false, "context", "Bir aletin gösterdiği değer anlamı gerçek bir kullanımdır ama burada 'that reading' bir yorumu işaret eder."),
      option("o3", "Silent study of a written text", false, "context", "Yazılı metni okuma eylemi anlamı bağlama uymaz."),
      option("o4", "A public recital of a written work", false, "context", "Bir eserin topluluğa okunması anlamı gerçektir ama burada geçerli değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about button-pressing experiments?", evidence: findEvidence(paragraphs, "Pressing a button at a moment of one's own choosing is far removed from deciding whom to marry"), options: [
      option("o1", "They tell us little about weighty moral decisions", true, null, "Yazar düğmeye basmanın evlilik ya da söz tutma gibi bilinçli seçimlerden çok uzak olduğunu söyler; yani bu deneyler sorumluluk sorusuna sınırlı ışık tutar."),
      option("o2", "They show that marriage choices are determined", false, "reverse", "Evlilik örneği deneylerin kapsamadığı bir seçim türü olarak verilir."),
      option("o3", "They are useless and should no longer be carried out at all", false, "extreme", "Yazar deneylerin sınırlı olduğunu ima eder ama durdurulmaları gerektiğini söylemez."),
      option("o4", "They prove that responsibility is an illusion", false, "reverse", "Yazar deneylerin sorumluluk sorularını çözmediğini vurgular."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Özgür irade tartışmasında belirlenimcilik, liberteryenlik (özgür iradenin belirlenimcilikle bağdaşmadığını ve özgür olduğumuzu savunan görüş) ve özgür irade şüpheciliği (özgür olduğumuzu reddeden görüş) başlıca tutumlardır.", source: sepFree, checkedOn: "2026-11-23" },
    { claim: "Bağdaşırcılık özgür iradenin belirlenimcilikle bağdaştığını savunur; özgürlüğü zorlama ya da kompulsiyon olmaksızın kişinin kendi gerekçeleriyle davranması olarak ele alır.", source: sepCompat, checkedOn: "2026-11-23" },
    { claim: "Libet ve meslektaşları 1983'te hazırlık potansiyelinin, katılımcıların hareket etme niyetinin farkına vardıklarını bildirdikleri andan saniyenin bir kesri kadar önce başladığını raporladı.", source: libet, checkedOn: "2026-11-23" },
    { claim: "Schurger, Sitt ve Dehaene 2012'de hazırlık potansiyelinin kendiliğinden sinirsel dalgalanmaların birikimini yansıtabileceğini öne süren bir model önerdi.", source: schurger, checkedOn: "2026-11-23" },
  ] },
};
