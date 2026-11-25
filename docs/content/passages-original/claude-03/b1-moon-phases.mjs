import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} Moon{Ay} does{} not{} make{üretmek} its{} own{kendi} light{ışık}.", "Ay kendi ışığını üretmez."],
    ["It{} shines{parlamak} because{çünkü} it{} reflects{yansıtmak} light{ışık} from{-den} the{} Sun{Güneş}.", "Güneş'ten gelen ışığı yansıttığı için parlar."],
    ["At{} any{herhangi bir} time{zaman}, the{} Sun{Güneş} lights{aydınlatmak} up{(light up) aydınlatmak} half{yarı} of{} the{} Moon{Ay}.", "Her an Güneş, Ay'ın yarısını aydınlatır."],
    ["But{} from{-den} Earth{Dünya}, we{} usually{genellikle} see{görmek} only{yalnızca} part{kısım} of{} that{o} bright{parlak} half{yarı}.", "Ama Dünya'dan genellikle o parlak yarının yalnızca bir kısmını görürüz."],
  ],
  [
    ["The{} Moon{Ay} travels{dolaşmak} around{etrafında} Earth{Dünya} about{yaklaşık} once{bir kez} a{} month{ay}.", "Ay, Dünya'nın etrafında yaklaşık ayda bir kez dolaşır."],
    ["As{-dikçe} it{} moves{hareket etmek}, the{} bright{parlak} part{kısım} that{ki} we{} can{-ebilir} see{görmek} changes{değiştirmek} shape{şekil}.", "Ay hareket ettikçe görebildiğimiz parlak kısmın şekli değişir."],
    ["These{} shapes{şekiller} are{} called{adlandırılır} phases{evreler}.", "Bu şekillere evre denir."],
    ["During{sırasında} a{} new{yeni} moon{ay}, the{} Moon{Ay} is{} in{} the{} same{aynı} direction{yön} as{} the{} Sun{Güneş}, so{bu yüzden} we{} see{görmek} almost{neredeyse} nothing{hiçbir şey}.", "Yeni ay sırasında Ay, Güneş ile aynı yöndedir, bu yüzden neredeyse hiçbir şey görmeyiz."],
    ["About{yaklaşık} two{iki} weeks{haftalar} later{sonra}, the{} Moon{Ay} is{} on{} the{} opposite{karşı} side{taraf} of{} Earth{Dünya}, away{uzakta} from{-den} the{} Sun{Güneş}, so{bu yüzden} we{} see{görmek} a{} full{dolu} moon{ay}.", "Yaklaşık iki hafta sonra Ay, Dünya'nın Güneş'ten uzak olan karşı tarafındadır, bu yüzden dolunayı görürüz."],
  ],
  [
    ["Many{birçok} people{insanlar} think{düşünmek} that{ki} Earth's{Dünya'nın} shadow{gölge} causes{neden olmak} the{} phases{evreler}, but{} this{} is{} not{} true{doğru}.", "Birçok insan evrelere Dünya'nın gölgesinin neden olduğunu düşünür ama bu doğru değildir."],
    ["Earth's{Dünya'nın} shadow{gölge} only{yalnızca} falls{düşmek} on{} the{} Moon{Ay} during{sırasında} a{} lunar{Ay} eclipse{tutulma}, which{ki bu} happens{olur} only{yalnızca} a{} few{birkaç} times{kez} a{} year{yıl}.", "Dünya'nın gölgesi Ay'ın üzerine yalnızca bir Ay tutulması sırasında düşer ve bu yılda yalnızca birkaç kez olur."],
    ["The{} whole{tüm} cycle{döngü} of{} phases{evreler} takes{sürmek} about{yaklaşık} 29.5 days{günler}.", "Evrelerin tüm döngüsü yaklaşık 29,5 gün sürer."],
    ["People{insanlar} used{kullandı} this{} regular{düzenli} cycle{döngü} to{-mek için} make{yapmak} some{bazı} of{} the{} first{ilk} calendars{takvimler}.", "İnsanlar bu düzenli döngüyü ilk takvimlerin bazılarını yapmak için kullandı."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-moon-phases", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasaPhases = "NASA Space Place, Moon Phases; https://spaceplace.nasa.gov/moon-phases/en/";
const nasaEclipse = "NASA Science, Eclipses; https://science.nasa.gov/eclipses/";
const natgeo = "National Geographic, World's oldest calendar found in Scotland; https://www.nationalgeographic.com/science/article/130715-worlds-oldest-calendar-lunar-cycle-pits-mesolithic-scotland";

export default {
  slug: "b1-moon-phases", level: "B1", title: "Why the Moon Changes Shape", topic: "Bilim", sortOrder: 41, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "These shapes are called phases."), options: [
      option("o1", "Why the Moon seems to change its shape", true, null, "Metin Ay'ın evrelerini, yani şeklinin neden değişiyor göründüğünü anlatır."),
      option("o2", "How the Moon makes its own bright light", false, "reverse", "Metin Ay'ın kendi ışığını üretmediğini söyler."),
      option("o3", "How people first travelled to the Moon", false, "notstated", "Ay yolculuğu anlatılmaz."),
      option("o4", "Why lunar eclipses happen every single month", false, "reverse", "Metin Ay tutulmasının yılda yalnızca birkaç kez olduğunu söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "What do we see during a new moon?", evidence: ev(1, "so we see almost nothing"), options: [
      option("o1", "Almost nothing of the Moon", true, null, "Metin yeni ayda neredeyse hiçbir şey görmediğimizi söyler."),
      option("o2", "A full circle of bright light", false, "reverse", "Tam parlak daire dolunayda görülür."),
      option("o3", "Earth's shadow covering the Moon", false, "reverse", "Gölge evrelere neden olmaz; yalnızca Ay tutulmasında düşer."),
      option("o4", "The Moon making its own light", false, "reverse", "Ay kendi ışığını üretmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "reflects" mean in the first paragraph?', evidence: ev(0, "it reflects light from the Sun"), options: [
      option("o1", "Sends light back from its surface", true, null, "Reflect, gelen ışığı geri göndermek, yansıtmak demektir."),
      option("o2", "Makes its own light inside", false, "reverse", "Metin Ay'ın kendi ışığını üretmediğini söyler."),
      option("o3", "Hides light from the Earth", false, "context", "Ay ışığı saklamaz; bu yüzden parlar."),
      option("o4", "Takes light in and keeps it for a long time", false, "context", "Işığın depolandığı söylenmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about a lunar eclipse?", evidence: findEvidence(paragraphs, "Earth's shadow only falls on the Moon during a lunar eclipse, which happens only a few times a year."), options: [
      option("o1", "It does not happen every month.", true, null, "Evre döngüsü her ay tekrarlanırken tutulma yılda yalnızca birkaç kez olduğuna göre her ay yaşanmaz."),
      option("o2", "It happens at every new moon.", false, "reverse", "Tutulma yılda yalnızca birkaç kez olur; her yeni ayda olmaz."),
      option("o3", "It is what causes the phases.", false, "reverse", "Metin gölgenin evrelere neden olmadığını söyler."),
      option("o4", "It happens when the Moon makes light.", false, "context", "Ay kendi ışığını üretmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ay kendi ışığını üretmez, Güneş ışığını yansıtır; her an yarısı aydınlıktır ve Dünya'dan bu yarının değişen bir kısmı görülür.", source: nasaPhases, checkedOn: "2026-11-23" },
    { claim: "Yeni ayda Ay Güneş ile aynı yöndedir; yaklaşık iki hafta sonra Dünya'nın karşı tarafında olduğunda dolunay görülür; evre döngüsü yaklaşık 29,5 gün sürer.", source: nasaPhases, checkedOn: "2026-11-23" },
    { claim: "Evrelere Dünya'nın gölgesi neden olmaz; gölge Ay'a yalnızca Ay tutulmasında düşer ve tutulmalar her ay olmaz.", source: nasaEclipse + "; " + nasaPhases, checkedOn: "2026-11-23" },
    { claim: "Bilinen en eski takvimlerden biri (İskoçya, yaklaşık 10.000 yıl önce) Ay evrelerini ve ay döngüsünü izleyen 12 çukurdan oluşur.", source: natgeo, checkedOn: "2026-11-25" },
  ] },
};
