import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["According{-e göre (according to)} to{-e göre (according to)} Plutarch{Plutarkhos}, the{} Athenians{Atinalılar} preserved{korumak} the{} ship{gemi} on{} which{ki onun} Theseus{Theseus} had{} returned{dönmek} from{-den} Crete{Girit}, replacing{değiştirmek} its{} timbers{keresteler} one{bir} by{-er (one by one: teker teker)} one{bir} as{-dıkça} they{} decayed{çürümek}.", "Plutarkhos'a göre Atinalılar, Theseus'un Girit'ten döndüğü gemiyi korudu ve keresteleri çürüdükçe onları teker teker değiştirdi."],
    ["Plutarch{Plutarkhos} adds{eklemek} that{ki} philosophers{filozoflar} used{kullanmak} the{} ship{gemi} as{} an{} example{örnek} in{} debates{tartışmalar} about{hakkında} things{şeyler} that{ki} grow{büyümek}: some{bazıları} held{savunmak} that{ki} it{} remained{kalmak} the{} same{aynı} ship{gemi}, others{diğerleri} that{ki} it{} did{} not{}.", "Plutarkhos, filozofların gemiyi büyüyen şeyler hakkındaki tartışmalarda örnek olarak kullandığını ekler: bazıları onun aynı gemi olarak kaldığını, diğerleri kalmadığını savundu."],
    ["The{} puzzle{bilmece} has{} long{çoktan} outlived{-den uzun yaşamak} the{} timber{kereste}.", "Bilmece keresteden çok daha uzun yaşadı."],
  ],
  [
    ["Thomas{Thomas} Hobbes{Hobbes} later{sonra} added{eklemek} a{} twist{beklenmedik dönemeç} that{ki} makes{kılmak} the{} problem{sorun} far{çok} less{daha az} comfortable{rahat}.", "Thomas Hobbes daha sonra sorunu çok daha az rahat kılan beklenmedik bir dönemeç ekledi."],
    ["Suppose{varsayalım} someone{biri} collected{toplamak} the{} discarded{atılmış} planks{tahtalar} and{} reassembled{yeniden birleştirmek} them{} in{} their{} original{asıl} order{sıra}.", "Birinin atılmış tahtaları toplayıp asıl sıralarıyla yeniden birleştirdiğini varsayalım."],
    ["Now{şimdi} there{orada (there are: vardır)} are{} two{iki} ships{gemiler}, each{her biri} with{} a{} respectable{saygın} claim{iddia}: one{biri} has{sahip olmak} continuity{süreklilik} of{} form{biçim} and{} use{kullanım}, the{} other{diğeri} has{sahip olmak} every{her} original{asıl} piece{parça}.", "Şimdi her biri saygın bir iddiaya sahip iki gemi vardır: biri biçim ve kullanım sürekliliğine, diğeri her asıl parçaya sahiptir."],
    ["Whichever{hangisini} we{} choose{seçmek}, we{} seem{görünmek} to{-mek} surrender{teslim etmek (vazgeçmek)} an{} intuition{sezgi} we{} thought{düşünmek} we{} held{tutmak} firmly{sıkıca}.", "Hangisini seçersek seçelim, sıkıca tuttuğumuzu düşündüğümüz bir sezgiden vazgeçiyor gibiyiz."],
  ],
  [
    ["Philosophers{filozoflar} have{} proposed{önermek} several{birkaç} exits{çıkış yolları}.", "Filozoflar birkaç çıkış yolu önerdi."],
    ["Some{bazıları} say{söylemek} identity{kimlik} over{boyunca} time{zaman} is{} a{} matter{mesele} of{} continuity{süreklilik}, so{bu yüzden} the{} repaired{onarılmış} ship{gemi} wins{kazanmak}.", "Bazıları zaman içindeki kimliğin bir süreklilik meselesi olduğunu söyler; bu yüzden onarılmış gemi kazanır."],
    ["Others{diğerleri} treat{ele almak} the{} question{soru} as{} partly{kısmen} verbal{sözel}: 'same{aynı} ship{gemi}' has{sahip olmak} more{daha fazla} than{-den} one{bir} legitimate{meşru} meaning{anlam}, and{} the{} puzzle{bilmece} merely{yalnızca} forces{zorlamak} us{bizi} to{-meye} notice{fark etmek} which{hangi} one{olan} we{} were{} using{kullanmak}.", "Diğerleri soruyu kısmen sözel sayar: 'aynı gemi' ifadesinin birden fazla meşru anlamı vardır ve bilmece yalnızca hangisini kullandığımızı fark etmeye bizi zorlar."],
    ["A{} more{daha} radical{köklü} view{görüş} holds{savunmak} that{ki} an{} object{nesne} is{} not{} wholly{tamamen} present{mevcut} at{-de} any{herhangi bir} moment{an} but{} is{} spread{yayılmak} out{yayılmak (spread out)} across{boyunca} time{zaman}, much{çok} like{gibi} an{} event{olay}.", "Daha köklü bir görüş, bir nesnenin herhangi bir anda tamamen mevcut olmadığını, tıpkı bir olay gibi zamana yayıldığını savunur."],
  ],
  [
    ["Each{her} answer{yanıt} purchases{satın almak} tidiness{düzenlilik} at{} a{} price{bedel}.", "Her yanıt düzenliliği bir bedel karşılığında satın alır."],
    ["The{} continuity{süreklilik} view{görüş} must{-meli} explain{açıklamak} why{neden} the{} reassembled{yeniden birleştirilmiş} original{asıl} feels{hissettirmek} like{gibi} a{} serious{ciddi} rival{rakip} rather{yerine (rather than)} than{yerine (rather than)} a{} pile{yığın} of{} recycled{geri dönüştürülmüş} wood{tahta}.", "Süreklilik görüşü, yeniden birleştirilmiş aslın neden bir geri dönüştürülmüş tahta yığını yerine ciddi bir rakip gibi hissettirdiğini açıklamalıdır."],
    ["The{} verbal{sözel} view{görüş} risks{riske girmek} implying{ima etmek} that{ki} nothing{hiçbir şey} deep{derin} was{} ever{hiç} at{-de (at stake: tehlikede)} stake{tehlikede olan}, which{ki bu} seems{görünmek} too{fazla} quick{hızlı}: insurance{sigorta} claims{talepler}, museum{müze} labels{etiketler} and{} court{mahkeme} rulings{kararlar} about{hakkında} ownership{mülkiyet} depend{bağlı olmak} on{-e} settling{karara bağlamak} which{hangi} object{nesne} is{} which{hangisi}.", "Sözel görüş, hiçbir derin şeyin tehlikede olmadığını ima etme riskine girer ve bu fazla aceleci görünür: sigorta talepleri, müze etiketleri ve mülkiyetle ilgili mahkeme kararları hangi nesnenin hangisi olduğunu karara bağlamaya dayanır."],
  ],
  [
    ["Perhaps{belki} the{} ship's{geminin} real{gerçek} lesson{ders} concerns{ilgilendirmek} us{bizi} rather{yerine (rather than)} than{yerine (rather than)} the{} vessel{tekne}.", "Belki geminin gerçek dersi tekneyi değil bizi ilgilendirir."],
    ["Many{birçok} of{} our{} cells{hücreler} are{} replaced{yenilenmek} over{boyunca} the{} years{yıllar}, our{} memories{anılar} can{-ebilir} shift{kaymak} as{-dıkça} we{} recall{hatırlamak} them{}, and{} yet{yine de} we{} rarely{nadiren} doubt{kuşku duymak} that{ki} we{} are{} the{} same{aynı} person{kişi} who{ki o} began{başlamak} reading{okumak} this{} paragraph{paragraf}.", "Hücrelerimizin birçoğu yıllar içinde yenilenir, anılarımız hatırladıkça kayabilir, yine de bu paragrafı okumaya başlayan kişiyle aynı kişi olduğumuzdan nadiren kuşku duyarız."],
    ["That{bu} confidence{güven} may{-ebilir} be{} justified{haklı çıkmak}, but{} it{} is{} not{} obviously{açıkça} better{daha iyi} grounded{temellendirilmiş} than{-den} the{} Athenians{Atinalıların}' confidence{güven} in{-e} their{} ship{gemi}.", "Bu güven haklı olabilir, ama Atinalıların gemilerine duyduğu güvenden açıkça daha iyi temellendirilmiş değildir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-ship-of-theseus", rows);
const plutarch = "Plutarch, Life of Theseus, 23 (Loeb ceviri, LacusCurtius); https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Theseus*.html";
const sepIdentity = "Stanford Encyclopedia of Philosophy, Identity Over Time; https://plato.stanford.edu/entries/identity-time/";
const sepParts = "Stanford Encyclopedia of Philosophy, Temporal Parts; https://plato.stanford.edu/entries/temporal-parts/";
const cells = "Spalding KL ve ark., Retrospective Birth Dating of Cells in Humans, Cell (2005); https://doi.org/10.1016/j.cell.2005.04.028";
const memory = "Nader K., Schafe GE, LeDoux JE, Fear memories require protein synthesis in the amygdala for reconsolidation after retrieval, Nature (2000); https://doi.org/10.1038/35021052";

export default {
  slug: "c2-ship-of-theseus", level: "C2", title: "The Ship That Would Not Settle", topic: "Felsefe", sortOrder: 33, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's attitude toward the proposed solutions?", evidence: findEvidence(paragraphs, "Whichever we choose, we seem to surrender an intuition we thought we held firmly"), options: [
      option("o1", "Each solves something but has a cost", true, null, "Yazar her yanıtın düzen sağladığını ama bir bedeli olduğunu söyler."),
      option("o2", "One of them clearly settles the puzzle", false, "reverse", "Yazar hiçbir yanıtı kesin çözüm olarak sunmaz."),
      option("o3", "The puzzle is a merely verbal game", false, "reverse", "Yazar sözel görüşü fazla aceleci bulur; sigorta ve mahkeme örnekleri verir."),
      option("o4", "Hobbes's version has been fully refuted", false, "notstated", "Metin Hobbes'un sürümünün çürütüldüğünü söylemez."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement correctly describes Hobbes's added twist?", evidence: findEvidence(paragraphs, "reassembled them in their original order. Now there are two ships, each with a respectable claim: one has continuity of form and use, the other has every original piece"), options: [
      option("o1", "The ship rebuilt from old planks has the original timber", true, null, "Yeniden birleştirilen gemi her özgün parçaya sahiptir; onarılan gemi ise biçim ve kullanım sürekliliğine."),
      option("o2", "The continuously repaired ship keeps the original timber in full", false, "detail", "Sürekli onarılan gemide tahtalar değiştirilmiştir; özgün tahtalar öbür gemidedir."),
      option("o3", "The reassembled ship has the stronger claim from continuity of use", false, "detail", "Biçim ve kullanım sürekliliği onarılan geminin iddiasıdır."),
      option("o4", "The planks were reassembled in a new order to form a second ship", false, "reverse", "Tahtalar özgün sıralarıyla yeniden birleştirildi."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “settling” mean in “depend on settling which object is which”?", evidence: findEvidence(paragraphs, "depend on settling which object is which"), options: [
      option("o1", "Deciding it conclusively", true, null, "Settling burada bir sorunu kesin olarak karara bağlamak demektir; mahkeme ve sigorta bağlamına uyar."),
      option("o2", "Paying off an outstanding debt", false, "context", "Settle'ın 'borcu ödemek' anlamıdır; sigorta bağlamı kandırıcıdır ama cümlede nesne 'hangisi hangisi' sorusudur."),
      option("o3", "Moving to live in a new place", false, "context", "Settle'ın 'yerleşmek' anlamıdır; bağlama uymaz."),
      option("o4", "Calming a dispute by compromise", false, "context", "Uzlaşma yoluyla yatıştırma kastedilmez; amaç hangi nesnenin hangisi olduğuna karar vermektir."),
    ] },
    { key: "q4", type: "inference", prompt: "What is the main purpose of the final paragraph?", evidence: findEvidence(paragraphs, "Perhaps the ship's real lesson concerns us rather than the vessel"), options: [
      option("o1", "To turn the puzzle back on the reader", true, null, "Yazar bilmeceyi okurun kendi kimliğine uygular ve kendi güvenini sorgulatır."),
      option("o2", "To prove that personal identity is an illusion", false, "extreme", "Yazar güvenin haklı olabileceğini kabul eder; yanılsama demez."),
      option("o3", "To describe how the Athenians built ships", false, "context", "Gemi yapımı anlatılmaz; Atinalılar yalnızca karşılaştırma içindir."),
      option("o4", "To argue that memory never changes", false, "reverse", "Metin anıların kayabileceğini söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Plutarkhos'a göre Atinalılar Theseus'un Girit'ten döndüğü gemiyi korudu, çürüyen kerestelerini yenileriyle değiştirdi; gemi büyüyen şeyler hakkındaki mantık sorusunda filozoflar için örnek oldu, bir taraf aynı gemi olduğunu, diğeri olmadığını savundu.", source: plutarch, checkedOn: "2026-11-23" },
    { claim: "Hobbes, atılan asıl tahtaların toplanıp yeniden birleştirildiği sürümü ekledi; süreklilik görüşleri, sözel/çoklu anlam yaklaşımları tartışılır.", source: sepIdentity, checkedOn: "2026-11-23" },
    { claim: "Dört boyutçuluk (perdurantizm) nesnelerin zamana yayıldığını, herhangi bir anda tamamen mevcut olmadığını savunur.", source: sepParts, checkedOn: "2026-11-23" },
    { claim: "İnsan vücudundaki birçok hücre türü yıllar içinde yenilenir.", source: cells, checkedOn: "2026-11-23" },
    { claim: "Hatırlanan anılar yeniden pekiştirme sürecinde değişebilir.", source: memory, checkedOn: "2026-11-23" },
  ] },
};
