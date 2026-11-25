import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Public{kamusal} discussion{tartışma} of{} climate{iklim} change{değişim} tends{eğilimli olmak} to{-mek} fix{sabitlemek} on{-e} carbon{karbon} dioxide{dioksit}, and{} for{için} good{iyi} reason{neden}: the{} gas{gaz} is{} the{} main{ana} lever{kaldıraç} that{ki} human{insan} activity{faaliyet} has{} pulled{çekmek}.", "Kamusal iklim değişikliği tartışması karbondioksit üzerinde odaklanma eğilimindedir ve bunun iyi bir nedeni vardır: gaz, insan faaliyetinin çektiği ana kaldıraçtır."],
    ["Yet{yine de} the{} mechanism{mekanizma} by{ile} which{ki} it{} warms{ısıtmak} the{} planet{gezegen} involves{içermek} more{daha fazla} than{-den} the{} gas{gaz} itself{kendisi}, and{} the{} fuller{daha tam} picture{resim} helps{yardım etmek} explain{açıklamak} why{neden} small{küçük} changes{değişimler} matter{önemli olmak}.", "Yine de gazın gezegeni ısıtma mekanizması gazın kendisinden fazlasını içerir ve daha tam resim, küçük değişimlerin neden önemli olduğunu açıklamaya yardım eder."],
    ["That{o} is{} why{neden} the{} subject{konu} rewards{ödüllendirmek} patient{sabırlı} explanation{açıklama} far{çok} more{daha fazla} than{-den} confident{kendinden emin} slogans{sloganlar}.", "Bu yüzden konu, kendinden emin sloganlardan çok sabırlı açıklamayı ödüllendirir."],
  ],
  [
    ["The{} basic{temel} physics{fizik} is{} a{} natural{doğal} greenhouse{sera} effect{etki}: certain{belirli} gases{gazlar} absorb{emmek} heat{ısı} and{} slow{yavaşlatmak} its{onun} escape{kaçış} into{içine} space{uzay}, keeping{tutmak} the{} surface{yüzey} warm{sıcak} enough{yeterince} for{için} life{yaşam}.", "Temel fizik doğal bir sera etkisidir: bazı gazlar ısıyı emer ve uzaya kaçışını yavaşlatarak yüzeyi yaşam için yeterince sıcak tutar."],
    ["Carbon{karbon} dioxide{dioksit} comes{gelmek} from{-den} natural{doğal} sources{kaynaklar} such{gibi} as{gibi} volcanoes{yanardağlar} and{} from{-den} human{insan} activities{faaliyetler} such{gibi} as{gibi} burning{yakmak} fossil{fosil} fuels{yakıtlar} and{} clearing{kesip alan açmak (ormanları)} forests{ormanlar}.", "Karbondioksit yanardağlar gibi doğal kaynaklardan ve fosil yakıt yakmak ile ormanları temizlemek gibi insan faaliyetlerinden gelir."],
    ["NASA{NASA} reports{bildirmek} that{ki} its{onun} concentration{yoğunluk} in{} the{} atmosphere{atmosfer} has{} risen{yükselmek} by{kadar} nearly{neredeyse} fifty{elli} percent{yüzde} since{-den beri} seventeen{on yedi} fifty{elli}.", "NASA, atmosferdeki yoğunluğunun 1750'den beri neredeyse yüzde elli arttığını bildirir."],
  ],
  [
    ["Water{su} vapour{buhar} complicates{karmaşıklaştırmak} the{} account{anlatım}.", "Su buharı anlatımı karmaşıklaştırır."],
    ["It{} is{} the{} most{en} abundant{bol} greenhouse{sera} gas{gaz}, yet{yine de} it{} is{} not{değil} a{} direct{doğrudan} cause{neden} of{} warming{ısınma}: it{} responds{tepki vermek} to{-e} temperature{sıcaklık}, because{çünkü} warmer{daha sıcak} oceans{okyanuslar} put{koymak} more{daha fazla} of{} it{} into{içine} the{} air{hava}, and{} the{} extra{ekstra} vapour{buhar} then{sonra} amplifies{güçlendirmek} the{} original{özgün} warming{ısınma}.", "Bu en bol sera gazıdır; yine de ısınmanın doğrudan nedeni değildir: sıcaklığa tepki verir, çünkü daha sıcak okyanuslar havaya daha fazlasını verir ve fazla buhar özgün ısınmayı güçlendirir."],
    ["The{} result{sonuç} is{} a{} feedback{geri besleme}: a{} modest{mütevazı} initial{ilk} push{itme} from{-den} carbon{karbon} dioxide{dioksit} is{} magnified{büyütmek} by{tarafından} the{} system{sistem} it{} disturbs{rahatsız etmek}.", "Sonuç bir geri beslemedir: karbondioksitten gelen mütevazı bir ilk itme, rahatsız ettiği sistem tarafından büyütülür."],
  ],
  [
    ["Evidence{kanıt} for{için} how{nasıl} the{} system{sistem} behaves{davranmak} comes{gelmek} partly{kısmen} from{-den} ice{buz} cores{çekirdekler}.", "Sistemin nasıl davrandığına dair kanıt kısmen buz çekirdeklerinden gelir."],
    ["Drilled{delinmek} in{} Greenland{Grönland}, Antarctica{Antarktika} and{} tropical{tropikal} glaciers{buzullar}, they{} contain{içermek} tiny{minik} bubbles{kabarcıklar} of{} ancient{eski} air{hava} whose{kimin} composition{bileşim} can{-ebilir} be{olmak} compared{karşılaştırmak} with{ile} recent{yakın} direct{doğrudan} measurements{ölçümler}.", "Grönland, Antarktika ve tropik buzullarda delinen çekirdekler, bileşimi yakın tarihli doğrudan ölçümlerle karşılaştırılabilen eski havanın minik kabarcıklarını içerir."],
    ["They{} show{göstermek} that{ki} Earth's{Dünya (iyelik)} climate{iklim} has{} always{her zaman} responded{tepki vermek} to{-e} changes{değişimler} in{} greenhouse{sera} gases{gazlar}.", "Dünya'nın ikliminin sera gazlarındaki değişimlere her zaman tepki verdiğini gösterirler."],
  ],
  [
    ["What{ne} is{} new{yeni} is{} the{} pace{tempo}.", "Yeni olan şey tempodur."],
    ["NASA{NASA} states{belirtmek} that{ki} carbon{karbon} dioxide{dioksit} added{eklenmek} by{tarafından} people{insanlar} is{} increasing{artıyor} roughly{kabaca} two{iki} hundred{yüz} and{} fifty{elli} times{kat} faster{daha hızlı} than{-den} it{} did{(önceki fiilin yerine) artmıştı} from{-den} natural{doğal} sources{kaynaklar} after{sonra} the{} last{son} ice{buz} age{çağ}.", "NASA, insanların eklediği karbondioksitin son buz çağından sonra doğal kaynaklardan arttığından kabaca iki yüz elli kat daha hızlı arttığını belirtir."],
    ["A{} system{sistem} that{ki} amplifies{güçlendirmek} small{küçük} pushes{itmeler} is{} least{en az} forgiving{bağışlayıcı} when{-dığında} the{} push{itme} is{} large{büyük} and{} sudden{ani}.", "Küçük itmeleri güçlendiren bir sistem, itme büyük ve ani olduğunda en az bağışlayıcıdır."],
    ["Understanding{anlamak} that{o} logic{mantık} does{} not{} prescribe{reçete etmek} a{} policy{politika}, but{ama} it{} explains{açıklamak} why{neden} the{} timing{zamanlama} of{} any{herhangi bir} policy{politika} matters{önemli olmak}.", "O mantığı anlamak bir politika reçete etmez ama herhangi bir politikanın zamanlamasının neden önemli olduğunu açıklar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-climate-feedback", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA, Causes of Climate Change; https://science.nasa.gov/climate-change/causes/";
const nasaE = "NASA, Evidence (Climate Change); https://climate.nasa.gov/evidence/";

export default {
  slug: "c2-climate-feedback", level: "C2", title: "Small Pushes, Large Effects", topic: "İklim", sortOrder: 22, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central argument of the passage?", evidence: ev(4, "A system that amplifies small pushes is least forgiving when the push is large and sudden."), options: [
      option("o1", "Feedback and speed amplify warming", true, null, "Metin geri besleme ve hızın önemini vurgular."),
      option("o2", "Water vapour alone drives all warming", false, "reverse", "Su buharı doğrudan neden değildir."),
      option("o3", "Natural gases cannot change the climate", false, "reverse", "Metin sera etkisini doğal ve etkili sayar."),
      option("o4", "Ice-core records contradict direct data", false, "reverse", "Metin onların karşılaştırıldığını anlatır."),
    ] },
    { key: "q2", type: "detail", prompt: "Why is water vapour described as a feedback?", evidence: findEvidence(paragraphs, "it responds to temperature, because warmer oceans put more of it into the air, and the extra vapour then amplifies the original warming"), options: [
      option("o1", "It responds and amplifies", true, null, "Metin sıcaklığa tepki verdiğini ve ısınmayı güçlendirdiğini söyler."),
      option("o2", "It is the main gas added by fossil fuels", false, "reverse", "Fosil yakıtlarla eklenen karbondioksittir."),
      option("o3", "It cools the planet whenever it is warmed", false, "reverse", "Metin güçlendirmeyi anlatır; soğutmayı değil."),
      option("o4", "It is released directly by human activity", false, "reverse", "Okyanuslar ısındıkça havaya karışır; doğrudan insan salımı değildir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “amplifies” mean in the third paragraph?", evidence: ev(2, "the extra vapour then amplifies the original warming"), options: [
      option("o1", "Makes it stronger", true, null, "Amplify, güçlendirmek, büyütmek demektir."),
      option("o2", "Slowly removes entirely", false, "reverse", "Tersini anlatır."),
      option("o3", "Measures very precisely", false, "context", "Ölçme anlamı yoktur."),
      option("o4", "Records in a notebook", false, "context", "Kayıt anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does timing matter for any policy?", evidence: ev(4, "A system that amplifies small pushes is least forgiving when the push is large and sudden."), options: [
      option("o1", "Fast change leaves less time", true, null, "Büyük ve ani itme sistemi en az bağışlayıcı kılar."),
      option("o2", "Policy has no effect on the climate", false, "reverse", "Metin böyle bir şey söylemez."),
      option("o3", "Slow pushes are always more harmful", false, "reverse", "Tersini ima eder."),
      option("o4", "Timing matters only for water vapour", false, "extreme", "Metin böyle bir sınırlama yapmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Sera etkisi doğaldır: bazı gazlar ısıyı emip uzaya kaçışını yavaşlatır; karbondioksit volkanlar gibi doğal kaynaklardan ve fosil yakıt yakma ile ormansızlaşmadan gelir; atmosferdeki karbondioksit 1750'den beri yaklaşık yüzde 50 arttı.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Su buharı en bol sera gazıdır ama ısınmanın doğrudan nedeni değildir; ısınan okyanuslar havaya daha fazla su buharı ekler (geri besleme).", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Grönland, Antarktika ve tropik buzullardan alınan buz çekirdekleri iklimin sera gazı değişimlerine tepki verdiğini gösterir; insan kaynaklı karbondioksit son buz çağından sonra doğal kaynakların artışından yaklaşık 250 kat daha hızlı artıyor.", source: nasaE, checkedOn: "2026-11-23" },
  ] },
};
