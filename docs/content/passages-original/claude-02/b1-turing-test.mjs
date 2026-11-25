import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} nineteen{on dokuz} fifty{elli}, a{} British{İngiliz} scientist{bilim insanı} named{adlı} Alan{Alan} Turing{Turing} asked{sordu} a{} simple{basit} question{soru}: can{-ebilir mi} machines{makineler} think{düşünmek}?", "1950'de Alan Turing adlı İngiliz bir bilim insanı basit bir soru sordu: makineler düşünebilir mi?"],
    ["He{} wrote{yazdı} about{hakkında} it{} in{} a{} famous{ünlü} paper{makale}.", "Bunu ünlü bir makalede yazdı."],
    ["Turing{Turing} thought{düşündü} that{ki} the{} question{soru} about{hakkındaki} thinking{düşünme} was{} too{fazla} difficult{zor} to{-mek için} answer{cevaplamak} directly{doğrudan}.", "Turing, düşünme hakkındaki sorunun doğrudan cevaplanamayacak kadar zor olduğunu düşündü."],
    ["The{} question{soru} was{} hard{zor}, so{bu yüzden} he{} suggested{önerdi} a{} game{oyun}.", "Soru zordu, bu yüzden bir oyun önerdi."],
  ],
  [
    ["In{-de} the{} game{oyun}, a{} person{kişi} writes{yazar} messages{mesajlar} to{-e} two{iki} players{oyuncular} in{} other{başka} rooms{odalar}.", "Oyunda bir kişi, başka odalardaki iki oyuncuya mesaj yazar."],
    ["The{} person{kişi} cannot{-amaz} see{görmek} the{} players{oyuncular}, so{bu yüzden} only{yalnızca} the{} words{sözcükler} on{üzerindeki} the{} page{sayfa} give{vermek} clues{ipuçları}.", "Kişi oyuncuları göremez, bu yüzden yalnızca sayfadaki sözcükler ipucu verir."],
    ["One{biri} player{oyuncu} is{} a{} human{insan}, and{} the{} other{diğeri} is{} a{} machine{makine}.", "Oyunculardan biri insan, diğeri makinedir."],
    ["If{eğer} the{} person{kişi} cannot{-amaz} tell{söylemek} which{hangisi} is{} which{hangisi}, the{} machine{makine} has{-miştir (yardımcı fiil)} done{yaptı} well{iyi}.", "Kişi hangisinin hangisi olduğunu söyleyemezse, makine iyi iş çıkarmış demektir."],
    ["Turing{Turing} called{adlandırdı (call it: ... dedi)} it{o} the{} imitation{taklit} game{oyun}.", "Turing buna taklit oyunu dedi."],
  ],
  [
    ["Today{bugün}, people{insanlar} call{adlandırmak (call it: ... demek)} it{o} the{} Turing{Turing} test{test}.", "Bugün insanlar ona Turing testi der."],
    ["It{} does{-mez (olumsuz yardımcı fiil)} not{} prove{kanıtlamak} that{ki} a{} machine{makine} really{gerçekten} understands{anlar} us{bizi}.", "Bir makinenin bizi gerçekten anladığını kanıtlamaz."],
    ["However{ancak}, it{} gave{verdi} scientists{bilim insanları} a{} clear{net} way{yol} to{-mek} talk{konuşmak} about{hakkında} intelligent{akıllı} machines{makineler}.", "Ancak bilim insanlarına akıllı makineler hakkında konuşmak için net bir yol verdi."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-turing-test", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const turing = "A. M. Turing, Computing Machinery and Intelligence, Mind 59(236), 1950, ss. 433-460; https://doi.org/10.1093/mind/LIX.236.433";

export default {
  slug: "b1-turing-test", level: "B1", title: "Can a Machine Fool You?", topic: "Yapay zeka", sortOrder: 15, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "If the person cannot tell which is which, the machine has done well."), options: [
      option("o1", "A game to test machines", true, null, "Metin Turing'in makineleri sınama oyununu anlatır."),
      option("o2", "Why computers can never think", false, "extreme", "Metin böyle bir kesinlik söylemez."),
      option("o3", "How Turing built the first machine", false, "notstated", "Makine yapımı anlatılmaz."),
      option("o4", "How judges write books about machines", false, "notstated", "Kitap yazımı anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What is the person in the game trying to tell apart?", evidence: findEvidence(paragraphs, "If the person cannot tell which is which, the machine has done well."), options: [
      option("o1", "The human and the machine", true, null, "Kişi hangisinin insan, hangisinin makine olduğunu ayırt etmeye çalışır."),
      option("o2", "The fast and the slow players", false, "notstated", "Hız karşılaştırması anlatılmaz."),
      option("o3", "The two rooms in the building", false, "context", "Odalar geçer ama ayırt edilen şey odalar değildir."),
      option("o4", "The first and the last messages", false, "notstated", "Mesaj sırası anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “imitation” mean here?", evidence: findEvidence(paragraphs, "Turing called it the imitation game."), options: [
      option("o1", "Copying how someone acts", true, null, "Imitation, birinin davranışını taklit etmektir."),
      option("o2", "Beating someone in a contest", false, "context", "Oyun geçer ama imitation kazanmak demek değildir."),
      option("o3", "Hiding from the other players", false, "context", "Saklanma anlatılmaz."),
      option("o4", "Explaining a rule very clearly", false, "notstated", "Kural açıklaması anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the last paragraph suggest?", evidence: ev(2, "It does not prove that a machine really understands us. However, it gave scientists a clear way to talk about intelligent machines."), options: [
      option("o1", "Passing the test means a machine truly thinks.", false, "reverse", "Metin bunun kanıtlanmadığını söyler."),
      option("o2", "The test was useful but not perfect.", true, null, "Test kanıt sağlamıyor ama tartışmak için net bir yol veriyor."),
      option("o3", "No scientist ever used the test.", false, "extreme", "Test bilim insanlarına yol verdi."),
      option("o4", "The test needs ten different rooms.", false, "notstated", "Oda sayısı on değildir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Alan Turing 1950'de Mind dergisinde 'Computing Machinery and Intelligence' makalesinde 'makineler düşünebilir mi?' sorusunu ele aldı ve bir taklit oyunu önerdi: bir sorgulayıcı, ayrı odalardaki bir insan ve bir makineyle yazılı iletişim kurar.", source: turing, checkedOn: "2026-11-23" },
  ] },
};
