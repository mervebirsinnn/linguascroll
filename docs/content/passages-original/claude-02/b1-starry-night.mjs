import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} eighteen{on sekiz} eighty{seksen} nine{dokuz}, the{} painter{ressam} Vincent{Vincent} van{van} Gogh{Gogh} lived{yaşadı} in{} a{} hospital{hastane} in{} the{} south{güney} of{} France{Fransa}.", "1889'da ressam Vincent van Gogh, Fransa'nın güneyinde bir hastanede yaşıyordu."],
    ["He{} was{} unwell{hasta}, and{} he{} stayed{kaldı} there{orada} for{boyunca} about{yaklaşık} a{} year{yıl}.", "Hastaydı ve orada yaklaşık bir yıl kaldı."],
    ["The{} hospital{hastane} was{} quiet{sessiz} and{} the{} nights{geceler} were{} long{uzun}.", "Hastane sessizdi ve geceler uzundu."],
    ["From{-den} his{} window{pencere}, he{} could{-ebilirdi} see{görmek} the{} morning{sabah} sky{gökyüzü} before{önce} sunrise{gün doğumu}.", "Penceresinden gün doğumundan önce sabah gökyüzünü görebiliyordu."],
  ],
  [
    ["That{o} view{manzara} gave{verdi} him{ona} the{} idea{fikir} for{için} a{} famous{ünlü} painting{tablo}, The{} Starry{yıldızlı} Night{gece}.", "O manzara ona ünlü tablosu Yıldızlı Gece için fikir verdi."],
    ["In{-de} the{} picture{resim}, big{büyük} stars{yıldızlar} shine{parlar} and{} the{} sky{gökyüzü} moves{hareket eder} in{} bright{parlak} blue{mavi} and{} yellow{sarı} circles{daireler}.", "Resimde büyük yıldızlar parlar ve gökyüzü parlak mavi ve sarı dairelerle hareket eder."],
    ["Under{altında} the{} sky{gökyüzü}, a{} quiet{sessiz} village{köy} sleeps{uyur}.", "Gökyüzünün altında sessiz bir köy uyur."],
    ["Many{birçok} people{insanlar} love{sevmek} this{} picture{resim} because{çünkü} the{} colours{renkler} feel{hissettirmek} so{çok} alive{canlı}.", "Birçok kişi bu resmi seviyor çünkü renkler çok canlı hissettiriyor."],
  ],
  [
    ["Van{van} Gogh{Gogh} did{-medi (olumsuz yardımcı fiil)} not{} only{yalnızca} copy{kopyalamak} what{ne} he{} saw{gördü}.", "Van Gogh sadece gördüğünü kopyalamadı."],
    ["He{} also{ayrıca} used{kullandı} his{} imagination{hayal gücü}, his{} memories{anılar} and{} his{} feelings{duygular}.", "Ayrıca hayal gücünü, anılarını ve duygularını kullandı."],
    ["Today{bugün}, the{} painting{tablo} is{} in{} a{} museum{müze} in{} New{Yeni} York{York}, and{} many{birçok} people{insanlar} come{gelir} to{-e} see{görmek} it{}.", "Bugün tablo New York'taki bir müzede ve birçok kişi onu görmeye geliyor."],
    ["Each{her} visitor{ziyaretçi} sees{görür} something{bir şey} a{} little{biraz} different{farklı}.", "Her ziyaretçi biraz farklı bir şey görür."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-starry-night", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const moma = "MoMA, Vincent van Gogh, The Starry Night, 1889 (koleksiyon kaydı); https://www.moma.org/collection/works/79802";

export default {
  slug: "b1-starry-night", level: "B1", title: "A Sky From a Window", topic: "Sanat", sortOrder: 14, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "That view gave him the idea for a famous painting, The Starry Night."), options: [
      option("o1", "A window view that led to a painting", true, null, "Metin pencere manzarasının tabloya ilham verdiğini anlatır."),
      option("o2", "Why Van Gogh preferred painting people", false, "notstated", "Portre tercihi anlatılmaz."),
      option("o3", "How a hospital was built in France", false, "notstated", "Hastane inşası anlatılmaz."),
      option("o4", "Why a New York museum buys paintings", false, "notstated", "Satın alma anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Where did Van Gogh live in eighteen eighty nine?", evidence: ev(0, "In eighteen eighty nine, the painter Vincent van Gogh lived in a hospital in the south of France."), options: [
      option("o1", "In a French hospital", true, null, "Metin Fransa'nın güneyindeki bir hastaneyi söyler."),
      option("o2", "In a village in New York City", false, "context", "New York tablonun bugünkü yeridir."),
      option("o3", "In a museum near a river", false, "notstated", "Metinde böyle bir yer yok."),
      option("o4", "In a ship near the coast", false, "notstated", "Gemi anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “imagination” mean here?", evidence: findEvidence(paragraphs, "He also used his imagination, his memories and his feelings."), options: [
      option("o1", "Power to picture things", true, null, "Imagination, zihinde şeyler canlandırma gücüdür."),
      option("o2", "Skill at mixing paint well", false, "context", "Boya karıştırma anlatılmaz."),
      option("o3", "Memory of many past events", false, "context", "Anılar ayrı bir sözcük olarak geçer."),
      option("o4", "A feeling of deep sadness", false, "context", "Duygular ayrı bir sözcük olarak geçer."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about the village in the picture?", evidence: ev(2, "Van Gogh did not only copy what he saw. He also used his imagination"), options: [
      option("o1", "It was exactly the same as the real one.", false, "reverse", "Hayal gücünü de kullandığı söylenir."),
      option("o2", "It may come partly from his mind.", true, null, "Van Gogh gördüğünü kopyalamadı; hayal gücünü de kullandı."),
      option("o3", "It was painted by another artist.", false, "notstated", "Başka ressamdan söz edilmez."),
      option("o4", "It was built inside the museum.", false, "notstated", "Böyle bir bilgi yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "The Starry Night 1889'da Saint-Rémy'deki Saint-Paul-de-Mausole akıl hastanesinde, ressamın penceresinden gördüğü manzaradan esinlenerek yapıldı; sanatçı orada yaklaşık on iki ay kaldı.", source: moma, checkedOn: "2026-11-23" },
    { claim: "Tablo van Gogh'un doğrudan gözlemine, hayal gücüne, anılarına ve duygularına dayanır; MoMA koleksiyonundadır.", source: moma, checkedOn: "2026-11-23" },
  ] },
};
