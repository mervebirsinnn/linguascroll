import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} ocean{okyanus} has{} quietly{sessizce} softened{yumuşatmak} the{} impact{etki} of{} human{insan} emissions{salımlar}.", "Okyanus insan kaynaklı salımların etkisini sessizce yumuşattı."],
    ["According{göre (according to)} to{göre (according to)} the{} US{ABD} National{ulusal} Oceanic{okyanus} and{} Atmospheric{atmosfer} Administration{idare}, it{} absorbs{emmek} about{yaklaşık} thirty{otuz} percent{yüzde} of{} the{} carbon{karbon} dioxide{dioksit} released{salınan} into{-e} the{} atmosphere{atmosfer}, slowing{yavaşlatmak} the{} warming{ısınma} that{ki} would{-ecekti} otherwise{aksi hâlde} occur{gerçekleşmek}.", "ABD Ulusal Okyanus ve Atmosfer İdaresi'ne göre okyanus atmosfere salınan karbondioksitin yaklaşık yüzde otuzunu emer ve aksi hâlde gerçekleşecek ısınmayı yavaşlatır."],
    ["This{} service{hizmet}, however{ancak}, comes{gelmek} at{} a{} chemical{kimyasal} price{bedel}.", "Ancak bu hizmetin kimyasal bir bedeli vardır."],
    ["When{-dığında} carbon{karbon} dioxide{dioksit} dissolves{çözünmek} in{} seawater{deniz suyu} it{} forms{oluşturmak} carbonic{karbonik} acid{asit}, and{} the{} average{ortalama} pH{pH} of{} surface{yüzey} waters{sular} has{} fallen{düşmek} by{kadar} about{yaklaşık} 0.1 units{birimler} since{-den beri} the{} start{başlangıç} of{} the{} industrial{endüstriyel} era{çağ}.", "Karbondioksit deniz suyunda çözündüğünde karbonik asit oluşturur ve yüzey sularının ortalama pH değeri endüstri çağının başından beri yaklaşık 0,1 birim düştü."],
  ],
  [
    ["That{o} figure{rakam} sounds{gibi gelmek} trivial{önemsiz} until{-e kadar} one{insan (genel özne)} recalls{hatırlamak} that{-dığını} the{} pH{pH} scale{ölçek} is{} logarithmic{logaritmik}: a{} fall{düşüş} of{} 0.1 corresponds{karşılık gelmek} to{-e} an{} increase{artış} of{} roughly{kabaca} thirty{otuz} percent{yüzde} in{} acidity{asitlik}.", "pH ölçeğinin logaritmik olduğu hatırlanana kadar bu rakam önemsiz gelir: 0,1'lik bir düşüş asitlikte kabaca yüzde otuzluk bir artışa karşılık gelir."],
    ["The{} term{terim} can{-ebilir} nonetheless{yine de} mislead{yanıltmak}.", "Terim yine de yanıltıcı olabilir."],
    ["Seawater{deniz suyu} remains{kalmak} slightly{hafifçe} basic{bazik} rather{-den çok (rather than)} than{-den çok (rather than)} acidic{asidik}; acidification{asitlenme} describes{tanımlamak} the{} direction{yön} of{} change{değişim}, not{} the{} destination{varış noktası}.", "Deniz suyu asidik değil, hafif bazik kalmaya devam eder; asitlenme varış noktasını değil, değişimin yönünü tanımlar."],
  ],
  [
    ["The{} biological{biyolojik} stakes{risk altındaki şeyler (stakes)} lie{bulunmak} mainly{esas olarak} in{} what{ne} the{} extra{fazladan} acid{asit} removes{ortadan kaldırmak}.", "Biyolojik açıdan asıl tehlike, fazladan asidin ortadan kaldırdığı şeyde yatar."],
    ["Reactions{tepkimeler} triggered{tetiklenen} by{tarafından} the{} dissolved{çözünmüş} gas{gaz} reduce{azaltmak} the{} concentration{yoğunluk} of{} carbonate{karbonat} ions{iyonlar}, the{} building{yapı (building blocks)} blocks{taşları (building blocks: yapı taşları)} that{ki} oysters{istiridyeler}, corals{mercanlar} and{} some{bazı} pteropods{pteropodlar (küçük deniz salyangozları)} use{kullanmak} to{-mek için} construct{inşa etmek} shells{kabuklar} and{} skeletons{iskeletler}.", "Çözünmüş gazın tetiklediği tepkimeler, istiridyelerin, mercanların ve bazı pteropodların (küçük deniz salyangozları) kabuk ve iskelet yapmak için kullandığı yapı taşları olan karbonat iyonlarının yoğunluğunu azaltır."],
    ["Where{-dığı yerde} carbonate{karbonat} becomes{olmak} scarce{kıt}, these{} organisms{organizmalar} must{zorunda olmak} spend{harcamak} more{daha fazla} energy{enerji} to{-mek için} build{inşa etmek}, and{} in{} sufficiently{yeterince} corrosive{aşındırıcı} water{su} existing{mevcut} structures{yapılar} can{-ebilir} begin{başlamak} to{-meye} dissolve{çözünmek}.", "Karbonatın kıtlaştığı yerlerde bu organizmalar yapı kurmak için daha fazla enerji harcamak zorunda kalır ve yeterince aşındırıcı suda mevcut yapılar çözünmeye başlayabilir."],
    ["Oyster{istiridye} hatcheries{kuluçkahaneler} on{} the{} Pacific{Pasifik} coast{kıyı} of{} North{kuzey} America{Amerika} have{} suffered{maruz kalmak} severe{ağır} losses{kayıplar} of{} larvae{larvalar}, which{ki bunu} researchers{araştırmacılar} have{} linked{ilişkilendirmek} in{kısmen (in part)} part{kısmen (in part)} to{-e} corrosive{aşındırıcı} water{su} rising{yükselen} from{-den} the{} deep{derinlikler}.", "Kuzey Amerika'nın Pasifik kıyısındaki istiridye kuluçkahaneleri ağır larva kayıpları yaşadı; araştırmacılar bunu kısmen derinlerden yükselen aşındırıcı suyla ilişkilendirdi."],
  ],
  [
    ["The{} picture{tablo} is{} not{} uniformly{baştan sona, tümüyle} bleak{kasvetli}.", "Tablo baştan sona kasvetli değil."],
    ["Some{bazı} seagrasses{deniz çayırları} and{} algae{algler} may{-ebilir} grow{büyümek} faster{daha hızlı} with{} more{daha fazla} carbon{karbon} dioxide{dioksit} available{mevcut}, and{} sensitivity{duyarlılık} varies{değişmek} widely{büyük ölçüde} between{arasında} species{türler} and{} even{bile} between{arasında} populations{popülasyonlar}.", "Bazı deniz çayırları ve algler daha fazla karbondioksitle daha hızlı büyüyebilir; duyarlılık türler arasında, hatta popülasyonlar arasında büyük ölçüde değişir."],
    ["Yet{yine de} organisms{organizmalar} rarely{nadiren} face{karşılaşmak} a{} single{tek} stress{stres etkeni} at{aynı anda (at a time)} a{} time{aynı anda (at a time)}, and{} acidification{asitlenme} is{} unfolding{gelişmek} alongside{yanı sıra} warming{ısınma} and{} falling{düşen} oxygen{oksijen} levels{düzeyler}, which{ki bu} makes{kılmak} the{} combined{birleşik} outcome{sonuç} harder{daha zor} to{-mek} forecast{öngörmek} than{-den} the{} effect{etki} of{} any{herhangi} single{tek} change{değişim}.", "Yine de organizmalar nadiren aynı anda tek bir stres etkeniyle karşılaşır; asitlenme ısınma ve düşen oksijen düzeyleriyle birlikte gelişiyor ve bu, birleşik sonucu herhangi bir tek değişimin etkisinden daha zor öngörülür kılıyor."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-ocean-acidification", rows);
const noaa = "NOAA, Ocean acidification (Education resource collection); https://www.noaa.gov/education/resource-collections/ocean-coasts/ocean-acidification";
const pmel = "NOAA Pacific Marine Environmental Laboratory, What is Ocean Acidification?; https://www.pmel.noaa.gov/co2/story/What+is+Ocean+Acidification%3F";
const barton = "Barton A, Hales B, Waldbusser GG, Langdon C, Feely RA (2012), The Pacific oyster, Crassostrea gigas, shows negative correlation to naturally elevated carbon dioxide levels: Implications for near-term ocean acidification effects, Limnology and Oceanography 57(3): 698-710";
const iucn = "IUCN, Issues brief: Ocean deoxygenation; https://iucn.org/resources/issues-brief/ocean-deoxygenation";

export default {
  slug: "c1-ocean-acidification", level: "C1", title: "The Ocean's Hidden Bill", topic: "Biyoloji", sortOrder: 41, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main point of the passage?", evidence: findEvidence(paragraphs, "This service, however, comes at a chemical price."), options: [
      option("o1", "Absorbing carbon protects climate but strains marine life", true, null, "Okyanus karbon emerek ısınmayı yavaşlatır, ancak bunun bedeli kabuk ve iskelet yapan canlıları zorlayan kimyasal bir değişimdir."),
      option("o2", "The ocean has now become acidic like vinegar", false, "reverse", "Metin deniz suyunun hâlâ hafif bazik olduğunu belirtir."),
      option("o3", "Acidification harms every marine species equally", false, "extreme", "Duyarlılığın türler, hatta popülasyonlar arasında büyük ölçüde değiştiği söylenir."),
      option("o4", "Warming is a far greater threat to the sea than acidification", false, "notstated", "Isınma ile asitlenmenin tehlikesi kıyaslanmaz; birlikte etki ettikleri söylenir."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage link to the larval losses at Pacific oyster hatcheries?", evidence: findEvidence(paragraphs, "linked in part to corrosive water rising from the deep"), options: [
      option("o1", "Corrosive water coming up from the depths", true, null, "Araştırmacılar kayıpları kısmen derinden yükselen aşındırıcı suya bağlar."),
      option("o2", "A surface-water pH drop of 0.1 since the industrial era", false, "detail", "Bu rakam yüzey sularının ortalama değişimidir; kuluçkahane kayıplarına bağlanmaz."),
      option("o3", "Seagrass growth that removed carbonate from nearby water", false, "notstated", "Deniz çayırlarının büyümesi kayıplara bağlanmaz."),
      option("o4", "Falling oxygen that left larvae unable to build shells", false, "notstated", "Oksijen düşüşü genel bir ek stres olarak anılır; larva kayıpları için neden gösterilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “stakes” mean in “The biological stakes lie mainly in what the extra acid removes”?", evidence: findEvidence(paragraphs, "The biological stakes lie mainly in what the extra acid removes"), options: [
      option("o1", "What could be lost", true, null, "Stakes burada risk altındaki, kaybedilebilecek şeyler demektir."),
      option("o2", "Ownership shares held in a firm", false, "context", "'Hisse' anlamı gerçektir ama biyolojik bağlama uymaz."),
      option("o3", "Pointed posts driven into ground", false, "context", "Kazık anlamı bu bağlamda geçerli değildir."),
      option("o4", "Prizes offered for winning a contest", false, "context", "Ödül anlamı yoktur; paragraf neyin tehlikede olduğunu anlatır."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred from the final paragraph?", evidence: findEvidence(paragraphs, "organisms rarely face a single stress at a time"), options: [
      option("o1", "Effects on sea life will be hard to predict precisely", true, null, "Duyarlılık türden türe değişir ve asitlenme ısınma ile oksijen kaybıyla birlikte ilerler; bu, sonuçları öngörmeyi zorlaştırır."),
      option("o2", "Seagrasses will replace corals on most reefs", false, "notstated", "Deniz çayırlarının daha hızlı büyüyebileceği söylenir; mercanların yerini alacakları söylenmez."),
      option("o3", "Acidification can be studied in isolation easily", false, "reverse", "Birden çok stres etkeni birlikte işlediği için asitlenmeyi tek başına ele almak zordur."),
      option("o4", "Every population of a species will react in the same way", false, "reverse", "Metne göre duyarlılık aynı türün popülasyonları arasında bile değişir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Okyanus atmosfere salınan karbondioksitin yaklaşık yüzde 30'unu emer; CO2 deniz suyunda karbonik asit oluşturur ve karbonat iyonlarını azaltarak istiridye, mercan ve bazı pteropodların (küçük deniz salyangozları) kabuk/iskelet yapımını zorlaştırır; bazı deniz çayırları artan CO2'den yararlanabilir.", source: noaa, checkedOn: "2026-11-23" },
    { claim: "Endüstri çağının başından beri yüzey okyanusunun pH'ı yaklaşık 0,1 birim düştü; bu, asitlikte (hidrojen iyonu derişiminde) yaklaşık yüzde 30 artışa karşılık gelir; deniz suyu bazik kalmaya devam eder.", source: pmel, checkedOn: "2026-11-23" },
    { claim: "ABD'nin Pasifik kuzeybatısındaki istiridye kuluçkahanelerindeki larva kayıpları, derinlerden yükselen aşındırıcı (yüksek CO2'li) suyla ilişkilendirildi.", source: barton, checkedOn: "2026-11-23" },
    { claim: "Okyanuslarda oksijen düzeyleri düşmekte (deoksijenasyon) ve bu süreç ısınma ve asitlenmeyle birlikte deniz yaşamını etkilemektedir.", source: iucn, checkedOn: "2026-11-23" },
  ] },
};
