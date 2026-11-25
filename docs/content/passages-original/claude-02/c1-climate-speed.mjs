import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Debates{tartışmalar} about{hakkında} climate{iklim} change{değişim} often{sıklıkla} treat{ele almak} carbon{karbon} dioxide{dioksit} as{olarak} a{} newcomer{yeni gelen}, yet{yine de} the{} gas{gaz} is{} a{} natural{doğal} part{parça} of{} the{} atmosphere{atmosfer}, released{salınmak} by{tarafından} volcanoes{yanardağlar} and{} living{yaşayan} organisms{organizmalar} long{uzun} before{önce} humans{insanlar} existed{var olmak}.", "İklim değişikliği tartışmaları karbondioksiti sıklıkla yeni gelen biri gibi ele alır; oysa gaz atmosferin doğal bir parçasıdır ve insanlar var olmadan çok önce yanardağlar ve canlılarca salınıyordu."],
    ["What{ne} has{} changed{değişmek} is{} the{} scale{ölçek}.", "Değişen şey ölçektir."],
    ["Understanding{anlamak} that{o} history{tarih} helps{yardım etmek} separate{ayırmak} natural{doğal} variation{değişkenlik} from{-den} human{insan} influence{etki}.", "Bu tarihi anlamak, doğal değişkenliği insan etkisinden ayırmaya yardım eder."],
    ["According{göre (according to)} to{göre (according to)} NASA{NASA}, industrial{endüstriyel} activity{faaliyet} has{} raised{yükseltmek} the{} concentration{yoğunluk} of{} atmospheric{atmosferik} carbon{karbon} dioxide{dioksit} by{kadar} nearly{neredeyse} fifty{elli} percent{yüzde} since{-den beri} seventeen{on yedi} fifty{elli}, mainly{esas olarak} through{aracılığıyla} the{} burning{yakma} of{} fossil{fosil} fuels{yakıtlar} and{} the{} clearing{kesip alan açma (ormanları)} of{} forests{ormanlar}.", "NASA'ya göre endüstriyel faaliyet, esas olarak fosil yakıtların yakılması ve ormanların temizlenmesiyle atmosferik karbondioksit yoğunluğunu 1750'den beri neredeyse yüzde elli artırdı."],
  ],
  [
    ["Knowing{bilmek} this{bu} requires{gerektirmek} a{} way{yol} of{} measuring{ölçmek} the{} past{geçmiş}.", "Bunu bilmek, geçmişi ölçmenin bir yolunu gerektirir."],
    ["Ice{buz} cores{çekirdekler} drilled{delinmek} in{} Greenland{Grönland}, Antarctica{Antarktika} and{} tropical{tropikal} glaciers{buzullar} trap{hapsetmek} tiny{minik} bubbles{kabarcıklar} of{} ancient{eski} air{hava}, and{} when{-dığında} those{o} bubbles{kabarcıklar} are{} analysed{analiz etmek} they{} reveal{ortaya çıkarmak} past{geçmiş} concentrations{yoğunluklar} of{} greenhouse{sera} gases{gazlar}.", "Grönland, Antarktika ve tropik buzullarda delinen buz çekirdekleri eski havanın minik kabarcıklarını hapseder ve bu kabarcıklar analiz edildiğinde geçmiş sera gazı yoğunluklarını ortaya çıkarır."],
    ["Compared{karşılaştırmak} with{ile} recent{yakın} direct{doğrudan} measurements{ölçümler}, they{} show{göstermek} the{} climate{iklim} responding{tepki vermek} to{-e} changes{değişimler} in{} those{o} gases{gazlar}.", "Yakın tarihli doğrudan ölçümlerle karşılaştırıldığında iklimin bu gazlardaki değişimlere tepki verdiğini gösterirler."],
    ["Layer{katman} by{-ar (tekrar kalıbı)} layer{katman}, the{} ice{buz} preserves{korumak} a{} record{kayıt} that{ki} stretches{uzanmak} back{geri} far{çok} beyond{ötesine} written{yazılı} history{tarih}.", "Katman katman buz, yazılı tarihin çok ötesine uzanan bir kaydı korur."],
  ],
  [
    ["The{} decisive{belirleyici} contrast{zıtlık} is{} one{bir} of{} speed{hız}.", "Belirleyici zıtlık hızdadır."],
    ["NASA{NASA} reports{bildirmek} that{ki} carbon{karbon} dioxide{dioksit} from{-den} human{insan} activities{faaliyetler} is{} now{şimdi} increasing{artmak} roughly{kabaca} two{iki} hundred{yüz} and{} fifty{elli} times{kat} faster{daha hızlı} than{-den} it{} did{(önceki fiilin yerine) artmıştı} from{-den} natural{doğal} sources{kaynaklar} after{sonra} the{} last{son} ice{buz} age{çağ}.", "NASA, insan faaliyetlerinden gelen karbondioksitin şimdi son buz çağından sonra doğal kaynaklardan arttığından kabaca iki yüz elli kat daha hızlı arttığını bildirir."],
    ["Ecosystems{ekosistemler} and{} societies{toplumlar} can{-ebilir} adapt{uyum sağlamak} to{-e} slow{yavaş} change{değişim}, but{ama} rapid{hızlı} change{değişim} shortens{kısaltmak} the{} time{zaman} available{mevcut} for{için} adjustment{uyum}.", "Ekosistemler ve toplumlar yavaş değişime uyum sağlayabilir; ancak hızlı değişim uyum için kalan süreyi kısaltır."],
    ["That{o} is{} why{neden} the{} argument{argüman} is{} less{daha az} about{hakkında} the{} existence{varlık} of{} a{} greenhouse{sera} effect{etki}, which{ki o} is{} natural{doğal} and{} essential{gerekli}, than{-den} about{hakkında} the{} pace{tempo} at{-de} which{ki} we{biz} are{} altering{değiştirmek} it{}.", "Bu yüzden tartışma, doğal ve gerekli olan bir sera etkisinin varlığından çok, onu değiştirme hızımız hakkındadır."],
    ["Slowing{yavaşlatmak} the{} rise{artış} is{} therefore{bu nedenle} a{} question{soru} of{} timing{zamanlama} as{kadar} much{çok} as{} of{} intention{niyet}.", "Artışı yavaşlatmak bu nedenle niyet kadar zamanlama meselesidir."],
    ["Facing{yüzleşmek} that{o} reality{gerçeklik} calmly{sakince} is{} the{} first{ilk} step{adım} towards{doğru} sensible{makul} choices{seçimler}.", "Bu gerçekle sakince yüzleşmek, makul seçimlere giden ilk adımdır."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-climate-speed", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA, Causes of Climate Change; https://science.nasa.gov/climate-change/causes/";
const nasaE = "NASA, Evidence (Climate Change); https://climate.nasa.gov/evidence/";

export default {
  slug: "c1-climate-speed", level: "C1", title: "The Problem Is the Pace", topic: "İklim", sortOrder: 22, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central argument of the passage?", evidence: ev(2, "That is why the argument is less about the existence of a greenhouse effect"), options: [
      option("o1", "The speed of change is the key concern", true, null, "Metin asıl sorunun değişimin hızı olduğunu savunur."),
      option("o2", "The greenhouse effect is itself harmful", false, "reverse", "Metin onu doğal ve gerekli sayar."),
      option("o3", "Ice cores are the only available evidence", false, "extreme", "Doğrudan ölçümler de kullanılır."),
      option("o4", "Human emissions rise slower than natural ones", false, "reverse", "Metin insan kaynaklı artışın çok daha hızlı olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "How do ice cores help scientists?", evidence: ev(1, "they reveal past concentrations of greenhouse gases"), options: [
      option("o1", "They trap ancient air", true, null, "Metin hapsolmuş eski havanın analiz edildiğini söyler."),
      option("o2", "They measure the speed of passing glaciers", false, "notstated", "Buzul hızı anlatılmaz."),
      option("o3", "They store carbon dioxide for future use", false, "notstated", "Depolama anlatılmaz."),
      option("o4", "They record the daily weather in detail", false, "extreme", "Günlük hava durumu verilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “pace” mean in the last paragraph?", evidence: ev(2, "the pace at which we are altering it"), options: [
      option("o1", "Speed of change", true, null, "Pace, hız, tempo demektir."),
      option("o2", "Level of real danger", false, "context", "Tehlike seviyesi anlamı yoktur."),
      option("o3", "Source of heat", false, "context", "Isı kaynağı anlamı yoktur."),
      option("o4", "Type of fuel", false, "context", "Yakıt türü anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author call the greenhouse effect “natural and essential”?", evidence: findEvidence(paragraphs, "the argument is less about the existence of a greenhouse effect, which is natural and essential, than about the pace at which we are altering it"), options: [
      option("o1", "To blame pace, not the effect", true, null, "Sorun etkinin kendisi değil, onu değiştirme hızıdır."),
      option("o2", "To suggest the effect should be removed", false, "reverse", "Metin onu gerekli sayar."),
      option("o3", "To argue natural gases are harmless", false, "extreme", "Metin böyle bir sonuç söylemez."),
      option("o4", "To show scientists disagree about it", false, "notstated", "Bilim insanlarının anlaşmazlığı anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Karbondioksit volkanlar ve canlılar gibi doğal kaynaklardan gelir; insan faaliyetleri (fosil yakıt yakma, ormansızlaşma) seviyeyi 1750'den beri yaklaşık yüzde 50 artırdı.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Grönland, Antarktika ve tropik buzullardan alınan buz çekirdekleri eski havayı hapseder ve iklimin sera gazı değişimlerine tepki verdiğini gösterir.", source: nasaE, checkedOn: "2026-11-23" },
    { claim: "İnsan kaynaklı karbondioksit, son buz çağından sonra doğal kaynakların artışından yaklaşık 250 kat daha hızlı artıyor.", source: nasa, checkedOn: "2026-11-23" },
  ] },
};
