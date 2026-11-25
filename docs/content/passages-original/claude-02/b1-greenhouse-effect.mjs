import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} Earth{Dünya} is{} warm{sıcak} enough{yeterince} for{için} life{yaşam}, and{} one{bir} reason{neden} is{} the{} greenhouse{sera} effect{etki}.", "Dünya yaşam için yeterince sıcaktır ve bir nedeni sera etkisidir."],
    ["Some{bazı} gases{gazlar} in{} the{} air{hava} work{çalışır} like{gibi} a{} blanket{battaniye}.", "Havadaki bazı gazlar bir battaniye gibi çalışır."],
    ["They{} let{izin vermek} sunlight{güneş ışığı} in{içeri}, but{ama} they{} keep{tutmak} some{bir miktar} of{} the{} heat{ısı} near{yakınında} the{} ground{yer}.", "Güneş ışığının içeri girmesine izin verirler ama ısının bir kısmını yere yakın tutarlar."],
    ["Without{olmadan} this{} natural{doğal} blanket{battaniye}, the{} planet{gezegen} would{-ecekti} be{olmak} much{çok} colder{daha soğuk}.", "Bu doğal battaniye olmasaydı gezegen çok daha soğuk olurdu."],
  ],
  [
    ["One{bir} of{} the{} most{en} important{önemli} gases{gazlar} is{} carbon{karbon} dioxide{dioksit}.", "En önemli gazlardan biri karbondioksittir."],
    ["It{} comes{gelir} from{-den} natural{doğal} sources{kaynaklar}, such{gibi (such as kalıbı)} as{gibi (such as kalıbı)} volcanoes{yanardağlar}, but{ama} people{insanlar} also{ayrıca} add{eklemek} it{} to{-e} the{} air{hava}.", "Yanardağlar gibi doğal kaynaklardan gelir ama insanlar da onu havaya ekler."],
    ["We{} burn{yakmak} coal{kömür}, oil{petrol} and{} gas{gaz} for{için} energy{enerji}, and{} we{} cut{kesmek} down{aşağı} forests{ormanlar}.", "Enerji için kömür, petrol ve gaz yakıyoruz ve ormanları kesiyoruz."],
    ["Both{ikisi de} actions{eylemler} increase{artırır} the{} amount{miktar} of{} carbon{karbon} dioxide{dioksit} in{} the{} air{hava}.", "İki eylem de havadaki karbondioksit miktarını artırır."],
  ],
  [
    ["Scientists{bilim insanları} say{söylemek} that{ki} the{} level{seviye} of{} this{} gas{gaz} has{artmış (has gone up)} gone{artmış (has gone up)} up{artmış (has gone up)} by{kadar (artış miktarı)} nearly{neredeyse} fifty{elli} percent{yüzde} since{-den beri} seventeen{on yedi} fifty{elli}.", "Bilim insanları bu gazın seviyesinin 1750'den beri neredeyse yüzde elli arttığını söylüyor."],
    ["With{ile} more{daha fazla} of{} the{} gas{gaz}, more{daha fazla} heat{ısı} stays{kalır} near{yakınında} the{} ground{yer}.", "Gaz arttıkça daha fazla ısı yere yakın kalır."],
    ["This{} is{} why{neden} the{} world{dünya} is{} slowly{yavaşça} getting{olmak} warmer{daha sıcak}.", "Dünya bu yüzden yavaş yavaş ısınıyor."],
    ["Using{kullanmak} cleaner{daha temiz} energy{enerji} can{-ebilir} help{yardım etmek} slow{yavaşlatmak} that{o} change{değişim}.", "Daha temiz enerji kullanmak bu değişimi yavaşlatmaya yardım edebilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-greenhouse-effect", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA, Causes of Climate Change; https://science.nasa.gov/climate-change/causes/";
const nasaE = "NASA, Evidence (Climate Change); https://climate.nasa.gov/evidence/";

export default {
  slug: "b1-greenhouse-effect", level: "B1", title: "A Blanket Around the Earth", topic: "İklim", sortOrder: 21, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "Some gases in the air work like a blanket."), options: [
      option("o1", "How some gases keep the Earth warm", true, null, "Metin bazı gazların ısıyı nasıl tuttuğunu anlatır."),
      option("o2", "Why the Earth gets colder every year", false, "reverse", "Metin Dünya'nın yavaş yavaş ısındığını söyler."),
      option("o3", "How plants clean the air we breathe", false, "notstated", "Bitkilerin havayı temizlemesi anlatılmaz."),
      option("o4", "Why the Sun gives less heat today", false, "notstated", "Güneş'in ısısının azaldığı söylenmez."),
    ] },
    { key: "q2", type: "detail", prompt: "Which two human actions add carbon dioxide to the air?", evidence: findEvidence(paragraphs, "We burn coal, oil and gas for energy, and we cut down forests."), options: [
      option("o1", "Burning fuels and cutting trees", true, null, "Metin yakıt yakmayı ve ormanları kesmeyi söyler."),
      option("o2", "Farming crops and building roads", false, "notstated", "Tarım ve yol yapımı anlatılmaz."),
      option("o3", "Burning fuels and planting forests", false, "copy", "Yakıt yakmak doğru; orman dikmek ise karbondioksiti artırmaz."),
      option("o4", "Breathing air and growing plants", false, "context", "Bunlar doğal süreçlerdir; metin insan eylemlerini sorar."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “increase” mean in the second paragraph?", evidence: ev(1, "Both actions increase the amount of carbon dioxide in the air."), options: [
      option("o1", "Make something bigger", true, null, "Increase, artırmak, büyütmek demektir."),
      option("o2", "Take something away", false, "reverse", "Çıkarmak, artırmanın tersidir."),
      option("o3", "Keep something warm", false, "context", "Sıcaklık geçer; kelime bunu demez."),
      option("o4", "Look at something closely", false, "notstated", "İncelemek anlamı yok."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the last paragraph suggest?", evidence: ev(2, "Using cleaner energy can help slow that change."), options: [
      option("o1", "People cannot change anything at all.", false, "extreme", "Metin temiz enerjinin yardım edebileceğini söyler."),
      option("o2", "The world is cooling down quickly.", false, "reverse", "Dünya ısınıyor."),
      option("o3", "Our choices can affect the warming.", true, null, "Temiz enerji kullanmak değişimi yavaşlatabilir."),
      option("o4", "Gases do not matter to the weather.", false, "reverse", "Metin gazların ısıyı tuttuğunu anlatır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Sera etkisi: bazı gazlar ısıyı yeryüzüne yakın tutar; karbondioksit volkanlar gibi doğal kaynaklardan ve fosil yakıt yakma ile ormansızlaşma gibi insan faaliyetlerinden gelir.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Atmosferdeki karbondioksit seviyesi 1750'den beri yaklaşık yüzde 50 arttı.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "Buz çekirdekleri ve doğrudan ölçümler karbondioksitin Sanayi Devrimi'nden beri arttığını gösterir.", source: nasaE, checkedOn: "2026-11-23" },
  ] },
};
