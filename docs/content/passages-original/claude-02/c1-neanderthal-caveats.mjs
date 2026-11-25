import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} claim{iddia} that{ki} many{birçok} living{yaşayan} people{insanlar} carry{taşımak} Neanderthal{Neandertal} DNA{DNA} has{} become{olmak} so{çok} familiar{tanıdık} that{ki} its{onun} limits{sınırlar} are{} easily{kolayca} forgotten{unutulmak}.", "Yaşayan birçok kişinin Neandertal DNA'sı taşıdığı iddiası o kadar tanıdık hâle geldi ki sınırları kolayca unutuluyor."],
    ["The{} full{tam} picture{resim} is{} more{daha} careful{dikkatli} and{} more{daha} interesting{ilginç}.", "Tam resim daha dikkatli ve daha ilginçtir."],
    ["Early{erken} estimates{tahminler}, reported{bildirilmek} after{sonra} the{} first{ilk} Neanderthal{Neandertal} genome{genom} was{} sequenced{dizilemek} in{-de} twenty{yirmi} ten{on}, suggested{ima etmek} that{ki} between{arasında} one{bir} and{} four{dört} percent{yüzde} of{} the{} ancestry{soy} of{} non{olmayan}-Africans{Afrikalılar} came{gelmek} from{-den} Neanderthals{Neandertaller}.", "2010'da ilk Neandertal genomu dizilendikten sonra bildirilen erken tahminler, Afrikalı olmayanların soyunun yüzde bir ile dördünün Neandertallerden geldiğini ima ediyordu."],
    ["A{} later{daha sonraki} analysis{analiz}, published{yayımlanmak} in{-de} the{} journal{dergi} Cell{Cell} in{-de} twenty{yirmi} twenty{yirmi}, refined{hassaslaştırmak (tahmini)} the{} figures{rakamlar}: roughly{kabaca} one{bir} point{nokta} seven{yedi} to{-e} one{bir} point{nokta} eight{sekiz} percent{yüzde} of{} European{Avrupalı} and{} Asian{Asyalı} genomes{genomlar}.", "2020'de Cell dergisinde yayımlanan daha sonraki bir analiz rakamları inceltti: Avrupalı ve Asyalı genomlarının kabaca yüzde 1,7 ile 1,8'i."],
  ],
  [
    ["The{} same{aynı} study{çalışma} overturned{alt üst etmek} a{} second{ikinci} assumption{varsayım}.", "Aynı çalışma ikinci bir varsayımı alt üst etti."],
    ["Africans{Afrikalılar} in{-de} the{} sample{örneklem}, long{uzun süre} thought{düşünülmek} to{-mek} carry{taşımak} almost{neredeyse} no{hiç} Neanderthal{Neandertal} DNA{DNA}, were{} found{bulunmak} to{-mek} carry{taşımak} an{} average{ortalama} of{} about{yaklaşık} seventeen{on yedi} million{milyon} Neanderthal{Neandertal} base{baz} pairs{çiftler}, roughly{kabaca} a{} third{üçte bir} of{} the{} amount{miktar} found{bulmak} in{} Europeans{Avrupalılar} and{} Asians{Asyalılar}.", "Uzun süre neredeyse hiç Neandertal DNA'sı taşımadığı düşünülen örneklemdeki Afrikalıların, Avrupalılarda ve Asyalılarda bulunan miktarın kabaca üçte biri olan ortalama on yedi milyon Neandertal baz çifti taşıdığı bulundu."],
    ["The{} authors{yazarlar} argued{savunmak} that{ki} gene{gen} flow{akış} had{} run{işlemek} in{} both{ikisi de} directions{yönler}, so{bu yüzden} some{bazı} of{} the{} Neanderthal{Neandertal}-like{benzeri} sequences{diziler} in{} Africa{Afrika} may{-ebilir} have{} travelled{yolculuk etmek} back{geri} with{ile} early{erken} modern{modern} humans{insanlar}.", "Yazarlar gen akışının iki yönde de işlediğini, bu yüzden Afrika'daki Neandertal benzeri dizilerin bir kısmının erken modern insanlarla birlikte geri taşınmış olabileceğini savundu."],
    ["Gene{gen} flow{akış} in{} both{ikisi de} directions{yönler} complicates{karmaşıklaştırmak} any{herhangi bir} simple{basit} story{hikâye} about{hakkında} who{kim} gave{vermek} what{ne} to{-e} whom{kime}.", "İki yönlü gen akışı, kimin kime ne verdiğine dair her basit hikâyeyi karmaşıklaştırır."],
  ],
  [
    ["Responsible{sorumlu} readers{okuyucular} should{-meli} note{not etmek} the{} caveats{çekinceler}.", "Sorumlu okuyucular çekincelere dikkat etmeli."],
    ["The{} team{ekip} sampled{örneklemek} only{yalnızca} a{} limited{sınırlı} number{sayı} of{} African{Afrikalı} populations{topluluklar}, so{bu yüzden} the{} results{sonuçlar} may{-ebilir} not{değil} apply{geçerli olmak} to{-e} everyone{herkes} with{ile} African{Afrikalı} ancestry{soy}.", "Ekip yalnızca sınırlı sayıda Afrikalı topluluktan örnek aldı; bu yüzden sonuçlar Afrika kökenli herkes için geçerli olmayabilir."],
    ["Moreover{üstelik}, the{} Neanderthal{Neandertal} genome{genom} used{kullanılmak} for{için} comparison{karşılaştırma} came{gelmek} from{-den} Siberia{Sibirya}, which{ki orası} may{-ebilir} not{değil} have{} been{} part{parça} of{} the{} population{topluluk} that{ki} actually{gerçekten} mixed{karışmak} with{ile} migrating{göç eden} humans{insanlar}.", "Üstelik karşılaştırma için kullanılan Neandertal genomu, göç eden insanlarla gerçekten karışan topluluğun parçası olmayabilecek Sibirya'dan geliyordu."],
    ["Such{böyle} qualifications{kayıtlar} do{} not{} undermine{zayıflatmak} the{} central{merkezi} finding{bulgu}; they{} simply{sadece} remind{hatırlatmak} us{bize} that{ki} a{} headline{manşet} number{sayı} is{} a{} summary{özet}, not{değil} a{} verdict{hüküm}.", "Bu tür kayıtlar temel bulguyu zayıflatmaz; yalnızca bize bir manşet rakamının özet olduğunu, hüküm olmadığını hatırlatır."],
    ["A{} careful{dikkatli} reader{okuyucu} will{-ecek} therefore{bu nedenle} treat{ele almak} each{her} percentage{yüzde} as{olarak} an{} estimate{tahmin} that{ki} may{-ebilir} be{olmak} revised{gözden geçirilmek}.", "Dikkatli bir okuyucu bu nedenle her yüzdeyi gözden geçirilebilecek bir tahmin olarak ele alır."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-neanderthal-caveats", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cell = "Chen, Wolf, Fu, Li ve Akey, Identifying and Interpreting Apparent Neanderthal Ancestry in African Individuals, Cell 180(4), 2020; https://doi.org/10.1016/j.cell.2020.01.012";
const smith = "Smithsonian Magazine, 4 Şubat 2020, haber: Cell dergisindeki Akey ekibi çalışması (Afrikalılardaki Neandertal DNA'sı); https://www.smithsonianmag.com/smart-news/new-research-expands-neanderthals-genetic-legacy-modern-humans-180974099/";
const npr = "NPR, Hey, good lookin': early humans dug Neanderthals (2010); https://www.npr.org/2010/05/06/126553081/hey-good-lookin-early-humans-dug-neanderthals";

export default {
  slug: "c1-neanderthal-caveats", level: "C1", title: "A Headline Number Is a Summary", topic: "Neandertaller", sortOrder: 21, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central point of the passage?", evidence: ev(2, "a headline number is a summary, not a verdict"), options: [
      option("o1", "Neanderthal DNA findings come with limits", true, null, "Metin bulguların sınırlarını ve çekincelerini vurgular."),
      option("o2", "Neanderthal DNA proves a single ancestry", false, "extreme", "Metin böyle bir kanıtlama yapmaz."),
      option("o3", "African populations carry no Neanderthal DNA", false, "reverse", "Metin Afrikalılarda da az miktar bulunduğunu söyler."),
      option("o4", "The Siberian genome settles every question", false, "reverse", "Metin bu genomun sınırlılığını vurgular."),
    ] },
    { key: "q2", type: "detail", prompt: "How much Neanderthal DNA did the twenty twenty study find in Europeans and Asians?", evidence: findEvidence(paragraphs, "roughly one point seven to one point eight percent of European and Asian genomes"), options: [
      option("o1", "About 1.7 to 1.8 percent", true, null, "Metin bu oranı söyler."),
      option("o2", "About 17 to 18 percent", false, "detail", "On yedi milyon baz çifti Afrikalılar içindir; oran değil."),
      option("o3", "About 0.17 to 0.18 percent", false, "detail", "Ondalık yanlış yere kaydırılmıştır."),
      option("o4", "About 4 to 5 percent", false, "detail", "Eski tahmin aralığı 1-4'tür; 2020 çalışması bunu inceltti."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “caveats” mean in the last paragraph?", evidence: ev(2, "Responsible readers should note the caveats."), options: [
      option("o1", "Warnings about limits", true, null, "Caveat, sınırlara dair uyarıdır."),
      option("o2", "Records of earlier fossils", false, "sound", "Cave sözcüğü mağarayı çağrıştırır; anlam bu değildir."),
      option("o3", "Proofs of ancient mixing", false, "context", "Karışma geçer ama caveat kanıt değildir."),
      option("o4", "Names of research teams", false, "notstated", "Ekip adları anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why might the Siberian genome limit the study?", evidence: ev(2, "the Neanderthal genome used for comparison came from Siberia, which may not have been part of the population that actually mixed with migrating humans"), options: [
      option("o1", "It may not match the mixing group", true, null, "Sibirya genomu, karışan topluluğu temsil etmeyebilir."),
      option("o2", "It was too old to be analysed", false, "notstated", "Yaş sorunu anlatılmaz."),
      option("o3", "It contained no usable DNA at all", false, "extreme", "Metin böyle demez."),
      option("o4", "It came from a modern human sample", false, "reverse", "Neandertal genomudur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Birincil çalışma (Cell, 2020): örneklenen genomlarda Avrupalı/Asyalılarda yaklaşık %1,7-1,8 Neandertal soyu; örneklenen Afrikalı bireylerde bunun yaklaşık üçte biri (ortalama ~17 milyon baz çifti); bulgular örneklemle sınırlıdır, bütün insanlara genellenemez.", source: cell, checkedOn: "2026-11-23" },
    { claim: "2010'daki ilk Neandertal genomundan sonra tahminler Afrikalı olmayanların soyunun yaklaşık %1-4'ünün Neandertallerden geldiğini ima ediyordu.", source: npr, checkedOn: "2026-11-23" },
    { claim: "2020 Cell çalışması (Akey ekibi): Avrupalı ve Asyalı genomlarında yaklaşık %1,7-1,8 Neandertal DNA'sı; Afrikalılarda ortalama yaklaşık 17 milyon baz çifti (Avrupalılardaki miktarın yaklaşık üçte biri); gen akışı iki yönlü olmuş olabilir.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Çalışma sınırlı sayıda Afrikalı topluluğu inceledi; karşılaştırmada kullanılan Neandertal genomu Sibirya'dan geliyordu ve karışan topluluğu temsil etmeyebilir.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
