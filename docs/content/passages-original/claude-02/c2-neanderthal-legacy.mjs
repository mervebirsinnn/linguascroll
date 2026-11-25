import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} most{çoğu} of{} the{} twentieth{yirminci} century{yüzyıl}, the{} Neanderthals{Neandertaller} served{hizmet etmek} as{olarak} a{} convenient{elverişli} foil{zıt örnek}: brutish{kaba}, slow{yavaş} and{} doomed{mahkûm}, they{} flattered{pohpohlamak} their{onların} successors{halefler} by{-erek} comparison{karşılaştırma}.", "Yirminci yüzyılın büyük bölümünde Neandertaller elverişli bir zıt örnek olarak hizmet etti: kaba, yavaş ve mahkûm olarak, karşılaştırma yoluyla halefleri pohpohluyorlardı."],
    ["The{} sequencing{dizileme} of{} their{onların} DNA{DNA} has{} unsettled{altüst etmek} that{o} flattering{pohpohlayıcı} story{hikâye}.", "DNA'larının dizilenmesi bu pohpohlayıcı hikâyeyi altüst etti."],
  ],
  [
    ["When{-dığında} researchers{araştırmacılar} compared{karşılaştırmak} the{} first{ilk} Neanderthal{Neandertal} genome{genom}, sequenced{dizilemek} in{-de} twenty{yirmi} ten{on}, with{ile} the{} genomes{genomlar} of{} living{yaşayan} people{insanlar}, they{} found{bulmak} that{ki} many{birçok} of{} us{biz} carry{taşımak} fragments{parçalar} of{} it{}.", "Araştırmacılar 2010'da dizilenen ilk Neandertal genomunu yaşayan insanların genomlarıyla karşılaştırdığında birçoğumuzun onun parçalarını taşıdığını buldu."],
    ["Early{erken} estimates{tahminler} placed{yerleştirmek} the{} share{pay} of{} Neanderthal{Neandertal} ancestry{soy} in{} non{olmayan}-Africans{Afrikalılar} at{-de} between{arasında} one{bir} and{} four{dört} percent{yüzde}; a{} later{daha sonraki} study{çalışma} published{yayımlamak} in{-de} the{} journal{dergi} Cell{Cell} in{-de} twenty{yirmi} twenty{yirmi} refined{hassaslaştırmak (tahmini)} the{} figure{rakam} to{-e} about{yaklaşık} one{bir} point{nokta} seven{yedi} or{ya da} one{bir} point{nokta} eight{sekiz} percent{yüzde} for{için} Europeans{Avrupalılar} and{} Asians{Asyalılar}.", "Erken tahminler Afrikalı olmayanlardaki Neandertal soy payını yüzde bir ile dört arasında gösteriyordu; 2020'de Cell dergisinde yayımlanan daha sonraki bir çalışma rakamı Avrupalılar ve Asyalılar için yaklaşık yüzde 1,7 ya da 1,8'e inceltti."],
    ["The{} implication{ima} is{} unavoidable{kaçınılmaz}: the{} two{iki} populations{topluluklar} met{karşılaşmak} and{} had{sahip olmak} children{çocuklar}, probably{muhtemelen} on{} more{daha fazla} than{-den} one{bir} occasion{vesile}.", "Sonuç kaçınılmazdır: iki topluluk karşılaştı ve çocuk sahibi oldu, muhtemelen birden fazla kez."],
  ],
  [
    ["The{} same{aynı} study{çalışma} complicated{karmaşıklaştırmak} the{} picture{resim} in{} a{} second{ikinci} way{biçim}.", "Aynı çalışma resmi ikinci bir biçimde karmaşıklaştırdı."],
    ["Africans{Afrikalılar} in{-de} the{} sample{örneklem}, long{uzun süre} assumed{varsaymak} to{-mek} carry{taşımak} almost{neredeyse} no{hiç} Neanderthal{Neandertal} DNA{DNA}, were{} found{bulmak} to{-mek} carry{taşımak} about{yaklaşık} seventeen{on yedi} million{milyon} Neanderthal{Neandertal} base{baz} pairs{çiftler} on{} average{ortalama}, roughly{kabaca} a{} third{üçte bir} of{} the{} amount{miktar} in{} Europeans{Avrupalılar} and{} Asians{Asyalılar}.", "Uzun süre neredeyse hiç Neandertal DNA'sı taşımadığı varsayılan örneklemdeki Afrikalıların ortalama yaklaşık on yedi milyon Neandertal baz çifti taşıdığı, yani Avrupalılarda ve Asyalılardaki miktarın kabaca üçte biri kadar taşıdığı bulundu."],
    ["The{} authors{yazarlar} suggested{önermek} that{ki} gene{gen} flow{akış} had{} run{işlemek} in{} both{ikisi de} directions{yönler}, with{ile} some{bazı} Neanderthal{Neandertal}-like{benzeri} sequences{diziler} travelling{yolculuk etmek} back{geri} to{-e} Africa{Afrika} with{ile} early{erken} modern{modern} humans{insanlar}.", "Yazarlar gen akışının iki yönde de işlemiş olabileceğini, bazı Neandertal benzeri dizilerin erken modern insanlarla birlikte Afrika'ya geri taşınmış olabileceğini önerdi."],
  ],
  [
    ["Every{her} such{böyle} finding{bulgu} carries{taşımak} limits{sınırlar}, and{} these{bu} deserve{hak etmek} equal{eşit} attention{dikkat}.", "Böyle her bulgu sınırlar taşır ve bunlar eşit dikkati hak eder."],
    ["The{} team{ekip} sampled{örneklemek} only{yalnızca} a{} limited{sınırlı} number{sayı} of{} African{Afrikalı} populations{topluluklar}, so{bu yüzden} the{} results{sonuçlar} may{-ebilir} not{değil} generalise{genellemek} to{-e} everyone{herkes} of{} African{Afrikalı} ancestry{soy}.", "Ekip yalnızca sınırlı sayıda Afrikalı topluluktan örnek aldı; bu yüzden sonuçlar Afrika kökenli herkese genellenemeyebilir."],
    ["Moreover{üstelik}, the{} Neanderthal{Neandertal} genome{genom} used{kullanmak} as{olarak} a{} reference{referans} came{gelmek} from{-den} Siberia{Sibirya}, and{} that{o} population{topluluk} may{-ebilir} not{değil} have{} been{} the{} one{olan} that{ki} actually{gerçekten} interbred{melezlenmek} with{ile} the{} humans{insanlar} who{ki onlar} left{ayrılmak} Africa{Afrika}.", "Üstelik referans olarak kullanılan Neandertal genomu Sibirya'dandı ve o topluluk, Afrika'yı terk eden insanlarla gerçekten melezlenen topluluk olmayabilir."],
  ],
  [
    ["Taken{almak} together{birlikte}, the{} findings{bulgular} replace{yerine koymak} a{} flattering{pohpohlayıcı} caricature{karikatür} with{ile} something{bir şey} more{daha} interesting{ilginç}: a{} people{halk} who{ki onlar} did{} not{} vanish{yok olmak} without{-meden} trace{iz}, but{ama} whose{kimin} genetic{genetik} traces{izler} persist{sürmek} in{} many{birçok} of{} us{biz}.", "Birlikte ele alındığında bulgular pohpohlayıcı bir karikatürün yerine daha ilginç bir şey koyar: iz bırakmadan yok olmamış, genetik izleri birçoğumuzda sürmekte olan bir halk."],
    ["Whether{-ip -mediği} that{o} persistence{süreklilik} reflects{yansıtmak} friendship{dostluk}, rivalry{rekabet} or{ya da} something{bir şey} in{} between{arası} remains{kalmak} unknown{bilinmeyen}, and{} an{} honest{dürüst} account{anlatım} must{-meli} say{söylemek} so{öyle}.", "O sürekliliğin dostluğu, rekabeti ya da arada bir şeyi yansıtıp yansıtmadığı bilinmiyor ve dürüst bir anlatım bunu söylemelidir."],
    ["Honest{dürüst} science{bilim} rarely{nadiren} offers{sunmak} a{} finished{tamamlanmış} story{hikâye}, but{ama} it{} offers{sunmak} a{} truthful{doğru} one{olan}.", "Dürüst bilim nadiren tamamlanmış bir hikâye sunar ama doğru bir hikâye sunar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-neanderthal-legacy", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cell = "Chen, Wolf, Fu, Li ve Akey, Identifying and Interpreting Apparent Neanderthal Ancestry in African Individuals, Cell 180(4), 2020; https://doi.org/10.1016/j.cell.2020.01.012";
const smith = "Smithsonian Magazine, 4 Şubat 2020, haber: Cell dergisindeki Akey ekibi çalışması (Afrikalılardaki Neandertal DNA'sı); https://www.smithsonianmag.com/smart-news/new-research-expands-neanderthals-genetic-legacy-modern-humans-180974099/";
const npr = "NPR, Hey, good lookin': early humans dug Neanderthals (2010); https://www.npr.org/2010/05/06/126553081/hey-good-lookin-early-humans-dug-neanderthals";

export default {
  slug: "c2-neanderthal-legacy", level: "C2", title: "The Caricature and the Genome", topic: "Neandertaller", sortOrder: 21, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main point of the passage?", evidence: ev(4, "the findings replace a flattering caricature with something more interesting"), options: [
      option("o1", "Genetics swapped a caricature for nuance", true, null, "Metin genetiğin eski karikatürü daha incelikli bir resimle değiştirdiğini anlatır."),
      option("o2", "Neanderthals proved superior to humans", false, "extreme", "Böyle bir karşılaştırma yoktur."),
      option("o3", "The two populations never met", false, "reverse", "Metin karıştıklarını söyler."),
      option("o4", "Africans carry most of the Neanderthal DNA", false, "reverse", "Metin Afrikalı örneklemde miktarın daha az olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "How much Neanderthal DNA did the twenty twenty study report in Europeans and Asians?", evidence: findEvidence(paragraphs, "about one point seven or one point eight percent for Europeans and Asians"), options: [
      option("o1", "About 1.7 to 1.8 percent", true, null, "Metin bu oranı söyler."),
      option("o2", "About 17 to 18 percent", false, "detail", "Ondalık yanlış yere kaydırılmıştır."),
      option("o3", "About 0.17 to 0.18 percent", false, "detail", "Ondalık yanlış yere kaydırılmıştır."),
      option("o4", "About 4 to 5 percent", false, "detail", "Eski tahmin aralığı 1-4'tür; 2020 çalışması bunu inceltti."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “foil” mean in the first paragraph?", evidence: ev(0, "the Neanderthals served as a convenient foil"), options: [
      option("o1", "A flattering contrast", true, null, "Foil, bir başkasını daha iyi gösteren zıt örnektir."),
      option("o2", "A tool for cutting stone", false, "sound", "Sözcüğün gündelik anlamıdır, burada kullanılmamıştır."),
      option("o3", "A record of ancient events", false, "context", "Kayıt anlamı yoktur."),
      option("o4", "A teacher of early humans", false, "notstated", "Böyle bir anlam yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply by calling the old image “flattering”?", evidence: findEvidence(paragraphs, "they flattered their successors by comparison"), options: [
      option("o1", "It made humans look superior by contrast", true, null, "Pohpohlamak, karşılaştırmayla insanları üstün göstermek demektir."),
      option("o2", "It praised Neanderthals for their great skill", false, "reverse", "Pohpohlanan Neandertaller değil, halefleridir."),
      option("o3", "It described Neanderthals as wise teachers", false, "reverse", "Metin onları kaba ve yavaş diye betimler."),
      option("o4", "It proved humans and Neanderthals were equal", false, "reverse", "Eski imge eşitlik değil, üstünlük sunar."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Birincil çalışma (Cell, 2020): örneklenen genomlarda Avrupalı/Asyalılarda yaklaşık %1,7-1,8 Neandertal soyu; örneklenen Afrikalı bireylerde bunun yaklaşık üçte biri (ortalama ~17 milyon baz çifti); bulgular örneklemle sınırlıdır, bütün insanlara genellenemez.", source: cell, checkedOn: "2026-11-23" },
    { claim: "2010'daki ilk Neandertal genomundan sonra tahminler Afrikalı olmayanların soyunun yaklaşık %1-4'ünün Neandertallerden geldiğini ima ediyordu.", source: npr, checkedOn: "2026-11-23" },
    { claim: "2020 Cell çalışması (Akey ekibi): Avrupalı ve Asyalı genomlarında yaklaşık %1,7-1,8 Neandertal DNA'sı; Afrikalılarda ortalama yaklaşık 17 milyon baz çifti (Avrupalılardaki miktarın yaklaşık üçte biri); gen akışı iki yönlü olmuş olabilir.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Çalışma sınırlı sayıda Afrikalı topluluğu inceledi; karşılaştırmada kullanılan Neandertal genomu Sibirya'dan geliyordu ve karışan topluluğu temsil etmeyebilir.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
