import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Life{yaşam} on{üzerinde} Earth{Dünya} depends{bağlıdır} on{-e} a{} natural{doğal} greenhouse{sera} effect{etki}: certain{belirli} gases{gazlar} in{} the{} atmosphere{atmosfer} absorb{emmek} heat{ısı} and{} slow{yavaşlatmak} its{onun} escape{kaçış} into{içine} space{uzay}.", "Dünya'daki yaşam doğal bir sera etkisine bağlıdır: atmosferdeki bazı gazlar ısıyı emer ve uzaya kaçışını yavaşlatır."],
    ["Without{olmadan} it{}, the{} planet{gezegen} would{-ecekti} be{olmak} far{çok} too{fazla} cold{soğuk} for{için} most{çoğu} living{yaşayan} things{canlılar}.", "O olmasaydı gezegen çoğu canlı için fazlasıyla soğuk olurdu."],
    ["The{} problem{sorun} is{} not{değil} the{} effect{etki} itself{kendisi} but{ama} its{onun} strength{güç}, which{ki o} has{} been{} growing{artmak} as{-dıkça} the{} concentration{yoğunluk} of{} these{bu} gases{gazlar} rises{artar}.", "Sorun etkinin kendisi değil, bu gazların yoğunluğu arttıkça güçlenen şiddetidir."],
  ],
  [
    ["Carbon{karbon} dioxide{dioksit} is{} the{} best{en iyi} known{bilinen} of{} them{onlar}.", "Karbondioksit bunların en bilinenidir."],
    ["It{} is{} released{salınmak} naturally{doğal olarak} by{tarafından} volcanoes{yanardağlar} and{} living{yaşayan} organisms{organizmalar}, but{ama} human{insan} activities{faaliyetler} now{şimdi} add{eklemek} far{çok} more{daha fazla}, mainly{esas olarak} through{aracılığıyla} burning{yakmak} fossil{fosil} fuels{yakıtlar} and{} clearing{kesip alan açmak (ormanları)} forests{ormanlar}.", "Doğal olarak yanardağlar ve canlılar tarafından salınır ama insan faaliyetleri şimdi, esas olarak fosil yakıtları yakarak ve ormanları temizleyerek çok daha fazlasını ekliyor."],
    ["According{göre (according to)} to{göre (according to)} NASA{NASA}, the{} amount{miktar} of{} carbon{karbon} dioxide{dioksit} in{} the{} atmosphere{atmosfer} has{} risen{yükselmek} by{kadar} nearly{neredeyse} fifty{elli} percent{yüzde} since{-den beri} seventeen{on yedi} fifty{elli}.", "NASA'ya göre atmosferdeki karbondioksit miktarı 1750'den beri neredeyse yüzde elli arttı."],
    ["Scientists{bilim insanları} can{-ebilir} check{kontrol etmek} this{} trend{eğilim} because{çünkü} tiny{minik} bubbles{kabarcıklar} of{} ancient{eski} air{hava} are{} trapped{hapsolmuş} in{} ice{buz} cores{çekirdekler} drilled{delinmiş} from{-den} Greenland{Grönland} and{} Antarctica{Antarktika}.", "Bilim insanları bu eğilimi kontrol edebilir, çünkü Grönland ve Antarktika'dan çıkarılan buz çekirdeklerinde eski havanın minik kabarcıkları hapsolmuştur."],
  ],
  [
    ["Those{o} records{kayıtlar} show{göstermek} that{ki} the{} climate{iklim} has{} always{her zaman} responded{tepki verdi} to{-e} changes{değişimler} in{} greenhouse{sera} gases{gazlar}.", "Bu kayıtlar iklimin sera gazlarındaki değişimlere her zaman tepki verdiğini gösterir."],
    ["What{ne} is{} different{farklı} today{bugün} is{} the{} speed{hız}: NASA{NASA} reports{bildirir} that{ki} the{} carbon{karbon} dioxide{dioksit} added{eklenen} by{tarafından} people{insanlar} is{} increasing{artıyor} far{çok} faster{daha hızlı} than{-den} natural{doğal} sources{kaynaklar} did{yaptı} after{sonra} the{} last{son} ice{buz} age{çağ}.", "Bugün farklı olan şey hızdır: NASA, insanların eklediği karbondioksitin son buz çağından sonra doğal kaynakların yaptığından çok daha hızlı arttığını bildiriyor."],
    ["For{için} that{o} reason{neden}, reducing{azaltmak} emissions{salınımlar} is{} often{sıklıkla} described{tanımlanmak} as{olarak} a{} race{yarış} against{karşı} time{zaman}.", "Bu nedenle salınımları azaltmak çoğu zaman zamana karşı bir yarış olarak tanımlanır."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-climate-carbon", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA, Causes of Climate Change; https://science.nasa.gov/climate-change/causes/";
const nasaE = "NASA, Evidence (Climate Change); https://climate.nasa.gov/evidence/";

export default {
  slug: "b2-climate-carbon", level: "B2", title: "A Race Against Time", topic: "İklim", sortOrder: 21, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "What is different today is the speed"), options: [
      option("o1", "Rising carbon dioxide and why it matters", true, null, "Metin karbondioksit artışını ve önemini anlatır."),
      option("o2", "How the Sun's heat reaches the Earth", false, "context", "Güneş ısısı yalnızca arka plandır."),
      option("o3", "Why volcanoes are the main cause of warming", false, "reverse", "Metin insan faaliyetlerinin çok daha fazla eklediğini söyler."),
      option("o4", "How ice cores are drilled in Greenland", false, "detail", "Buz çekirdekleri yalnızca kanıt kaynağıdır."),
    ] },
    { key: "q2", type: "detail", prompt: "How do scientists check how carbon dioxide has changed?", evidence: ev(1, "tiny bubbles of ancient air are trapped in ice cores drilled from Greenland and Antarctica"), options: [
      option("o1", "By studying air trapped in ice cores", true, null, "Metin buz çekirdeklerindeki hava kabarcıklarını söyler."),
      option("o2", "By counting the volcanoes on each continent", false, "notstated", "Yanardağ sayımı anlatılmaz."),
      option("o3", "By asking people to report how warm they feel", false, "notstated", "Anket anlatılmaz."),
      option("o4", "By measuring the depth of oceans each year", false, "notstated", "Derinlik ölçümü anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “emissions” mean in the last paragraph?", evidence: ev(2, "reducing emissions is often described as a race against time"), options: [
      option("o1", "Gases released into the air", true, null, "Emission, havaya salınan gaz demektir."),
      option("o2", "Records kept inside a laboratory", false, "context", "Kayıt geçer ama emission kayıt değildir."),
      option("o3", "Rules written to protect forests", false, "context", "Ormanlar geçer; kelimenin anlamı kural değildir."),
      option("o4", "Layers of ice below the ground", false, "context", "Buz geçer; emission buz değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "Why is the speed of the change important?", evidence: findEvidence(paragraphs, "the carbon dioxide added by people is increasing far faster than natural sources did after the last ice age"), options: [
      option("o1", "Fast change gives less time to adapt.", true, null, "Hızlı değişim uyum için daha az zaman bırakır."),
      option("o2", "Fast change is easier to measure.", false, "notstated", "Ölçülebilirlik anlatılmaz."),
      option("o3", "Fast change lets natural sources keep up.", false, "reverse", "Metin insan kaynaklı artışın doğal olandan çok hızlı olduğunu söyler."),
      option("o4", "Fast change mainly affects ice cores.", false, "notstated", "Buz çekirdekleri yalnızca veri kaynağıdır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Sera etkisi doğaldır: bazı gazlar ısıyı emip uzaya kaçışını yavaşlatır; karbondioksit volkanlar gibi doğal kaynaklardan ve fosil yakıt yakma ile ormansızlaşmadan gelir.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Atmosferdeki karbondioksit miktarı 1750'den beri neredeyse yüzde 50 arttı; insan kaynaklı karbondioksit, son buz çağından sonra doğal kaynakların artışından çok daha hızlı artıyor.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Grönland, Antarktika ve tropik buzullardan alınan buz çekirdekleri iklimin sera gazı seviyelerindeki değişimlere tepki verdiğini gösterir.", source: nasaE, checkedOn: "2026-11-23" },
  ] },
};
