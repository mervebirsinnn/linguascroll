import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} octopus{ahtapot} has{} become{olmak} a{} favourite{favori} of{} popular{popüler} science{bilim}, and{} favourites{favoriler} are{} dangerous{tehlikeli} subjects{konular}, because{çünkü} affection{sevgi} encourages{teşvik etmek} us{bizi} to{-mek} repeat{tekrarlamak} striking{çarpıcı} claims{iddialar} without{-meden} checking{kontrol etmek} them{onları}.", "Ahtapot popüler bilimin gözdesi oldu ve gözdeler tehlikeli konulardır, çünkü sevgi bizi çarpıcı iddiaları kontrol etmeden tekrarlamaya teşvik eder."],
    ["A{} careful{dikkatli} reading{okuma} of{} reliable{güvenilir} sources{kaynaklar} separates{ayırmak} the{} solid{sağlam} from{-den} the{} shaky{sallantılı}.", "Güvenilir kaynakların dikkatli bir okuması sağlam olanı sallantılı olandan ayırır."],
    ["This{bu} article{makale} tries{denemek} to{-mek} follow{izlemek} that{o} advice{öğüt}.", "Bu makale o öğüdü izlemeye çalışır."],
  ],
  [
    ["The{} solid{sağlam} facts{olgular} concern{ilgilendirmek} the{} animal's{hayvan (iyelik)} anatomy{anatomi}.", "Sağlam olgular hayvanın anatomisiyle ilgilidir."],
    ["It{} has{sahiptir} three{üç} hearts{kalpler}: two{iki} pump{pompalamak} blood{kan} through{içinden} the{} gills{solungaçlar}, and{} the{} third{üçüncü} circulates{dolaştırmak} it{} through{içinden} the{} rest{geri kalan} of{} the{} body{vücut}.", "Üç kalbi vardır: ikisi kanı solungaçlardan pompalar, üçüncüsü ise vücudun geri kalanından dolaştırır."],
    ["Its{onun} blood{kan} is{} blue{mavi} because{çünkü} it{} carries{taşımak} oxygen{oksijen} on{üzerinde} a{} copper{bakır}-based{temelli} protein{protein}, hemocyanin{hemosiyanin}, where{ki orada} human{insan} blood{kan} relies{güvenmek} on{-e} the{} iron{demir}-based{temelli} hemoglobin{hemoglobin}.", "Kanı mavidir, çünkü oksijeni bakır temelli bir protein olan hemosiyaninle taşır; insan kanı ise demir temelli hemoglobine güvenir."],
    ["Hemocyanin{hemosiyanin} appears{görünmek} to{-mek} perform{işlev görmek} efficiently{verimli biçimde} in{} cold{soğuk}, poorly{kötü} oxygenated{oksijenlenmiş} water{su}, which{ki bu} suggests{düşündürmek} an{} adaptation{uyum} rather{yerine (rather than)} than{yerine (rather than)} a{} curiosity{merak konusu}.", "Hemosiyanin soğuk, zayıf oksijenli suda verimli işlev görüyor gibi görünür; bu, bir merak konusundan çok bir uyumu düşündürür."],
    ["None{hiçbiri} of{} these{bu} facts{olgular} needs{ihtiyaç duymak} embellishment{süsleme} to{-mek} impress{etkilemek} a{} thoughtful{düşünceli} reader{okuyucu}.", "Bu olguların hiçbiri düşünceli bir okuyucuyu etkilemek için süslemeye ihtiyaç duymaz."],
  ],
  [
    ["The{} shakier{daha sallantılı} claims{iddialar} concern{ilgilendirmek} the{} nervous{sinir} system{sistem}.", "Daha sallantılı iddialar sinir sistemiyle ilgilidir."],
    ["It{} is{} well{iyi} established{yerleşmiş} that{ki} a{} large{büyük} share{pay} of{} an{} octopus's{ahtapot (iyelik)} neurons{sinir hücreleri} sits{durmak} in{} its{onun} arms{kollar}; PBS{PBS} puts{koymak} the{} figure{rakam} at{-de} about{yaklaşık} two{iki} thirds{üçte}, while{iken} other{başka} sources{kaynaklar} offer{sunmak} lower{daha düşük} proportions{oranlar}.", "Bir ahtapotun sinir hücrelerinin büyük bir payının kollarında bulunduğu iyi yerleşmiştir; PBS rakamı yaklaşık üçte iki olarak verir, başka kaynaklar ise daha düşük oranlar sunar."],
    ["The{} popular{popüler} slogan{slogan} that{ki} the{} animal{hayvan} has{sahiptir} nine{dokuz} brains{beyinler} compresses{sıkıştırmak} this{bu} distribution{dağılım} into{içine} a{} vivid{canlı} but{ama} misleading{yanıltıcı} image{imge}, since{çünkü} a{} cluster{küme} of{} neurons{sinir hücreleri} in{} an{} arm{kol} is{} not{değil} a{} brain{beyin} in{} any{herhangi bir} ordinary{olağan} sense{anlam}.", "Hayvanın dokuz beyni olduğu yönündeki popüler slogan bu dağılımı canlı ama yanıltıcı bir imgeye sıkıştırır, çünkü bir koldaki sinir hücresi kümesi olağan anlamda bir beyin değildir."],
    ["A{} more{daha} accurate{doğru} phrase{ifade} would{-ecekti} be{olmak} that{ki} the{} animal{hayvan} has{sahiptir} one{bir} central{merkezi} brain{beyin} and{} a{} widely{yaygın biçimde} distributed{dağılmış} nervous{sinir} system{sistem}.", "Daha doğru bir ifade, hayvanın tek bir merkezi beyni ve geniş biçimde dağılmış bir sinir sistemi olduğu olurdu."],
  ],
  [
    ["Why{neden} do{} these{bu} distinctions{ayrımlar} matter{önemli olmak}?", "Bu ayrımlar neden önemlidir?"],
    ["Because{çünkü} the{} gap{boşluk} between{arasında} a{} measured{ölçülmüş} fact{olgu} and{} a{} memorable{akılda kalıcı} claim{iddia} is{} where{ki orada} misunderstanding{yanlış anlama} grows{büyümek}.", "Çünkü ölçülmüş bir olgu ile akılda kalıcı bir iddia arasındaki boşluk, yanlış anlamanın büyüdüğü yerdir."],
    ["An{} audience{izleyici} told{söylemek} that{ki} the{} octopus{ahtapot} has{sahiptir} nine{dokuz} brains{beyinler} may{-ebilir} conclude{sonuca varmak} that{ki} it{} thinks{düşünmek} nine{dokuz} times{kat} as{kadar} well{iyi}, an{} inference{çıkarım} the{} evidence{kanıt} does{} not{} support{desteklemek}.", "Ahtapotun dokuz beyni olduğu söylenen bir izleyici, onun dokuz kat daha iyi düşündüğü sonucuna varabilir; kanıt böyle bir çıkarımı desteklemez."],
  ],
  [
    ["The{} fairest{en adil} summary{özet} is{} therefore{bu nedenle} modest{mütevazı}: the{} octopus{ahtapot} organises{düzenlemek} its{onun} body{vücut} and{} its{onun} nervous{sinir} system{sistem} very{çok} differently{farklı} from{-den} vertebrates{omurgalılar}, and{} that{o} difference{fark} is{} fascinating{büyüleyici} without{-meden} needing{ihtiyaç duymak} exaggeration{abartı}.", "En adil özet bu nedenle mütevazıdır: ahtapot vücudunu ve sinir sistemini omurgalılardan çok farklı düzenler ve bu fark abartıya ihtiyaç duymadan da büyüleyicidir."],
    ["Scientific{bilimsel} wonder{hayranlık} survives{hayatta kalmak} precision{kesinlik} perfectly{mükemmel biçimde} well{iyi}; indeed{gerçekten}, it{} usually{genellikle} deepens{derinleştirmek} with{ile} it{}.", "Bilimsel hayranlık kesinliğe rağmen mükemmel biçimde hayatta kalır; hatta genellikle onunla derinleşir."],
    ["Readers{okuyucular} lose{kaybetmek} nothing{hiçbir şey} by{-erek} demanding{talep etmek} that{o} standard{ölçüt}, and{} they{} gain{kazanmak} a{} clearer{daha net} picture{resim} of{} the{} animal{hayvan}.", "Okuyucular bu ölçütü talep ederek hiçbir şey kaybetmez ve hayvanın daha net bir resmini kazanır."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-octopus-mind", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const pbs = "PBS Nature, Octopus (other species); https://www.pbs.org/wnet/nature/group/other-species/octopus/";
const smith = "Smithsonian Magazine, Ten wild facts about octopuses: they have three hearts, big brains and blue blood; https://www.smithsonianmag.com/science-nature/ten-wild-facts-about-octopuses-they-have-three-hearts-big-brains-and-blue-blood-7625828/";

export default {
  slug: "c2-octopus-mind", level: "C2", title: "Wonder Without Exaggeration", topic: "Biyoloji", sortOrder: 17, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central argument of the passage?", evidence: ev(4, "Scientific wonder survives precision perfectly well; indeed, it usually deepens with it."), options: [
      option("o1", "Accuracy beats slogans", true, null, "Metin kesinliğin hayranlığı azaltmadığını, derinleştirdiğini savunur."),
      option("o2", "Octopuses should not be called intelligent", false, "reverse", "Metin zekâyı yadsımaz."),
      option("o3", "Popular science is mostly untrustworthy", false, "extreme", "Metin güvenilir kaynakları ayırt etmeyi önerir."),
      option("o4", "Octopus anatomy remains largely unknown", false, "reverse", "Metin sağlam olguların bilindiğini anlatır."),
    ] },
    { key: "q2", type: "detail", prompt: "What do the three hearts do?", evidence: ev(1, "two pump blood through the gills, and the third circulates it through the rest of the body"), options: [
      option("o1", "Two serve the gills, one the body", true, null, "Metin bunu söyler."),
      option("o2", "All three serve the arms equally", false, "reverse", "Kollar sinir hücreleri bağlamında geçer."),
      option("o3", "One pumps blood and two store oxygen", false, "notstated", "Depolama anlatılmaz."),
      option("o4", "Two control movement and one controls colour", false, "notstated", "Hareket ve renk kontrolü anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “shaky” mean in the third paragraph?", evidence: ev(2, "The shakier claims concern the nervous system."), options: [
      option("o1", "Not firmly supported", true, null, "Shaky, sağlam dayanağı olmayan demektir."),
      option("o2", "Moving quickly in water", false, "sound", "Fiziksel titremeyle karıştırılabilir."),
      option("o3", "Easy to measure exactly", false, "reverse", "Tersini anlatır."),
      option("o4", "Based on very old records", false, "notstated", "Eski kayıtlar anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Which kind of source does the author implicitly trust most?", evidence: findEvidence(paragraphs, "A careful reading of reliable sources separates the solid from the shaky."), options: [
      option("o1", "Ones that separate firm facts from slogans", true, null, "Metin sağlam olgu ile sallantılı iddiayı ayıran okumaları değerli sayar."),
      option("o2", "Ones that repeat the most striking claims eagerly", false, "reverse", "Metin bunu eleştirir."),
      option("o3", "Ones that avoid every number and measurement", false, "extreme", "Metin sayıları reddetmez."),
      option("o4", "Ones that were written by popular authors", false, "notstated", "Yazar popülerliği ölçüt değildir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ahtapotun üç kalbi vardır: ikisi kanı solungaçlara, üçüncüsü vücuda pompalar.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Kanı bakır temelli hemosiyanin yüzünden mavidir; insan kanı demirli hemoglobin kullanır; hemosiyanin soğuk, düşük oksijenli suda verimlidir.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Sinir hücrelerinin yaklaşık üçte ikisi kollardadır (PBS; başka kaynaklar daha düşük oranlar verir); 'dokuz beyin' ifadesi bir basitleştirmedir.", source: pbs, checkedOn: "2026-11-23" },
  ] },
};
