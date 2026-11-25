import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Inside{içinde} almost{neredeyse} every{her} cell{hücre} in{} your{} body{vücut} are{} tiny{minicik} structures{yapılar} called{adı verilen} mitochondria{mitokondriler}.", "Vücudundaki neredeyse her hücrenin içinde mitokondri adı verilen minicik yapılar bulunur."],
    ["They{} are{} often{sık sık} described{tanımlanır} as{} the{} power{enerji} stations{santralleri} of{} the{} cell{hücre}, because{çünkü} they{} use{kullanır} oxygen{oksijen} and{} nutrients{besinler} from{-den gelen} food{yiyecek} to{-mek için} produce{üretmek} a{} molecule{molekül} called{adı verilen} ATP{ATP}, which{ki o} supplies{sağlar} energy{enerji} for{} most{çoğu} cellular{hücresel} activities{etkinlikler}.", "Sık sık hücrenin enerji santralleri olarak tanımlanırlar, çünkü yiyeceklerden gelen oksijen ve besinleri kullanarak hücresel etkinliklerin çoğuna enerji sağlayan ATP adlı bir molekül üretirler."],
    ["Cells{hücreler} that{ki} work{çalışır} especially{özellikle} hard{sıkı}, such{gibi} as{(such as: gibi)} those{olanlar} in{} muscles{kaslar} and{} the{} heart{kalp}, depend{bağlı olmak} heavily{büyük ölçüde} on{(depend on: -e bağlı olmak)} them{}.", "Kaslardakiler ve kalptekiler gibi özellikle sıkı çalışan hücreler büyük ölçüde onlara bağlıdır."],
    ["Mature{olgun} red{kırmızı} blood{kan} cells{hücreleri} are{} an{} exception{istisna}, because{çünkü} they{} have{sahip olmak} none{hiç}.", "Olgun kırmızı kan hücreleri bir istisnadır, çünkü hiç mitokondrileri yoktur."],
  ],
  [
    ["Mitochondria{mitokondriler} are{} unusual{alışılmadık} in{} another{başka bir} way{yol}: they{} carry{taşır} their{} own{kendi} small{küçük} set{takım} of{} DNA{DNA}, separate{ayrı} from{-den} the{} main{ana} genetic{genetik} material{malzeme} in{} the{} cell{hücre} nucleus{çekirdeği}.", "Mitokondriler başka bir açıdan da alışılmadıktır: hücre çekirdeğindeki ana genetik malzemeden ayrı, kendi küçük DNA takımlarını taşırlar."],
    ["This{} clue{ipucu} supports{destekler} a{} remarkable{dikkat çekici} idea{fikir} known{bilinen} as{} the{} endosymbiotic{endosimbiyotik} theory{kuram}.", "Bu ipucu, endosimbiyotik kuram olarak bilinen dikkat çekici bir fikri destekler."],
    ["According{göre} to{(according to: -e göre)} it{}, mitochondria{mitokondriler} descend{soyundan gelmek} from{-den} free{serbest}-living{yaşayan} bacteria{bakteriler} that{ki} were{} taken{alınmış} inside{içine} another{başka bir} cell{hücre} more{daha} than{-den} a{} billion{milyar} years{yıl} ago{önce}.", "Bu kurama göre mitokondriler, bir milyar yıldan daha uzun zaman önce başka bir hücrenin içine alınmış serbest yaşayan bakterilerin soyundan gelir."],
    ["Instead{yerine} of{(instead of: yerine)} being{-mek} digested{sindirilmek}, the{} bacteria{bakteriler} stayed{kaldı} and{} became{oldu} permanent{kalıcı} partners{ortaklar}.", "Bakteriler sindirilmek yerine kaldı ve kalıcı ortaklar oldu."],
    ["The{} American{Amerikalı} biologist{biyolog} Lynn{Lynn} Margulis{Margulis} became{oldu} its{} best{en} known{bilinen} champion{savunucu}, at{} a{} time{zaman} when{-dığı} many{birçok} scientists{bilim insanları} still{hâlâ} doubted{kuşkuyla bakıyordu} it{}.", "Amerikalı biyolog Lynn Margulis, birçok bilim insanının hâlâ kuşkuyla baktığı bir dönemde bu kuramın en bilinen savunucusu oldu."],
  ],
  [
    ["In{} humans{insanlar}, mitochondrial{mitokondriyal} DNA{DNA} is{} usually{genellikle} inherited{kalıtılır} from{-den} the{} mother{anne} alone{yalnızca}.", "İnsanlarda mitokondriyal DNA genellikle yalnızca anneden kalıtılır."],
    ["When{-dığında} mitochondria{mitokondriler} do{} not{} work{çalışmak} properly{düzgün}, the{} organs{organlar} that{ki} need{ihtiyaç duyar} the{} most{en çok} energy{enerji}, such{gibi} as{(such as: gibi)} the{} brain{beyin} and{} muscles{kaslar}, are{} often{sık sık} the{} first{ilk} to{-mek} suffer{zarar görmek}.", "Mitokondriler düzgün çalışmadığında beyin ve kaslar gibi en çok enerjiye ihtiyaç duyan organlar çoğu zaman ilk zarar görenler olur."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-mitochondria", rows);
const ev = (t) => findEvidence(paragraphs, t);
const nigms = "National Institute of General Medical Sciences (NIH), Mitochondria; https://www.nigms.nih.gov/node/144581";
const medline = "MedlinePlus Genetics, Mitochondrial DNA; https://medlineplus.gov/genetics/chromosome/mitochondrial-dna/";
const medlineV = "MedlinePlus Genetics, Mitochondrial complex V deficiency (maternal inheritance of mtDNA); https://medlineplus.gov/genetics/condition/mitochondrial-complex-v-deficiency/";
const pmcMargulis = "PMC (NIH), Lynn Margulis, 1938-2011; https://pmc.ncbi.nlm.nih.gov/articles/PMC3268288";
const pmcOrigin = "PMC (NIH), Independent and sensory human mitochondrial functions reflecting symbiotic evolution; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10302212/";

export default {
  slug: "b2-mitochondria", level: "B2", title: "Power Stations with a Past", topic: "Biyoloji", sortOrder: 40, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("They are often described as the power stations of the cell"), options: [
      option("o1", "The role and unusual origin of mitochondria", true, null, "Metin mitokondrinin enerji üretimindeki görevini, kendi DNA'sını ve bakteri kökenini anlatır."),
      option("o2", "How red blood cells carry oxygen around the body", false, "context", "Kırmızı kan hücreleri yalnızca bir istisna olarak anılır."),
      option("o3", "Why the cell nucleus has no DNA of its own", false, "reverse", "Metin ana genetik malzemenin çekirdekte olduğunu söyler."),
      option("o4", "A debate that proved Lynn Margulis wrong", false, "reverse", "Margulis kuramın savunucusu olarak anılır; yanıldığı söylenmez."),
    ] },
    { key: "q2", type: "detail", prompt: "Which cells, according to the passage, have no mitochondria?", evidence: ev("Mature red blood cells are an exception, because they have none."), options: [
      option("o1", "Mature red blood cells", true, null, "Metin olgun kırmızı kan hücrelerinin hiç mitokondrisi olmadığını söyler."),
      option("o2", "Cells in the heart", false, "reverse", "Kalp hücreleri enerji için mitokondrilere büyük ölçüde bağlıdır."),
      option("o3", "Muscle cells that work hard", false, "reverse", "Sıkı çalışan kas hücreleri enerji için mitokondrilere büyük ölçüde bağlıdır."),
      option("o4", "Cells in the brain", false, "notstated", "Beyin enerji ihtiyacı yüksek bir organ olarak anılır; mitokondrisiz olduğu söylenmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “descend from” mean in paragraph 2?", evidence: ev("mitochondria descend from free-living bacteria"), options: [
      option("o1", "Come originally from", true, null, "Descend from, bir şeyin soyundan gelmek, kökeni oraya dayanmak demektir."),
      option("o2", "Slowly move downwards towards", false, "context", "Descend'in fiziksel 'aşağı inmek' anlamı bu bağlama uymaz."),
      option("o3", "Fight against and destroy", false, "notstated", "Metin bakterilerin kalıcı ortak olduğunu söyler; savaş yoktur."),
      option("o4", "Break down into smaller parts", false, "context", "Sindirilme anılır ama bakterilerin sindirilmediği söylenir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about a person's mitochondrial DNA?", evidence: ev("mitochondrial DNA is usually inherited from the mother alone"), options: [
      option("o1", "It points to the maternal line", true, null, "Mitokondriyal DNA genellikle yalnızca anneden geçtiği için kişiyi anne tarafındaki soya bağlar."),
      option("o2", "It is mixed from both parents", false, "reverse", "Metin genellikle yalnızca anneden geldiğini söyler."),
      option("o3", "It is stored inside the cell nucleus", false, "reverse", "Mitokondriyal DNA çekirdekteki malzemeden ayrıdır."),
      option("o4", "It is destroyed before a baby is born", false, "notstated", "Metinde böyle bir şeyden söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Mitokondriler hücre enerjisinin %90'ından fazlasını üretir; en yaygın hücresel enerji kaynağı olan ATP'yi oluştururlar; olgun kırmızı kan hücreleri dışındaki her hücre mitokondri içerir.", source: nigms, checkedOn: "2026-11-25" },
    { claim: "Mitokondrilerin çekirdekteki kromozomlardan ayrı, kendi küçük DNA'sı vardır; bozuklukları en çok beyin, kas ve kalp gibi yüksek enerji gerektiren dokuları etkiler.", source: medline, checkedOn: "2026-11-25" },
    { claim: "Yumurta hücresi mitokondri katar, sperm katmaz; mtDNA kaynaklı durumlar yalnızca anneden kalıtılır.", source: medlineV, checkedOn: "2026-11-25" },
    { claim: "Endosimbiyotik hipoteze göre mitokondriler bakteriyel kökenlidir; olay yaklaşık 1,45 milyar yıl önce gerçekleşmiştir (bakteri konak hücre tarafından içe alınmıştır).", source: pmcOrigin, checkedOn: "2026-11-25" },
    { claim: "Lynn Margulis (Amerikalı biyolog) endosimbiyoz kuramını savundu; ilk makalesi onlarca dergi tarafından reddedildi ve eleştiri sert oldu.", source: pmcMargulis, checkedOn: "2026-11-25" },
  ] },
};
