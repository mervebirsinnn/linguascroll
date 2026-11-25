import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Octopuses{ahtapotlar} and{} humans{insanlar} last{en son} shared{paylaşmak} an{} ancestor{ata} hundreds{yüzlerce} of{} millions{milyonlar} of{} years{yıllar} ago{önce}, a{} creature{canlı} that{ki o} almost{neredeyse} certainly{kesinlikle} lacked{sahip olmamak} a{} camera{kamera} eye{göz}.", "Ahtapotlar ve insanlar en son yüz milyonlarca yıl önce bir atayı paylaştı; bu, büyük olasılıkla kamera gözünden yoksun bir canlıydı."],
    ["Yet{yine de} both{her iki} lineages{soy hatları} ended{sonunda varmak (end up)} up{sonunda varmak (end up)} with{} camera{kamera} eyes{gözler}: a{} lens{mercek} focusing{odaklamak} light{ışık} onto{üzerine} a{} retina{retina} at{} the{} back{arka} of{} a{} chamber{hazne}.", "Yine de her iki soy hattı da kamera gözleriyle sonuçlandı: bir haznenin arkasındaki retinaya ışığı odaklayan bir mercek."],
    ["Biologists{biyologlar} call{adlandırmak} this{} convergent{yakınsak} evolution{evrim}, the{} independent{bağımsız} arrival{varış} of{} unrelated{akraba olmayan} organisms{organizmalar} at{-e} similar{benzer} solutions{çözümler}.", "Biyologlar buna yakınsak evrim der: akraba olmayan organizmaların bağımsız olarak benzer çözümlere varması."],
  ],
  [
    ["The{} resemblance{benzerlik} is{} impressive{etkileyici}, but{} the{} differences{farklar} are{} more{daha} revealing{aydınlatıcı}.", "Benzerlik etkileyicidir ama farklar daha aydınlatıcıdır."],
    ["In{} the{} vertebrate{omurgalı} eye{göz}, the{} nerve{sinir} fibres{lifler} run{uzanmak} across{boyunca} the{} front{ön} of{} the{} retina{retina} and{} must{-mek zorunda} pass{geçmek} back{geri} through{içinden} it{onun} to{-mek için} reach{ulaşmak} the{} brain{beyin}, which{ki bu} leaves{bırakmak} a{} small{küçük} blind{kör} spot{nokta} where{-dığı} no{hiç} light{ışık} can{-ebilmek} be{} detected{algılanmak}.", "Omurgalı gözünde sinir lifleri retinanın önü boyunca uzanır ve beyne ulaşmak için retinanın içinden geri geçmek zorundadır; bu da hiç ışığın algılanamadığı küçük bir kör nokta bırakır."],
    ["The{} octopus{ahtapot} retina{retina} is{} wired{kablolanmak} the{} other{öbür} way{yön} round{tersine (the other way round)}, with{} its{} receptors{alıcılar} facing{dönük olmak} the{} incoming{gelen} light{ışık}, and{} it{} has{sahip olmak} no{hiç} such{böyle} gap{boşluk}.", "Ahtapot retinası tersine kablolanmıştır; alıcıları gelen ışığa dönüktür ve böyle bir boşluğu yoktur."],
    ["Two{iki} designs{tasarımlar} that{ki} look{görünmek} alike{benzer} from{-den} outside{dışarı} turn{ortaya çıkmak (turn out)} out{ortaya çıkmak (turn out)} to{-mek} carry{taşımak} the{} marks{izler} of{} entirely{tamamen} separate{ayrı} histories{tarihler}.", "Dışarıdan benzer görünen iki tasarımın tamamen ayrı tarihlerin izlerini taşıdığı ortaya çıkar."],
  ],
  [
    ["Convergence{yakınsama} is{} not{} confined{sınırlı} to{-e} eyes{gözler}.", "Yakınsama gözlerle sınırlı değildir."],
    ["Bats{yarasalar} and{} toothed{dişli} whales{balinalar} both{ikisi de} locate{yerini bulmak} prey{av} by{yoluyla} echolocation{ekolokasyon}, and{} wings{kanatlar} have{} evolved{evrimleşmek} separately{ayrı ayrı} in{} birds{kuşlar}, bats{yarasalar} and{} the{} extinct{soyu tükenmiş} pterosaurs{pterozorlar}.", "Yarasalar ve dişli balinalar avlarının yerini ekolokasyonla bulur; kanatlar da kuşlarda, yarasalarda ve soyu tükenmiş pterozorlarda ayrı ayrı evrimleşmiştir."],
    ["Such{böyle} cases{durumlar} have{} fed{beslemek} a{} long{uzun} argument{tartışma} about{hakkında} predictability{öngörülebilirlik}.", "Böyle durumlar öngörülebilirlik hakkında uzun bir tartışmayı besledi."],
    ["Stephen{Stephen} Jay{Jay} Gould{Gould} suggested{öne sürmek} that{ki} if{} the{} tape{bant} of{} life{yaşam} were{} replayed{yeniden oynatılmak}, the{} outcome{sonuç} would{-erdi} likely{büyük olasılıkla} differ{farklı olmak}, because{çünkü} history{tarih} is{} shaped{şekillenmek} by{tarafından} countless{sayısız} contingent{rastlantısal, koşullara bağlı} events{olaylar}.", "Stephen Jay Gould, yaşamın bandı yeniden oynatılsaydı sonucun büyük olasılıkla farklı olacağını öne sürdü, çünkü tarih sayısız rastlantısal olayla şekillenir."],
    ["The{} palaeontologist{paleontolog} Simon{Simon} Conway{Conway} Morris{Morris} has{} instead{bunun yerine} argued{savunmak} that{ki} convergence{yakınsama} is{} pervasive{yaygın} in{} evolution{evrim}.", "Paleontolog Simon Conway Morris ise bunun yerine yakınsamanın evrimde yaygın olduğunu savundu."],
  ],
  [
    ["The{} two{iki} positions{görüşler} are{} less{daha az} opposed{karşıt} than{-den} they{} first{ilk} appear{görünmek}.", "İki görüş ilk göründüklerinden daha az karşıttır."],
    ["Convergence{yakınsama} can{-ebilmek} make{kılmak} broad{genel} outcomes{sonuçlar} such{gibi (such as)} as{gibi (such as)} eyes{gözler}, wings{kanatlar} or{} sonar{sonar} likely{olası} without{-meden} making{kılmak} any{herhangi bir} particular{belirli} eye{göz} predictable{öngörülebilir}, and{} the{} octopus{ahtapot} and{} the{} human{insan} illustrate{örneklemek} both{her iki} halves{yarılar} of{} that{o} claim{iddia} at{aynı anda (at once)} once{aynı anda (at once)}.", "Yakınsama, gözler, kanatlar ya da sonar gibi genel sonuçları belirli bir gözü öngörülebilir kılmadan olası kılabilir; ahtapot ve insan bu iddianın her iki yarısını aynı anda örnekler."],
    ["Both{ikisi de} arrived{varmak} at{-e} the{} camera{kamera} eye{göz}, yet{yine de} the{} wiring{kablolama} of{} each{her biri} was{} settled{belirlenmek} by{tarafından} its{} own{kendi} particular{özgül} ancestry{soy geçmişi}.", "İkisi de kamera gözüne vardı, yine de her birinin kablolaması kendi özgül soy geçmişi tarafından belirlendi."],
  ],
  [
    ["Read{okunmak} this{} way{şekilde}, convergence{yakınsama} is{} less{daha az} a{} verdict{hüküm} on{hakkında} whether{-ip -mediği} evolution{evrim} repeats{tekrarlamak} itself{kendini} than{-den} a{} reminder{hatırlatma} to{-mek} ask{sormak} at{} what{hangi} level{düzey} of{} detail{ayrıntı} the{} question{soru} is{} being{olmakta (sürerlik)} posed{sorulmak}.", "Bu şekilde okununca yakınsama, evrimin kendini tekrarlayıp tekrarlamadığına dair bir hükümden çok, sorunun hangi ayrıntı düzeyinde sorulduğunu sormaya yönelik bir hatırlatmadır."],
    ["Answer{yanıtlamak} it{onu} at{} one{bir} level{düzey} and{} life{yaşam} looks{görünmek} inevitable{kaçınılmaz}; answer{yanıtlamak} it{onu} at{} another{başka} and{} it{} looks{görünmek} like{gibi} an{} accident{rastlantı}.", "Onu bir düzeyde yanıtlayın, yaşam kaçınılmaz görünür; başka bir düzeyde yanıtlayın, bir rastlantı gibi görünür."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-convergent-evolution", rows);
const convergent = "Wikipedia, Convergent evolution; https://en.wikipedia.org/wiki/Convergent_evolution";
const blindSpot = "Wikipedia, Blind spot (vision); https://en.wikipedia.org/wiki/Blind_spot_(vision)";
const gould = "Wikipedia, Wonderful Life (book); https://en.wikipedia.org/wiki/Wonderful_Life_(book)";
const conwayMorris = "Wikipedia, Simon Conway Morris; https://en.wikipedia.org/wiki/Simon_Conway_Morris";

export default {
  slug: "c2-convergent-evolution", level: "C2", title: "Same Eye, Different Wiring", topic: "Biyoloji", sortOrder: 40, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main point about convergent evolution?", evidence: findEvidence(paragraphs, "a reminder to ask at what level of detail the question is being posed"), options: [
      option("o1", "Its lesson depends on the level of detail", true, null, "Yazar yakınsamanın, sorunun hangi ayrıntı düzeyinde sorulduğuna göre farklı görüneceğini savunur."),
      option("o2", "It proves evolution always repeats itself", false, "extreme", "Yazar yakınsamayı bu konuda bir hüküm olarak görmez."),
      option("o3", "Octopus and human eyes are identical in design", false, "reverse", "Metin kablolamanın ters olduğunu vurgular."),
      option("o4", "Gould's view has been decisively disproved", false, "notstated", "Yazar iki görüşün düşünüldüğünden az karşıt olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the second paragraph, why do vertebrates have a blind spot that octopuses lack?", evidence: findEvidence(paragraphs, "the nerve fibres run across the front of the retina and must pass back through it to reach the brain"), options: [
      option("o1", "Their nerve fibres cross the retina's front and must pass back through it", true, null, "Omurgalılarda lifler retinanın önünden geçip retinadan geri geçer ve kör nokta bırakır."),
      option("o2", "Their receptors face the incoming light, with nerve fibres tucked behind them", false, "detail", "Alıcıların ışığa dönük olması ahtapot retinasının özelliğidir."),
      option("o3", "Octopus-style wiring puts their receptors toward the light, leaving a small gap", false, "detail", "Bu kablolama ahtapota aittir ve kör nokta bırakmaz."),
      option("o4", "Their retina sits at the back of the chamber, whereas the octopus retina lies at the front", false, "detail", "Metin iki gözde de retinanın haznenin arkasında olduğunu söyler."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “contingent” mean in the third paragraph?", evidence: findEvidence(paragraphs, "because history is shaped by countless contingent events"), options: [
      option("o1", "Dependent on unpredictable circumstances", true, null, "Gould'a göre olaylar öngörülemeyen koşullara bağlıdır."),
      option("o2", "Bound by terms agreed in advance", false, "context", "'Contingent on' koşula bağlı anlamı olabilir ama önceden kararlaştırılan şartlar kastedilmez."),
      option("o3", "Forming a delegation of one group", false, "context", "İsim anlamı (birlik, heyet) burada sıfat kullanımına uymaz."),
      option("o4", "Unavoidable given the prior state of things", false, "reverse", "Kaçınılmazlık, Gould'un olumsallık vurgusunun tersidir."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author consider the two positions “less opposed than they first appear”?", evidence: findEvidence(paragraphs, "Convergence can make broad outcomes such as eyes, wings or sonar likely without making any particular eye predictable"), options: [
      option("o1", "Each holds at a different level of detail", true, null, "Genel sonuçlar olası, belirli ayrıntılar öngörülemez olabilir; iki görüş farklı düzeylerde doğrudur."),
      option("o2", "Gould and Conway Morris later agreed publicly", false, "notstated", "Böyle bir uzlaşma anlatılmaz."),
      option("o3", "Both deny that convergence happens at all", false, "reverse", "Metin yakınsamanın gerçekleştiğini örneklerle gösterir."),
      option("o4", "Neither position has any supporting evidence", false, "extreme", "Metin her iki görüşü de örneklerle destekler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kafadanbacaklılar (ahtapot) ve omurgalılarda kamera tipi göz bağımsız olarak evrimleşmiştir; yarasalar ve dişli balinalarda ekolokasyon, kuşlar, yarasalar ve pterozorlarda kanat yakınsak evrim örnekleridir.", source: convergent, checkedOn: "2026-11-23" },
    { claim: "Omurgalı retinasında sinir lifleri fotoreseptörlerin önünden geçer ve optik sinirin retinadan çıktığı yerde kör nokta oluşur; kafadanbacaklıların retinası ters düzende olduğundan böyle bir kör noktaları yoktur.", source: blindSpot, checkedOn: "2026-11-23" },
    { claim: "Stephen Jay Gould 'yaşamın bandını yeniden oynatma' düşünce deneyiyle evrimde olumsallığı vurguladı.", source: gould, checkedOn: "2026-11-23" },
    { claim: "Paleontolog Simon Conway Morris yakınsamanın evrimde yaygın olduğunu savunur.", source: conwayMorris, checkedOn: "2026-11-23" },
  ] },
};
