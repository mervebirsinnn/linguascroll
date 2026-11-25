import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Biographies{biyografiler} of{} Marie{Marie} Curie{Curie} tend{eğilimli olmak} to{-mek} dwell{üzerinde durmak} on{} her{} prizes{ödüller}, and{} the{} prizes{ödüller} are{} indeed{gerçekten} remarkable{dikkate değer}: she{} shared{paylaşmak} the{} Nobel{Nobel} Prize{Ödül} in{} Physics{Fizik} in{-de} nineteen{on dokuz} oh{sıfır} three{üç} and{} won{kazanmak} the{} Nobel{Nobel} Prize{Ödül} in{} Chemistry{Kimya} alone{tek başına} in{-de} nineteen{on dokuz} eleven{on bir}, remaining{kalmak} the{} only{tek} person{kişi} honoured{onurlandırılmak} in{} two{iki} different{farklı} scientific{bilimsel} fields{alanlar}.", "Marie Curie biyografileri ödülleri üzerinde durmaya eğilimlidir ve ödüller gerçekten dikkate değerdir: 1903'te Nobel Fizik Ödülü'nü paylaştı, 1911'de Nobel Kimya Ödülü'nü tek başına kazandı ve iki farklı bilim alanında onurlandırılan tek kişi olarak kaldı."],
    ["Yet{yine de} the{} prizes{ödüller} describe{tanımlamak} outcomes{sonuçlar}; they{} say{söylemek} little{az} about{hakkında} method{yöntem}.", "Yine de ödüller sonuçları tanımlar; yöntem hakkında az şey söyler."],
    ["That{o} omission{eksik bırakma} is{} understandable{anlaşılır}, since{çünkü} outcomes{sonuçlar} are{} easier{daha kolay} to{-mek} list{listelemek} than{-den} habits{alışkanlıklar} of{} mind{zihin}.", "Bu eksik bırakma anlaşılırdır, çünkü sonuçları listelemek zihin alışkanlıklarını listelemekten daha kolaydır."],
  ],
  [
    ["The{} method{yöntem} began{başlamak} with{ile} a{} puzzle{bilmece}.", "Yöntem bir bilmeceyle başladı."],
    ["Working{çalışarak} with{ile} Pierre{Pierre} Curie{Curie} on{üzerinde} the{} spontaneous{kendiliğinden} radiation{ışıma} discovered{keşfetmek} by{tarafından} Henri{Henri} Becquerel{Becquerel}, she{} found{bulmak} that{ki} a{} heavy{ağır} ore{cevher} called{denen} pitchblende{uranit} was{} more{daha} radioactive{radyoaktif} than{-den} the{} uranium{uranyum} it{} contained{içermek} could{-ebilirdi} explain{açıklamak}.", "Pierre Curie ile Henri Becquerel'in keşfettiği kendiliğinden ışıma üzerinde çalışırken, uranit denen ağır bir cevherin içerdiği uranyumun açıklayabileceğinden daha radyoaktif olduğunu buldu."],
    ["Rather{yerine (rather than)} than{yerine (rather than)} dismiss{reddetmek} the{} discrepancy{tutarsızlık} as{olarak} experimental{deneysel} error{hata}, the{} couple{çift} treated{ele almak} it{} as{olarak} evidence{kanıt} of{} an{} unknown{bilinmeyen} substance{madde}.", "Çift, tutarsızlığı deneysel hata diye geçmek yerine bilinmeyen bir maddenin kanıtı olarak ele aldı."],
    ["That{o} choice{seçim} is{} easy{kolay} to{-mek} admire{hayran olmak} afterwards{sonradan} but{ama} hard{zor} to{-mek} make{yapmak} in{} the{} moment{an}.", "Bu seçime sonradan hayran olmak kolay, ama o anda yapmak zordur."],
  ],
  [
    ["Acting{harekete geçmek} on{-e} that{o} conviction{inanç} required{gerektirmek} years{yıllar} of{} laborious{zahmetli} chemical{kimyasal} separation{ayırma}.", "Bu inanca göre hareket etmek yıllarca zahmetli kimyasal ayırma gerektirdi."],
    ["From{-den} the{} ore{cevher} they{} eventually{sonunda} isolated{ayrıştırmak} two{iki} new{yeni} elements{elementler}: polonium{polonyum}, which{ki o} Marie{Marie} named{adlandırmak} after{-nin adına} her{} native{doğduğu} Poland{Polonya}, and{} radium{radyum}.", "Cevherden sonunda iki yeni element ayrıştırdılar: Marie'nin doğduğu Polonya'nın adını verdiği polonyum ve radyum."],
    ["The{} achievement{başarı} lay{yatmak} less{daha az} in{} a{} moment{an} of{} inspiration{ilham} than{-den} in{} the{} refusal{reddetme} to{-mek} abandon{terk etmek} an{} anomaly{anomali} until{-e kadar} it{} had{} been{} explained{açıklanmak}.", "Başarı, bir ilham anından çok bir anomaliyi açıklanana kadar terk etmeyi reddetmekte yatıyordu."],
  ],
  [
    ["Pierre's{Pierre (iyelik)} death{ölüm} in{-de} nineteen{on dokuz} oh{sıfır} six{altı} might{-ebilirdi} have{} ended{bitirmek} the{} partnership{ortaklık} and{} the{} programme{program}.", "Pierre'in 1906'daki ölümü ortaklığı ve programı bitirebilirdi."],
    ["Instead{bunun yerine}, Marie{Marie} took{devralmak (take over)} over{devralmak (take over)} his{} professorship{profesörlük}, continued{sürdürmek} the{} research{araştırma}, and{} secured{güvence altına almak} the{} second{ikinci} prize{ödül} that{ki} made{yapmak} her{onu} unique{eşsiz}.", "Bunun yerine Marie onun profesörlüğünü devraldı, araştırmayı sürdürdü ve onu eşsiz kılan ikinci ödülü güvence altına aldı."],
    ["Her{onun} example{örnek} is{} often{sıklıkla} invoked{anmak} in{} discussions{tartışmalar} of{} women{kadınlar} in{} science{bilim}, and{} rightly{haklı olarak} so{öyle}, although{rağmen} it{} should{-meli} not{değil} obscure{gölgelemek} the{} intellectual{entelektüel} habits{alışkanlıklar} that{ki} made{yapmak} the{} work{iş} possible{mümkün}.", "Örneği bilimde kadınlar üzerine tartışmalarda sıkça ve haklı olarak anılır; ancak işi mümkün kılan entelektüel alışkanlıkları gölgelememelidir."],
    ["A{} biography{biyografi} that{ki} explains{açıklamak} this{bu} well{iyi} is{} worth{değer} more{daha fazla} than{-den} one{olan} that{ki} merely{sadece} celebrates{kutlamak}.", "Bunu iyi açıklayan bir biyografi, yalnızca kutlayan bir biyografiden daha değerlidir."],
  ],
  [
    ["Those{o} habits{alışkanlıklar} are{} not{değil} mysterious{gizemli}: attention{dikkat} to{-e} small{küçük} anomalies{anomaliler}, patience{sabır} with{ile} tedious{sıkıcı} procedure{prosedür}, and{} willingness{isteklilik} to{-mek} trust{güvenmek} evidence{kanıt} over{üzerinde} expectation{beklenti}.", "O alışkanlıklar gizemli değildir: küçük anomalilere dikkat, sıkıcı prosedüre sabır ve kanıta beklentiden çok güvenme isteği."],
    ["They{} are{} also{ayrıca} learnable{öğrenilebilir}, which{ki bu} may{-ebilir} be{olmak} the{} most{en} useful{yararlı} thing{şey} to{-mek} remember{hatırlamak} about{hakkında} her{onun} career{kariyer}.", "Ayrıca öğrenilebilirler; bu, kariyeri hakkında hatırlanacak en yararlı şey olabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-curie-method", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobelP = "Nobel Prize Outreach, Marie Curie - Biographical / Physics 1903; https://www.nobelprize.org/prizes/physics/1903/marie-curie/biographical/";
const nobelC = "Nobel Prize Outreach, Marie Curie - Facts / Chemistry 1911; https://www.nobelprize.org/prizes/chemistry/1911/marie-curie/facts";

export default {
  slug: "c2-curie-method", level: "C2", title: "The Habits Behind the Prizes", topic: "Önemli insanlar", sortOrder: 19, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central claim?", evidence: ev(4, "attention to small anomalies, patience with tedious procedure, and willingness to trust evidence over expectation"), options: [
      option("o1", "Her method matters as much as prizes", true, null, "Metin ödüllerin yöntem hakkında az şey söylediğini savunur."),
      option("o2", "Her success came mostly from inspiration", false, "reverse", "Metin ilhamdan çok azmı vurgular."),
      option("o3", "Prizes tell us everything about her work", false, "reverse", "Metin ödüllerin yöntemi anlatmadığını söyler."),
      option("o4", "Her husband's role mattered more than hers", false, "notstated", "Böyle bir karşılaştırma yoktur."),
    ] },
    { key: "q2", type: "detail", prompt: "What puzzle began Curie's work with pitchblende?", evidence: ev(1, "a heavy ore called pitchblende was more radioactive than the uranium it contained could explain"), options: [
      option("o1", "The ore was more radioactive than expected", true, null, "Metin bunu söyler."),
      option("o2", "The ore had disappeared from the laboratory", false, "notstated", "Böyle bir olay anlatılmaz."),
      option("o3", "The ore was lighter than uranium itself", false, "notstated", "Ağırlık karşılaştırması yok."),
      option("o4", "The ore produced no radiation at all", false, "reverse", "Tersini anlatır."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “anomaly” mean in the third paragraph?", evidence: ev(2, "the refusal to abandon an anomaly until it had been explained"), options: [
      option("o1", "Something that does not fit", true, null, "Anomaly, beklentiye uymayan şeydir."),
      option("o2", "A decisive and final proof", false, "reverse", "Kanıtın tersine yakın bir kavramdır."),
      option("o3", "A new kind of laboratory tool", false, "context", "Alet anlamı yoktur."),
      option("o4", "A type of prize", false, "context", "Ödül geçer ama anlam bu değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author say her example “should not obscure” her habits?", evidence: findEvidence(paragraphs, "although it should not obscure the intellectual habits that made the work possible"), options: [
      option("o1", "Symbolic status may overshadow her method", true, null, "Örneğin simgesel önemi yöntemi gölgede bırakabilir."),
      option("o2", "Women in science should not be discussed at all", false, "extreme", "Metin tartışmayı haklı bulur."),
      option("o3", "Her habits matter less than her prizes", false, "reverse", "Metin tersini savunur."),
      option("o4", "Her method cannot be taught to anyone", false, "reverse", "Metin öğrenilebilir olduğunu söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "1903 Nobel Fizik Ödülü Marie ve Pierre Curie ile Henri Becquerel arasında paylaşıldı; 1911 Nobel Kimya Ödülü'nü Marie tek başına aldı ve iki farklı bilim alanında Nobel kazanan tek kişidir.", source: nobelC, checkedOn: "2026-11-23" },
    { claim: "Curie'ler uranyumdan daha radyoaktif uranit cevherinden polonyum (Polonya'nın adını taşır) ve radyum elementlerini ayırdı; Pierre 1906'da öldü, Marie profesörlüğünü devralıp araştırmayı sürdürdü.", source: nobelP, checkedOn: "2026-11-23" },
  ] },
};
