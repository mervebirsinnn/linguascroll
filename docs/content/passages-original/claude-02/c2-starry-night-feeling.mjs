import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Few{az} paintings{tablolar} are{} as{kadar} widely{yaygın biçimde} reproduced{çoğaltılmak} as{} The{} Starry{yıldızlı} Night{gece}, and{} fewer{daha az} still{hâlâ} are{} as{} widely{yaygın biçimde} misdescribed{yanlış tanımlanmak}.", "Çok az tablo Yıldızlı Gece kadar yaygın biçimde çoğaltılır ve daha da azı bu kadar yaygın biçimde yanlış tanımlanır."],
    ["This{bu} essay{deneme} argues{savunmak} for{için} a{} different{farklı} emphasis{vurgu}.", "Bu deneme farklı bir vurgu savunur."],
    ["It{} is{} frequently{sıklıkla} presented{sunmak} as{olarak} the{} spontaneous{kendiliğinden} outpouring{taşma} of{} a{} troubled{sıkıntılı} mind{zihin}, a{} view{görüş} that{ki} flatters{pohpohlamak} our{bizim} taste{zevk} for{için} romantic{romantik} legends{efsaneler} but{ama} fits{uymak} the{} evidence{kanıt} poorly{kötü}.", "Sıklıkla sıkıntılı bir zihnin kendiliğinden taşması olarak sunulur; bu görüş romantik efsanelere olan zevkimizi pohpohlar ama kanıta kötü uyar."],
  ],
  [
    ["The{} Museum{Müze} of{} Modern{Modern} Art{Sanat}, which{ki o} owns{sahip olmak} the{} canvas{tuval}, offers{sunmak} a{} more{daha} careful{dikkatli} account{anlatım}.", "Tuvale sahip olan Modern Sanat Müzesi daha dikkatli bir anlatım sunar."],
    ["Van{van} Gogh{Gogh} painted{boyadı} it{} in{} mid{orta}-June{Haziran} of{} eighteen{on sekiz} eighty{seksen} nine{dokuz}, in{-de} the{} course{süre} of{} roughly{kabaca} twelve{on iki} months{ay} spent{harcamak} at{-de} the{} Saint{Saint}-Paul{Paul}-de{de}-Mausole{Mausole} asylum{akıl hastanesi} in{} Saint{Saint}-Remy{Remy}, where{ki orada} he{} had{} sought{aramak} relief{rahatlama} from{-den} his{} mental{zihinsel} illness{hastalık}.", "Van Gogh onu, zihinsel hastalığından rahatlama aradığı Saint-Rémy'deki Saint-Paul-de-Mausole akıl hastanesinde geçirdiği kabaca on iki ay boyunca, Haziran 1889'un ortasında boyadı."],
    ["The{} composition{kompozisyon} was{} inspired{esinlenmek} by{tarafından} the{} view{manzara} from{-den} his{} window{pencere} but{ama} depends{bağlı olmak} equally{eşit derecede} on{-e} imagination{hayal gücü}, memory{bellek} and{} emotion{duygu}.", "Kompozisyon penceresinden görünen manzaradan esinlenmiştir ama eşit derecede hayal gücüne, belleğe ve duyguya bağlıdır."],
    ["The{} asylum{akıl hastanesi} years{yıllar} were{} difficult{zor}, yet{yine de} they{} were{} also{ayrıca} productive{üretken}, and{} the{} two{iki} facts{olgular} should{-meli} be{olmak} held{tutmak} together{birlikte}.", "Akıl hastanesi yılları zordu ama aynı zamanda üretkendi ve bu iki olgu birlikte düşünülmelidir."],
  ],
  [
    ["That{o} blend{karışım} is{} the{} key{anahtar} to{-e} its{onun} effect{etki}.", "O karışım etkisinin anahtarıdır."],
    ["The{} village{köy} beneath{altında} the{} sky{gökyüzü} is{} not{} a{} record{kayıt} but{ama} an{} invention{icat}, and{} the{} cypress{selvi} that{ki} rises{yükselmek} in{} the{} foreground{ön plan} behaves{davranmak} less{daha az} like{gibi} a{} tree{ağaç} than{-den} like{gibi} a{} gesture{jest}.", "Gökyüzünün altındaki köy bir kayıt değil bir icattır; ön planda yükselen selvi ise bir ağaçtan çok bir jest gibi davranır."],
    ["Even{bile} the{} celebrated{ünlü} sky{gökyüzü}, with{ile} its{onun} thick{kalın} swirling{dönen} strokes{fırça darbeleri}, seems{görünmek} to{-mek} record{kaydetmek} how{nasıl} the{} night{gece} felt{hissettirmek} rather{yerine (rather than)} than{yerine (rather than)} how{nasıl} it{} looked{görünmek}.", "Kalın, dönen fırça darbeleriyle ünlü gökyüzü bile, gecenin nasıl göründüğünden çok nasıl hissettirdiğini kaydediyor gibi görünür."],
    ["Such{böyle} choices{seçimler} are{} the{} signature{imza} of{} a{} painter{ressam} in{} command{hâkimiyet} of{} his{} material{malzeme}.", "Bu tür seçimler, malzemesine hâkim bir ressamın imzasıdır."],
  ],
  [
    ["Why{neden} does{} the{} distinction{ayrım} matter{önemli olmak}?", "Bu ayrım neden önemlidir?"],
    ["If{eğer} we{biz} read{okumak} the{} painting{tablo} as{olarak} a{} symptom{belirti}, we{biz} reduce{indirgemek} deliberate{kasıtlı} artistic{sanatsal} choices{seçimler} to{-e} an{} accident{kaza} of{} illness{hastalık}.", "Tabloyu bir belirti olarak okursak kasıtlı sanatsal seçimleri bir hastalık kazasına indirgemiş oluruz."],
    ["If{eğer}, instead{bunun yerine}, we{biz} read{okumak} it{} as{olarak} a{} composition{kompozisyon}, we{biz} can{-ebilir} admire{hayran olmak} the{} control{denetim} behind{arkasındaki} the{} apparent{görünürdeki} turbulence{çalkantı}.", "Bunun yerine onu bir kompozisyon olarak okursak görünürdeki çalkantının ardındaki denetime hayran olabiliriz."],
    ["The{} second{ikinci} reading{okuma} respects{saygı duymak} both{ikisi de} the{} artist{sanatçı} and{} the{} work{eser}.", "İkinci okuma hem sanatçıya hem esere saygı duyar."],
    ["That{o} is{} a{} more{daha} generous{cömert} and{} a{} more{daha} accurate{doğru} way{yol} to{-mek} look{bakmak}.", "Bu, bakmanın daha cömert ve daha doğru bir yoludur."],
  ],
  [
    ["None{hiçbiri} of{} this{bu} denies{inkâr etmek} that{ki} Van{van} Gogh{Gogh} suffered{acı çekmek}.", "Bunların hiçbiri Van Gogh'un acı çektiğini inkâr etmez."],
    ["It{} simply{sadece} insists{ısrar etmek} that{ki} suffering{acı} does{} not{} explain{açıklamak} skill{beceri}, and{} that{ki} the{} sky{gökyüzü} we{biz} admire{hayran olmak} was{} made{yapılmak} by{tarafından} a{} painter{ressam} thinking{düşünmek} as{olarak} hard{sıkı} as{} he{} was{} feeling{hissetmek}.", "Yalnızca acının beceriyi açıklamadığında ve hayran olduğumuz gökyüzünün, hissettiği kadar sıkı düşünen bir ressam tarafından yapıldığında ısrar eder."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-starry-night-feeling", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const moma = "MoMA, Vincent van Gogh, The Starry Night, 1889 (koleksiyon kaydı); https://www.moma.org/collection/works/79802";

export default {
  slug: "c2-starry-night-feeling", level: "C2", title: "More Than a Symptom", topic: "Sanat", sortOrder: 14, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best summarises the author's position?", evidence: ev(3, "If we read the painting as a symptom, we reduce deliberate artistic choices to an accident of illness."), options: [
      option("o1", "It reflects skill, not just illness", true, null, "Metin tablonun beceri ve kasıtlı seçimlerle yapıldığını savunur."),
      option("o2", "The painting records the view exactly", false, "reverse", "Köy ve selvi icat olarak sunulur."),
      option("o3", "Illness fully explains the painting's style", false, "reverse", "Metin bunu açıkça reddeder."),
      option("o4", "Van Gogh's technique was largely accidental", false, "reverse", "Metin kasıtlı seçimleri vurgular."),
    ] },
    { key: "q2", type: "detail", prompt: "When and where was the painting made?", evidence: findEvidence(paragraphs, "painted it in mid-June of eighteen eighty nine, in the course of roughly twelve months spent at the Saint-Paul-de-Mausole asylum in Saint-Remy"), options: [
      option("o1", "In June eighteen eighty nine, at an asylum", true, null, "Metin Haziran 1889 ve akıl hastanesini söyler."),
      option("o2", "In June eighteen eighty nine, at a studio in Paris", false, "detail", "Tarih doğru, yer yanlış."),
      option("o3", "In the autumn of eighteen eighty nine, at the asylum", false, "detail", "Yer doğru, mevsim yanlış."),
      option("o4", "In June eighteen ninety, at the asylum", false, "detail", "Yer doğru, yıl yanlış."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “flatters” mean in the first paragraph?", evidence: ev(0, "a view that flatters our taste for romantic legends"), options: [
      option("o1", "Pleases by agreeing with", true, null, "Flatter, hoşa gidecek biçimde uymak, pohpohlamak demektir."),
      option("o2", "Makes smoother and thinner", false, "sound", "Flat sözcüğünden gelen yanıltıcı anlamdır."),
      option("o3", "Criticises in strong terms", false, "reverse", "Tersini anlatır."),
      option("o4", "Ignores without comment", false, "notstated", "Görmezden gelme anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What assumption does the author attribute to the “outpouring” view?", evidence: findEvidence(paragraphs, "the spontaneous outpouring of a troubled mind"), options: [
      option("o1", "That illness, rather than skill, produced it", true, null, "Yazar bu görüşün kasıtlı seçimleri hastalığa indirgediğini söyler."),
      option("o2", "That the painter followed a careful plan", false, "reverse", "Kendiliğinden taşma görüşü planlı çalışmanın tersini varsayar."),
      option("o3", "That he painted it from memory in a quiet studio", false, "notstated", "Böyle bir varsayım anlatılmaz."),
      option("o4", "That he had been trained by older artists", false, "notstated", "Eğitim konusu anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "The Starry Night Haziran 1889 ortasında, van Gogh'un Saint-Rémy'deki Saint-Paul-de-Mausole akıl hastanesinde (zihinsel hastalığından rahatlama aradığı) yaklaşık on iki ayı sırasında yapıldı; MoMA (New York) koleksiyonundadır.", source: moma, checkedOn: "2026-11-23" },
    { claim: "Tablo penceresinden görünen manzaradan esinlenir; doğrudan gözlemin yanında hayal gücü, anılar ve duygulara dayanır.", source: moma, checkedOn: "2026-11-23" },
  ] },
};
