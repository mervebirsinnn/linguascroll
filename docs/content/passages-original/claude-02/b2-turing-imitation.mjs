import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} nineteen{on dokuz} fifty{elli}, the{} British{İngiliz} mathematician{matematikçi} Alan{Alan} Turing{Turing} published{yayımladı} a{} paper{makale} that{ki} opened{açtı} with{ile} a{} deceptively{aldatıcı biçimde} simple{basit} question{soru}: can{-ebilir mi} machines{makineler} think{düşünmek}?", "1950'de İngiliz matematikçi Alan Turing, aldatıcı biçimde basit bir soruyla açılan bir makale yayımladı: makineler düşünebilir mi?"],
    ["Because{çünkü} the{} words{sözcükler} think{düşünmek} and{} machine{makine} are{} hard{zor} to{-mek} define{tanımlamak}, he{} proposed{önerdi} replacing{yerine koymak} the{} question{soru} with{ile} a{} practical{pratik} test{test}.", "Düşünmek ve makine sözcüklerini tanımlamak zor olduğundan soruyu pratik bir testle değiştirmeyi önerdi."],
    ["He{} called{adlandırdı (call it: ... dedi)} it{o} the{} imitation{taklit} game{oyun}.", "Ona taklit oyunu adını verdi."],
    ["He{} wrote{yazdı} it{} when{-dığında} electronic{elektronik} computers{bilgisayarlar} were{} still{hâlâ} very{çok} new{yeni}.", "Bunu elektronik bilgisayarlar hâlâ çok yeniyken yazdı."],
  ],
  [
    ["In{-de} the{} game{oyun}, an{} interrogator{sorgulayıcı} sits{oturur} in{} one{bir} room{oda} and{} exchanges{değiş tokuş eder} written{yazılı} messages{mesajlar} with{ile} two{iki} hidden{gizli} players{oyuncular}.", "Oyunda bir sorgulayıcı bir odada oturur ve gizli iki oyuncuyla yazılı mesaj alışverişi yapar."],
    ["One{biri} is{} a{} person{kişi}; the{} other{diğeri} is{} a{} machine{makine}.", "Biri bir insandır, diğeri bir makine."],
    ["If{eğer} the{} interrogator{sorgulayıcı} cannot{-amaz} reliably{güvenilir biçimde} tell{ayırt etmek} them{onları} apart{ayrı}, the{} machine{makine} is{} said{söylenir} to{-mek} have{} passed{geçmek}.", "Sorgulayıcı onları güvenilir biçimde ayırt edemezse makinenin testi geçtiği söylenir."],
    ["Notice{dikkat et} that{ki} the{} test{test} measures{ölçer} behaviour{davranış}, not{değil} inner{iç} experience{deneyim}.", "Testin içsel deneyimi değil, davranışı ölçtüğüne dikkat et."],
    ["The{} idea{fikir} is{} that{ki} if{eğer} conversation{konuşma} alone{tek başına} cannot{-amaz} reveal{ortaya çıkarmak} the{} difference{fark}, then{o zaman} the{} machine{makine} deserves{hak etmek} to{-mek} be{olmak} taken{alınmak} seriously{ciddiye}.", "Fikir şudur: konuşma tek başına farkı ortaya çıkaramıyorsa makine ciddiye alınmayı hak eder."],
  ],
  [
    ["That{o} distinction{ayrım} explains{açıklar} why{neden} the{} test{test} remains{kalır} controversial{tartışmalı}.", "Bu ayrım testin neden hâlâ tartışmalı olduğunu açıklar."],
    ["A{} program{program} might{-ebilir} produce{üretmek} convincing{ikna edici} replies{yanıtlar} without{-meden} understanding{anlamak} anything{hiçbir şey} it{} says{söyler}.", "Bir program, söylediği hiçbir şeyi anlamadan ikna edici yanıtlar üretebilir."],
    ["Even{bile} so{öyle olsa da}, the{} proposal{öneri} changed{değiştirdi} the{} debate{tartışma}, because{çünkü} it{} replaced{yerini aldı} an{} endless{bitmez} argument{tartışma} about{hakkında} definitions{tanımlar} with{ile} something{bir şey} that{ki} could{-ebilirdi} be{olmak} tried{denenmiş} in{} practice{uygulama}.", "Yine de öneri tartışmayı değiştirdi, çünkü tanımlar hakkındaki bitmek bilmeyen bir tartışmanın yerine uygulamada denenebilecek bir şey koydu."],
    ["Later{daha sonra} researchers{araştırmacılar} have{} proposed{önerdi} many{birçok} variations{varyasyonlar}, but{ama} the{} original{özgün} setup{kurgu} is{} still{hâlâ} the{} best{en iyi} known{bilinen}.", "Sonraki araştırmacılar birçok varyasyon önerdi ama özgün kurgu hâlâ en bilinenidir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-turing-imitation", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const turing = "A. M. Turing, Computing Machinery and Intelligence, Mind 59(236), 1950, ss. 433-460; https://doi.org/10.1093/mind/LIX.236.433";

export default {
  slug: "b2-turing-imitation", level: "B2", title: "Replacing a Hard Question", topic: "Yapay zeka", sortOrder: 15, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "he proposed replacing the question with a practical test"), options: [
      option("o1", "A practical test for machines", true, null, "Metin Turing'in düşünme sorusunu pratik bir testle değiştirmesini anlatır."),
      option("o2", "A machine that has proved it can think", false, "reverse", "Metin bunu kanıtlanmış saymaz."),
      option("o3", "A rule that bans machines from speaking", false, "reverse", "Böyle bir kural yoktur."),
      option("o4", "A history of early British computers", false, "notstated", "Bilgisayar tarihi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the interrogator in the game do?", evidence: ev(1, "an interrogator sits in one room and exchanges written messages with two hidden players"), options: [
      option("o1", "Writes messages to two hidden players", true, null, "Metin bunu açıkça söyler."),
      option("o2", "Builds a machine while the others watch", false, "notstated", "Makine yapımı anlatılmaz."),
      option("o3", "Speaks aloud to a crowd of observers", false, "notstated", "Konuşma yazılıdır, kalabalık yoktur."),
      option("o4", "Reads a long paper about thinking machines", false, "context", "Makale Turing'e aittir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “controversial” mean in the last paragraph?", evidence: ev(2, "the test remains controversial"), options: [
      option("o1", "Causing disagreement among people", true, null, "Controversial, tartışma yaratan demektir."),
      option("o2", "Simple and accepted by everyone", false, "reverse", "Tersini anlatır."),
      option("o3", "Easy to carry out in a small room", false, "context", "Oda ayrıntısı geçer ama kelime bunu demez."),
      option("o4", "Written in a clear and formal style", false, "notstated", "Üslupla ilgili değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final paragraph imply about the test's lasting value?", evidence: findEvidence(paragraphs, "the proposal changed the debate, because it replaced an endless argument about definitions with something that could be tried in practice"), options: [
      option("o1", "Its value lies in being testable", true, null, "Önerinin değeri, tartışmanın yerine denenebilir bir şey koymasıdır."),
      option("o2", "Its value lies in settling the question", false, "reverse", "Metin tartışmanın çözülmediğini söyler."),
      option("o3", "Its value lies in defining thought exactly", false, "reverse", "Tanım tartışması bilerek aşılmıştı."),
      option("o4", "Its value lies in avoiding all argument", false, "extreme", "Metin tartışmayı ortadan kaldırmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Alan Turing 1950'de Mind dergisindeki 'Computing Machinery and Intelligence' makalesinde 'makineler düşünebilir mi?' sorusunu, 'düşünmek' ve 'makine' sözcüklerinin tanımı zor olduğu için taklit oyunu adlı pratik bir testle değiştirmeyi önerdi.", source: turing, checkedOn: "2026-11-23" },
    { claim: "Oyunda bir sorgulayıcı, ayrı yerlerdeki bir insan ve bir makineyle yazılı iletişim kurar; ikisini ayırt edemezse makine testi geçmiş sayılır.", source: turing, checkedOn: "2026-11-23" },
  ] },
};
