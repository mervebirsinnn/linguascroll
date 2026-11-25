import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Few{az} animals{hayvanlar} invite{davet etmek} as{kadar} many{birçok} superlatives{üstünlük ifadeleri} as{} the{} octopus{ahtapot}, yet{yine de} the{} most{en} repeated{tekrarlanan} claims{iddialar} about{hakkında} it{} deserve{hak etmek} a{} careful{dikkatli} second{ikinci} look{bakış}.", "Çok az hayvan ahtapot kadar çok üstünlük ifadesini çağırır; yine de onun hakkındaki en çok tekrarlanan iddialar dikkatli bir ikinci bakışı hak eder."],
    ["That{o} sentence{cümle} may{-ebilir} sound{görünmek} cautious{temkinli}, but{ama} it{} reflects{yansıtmak} how{nasıl} science{bilim} actually{gerçekten} works{çalışır}: claims{iddialar} are{} kept{korunmak} when{-dığında} several{birkaç} sources{kaynaklar} agree{aynı fikirde olmak}.", "Bu cümle temkinli görünebilir ama bilimin gerçekte nasıl işlediğini yansıtır: iddialar birkaç kaynak hemfikir olduğunda korunur."],
    ["It{} makes{yapar} a{} good{iyi} test{test} case{örnek} for{için} reading{okumak} popular{popüler} science{bilim}.", "Popüler bilimi okumak için iyi bir deneme örneğidir."],
    ["That{o} it{} has{sahiptir} three{üç} hearts{kalpler} is{} well{iyi} established{yerleşmiş}: two{iki} pump{pompalamak} blood{kan} through{içinden} the{} gills{solungaçlar}, while{iken} the{} third{üçüncü} circulates{dolaştırmak} it{} around{çevresine} the{} body{vücut}.", "Üç kalbi olduğu iyi yerleşmiş bir bilgidir: ikisi kanı solungaçlardan geçirir, üçüncüsü ise vücuda dolaştırır."],
    ["Reports{raporlar} add{eklemek} that{ki} the{} body{vücut} heart{kalp} stops{durmak} beating{atmak} while{iken} the{} animal{hayvan} swims{yüzmek}, which{ki bu} may{-ebilir} help{yardım etmek} explain{açıklamak} why{neden} octopuses{ahtapotlar} usually{genellikle} prefer{tercih etmek} to{-mek} crawl{sürünmek}.", "Raporlar, hayvan yüzerken vücut kalbinin atmayı bıraktığını ekler; bu, ahtapotların neden genellikle sürünmeyi tercih ettiğini açıklamaya yardım edebilir."],
  ],
  [
    ["Its{onun} blue{mavi} blood{kan} is{} equally{eşit derecede} well{iyi} documented{belgelenmiş}.", "Mavi kanı da aynı derecede iyi belgelenmiştir."],
    ["The{} colour{renk} comes{gelir} from{-den} hemocyanin{hemosiyanin}, a{} copper{bakır}-based{temelli} protein{protein} that{ki} carries{taşımak} oxygen{oksijen}; human{insan} blood{kan} uses{kullanır} the{} iron{demir}-based{temelli} hemoglobin{hemoglobin} instead{bunun yerine}.", "Renk, oksijen taşıyan bakır temelli bir protein olan hemosiyaninden gelir; insan kanı bunun yerine demir temelli hemoglobini kullanır."],
    ["Hemocyanin{hemosiyanin} appears{görünmek} to{-mek} work{çalışmak} well{iyi} in{} cold{soğuk}, low{düşük}-oxygen{oksijen} water{su}, so{bu yüzden} the{} blood{kan} may{-ebilir} reflect{yansıtmak} the{} animal's{hayvan (iyelik)} habitat{yaşam alanı} as{} much{kadar} as{} its{onun} ancestry{soy}.", "Hemosiyanin soğuk, düşük oksijenli suda iyi çalışıyor gibi görünür; bu yüzden kan, hayvanın soyunu kadar yaşam alanını da yansıtıyor olabilir."],
    ["None{hiçbiri} of{} this{bu} is{} a{} substitute{yerine geçen} for{için} direct{doğrudan} measurement{ölçüm}; it{} simply{sadece} shows{gösterir} that{ki} the{} same{aynı} fact{olgu} can{-ebilir} be{olmak} read{okunmak} in{} more{daha fazla} than{-den} one{bir} way{yol}.", "Bunların hiçbiri doğrudan ölçümün yerini tutmaz; yalnızca aynı olgunun birden fazla biçimde okunabileceğini gösterir."],
  ],
  [
    ["The{} popular{popüler} claim{iddia} that{ki} an{} octopus{ahtapot} has{sahiptir} nine{dokuz} brains{beyinler} is{} different{farklı}.", "Bir ahtapotun dokuz beyni olduğu yönündeki popüler iddia farklıdır."],
    ["It{} compresses{sıkıştırmak} a{} real{gerçek} observation{gözlem}, namely{yani} that{ki} most{çoğu} of{} the{} animal's{hayvan (iyelik)} neurons{sinir hücreleri} sit{durmak} in{} its{onun} arms{kollar}, into{içine} a{} slogan{slogan}.", "Gerçek bir gözlemi, yani hayvanın sinir hücrelerinin çoğunun kollarında bulunduğunu, bir sloganın içine sıkıştırır."],
    ["Estimates{tahminler} of{} the{} proportion{oran} vary{değişir}: PBS{PBS} gives{vermek} about{yaklaşık} two{iki} thirds{üçte}, while{iken} other{başka} sources{kaynaklar} cite{anmak} lower{daha düşük} percentages{yüzdeler} for{için} the{} arms{kollar}.", "Oran tahminleri değişir: PBS yaklaşık üçte ikisini verir; başka kaynaklar ise kollar için daha düşük yüzdeler anar."],
    ["The{} lesson{ders} is{} not{değil} that{ki} the{} slogan{slogan} is{} false{yanlış}, but{ama} that{ki} a{} memorable{akılda kalıcı} number{sayı} can{-ebilir} travel{yolculuk etmek} much{çok} further{daha uzağa} than{-den} the{} evidence{kanıt} behind{arkasındaki} it{}.", "Ders, sloganın yanlış olduğu değil, akılda kalıcı bir sayının arkasındaki kanıttan çok daha uzağa gidebileceğidir."],
    ["Readers{okuyucular} who{ki onlar} want{istemek} to{-mek} repeat{tekrarlamak} an{} octopus{ahtapot} fact{olgu} would{-ecekti} do{yapmak} well{iyi} to{-mek} name{adlandırmak} the{} source{kaynak} and{} the{} date{tarih}.", "Bir ahtapot olgusunu tekrarlamak isteyen okuyucular kaynağı ve tarihi belirtmeyi iyi ederdi."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-octopus-numbers", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const pbs = "PBS Nature, Octopus (other species); https://www.pbs.org/wnet/nature/group/other-species/octopus/";
const smith = "Smithsonian Magazine, Ten wild facts about octopuses: they have three hearts, big brains and blue blood; https://www.smithsonianmag.com/science-nature/ten-wild-facts-about-octopuses-they-have-three-hearts-big-brains-and-blue-blood-7625828/";

export default {
  slug: "c1-octopus-numbers", level: "C1", title: "Handle Octopus Numbers With Care", topic: "Biyoloji", sortOrder: 16, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central message of the passage?", evidence: ev(2, "a memorable number can travel much further than the evidence behind it"), options: [
      option("o1", "Famous octopus claims need checking", true, null, "Metin ünlü ahtapot iddialarının dikkatle gözden geçirilmesini savunur."),
      option("o2", "Most famous octopus facts are myths", false, "extreme", "Üç kalp ve mavi kan iyi belgelenmiş olgulardır."),
      option("o3", "Octopus blood is red despite appearances", false, "reverse", "Kanı mavidir."),
      option("o4", "Researchers agree on every octopus figure", false, "reverse", "Oran tahminleri kaynaklara göre değişir."),
    ] },
    { key: "q2", type: "detail", prompt: "Where does the blue colour of the blood come from?", evidence: ev(1, "The colour comes from hemocyanin, a copper-based protein that carries oxygen"), options: [
      option("o1", "A copper-based protein", true, null, "Metin hemosiyanini bakır temelli protein olarak söyler."),
      option("o2", "A protein that contains iron", false, "reverse", "Demir insan kanıdır."),
      option("o3", "The colour of the surrounding sea", false, "context", "Deniz rengi anlatılmaz."),
      option("o4", "A chemical in the animal's food", false, "notstated", "Beslenme anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “slogan” mean in the last paragraph?", evidence: ev(2, "It compresses a real observation"), options: [
      option("o1", "A short, catchy phrase", true, null, "Slogan, kısa ve akılda kalıcı ifadedir."),
      option("o2", "A detailed scientific report", false, "reverse", "Tersini anlatır."),
      option("o3", "A rule about animal care", false, "notstated", "Bakım kuralı anlatılmaz."),
      option("o4", "A type of research method", false, "context", "Araştırma bağlamı yanıltır."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the discussion of PBS and other sources suggest?", evidence: ev(2, "Estimates of the proportion vary: PBS gives about two thirds, while other sources cite lower percentages for the arms."), options: [
      option("o1", "Exact figures are still uncertain", true, null, "Kaynaklar farklı oranlar verir; kesin rakamlar belirsizdir."),
      option("o2", "PBS has made a serious mistake", false, "notstated", "Hata suçlaması yoktur."),
      option("o3", "Arms contain no nerve cells at all", false, "reverse", "Kollarda sinir hücresi vardır."),
      option("o4", "The slogan is completely correct", false, "extreme", "Metin sloganı basitleştirme olarak sunar."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ahtapotun üç kalbi vardır (ikisi solungaçlara, biri vücuda pompalar); vücut kalbi ahtapot yüzerken atmayı bırakır, bu yüzden sürünmeyi tercih edebilir.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Mavi kan bakır temelli hemosiyaninden gelir (insan kanı demirli hemoglobin kullanır); hemosiyanin soğuk, düşük oksijenli suda etkilidir.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Sinir hücrelerinin yaklaşık üçte ikisi kollardadır (PBS); başka kaynaklar kollar için daha düşük yüzdeler verir; 'dokuz beyin' bir basitleştirmedir.", source: pbs, checkedOn: "2026-11-23" },
  ] },
};
