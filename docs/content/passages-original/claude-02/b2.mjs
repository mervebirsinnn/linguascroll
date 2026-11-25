import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca (for a long time kalıbı)} a{bir} long{uzun} time{süre}, people{insanlar} imagined{hayal etti} Neanderthals{Neandertaller} as{olarak} slow{yavaş} and{ve} clumsy{beceriksiz} cousins{kuzenler} who{ki onlar} simply{sadece} lost{kaybetti} a{bir} competition{yarışma} with{ile} modern{modern} humans{insanlar}.", "Uzun süre boyunca insanlar Neandertalleri, modern insanlara karşı bir yarışı sadece kaybetmiş yavaş ve beceriksiz kuzenler olarak hayal etti."],
    ["Genetics{genetik} has{-miştir} made{yaptı} that{o} picture{resim} much{çok} harder{daha zor} to{-mek} defend{savunmak}.", "Genetik, bu resmi savunmayı çok daha zor hâle getirdi."],
    ["When{-dığında} researchers{araştırmacılar} compared{karşılaştırdı} the{belirli tanımlık} DNA{DNA} of{-nin} living{yaşayan} people{insanlar} with{ile} a{bir} Neanderthal{Neandertal} genome{genom}, they{onlar} discovered{keşfetti} that{ki} many{birçoğu} of{-nin} the{} people{insanlar} they{} tested{test etmek} carry{taşır} small{küçük} pieces{parçalar} of{-nin} it{onun}.", "Araştırmacılar yaşayan insanların DNA'sını bir Neandertal genomuyla karşılaştırdığında, test ettikleri insanların birçoğunun onun küçük parçalarını taşıdığını keşfetti."],
    ["In{-de} the{belirli tanımlık} genomes{genomlar} studied{incelenmek}, people{insanlar} whose{kimlerin} ancestors{atalar} lived{yaşadı} outside{dışında} Africa{Afrika} typically{genellikle} carry{taşımak} between{arasında} one{bir} and{ve} two{iki} percent{yüzde} Neanderthal{Neandertal} DNA{DNA}.", "İncelenen genomlarda, ataları Afrika dışında yaşamış insanlar genellikle yüzde bir ile iki arasında Neandertal DNA'sı taşır."],
  ],
  [
    ["This{bu} means{demektir} that{ki} the{belirli tanımlık} two{iki} groups{grup} met{karşılaştı} and{ve} had{sahip oldu} children{çocuklar} together{birlikte}, probably{muhtemelen} more{daha fazla} than{-den (karşılaştırma)} once{bir kez}.", "Bu, iki grubun karşılaştığı ve birlikte çocuk sahibi olduğu, muhtemelen bunun bir defadan fazla yaşandığı anlamına gelir."],
    ["A{bir} study{çalışma} published{yayımlanan} in{-de} two{iki} thousand{bin} twenty{yirmi} also{ayrıca} found{buldu} small{küçük} amounts{miktarlar} of{-nin} Neanderthal{Neandertal} DNA{DNA} in{-de} African{Afrikalı} populations{topluluklar}, and{ve} its{onun} authors{yazarlar} argued{ileri sürdü} that{ki} some{bir kısmı} of{-nin} it{onun} may{-ebilir} have{-miş} travelled{yolculuk etti} back{geri} to{-e} Africa{Afrika} with{ile} early{erken} modern{modern} humans{insanlar}.", "2020'de yayımlanan bir çalışma Afrikalı topluluklarda da az miktarda Neandertal DNA'sı buldu ve yazarları bunun bir kısmının erken modern insanlarla birlikte Afrika'ya geri taşınmış olabileceğini ileri sürdü."],
    ["However{ancak}, the{belirli tanımlık} team{ekip} studied{inceledi} only{yalnızca} a{bir} limited{sınırlı} number{sayı} of{-nin} African{Afrikalı} populations{topluluklar}, so{bu yüzden} the{belirli tanımlık} results{sonuçlar} may{-ebilir} not{değil} apply{geçerli olmak} to{-e} everyone{herkes}.", "Ancak ekip yalnızca sınırlı sayıda Afrikalı topluluğu inceledi; bu yüzden sonuçlar herkes için geçerli olmayabilir."],
  ],
  [
    ["None{hiçbiri} of{-nin} this{bu} proves{kanıtlar} that{ki} every{her} meeting{karşılaşma} was{idi} peaceful{barışçıl}, or{ya da} that{ki} the{belirli tanımlık} two{iki} groups{grup} understood{anladı} each{her biri} other{diğeri}.", "Bunların hiçbiri her karşılaşmanın barışçıl olduğunu ya da iki grubun birbirini anladığını kanıtlamaz."],
    ["It{o} shows{gösterir} only{yalnızca} that{ki} the{belirli tanımlık} boundary{sınır} between{arasındaki} them{onlar} and{ve} us{biz} was{idi} thinner{daha ince} than{-den (karşılaştırma)} once{bir zamanlar} believed{inanıldı}.", "Yalnızca onlarla bizim aralarındaki sınırın bir zamanlar sanıldığından daha ince olduğunu gösterir."],
    ["In{-de} that{o} sense{anlam}, a{bir} Neanderthal{Neandertal} is{-dır} not{değil} a{bir} distant{uzak} relative{akraba} displayed{sergilenen} in{-de} a{bir} museum{müze}.", "Bu anlamda bir Neandertal, müzede sergilenen uzak bir akraba değildir."],
    ["It{o} may{-ebilir} be{olmak} a{bir} small{küçük} part{parça} of{-nin} who{kim} we{biz} are{-iz}.", "Kim olduğumuzun küçük bir parçası olabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-neanderthals-in-our-genes", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const cell = "Chen, Wolf, Fu, Li ve Akey, Identifying and Interpreting Apparent Neanderthal Ancestry in African Individuals, Cell 180(4), 2020; https://doi.org/10.1016/j.cell.2020.01.012";
const smith = "Smithsonian Magazine, 4 Şubat 2020, haber: Cell dergisindeki Akey ekibi çalışması (Afrikalılardaki Neandertal DNA'sı); https://www.smithsonianmag.com/smart-news/new-research-expands-neanderthals-genetic-legacy-modern-humans-180974099/";

export default {
  slug: "b2-neanderthals-in-our-genes", level: "B2", title: "Neanderthals in Our Genes", topic: "Neandertaller", sortOrder: 11, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "When researchers compared the DNA of living people with a Neanderthal genome, they discovered that many of the people they tested carry small pieces of it."), options: [
      option("o1", "Why Neanderthals lost a competition for food.", false, "context", "Yarış, eski bakış açısını anlatmak için geçer; metin yiyecek rekabetini incelemez."),
      option("o2", "How scientists built a complete Neanderthal body.", false, "notstated", "Metinde bir Neandertal bedeninin yeniden oluşturulmasından söz edilmez."),
      option("o3", "Evidence that Neanderthals and humans mixed.", true, null, "Metin, DNA kanıtlarıyla iki grubun karıştığını anlatır."),
      option("o4", "A comparison of African and European fossils.", false, "detail", "Fosil karşılaştırması yok; metin genetik verilere dayanır."),
    ] },
    { key: "q2", type: "detail", prompt: "How much Neanderthal DNA do many people with non-African ancestors carry?", evidence: findEvidence(paragraphs, "In the genomes studied, people whose ancestors lived outside Africa typically carry between one and two percent Neanderthal DNA."), options: [
      option("o1", "One to two percent", true, null, "Metin yüzde bir ile iki arasında olduğunu söyler."),
      option("o2", "Three to four percent", false, "detail", "Rakam yakın ama metnin verdiği aralık değil."),
      option("o3", "Five to six percent", false, "detail", "Rakam yakın ama metnin verdiği aralık değil."),
      option("o4", "Seven to eight percent", false, "detail", "Rakam yakın ama metnin verdiği aralık değil."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “boundary” mean in the last paragraph?", evidence: ev(2, "the boundary between them and us was thinner than once believed"), options: [
      option("o1", "A famous family name", false, "context", "Akrabalık konusu geçse de boundary bir isim değildir."),
      option("o2", "A distant, quiet place", false, "context", "Distant sözcüğü başka cümlede geçer; boundary yer değil, ayrım çizgisidir."),
      option("o3", "A shared daily habit", false, "notstated", "Metinde ortak bir alışkanlıktan söz edilmez."),
      option("o4", "A dividing line", true, null, "Boundary, iki şeyi ayıran çizgi ya da sınır demektir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer from the limits of the study?", evidence: ev(1, "However, the team studied only a limited number of African populations, so the results may not apply to everyone."), options: [
      option("o1", "African populations have no Neanderthal DNA at all.", false, "reverse", "Çalışma tam tersini, Afrikalılarda da az miktarda DNA bulunduğunu gösterdi."),
      option("o2", "The results may differ in other populations.", true, null, "Sınırlı sayıda topluluk incelendiği için sonuç başka topluluklarda farklı çıkabilir."),
      option("o3", "The study was too small to say anything.", false, "extreme", "Çalışma bir şey söylüyor; yalnızca genellemenin sınırlı olduğu belirtiliyor."),
      option("o4", "Scientists studied every African group.", false, "reverse", "Metin yalnızca sınırlı sayıda topluluğun incelendiğini söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Birincil çalışma (Cell, 2020): örneklenen genomlarda Avrupalı/Asyalılarda yaklaşık %1,7-1,8 Neandertal soyu; örneklenen Afrikalı bireylerde bunun yaklaşık üçte biri (ortalama ~17 milyon baz çifti); bulgular örneklemle sınırlıdır, bütün insanlara genellenemez.", source: cell, checkedOn: "2026-11-23" },
    { claim: "Avrupalı ve Asyalı genomlarında yaklaşık yüzde 1,7-1,8 Neandertal DNA'sı bulunur; daha önceki tahminler 'Afrika dışı atalara sahip insanlarda yüzde 1-4' aralığındaydı.", source: smith, checkedOn: "2026-11-23" },
    { claim: "2020 Cell çalışması Afrikalı topluluklarda da Neandertal DNA'sı buldu; yazarlara göre bir kısmı erken modern insanlarla birlikte Afrika'ya geri taşınmış olabilir (gen akışı iki yönlüydü).", source: smith, checkedOn: "2026-11-23" },
    { claim: "Çalışma sınırlı sayıda Afrikalı topluluğu inceledi; bu yüzden bulgular tüm Afrika kökenli insanlar için geçerli olmayabilir.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
