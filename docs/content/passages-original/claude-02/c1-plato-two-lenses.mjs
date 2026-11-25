import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Few{az} philosophical{felsefi} images{imgeler} have{} proved{olduğu anlaşıldı (prove + sıfat)} as{kadar} durable{dayanıklı} as{olarak} the{} allegory{alegori} of{} the{} cave{mağara}, which{ki o} Plato{Platon} places{yerleştirir} in{-de} Book{Kitap} Seven{Yedi} of{} the{} Republic{Devlet}.", "Felsefi imgelerin azı Platon'un Devlet'in yedinci kitabına yerleştirdiği mağara alegorisi kadar dayanıklı çıkmıştır."],
    ["Its{onun} setting{kurgu} is{} deceptively{aldatıcı biçimde} plain{sade}: prisoners{mahkûmlar} chained{zincirli} since{-den beri} childhood{çocukluk} watch{izlemek} shadows{gölgeler} cast{düşürülmüş} on{üzerine} a{} wall{duvar} by{tarafından} objects{nesneler} that{ki} are{} carried{taşınmak} in{} front{önünde} of{} a{} fire{ateş} behind{arkasında} them{onlar}.", "Kurgusu aldatıcı biçimde sadedir: çocukluktan beri zincirli mahkûmlar, arkalarındaki bir ateşin önünde taşınan nesnelerin duvara düşürdüğü gölgeleri izler."],
    ["Having{sahip olarak} never{asla} seen{görmek} anything{hiçbir şey} else{başka}, they{} treat{saymak} the{} shadows{gölgeler} as{olarak} the{} whole{bütün} of{} reality{gerçeklik}.", "Hiç başka bir şey görmedikleri için gölgeleri gerçekliğin bütünü sayarlar."],
    ["The{} image{imge} is{} short{kısa}, yet{yine de} it{} contains{içerir} a{} complete{tam} theory{teori} of{} how{nasıl} minds{zihinler} change{değişir}.", "İmge kısadır, yine de zihinlerin nasıl değiştiğine dair eksiksiz bir kuram içerir."],
    ["It{} is{} usually{genellikle} taught{öğretilmek} to{-e} first{ilk} year{yıl} students{öğrenciler} for{için} this{bu} reason{neden}.", "Bu nedenle genellikle birinci sınıf öğrencilerine öğretilir."],
  ],
  [
    ["Commentators{yorumcular} have{} long{uzun süredir} disagreed{aynı fikirde olmamak} about{hakkında} what{ne} the{} story{hikâye} is{} really{gerçekten} about{hakkında}.", "Yorumcular hikâyenin gerçekte ne hakkında olduğu konusunda uzun süredir anlaşamıyor."],
    ["One{bir} tradition{gelenek} reads{okur} it{} through{aracılığıyla} an{} epistemological{epistemolojik} lens{mercek}: the{} cave{mağara} represents{temsil eder} the{} limits{sınırlar} of{} ordinary{olağan} perception{algı}, and{} the{} ascent{yükseliş} describes{tanımlar} how{nasıl} the{} mind{zihin} advances{ilerler} from{-den} mere{salt} opinion{görüş} towards{doğru} genuine{gerçek} knowledge{bilgi}.", "Bir gelenek onu epistemolojik bir mercekten okur: mağara olağan algının sınırlarını temsil eder, yükseliş ise zihnin salt görüşten gerçek bilgiye doğru nasıl ilerlediğini anlatır."],
    ["Another{başka bir} tradition{gelenek} prefers{tercih eder} a{} political{siyasi} reading{okuma}: the{} prisoners{mahkûmlar} resemble{benzemek} citizens{vatandaşlar} who{ki onlar} accept{kabul etmek} the{} beliefs{inançlar} of{} their{onların} society{toplum} without{-meden} question{sorgu}, and{} the{} freed{özgür kalan} prisoner{mahkûm}, who{ki o} returns{döner} to{-e} be{olmak} ridiculed{alay edilmek}, resembles{benzemek} a{} philosopher{filozof} in{} a{} hostile{düşmanca} city{şehir}.", "Başka bir gelenek siyasi bir okumayı tercih eder: mahkûmlar toplumlarının inançlarını sorgulamadan kabul eden vatandaşlara, geri dönüp alay edilen özgür kalmış mahkûm ise düşmanca bir şehirdeki filozofa benzer."],
    ["Each{her} side{taraf} can{-ebilir} quote{alıntılamak} the{} text{metin} in{} its{onun} own{kendi} favour{lehine}.", "Her iki taraf da metni kendi lehine alıntılayabilir."],
  ],
  [
    ["The{} two{iki} readings{okumalar} need{ihtiyaç duymak} not{değil} compete{rekabet etmek}.", "İki okumanın birbiriyle rekabet etmesi gerekmez."],
    ["A{} careful{dikkatli} reader{okuyucu} may{-ebilir} conclude{sonuca varmak} that{ki} Plato{Platon} intended{amaçladı} more{daha fazla} than{-den} one{bir} lesson{ders}.", "Dikkatli bir okuyucu Platon'un birden fazla ders amaçladığı sonucuna varabilir."],
    ["That{o} possibility{olasılık} makes{yapar} the{} passage{pasaj} richer{daha zengin}, not{değil} weaker{daha zayıf}.", "Bu olasılık pasajı daha zayıf değil, daha zengin yapar."],
    ["Plato{Platon} himself{kendisi} presents{sunar} the{} image{imge} as{olarak} a{} comparison{karşılaştırma} between{arasında} the{} effect{etki} of{} education{eğitim} and{} the{} lack{eksiklik} of{} it{} on{üzerindeki} our{bizim} nature{doğa}, a{} theme{tema} broad{geniş} enough{yeterince} to{-mek} hold{tutmak} both{ikisi de} a{} theory{teori} of{} knowledge{bilgi} and{} a{} view{görüş} of{} politics{siyaset}.", "Platon imgeyi kendisi, eğitimin ve eğitimsizliğin doğamız üzerindeki etkisi arasında bir karşılaştırma olarak sunar; bu, hem bir bilgi kuramını hem de bir siyaset görüşünü barındıracak kadar geniş bir temadır."],
    ["Perhaps{belki} that{o} breadth{genişlik} explains{açıklar} why{neden} the{} cave{mağara} still{hâlâ} returns{geri dönmek} whenever{-dığında} people{insanlar} ask{sormak} how{nasıl} much{ne kadar} of{} what{ne} they{} believe{inanmak} they{} have{} actually{gerçekten} examined{incelemek}.", "Belki de bu genişlik, insanlar inandıklarının ne kadarını gerçekten incelediklerini sorduklarında mağaranın neden hâlâ geri döndüğünü açıklar."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-plato-two-lenses", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const plato = "Plato, Republic VII (514a-520a), Mağara Alegorisi (Jowett çevirisi, ders notu PDF); https://scholar.harvard.edu/sites/scholar.harvard.edu/files/seyer/files/plato_republic_514b-518d_allegory-of-the-cave.pdf";

export default {
  slug: "c1-plato-two-lenses", level: "C1", title: "Two Ways to Read a Cave", topic: "Felsefe", sortOrder: 13, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly concerned with?", evidence: ev(1, "Commentators have long disagreed about what the story is really about."), options: [
      option("o1", "Two rival readings of one image", true, null, "Metin mağara alegorisinin iki farklı okumasını tartışır."),
      option("o2", "Plato's reasons for writing the Republic", false, "notstated", "Devlet'in yazılış nedenleri anlatılmaz."),
      option("o3", "A proof that the cave really existed", false, "reverse", "Alegori gerçek bir mağara değildir."),
      option("o4", "A comparison of Plato with other thinkers", false, "notstated", "Başka düşünürler anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "How does the political reading treat the freed prisoner?", evidence: ev(1, "the freed prisoner, who returns to be ridiculed, resembles a philosopher in a hostile city"), options: [
      option("o1", "As a philosopher in a hostile city", true, null, "Metin bunu açıkça söyler."),
      option("o2", "As a ruler who punishes all the others", false, "notstated", "Cezalandırma anlatılmaz."),
      option("o3", "As a guard who protects the great fire", false, "notstated", "Muhafız yoktur."),
      option("o4", "As a teacher paid by the prisoners here", false, "notstated", "Ücretli öğretmen yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “durable” mean in the first paragraph?", evidence: ev(0, "Few philosophical images have proved as durable as the allegory of the cave"), options: [
      option("o1", "Lasting for a long time", true, null, "Durable, uzun süre dayanan demektir."),
      option("o2", "Difficult to understand fully", false, "context", "Anlaşılırlıkla ilgili değildir."),
      option("o3", "Easy to change or replace", false, "reverse", "Tersini anlatır."),
      option("o4", "Recently written and widely read", false, "context", "Yenilik değil süreklilik anlatılır."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final sentence suggest about the allegory's appeal?", evidence: ev(2, "Perhaps that breadth explains why the cave still returns whenever people ask how much of what they believe they have actually examined."), options: [
      option("o1", "It speaks to a recurring question.", true, null, "Cümle, mağaranın hep geri dönen bir soruya hitap ettiğini ima eder."),
      option("o2", "It was ignored until modern times.", false, "notstated", "Böyle bir zaman bilgisi yoktur."),
      option("o3", "It gives final answers to all questions.", false, "extreme", "Metin bunu söylemez."),
      option("o4", "It is mainly useful for teaching geography.", false, "notstated", "Coğrafya anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Platon'un Devlet'inde (Kitap VII, 514a-520a) mağara alegorisi: çocukluktan beri zincirli mahkûmlar arkalarındaki ateşin duvara düşürdüğü gölgeleri gerçeklik sanır.", source: plato, checkedOn: "2026-11-23" },
    { claim: "Platon alegoriyi eğitimin ve eğitimsizliğin doğamız üzerindeki etkisini karşılaştıran bir imge olarak sunar; yorumcular onu epistemolojik ya da siyasi (politeia) bir mercekten okur.", source: plato, checkedOn: "2026-11-23" },
  ] },
};
