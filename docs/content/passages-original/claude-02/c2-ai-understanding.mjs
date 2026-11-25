import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["When{-dığında} Alan{Alan} Turing{Turing} asked{sormak} in{-de} nineteen{on dokuz} fifty{elli} whether{-ip -mediğini} machines{makineler} can{-ebilir} think{düşünmek}, he{} deliberately{kasıtlı olarak} sidestepped{etrafından dolaşmak} the{} difficulty{zorluk} of{} defining{tanımlamak} thought{düşünce}.", "Alan Turing 1950'de makinelerin düşünüp düşünemeyeceğini sorduğunda, düşünceyi tanımlamanın zorluğunu kasıtlı olarak aşmaya çalıştı."],
    ["The{} move{hamle} was{} philosophically{felsefi olarak} bold{cesur}, because{çünkü} it{} turned{dönüştürmek} a{} metaphysical{metafizik} puzzle{bilmece} into{-e} an{} empirical{deneysel} one{olan}.", "Hamle felsefi olarak cesurdu, çünkü metafizik bir bilmeceyi deneysel bir bilmeceye dönüştürdü."],
    ["His{onun} imitation{taklit} game{oyun} asked{sormak} only{yalnızca} whether{-ip -mediğini} a{} machine{makine} could{-ebilirdi} converse{konuşmak} so{öyle} well{iyi} that{ki} an{} interrogator{sorgulayıcı}, exchanging{değiş tokuş etmek} written{yazılı} messages{mesajlar} with{ile} a{} hidden{gizli} person{kişi} and{} a{} hidden{gizli} machine{makine}, could{-ebilirdi} not{değil} reliably{güvenilir biçimde} tell{ayırt etmek} them{onları} apart{ayrı}.", "Taklit oyunu yalnızca, bir makinenin yazılı mesajlaştığı gizli bir kişiyle gizli bir makineyi güvenilir biçimde ayırt edemeyen bir sorgulayıcıyı yanıltacak kadar iyi konuşup konuşamayacağını sordu."],
  ],
  [
    ["The{} proposal{öneri} was{} elegant{zarif}, but{ama} it{} invited{davet etmek} an{} obvious{açık} objection{itiraz}: behaviour{davranış} is{} not{değil} the{} same{aynı} as{} understanding{anlayış}.", "Öneri zarifti ama açık bir itirazı davet etti: davranış anlayışla aynı şey değildir."],
    ["The{} philosopher{filozof} John{John} Searle{Searle} sharpened{keskinleştirmek} that{o} objection{itiraz} in{-de} nineteen{on dokuz} eighty{seksen} with{ile} his{onun} Chinese{Çince} Room{Oda} thought{düşünce} experiment{deney}.", "Filozof John Searle bu itirazı 1980'de Çin Odası düşünce deneyiyle keskinleştirdi."],
    ["Imagine{hayal etmek} a{} man{adam} locked{kilitli} in{} a{} room{oda}, receiving{almak} notes{notlar} written{yazılmak} in{} Chinese{Çince} and{} following{izlemek} a{} rule{kural} book{kitap} that{ki} tells{söylemek} him{ona} which{hangisi} symbols{semboller} to{-mek} send{göndermek} back{geri}.", "Bir odaya kilitlenmiş, Çince yazılmış notlar alan ve hangi sembolleri geri göndereceğini söyleyen bir kural kitabını izleyen bir adamı hayal et."],
    ["To{-e} observers{gözlemciler} outside{dışarıda}, his{onun} replies{yanıtlar} are{} flawless{kusursuz}; to{-e} the{} man{adam}, they{} are{} meaningless{anlamsız} shapes{şekiller}.", "Dışarıdaki gözlemcilere göre yanıtları kusursuzdur; adama göre ise anlamsız şekillerdir."],
    ["Whatever{ne olursa olsun} one{kişi} concludes{sonuca varmak}, the{} thought{düşünce} experiment{deney} has{} proved{olduğu anlaşıldı (prove + sıfat)} remarkably{dikkate değer biçimde} durable{dayanıklı} because{çünkü} it{} isolates{ayırmak} one{bir} intuition{sezgi} with{ile} unusual{olağandışı} clarity{açıklık}.", "Kişi ne sonuca varırsa varsın, düşünce deneyi tek bir sezgiyi olağandışı bir açıklıkla ayırdığı için dikkate değer biçimde dayanıklı çıktı."],
  ],
  [
    ["Searle's{Searle (iyelik)} conclusion{sonuç} was{} that{ki} following{izlemek} rules{kurallar} cannot{-amaz} by{ile} itself{kendisi} amount{eşit olmak} to{-e} understanding{anlayış}, however{ne kadar olursa olsun} convincing{ikna edici} the{} output{çıktı}.", "Searle'ün sonucu, çıktı ne kadar ikna edici olursa olsun, kuralları izlemenin tek başına anlayış anlamına gelemeyeceğiydi."],
    ["Critics{eleştirmenler} replied{cevap vermek} that{ki} understanding{anlayış} might{-ebilir} belong{ait olmak} to{-e} the{} whole{bütün} system{sistem}, man{adam}, book{kitap} and{} room{oda} together{birlikte}, rather{yerine (rather than)} than{yerine (rather than)} to{-e} any{herhangi bir} part{parça}.", "Eleştirmenler anlayışın herhangi bir parçaya değil, adam, kitap ve odadan oluşan bütün sisteme ait olabileceğini söyledi."],
    ["The{} dispute{anlaşmazlık} has{} never{asla} been{olmak} settled{çözülmek}, and{} it{} has{} grown{büyümek} more{daha} urgent{acil} as{olarak} programs{programlar} produce{üretmek} ever{hiç} more{daha} fluent{akıcı} replies{yanıtlar}.", "Anlaşmazlık hiç çözülmedi ve programlar giderek daha akıcı yanıtlar ürettikçe daha acil hâle geldi."],
    ["Each{her} side{taraf} can{-ebilir} cite{anmak} the{} same{aynı} scenario{senaryo} in{} its{onun} own{kendi} favour{lehine}, which{ki bu} is{} part{parça} of{} the{} problem{sorun}.", "Her iki taraf da aynı senaryoyu kendi lehine anabilir; bu da sorunun bir parçasıdır."],
  ],
  [
    ["What{ne} the{} debate{tartışma} clarifies{netleştirmek}, at{-de} least{en az}, is{} what{ne} we{biz} mean{kastetmek} when{-dığında} we{biz} ask{sormak} the{} question{soru}.", "Tartışmanın en azından netleştirdiği şey, soruyu sorarken ne kastettiğimizdir."],
    ["If{eğer} we{biz} mean{kastetmek} useful{yararlı} behaviour{davranış}, the{} imitation{taklit} game{oyun} is{} a{} reasonable{makul} standard{ölçüt}; if{eğer} we{biz} mean{kastetmek} inner{iç} experience{deneyim}, it{} is{} silent{sessiz}.", "Yararlı davranışı kastediyorsak taklit oyunu makul bir ölçüttür; iç deneyimi kastediyorsak sessizdir."],
  ],
  [
    ["The{} two{iki} questions{sorular} are{} easily{kolayca} confused{karıştırmak}, and{} much{çok} of{} the{} public{kamu} conversation{konuşma} about{hakkında} artificial{yapay} intelligence{zeka} depends{bağlı olmak} on{-e} confusing{karıştırmak} them{onları}.", "İki soru kolayca karıştırılır ve yapay zeka hakkındaki kamusal konuşmanın büyük kısmı onları karıştırmaya dayanır."],
    ["Recognising{fark etmek} the{} difference{fark} will{-ecek} not{değil} answer{cevaplamak} either{ikisinden biri} question{soru}, but{ama} it{} will{-ecek} at{-de} least{en az} keep{tutmak} us{bizi} honest{dürüst} about{hakkında} which{hangisi} one{biri} we{biz} are{} asking{sormak}.", "Farkı fark etmek iki sorudan hiçbirini cevaplamaz ama en azından hangisini sorduğumuz konusunda bizi dürüst tutar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-ai-understanding", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const turing = "A. M. Turing, Computing Machinery and Intelligence, Mind 59(236), 1950, ss. 433-460; https://doi.org/10.1093/mind/LIX.236.433";
const searle = "John R. Searle, Minds, Brains, and Programs, Behavioral and Brain Sciences 3(3), 1980, ss. 417-424; https://doi.org/10.1017/S0140525X00005756";

export default {
  slug: "c2-ai-understanding", level: "C2", title: "Behaviour Is Not Understanding", topic: "Yapay zeka", sortOrder: 15, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central point of the passage?", evidence: ev(4, "Recognising the difference will not answer either question, but it will at least keep us honest about which one we are asking."), options: [
      option("o1", "Behaviour and understanding differ", true, null, "Metin davranış ile anlayışın ayrı sorular olduğunu savunur."),
      option("o2", "Machines now understand language as people do", false, "reverse", "Metin bunu kanıtlanmış saymaz."),
      option("o3", "Turing's test is worthless as a standard", false, "reverse", "Metin onu makul bir ölçüt olarak değerlendirir."),
      option("o4", "Searle's argument ended the debate", false, "reverse", "Metin tartışmanın hiç çözülmediğini söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "How did critics respond to Searle's argument?", evidence: ev(2, "Critics replied that understanding might belong to the whole system, man, book and room together, rather than to any part."), options: [
      option("o1", "It may belong to the whole system", true, null, "Metin bunu açıkça söyler."),
      option("o2", "The man in the room secretly knew Chinese", false, "notstated", "Böyle bir itiraz yoktur."),
      option("o3", "Rule books can never be written down", false, "notstated", "Metin böyle bir iddia taşımaz."),
      option("o4", "The experiment was performed too early", false, "notstated", "Zamanlama itirazı yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “flawless” mean in the second paragraph?", evidence: ev(1, "To observers outside, his replies are flawless"), options: [
      option("o1", "Without any visible fault", true, null, "Flawless, kusursuz demektir."),
      option("o2", "Written very quickly", false, "notstated", "Hız anlatılmaz."),
      option("o3", "Based on real experience", false, "reverse", "Metin yanıtların anlamsız şekillerden geldiğini söyler."),
      option("o4", "Spoken in a foreign language", false, "context", "Çince geçer ama kelimenin anlamı bu değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author suggest about public conversation on artificial intelligence?", evidence: ev(4, "much of the public conversation about artificial intelligence depends on confusing them"), options: [
      option("o1", "It often mixes up two different questions", true, null, "Metin bu karışıklığı eleştirir."),
      option("o2", "It is based mainly on careful experiments", false, "reverse", "Metin tersini ima eder."),
      option("o3", "It rarely mentions the imitation game", false, "notstated", "Böyle bir bilgi yoktur."),
      option("o4", "It agrees that machines understand language", false, "reverse", "Metin böyle bir uzlaşıdan söz etmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Alan Turing 1950'de Mind dergisindeki makalesinde 'makineler düşünebilir mi?' sorusunu taklit oyunu adlı bir testle değiştirmeyi önerdi: sorgulayıcı yazılı mesajlarla gizli bir insan ve gizli bir makineyle iletişim kurar, onları güvenilir biçimde ayıramazsa makine testi geçer.", source: turing, checkedOn: "2026-11-23" },
    { claim: "John Searle 1980'de Çin Odası düşünce deneyini önerdi: Çince bilmeyen bir adam kural kitabını izleyerek Çince notlara kusursuz görünen yanıtlar verir; Searle kural izlemenin tek başına anlayış olmadığını savundu; eleştirmenler anlayışın bütün sisteme ait olabileceğini söyledi.", source: searle, checkedOn: "2026-11-23" },
  ] },
};
