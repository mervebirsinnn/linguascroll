import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["More{daha} than{-den} two{iki} thousand{bin} years{yıl} ago{önce}, the{} Greek{Yunan} thinker{düşünür} Plato{Platon} told{anlattı} a{} story{hikâye} about{hakkında} a{} cave{mağara}.", "İki bin yıldan uzun süre önce Yunan düşünür Platon, bir mağara hakkında bir hikâye anlattı."],
    ["In{-de} the{} story{hikâye}, some{bazı} people{insanlar} have{} lived{yaşadı} in{} the{} cave{mağara} since{-den beri} they{} were{} children{çocuk}.", "Hikâyede bazı insanlar çocukluklarından beri mağarada yaşıyor."],
    ["They{} cannot{-amaz} turn{dönmek} their{onların} heads{başlar}, so{bu yüzden} they{} can{-ebilir} only{yalnızca} look{bakmak} at{-e (bakmak)} the{} wall{duvar} in{} front{önünde} of{} them{onlar}.", "Başlarını çeviremedikleri için yalnızca önlerindeki duvara bakabiliyorlar."],
  ],
  [
    ["Behind{arkasında} them{onlar}, there{orada} is{} a{} fire{ateş}, and{} people{insanlar} carry{taşır} objects{nesneler} past{yanından} it{}.", "Arkalarında bir ateş var ve insanlar nesneleri onun önünden taşıyor."],
    ["The{} fire{ateş} makes{yapar} shadows{gölgeler} on{üzerinde} the{} wall{duvar}, and{} the{} prisoners{mahkûmlar} think{düşünür} that{ki} these{bu} shadows{gölgeler} are{} real{gerçek}.", "Ateş duvarda gölgeler oluşturuyor ve mahkûmlar bu gölgelerin gerçek olduğunu sanıyor."],
    ["One{biri} day{gün}, one{biri} prisoner{mahkûm} is{} freed{özgür bırakıldı} and{} walks{yürür} outside{dışarı}.", "Bir gün mahkûmlardan biri serbest bırakılır ve dışarı yürür."],
    ["At{-de} first{önce}, the{} bright{parlak} sun{güneş} hurts{acıtır} his{} eyes{gözler}, but{ama} slowly{yavaşça} he{} sees{görür} the{} real{gerçek} world{dünya}.", "Önce parlak güneş gözlerini acıtır ama yavaş yavaş gerçek dünyayı görür."],
  ],
  [
    ["He{} returns{döner} to{-e} the{} cave{mağara} to{-mek için} tell{anlatmak} the{} others{diğerleri} the{} truth{gerçek}.", "Diğerlerine gerçeği anlatmak için mağaraya döner."],
    ["But{ama} they{} do{} not{} believe{inanmak} him{ona}, because{çünkü} the{} shadows{gölgeler} are{} all{hepsi} they{} have{sahip} ever{hiç} known{bilmek}.", "Ama ona inanmazlar, çünkü bildikleri tek şey gölgelerdir."],
    ["Plato{Platon} used{kullandı} the{} story{hikâye} to{-mek için} show{göstermek} how{nasıl} hard{zor} it{} can{-ebilir} be{olmak} to{-mek} change{değiştirmek} what{ne} we{biz} think{düşünür} is{} true{doğru}.", "Platon, doğru sandığımız şeyi değiştirmenin ne kadar zor olabileceğini göstermek için bu hikâyeyi kullandı."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-platos-cave", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const plato = "Plato, Republic VII (514a-520a), Mağara Alegorisi (Jowett çevirisi, ders notu PDF); https://scholar.harvard.edu/sites/scholar.harvard.edu/files/seyer/files/plato_republic_514b-518d_allegory-of-the-cave.pdf";

export default {
  slug: "b1-platos-cave", level: "B1", title: "The Prisoners in the Cave", topic: "Felsefe", sortOrder: 22, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main idea of the passage?", evidence: ev(2, "Plato used the story to show how hard it can be to change what we think is true."), options: [
      option("o1", "How hard it can be to change beliefs", true, null, "Platon hikâyeyi inançları değiştirmenin zorluğunu göstermek için kullanır."),
      option("o2", "How a prisoner escaped from a hard prison", false, "detail", "Kaçış hikâyenin bir ayrıntısıdır; ana fikir değildir."),
      option("o3", "Why fire is better than sunlight", false, "notstated", "Böyle bir karşılaştırma yoktur."),
      option("o4", "How Greeks learned to draw shadows", false, "notstated", "Gölge çizimi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What do the prisoners think about the shadows?", evidence: ev(1, "the prisoners think that these shadows are real"), options: [
      option("o1", "That they are made by the sun", false, "reverse", "Gölgeleri ateş yapar; güneşi dışarıda görürler."),
      option("o2", "That they are only a joke", false, "notstated", "Şaka olarak görmezler."),
      option("o3", "That they are real", true, null, "Metin mahkûmların gölgeleri gerçek sandığını söyler."),
      option("o4", "That they come from a book", false, "notstated", "Kitap geçmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “freed” mean in the second paragraph?", evidence: ev(1, "One day, one prisoner is freed and walks outside."), options: [
      option("o1", "Allowed to go", true, null, "Freed, serbest bırakılmış demektir."),
      option("o2", "Made to wait longer", false, "reverse", "Serbest bırakılmanın tersidir."),
      option("o3", "Given a new name", false, "notstated", "İsim verilmez."),
      option("o4", "Told a funny story", false, "notstated", "Hikâye anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why do the other prisoners not believe him?", evidence: ev(2, "they do not believe him, because the shadows are all they have ever known"), options: [
      option("o1", "They know the real world already.", false, "reverse", "Yalnızca gölgeleri bilirler."),
      option("o2", "They know just shadows.", true, null, "Metin bunu açıkça söyler."),
      option("o3", "They are afraid of the fire.", false, "notstated", "Ateş korkusu geçmez."),
      option("o4", "They want to leave the cave.", false, "reverse", "Çıkmak istedikleri söylenmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Platon'un Devlet'inde (Kitap VII) mağara alegorisi: çocukluktan beri zincirli mahkûmlar duvardaki gölgeleri gerçek sanır; serbest kalan biri güneşe çıkar, dönüp anlattığında diğerleri ona inanmaz.", source: plato, checkedOn: "2026-11-23" },
  ] },
};
