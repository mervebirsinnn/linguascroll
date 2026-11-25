import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["When{-dığında} an{} antibiotic{antibiyotik} enters{girer} the{} body{vücut}, it{} kills{öldürür} bacteria{bakteriler} or{} stops{durdurur} them{} from{-mekten} multiplying{çoğalmak}.", "Bir antibiyotik vücuda girdiğinde bakterileri öldürür ya da çoğalmalarını durdurur."],
    ["Most{çoğu} of{} the{} bacteria{bakteriler} die{ölür}, but{} a{} few{birkaç} may{-ebilir} carry{taşımak} small{küçük} genetic{genetik} differences{farklılıklar} that{ki} help{yardım eder} them{} survive{hayatta kalmak} the{} drug{ilaç}.", "Bakterilerin çoğu ölür, ama birkaçı ilaçtan sağ çıkmalarına yardım eden küçük genetik farklılıklar taşıyabilir."],
    ["Those{o} survivors{hayatta kalanlar} then{sonra} multiply{çoğalır}, and{} their{} descendants{soyundan gelenler} inherit{miras alır} the{} same{aynı} protection{koruma}.", "Sonra bu hayatta kalanlar çoğalır ve onların soyundan gelenler aynı korumayı miras alır."],
    ["Over{boyunca} many{birçok} generations{kuşaklar}, a{} whole{bütün} population{topluluk, popülasyon} can{-ebilir} become{olmak} resistant{dirençli}.", "Birçok kuşak boyunca bütün bir topluluk dirençli hâle gelebilir."],
    ["Bacteria{bakteriler} can{-ebilir} also{ayrıca} pass{aktarmak} useful{yararlı} genes{genler} directly{doğrudan} to{-e} their{} neighbours{komşular}, which{ki bu} spreads{yayar} resistance{direnç} even{daha da} faster{hızlı}.", "Bakteriler yararlı genleri doğrudan komşularına da aktarabilir; bu da direnci daha da hızlı yayar."],
  ],
  [
    ["This{} process{süreç} can{-ebilir} happen{olmak} naturally{doğal olarak}, but{} human{insan} behaviour{davranış} has{} sped{hızlandırdı} it{} up{(speed up: hızlandırmak)}.", "Bu süreç doğal olarak gerçekleşebilir, ama insan davranışı onu hızlandırmıştır."],
    ["Antibiotics{antibiyotikler} are{} often{sık sık} taken{alınır} for{} colds{soğuk algınlıkları} and{} flu{grip}, which{ki bunlar} are{} caused{neden olunur} by{tarafından} viruses{virüsler}, so{bu yüzden} the{} drugs{ilaçlar} do{yapmak} nothing{hiçbir şey} except{dışında} give{vermek} bacteria{bakteriler} more{daha fazla} chances{fırsatlar} to{-mek} adapt{uyum sağlamak}.", "Antibiyotikler sık sık virüslerin neden olduğu soğuk algınlığı ve grip için alınır; bu yüzden ilaçlar bakterilere uyum sağlamaları için daha fazla fırsat vermekten başka bir şey yapmaz."],
    ["Large{büyük} amounts{miktarlar} are{} also{ayrıca} used{kullanılır} in{} farming{hayvancılık, tarım}.", "Büyük miktarlar hayvancılıkta da kullanılır."],
    ["Alexander{Alexander} Fleming{Fleming}, who{ki o} discovered{keşfetti} penicillin{penisilin}, warned{uyardı} about{hakkında} this{} danger{tehlike} in{} his{} Nobel{Nobel} lecture{konuşma, ders} in{} 1945.", "Penisilini keşfeden Alexander Fleming, 1945'teki Nobel konuşmasında bu tehlikeye karşı uyardı."],
  ],
  [
    ["The{} World{Dünya} Health{Sağlık} Organization{Örgütü} now{artık} describes{tanımlar} antimicrobial{antimikrobiyal} resistance{direnç} as{} a{} major{büyük} global{küresel} threat{tehdit} to{-e yönelik} public{halk} health{sağlığı}.", "Dünya Sağlık Örgütü artık antimikrobiyal direnci halk sağlığına yönelik büyük bir küresel tehdit olarak tanımlıyor."],
    ["When{-dığında} common{yaygın} drugs{ilaçlar} fail{işe yaramaz}, ordinary{sıradan} infections{enfeksiyonlar} become{olur} harder{daha zor} to{-mek} treat{tedavi etmek}, and{} routine{rutin} operations{ameliyatlar} become{olur} riskier{daha riskli}.", "Yaygın ilaçlar işe yaramadığında sıradan enfeksiyonları tedavi etmek zorlaşır ve rutin ameliyatlar daha riskli hâle gelir."],
    ["Too{çok} few{az} new{yeni} antibiotics{antibiyotikler} are{} being{olmak} developed{geliştirilmek}, so{bu yüzden} experts{uzmanlar} argue{savunur} that{ki} protecting{korumak} the{} drugs{ilaçlar} we{} already{zaten} have{sahip olmak} matters{önemlidir} just{tam} as{} much{o kadar}.", "Çok az yeni antibiyotik geliştiriliyor, bu yüzden uzmanlar elimizdeki ilaçları korumanın da tam o kadar önemli olduğunu savunur."],
    ["That{bu} means{demektir} using{kullanmak} them{} only{yalnızca} when{-dığında} they{} are{} truly{gerçekten} needed{gerekli}, preventing{önlemek} infections{enfeksiyonlar} through{yoluyla} clean{temiz} water{su} and{} vaccines{aşılar}, and{} watching{izlemek} carefully{dikkatle} for{} resistant{dirençli} strains{suşlar}.", "Bu, onları yalnızca gerçekten gerektiğinde kullanmak, temiz su ve aşılarla enfeksiyonları önlemek ve dirençli suşları dikkatle izlemek demektir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-antibiotic-resistance", rows);
const ev = (t) => findEvidence(paragraphs, t);
const who = "World Health Organization, Antimicrobial resistance (fact sheet); https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance";
const cdc = "U.S. Centers for Disease Control and Prevention, Antimicrobial Resistance; https://www.cdc.gov/antimicrobial-resistance/";
const fleming = "Alexander Fleming, Penicillin, Nobel Lecture, 11 Aralık 1945; https://www.nobelprize.org/prizes/medicine/1945/fleming/lecture/";

export default {
  slug: "b2-antibiotic-resistance", level: "B2", title: "When Drugs Stop Working", topic: "Tıp", sortOrder: 36, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("a whole population can become resistant"), options: [
      option("o1", "How bacteria resist drugs and why it matters", true, null, "Metin direncin nasıl oluştuğunu, nasıl hızlandığını ve neden önemli bir tehdit olduğunu anlatır."),
      option("o2", "Why antibiotics cure colds and flu quickly", false, "reverse", "Metin antibiyotiklerin virüslerin yol açtığı bu hastalıklarda işe yaramadığını söyler."),
      option("o3", "How Alexander Fleming first discovered penicillin", false, "context", "Fleming yalnızca uyarısıyla anılır; keşif hikâyesi anlatılmaz."),
      option("o4", "Why farm animals no longer need any medicine", false, "notstated", "Metinde böyle bir iddia yoktur; hayvancılıktaki kullanım bir risk olarak geçer."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, why are antibiotics useless against colds and flu?", evidence: ev("which are caused by viruses"), options: [
      option("o1", "These illnesses are caused by viruses", true, null, "Metin soğuk algınlığı ve gribin virüslerden kaynaklandığını açıkça söyler."),
      option("o2", "Colds are caused by resistant bacteria", false, "reverse", "Metne göre nedeni bakteri değil virüstür."),
      option("o3", "The drugs are too expensive for patients", false, "notstated", "Pahalılık yalnızca yeni ilaç geliştirmek için söylenir."),
      option("o4", "Patients usually stop taking the pills early", false, "notstated", "Metinde böyle bir neden verilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “inherit” mean in paragraph 1?", evidence: ev("their descendants inherit the same protection"), options: [
      option("o1", "Receive from their parents", true, null, "Inherit, bir özelliği önceki kuşaktan almak demektir; soyundan gelenler korumayı ebeveynlerinden alır."),
      option("o2", "Lose over a short time", false, "reverse", "Koruma kaybedilmez, aksine aktarılır."),
      option("o3", "Pass to nearby bacteria", false, "context", "Komşulara gen aktarımı ayrı bir cümlede anlatılır; inherit bu anlama gelmez."),
      option("o4", "Produce inside a laboratory", false, "notstated", "Laboratuvar üretimi metinde geçmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred from the final paragraph?", evidence: ev("protecting the drugs we already have matters just as much"), options: [
      option("o1", "Careful use of current drugs is a key defence", true, null, "Yeni ilaçlar yeterince gelmediği için mevcut ilaçları dikkatli kullanmak temel bir savunma olarak sunulur."),
      option("o2", "New antibiotics will soon solve the problem", false, "reverse", "Metin çok az yeni antibiyotik geliştirildiğini söyler."),
      option("o3", "Resistance affects only rare, exotic infections", false, "reverse", "Metin sıradan enfeksiyonların tedavisinin zorlaştığını söyler."),
      option("o4", "Vaccines have replaced the need for antibiotics", false, "extreme", "Aşılar önleme araçlarından biri olarak geçer; antibiyotiklerin yerini aldığı söylenmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Antibiyotikler bakterileri öldürür ya da çoğalmalarını durdurur; ilaçtan sağ çıkan bakteriler çoğalarak dirençli popülasyonlar oluşturabilir ve direnç genleri bakteriler arasında aktarılabilir.", source: cdc, checkedOn: "2026-11-23" },
    { claim: "Antibiyotikler virüslerin yol açtığı soğuk algınlığı ve gribe karşı etkisizdir; gereksiz kullanım direnci hızlandırır.", source: cdc, checkedOn: "2026-11-23" },
    { claim: "Antibiyotiklerin insanlarda ve hayvancılık/gıda sektöründe yanlış ve aşırı kullanımı direnci hızlandırır.", source: who, checkedOn: "2026-11-23" },
    { claim: "Alexander Fleming 1945 Nobel konuşmasında penisilinin yetersiz dozda kullanılmasının mikropları dirençli hâle getirebileceği konusunda uyardı.", source: fleming, checkedOn: "2026-11-23" },
    { claim: "DSÖ antimikrobiyal direnci büyük bir küresel halk sağlığı tehdidi olarak tanımlar; yeterli sayıda yeni antibiyotik geliştirilmemektedir; direnç enfeksiyon tedavisini ve ameliyatları daha riskli kılar; önleme için temiz su, hijyen, aşılar ve izleme önerilir.", source: who, checkedOn: "2026-11-23" },
  ] },
};
