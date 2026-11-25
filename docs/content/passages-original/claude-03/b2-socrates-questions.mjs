import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Socrates{Sokrates}, who{ki o} lived{yaşadı} in{} Athens{Atina} in{} the{} fifth{beşinci} century{yüzyıl} BCE{MÖ (Milattan Önce)}, never{hiç (never: asla)} wrote{yazdı} a{} book{kitap}.", "MÖ beşinci yüzyılda Atina'da yaşayan Sokrates hiç kitap yazmadı."],
    ["Much{çok} of{} what{-en şey} we{} know{bilmek} about{hakkında} him{onu} comes{gelir} from{-den} the{} dialogues{diyaloglar} of{} his{} student{öğrenci} Plato{Platon}, in{} which{ki onlarda} he{} appears{görünür} walking{yürürken} around{etrafında} the{} city{şehir} and{} talking{konuşurken} to{ile} anyone{herhangi biri} willing{istekli} to{-meye} answer{yanıtlamak}.", "Onun hakkında bildiklerimizin büyük bölümü öğrencisi Platon'un diyaloglarından gelir; bu diyaloglarda şehirde dolaşıp yanıt vermeye istekli herkesle konuşurken görünür."],
    ["His{} favourite{en sevdiği} activity{etkinlik} was{} not{} giving{vermek} lectures{dersler} but{} asking{sormak} questions{sorular}.", "En sevdiği etkinlik ders vermek değil, soru sormaktı."],
  ],
  [
    ["A{} typical{tipik} conversation{konuşma} began{başladı} when{-dığında} someone{biri} claimed{iddia etti} to{-mek} know{bilmek} what{ne} a{} word{sözcük} such{gibi} as{(such as: gibi)} courage{cesaret} or{} justice{adalet} meant{anlamına geliyordu}.", "Tipik bir konuşma, biri cesaret ya da adalet gibi bir sözcüğün ne anlama geldiğini bildiğini iddia ettiğinde başlardı."],
    ["Socrates{Sokrates} would{-irdi} ask{istemek} for{(ask for: istemek)} a{} definition{tanım}, then{sonra} raise{ortaya koymak} examples{örnekler} that{ki} did{} not{} fit{uymak} it{}.", "Sokrates bir tanım ister, sonra o tanıma uymayan örnekler ortaya koyardı."],
    ["Step{adım} by{(step by step: adım adım)} step{adım}, the{} speaker{konuşan kişi} was{} led{yönlendirildi} to{-meye} see{görmek} that{ki} his{} confident{kendinden emin} answer{yanıt} contradicted{çelişiyordu} his{} other{diğer} beliefs{inançlar}.", "Konuşan kişi adım adım, kendinden emin yanıtının diğer inançlarıyla çeliştiğini görmeye yönlendirilirdi."],
    ["According{göre} to{(according to: -e göre)} Plato{Platon}, Socrates{Sokrates} said{söyledi} that{ki} his{} own{kendi} wisdom{bilgelik} lay{yatıyordu} in{} recognising{fark etmek} how{ne kadar} little{az} he{} knew{biliyordu}, while{oysa} others{başkaları} believed{inanıyordu} they{} knew{biliyorlar} things{şeyler} they{} did{} not{}.", "Platon'a göre Sokrates kendi bilgeliğinin ne kadar az bildiğini fark etmesinde yattığını söyledi; oysa başkaları bilmedikleri şeyleri bildiklerine inanıyordu."],
  ],
  [
    ["Not{} everyone{herkes} enjoyed{hoşlandı} being{-mekten} questioned{sorgulanmak} in{} public{herkesin önünde}.", "Herkes herkesin önünde sorgulanmaktan hoşlanmıyordu."],
    ["In{} 399 BCE{MÖ (Milattan Önce)}, Socrates{Sokrates} was{} put{konuldu} on{(put on trial: yargılamak)} trial{yargılama}, accused{suçlanarak} of{(accused of: ile suçlanan)} failing{-memek} to{-mek} honour{saygı göstermek} the{} city's{şehrin} gods{tanrılar} and{} corrupting{yozlaştırmak} young{genç} people{insanlar}, and{} he{} was{} sentenced{mahkum edildi} to{-e} death{ölüm}.", "MÖ 399'da Sokrates, şehrin tanrılarına saygı göstermemek ve gençleri yozlaştırmakla suçlanarak yargılandı ve ölüme mahkum edildi."],
    ["Yet{yine de} his{} approach{yaklaşım} survived{hayatta kaldı} him{ondan sonra da}.", "Yine de yaklaşımı ondan sonra da yaşadı."],
    ["Today{bugün}, teachers{öğretmenler} in{} law{hukuk} schools{okulları} and{} classrooms{sınıflar} use{kullanır} a{} similar{benzer} method{yöntem}, asking{sorarak} careful{dikkatli} questions{sorular} that{ki} help{yardım eder} students{öğrenciler} examine{incelemek} their{} own{kendi} reasoning{akıl yürütme} instead{yerine} of{(instead of: yerine)} simply{sadece} memorising{ezberlemek} answers{yanıtlar}.", "Bugün hukuk fakültelerinde ve sınıflarda öğretmenler benzer bir yöntem kullanır; öğrencilerin yanıtları sadece ezberlemek yerine kendi akıl yürütmelerini incelemelerine yardım eden dikkatli sorular sorarlar."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-socrates-questions", rows);
const ev = (t) => findEvidence(paragraphs, t);
const sep = "Stanford Encyclopedia of Philosophy, Socrates; https://plato.stanford.edu/entries/socrates/";
const minnlr = "Minnesota Law Review, Dethroning Langdell (Beth Hirschfelder Wilensky); https://scholarship.law.umn.edu/minnlrev/vol107/iss6/8/";

export default {
  slug: "b2-socrates-questions", level: "B2", title: "Teaching by Asking", topic: "Felsefe", sortOrder: 39, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("His favourite activity was not giving lectures but asking questions."), options: [
      option("o1", "A philosopher who taught by asking questions", true, null, "Metin Sokrates'in soru sorarak düşündürme yöntemini ve bu yöntemin etkisini anlatır."),
      option("o2", "A thinker who wrote many famous books", false, "reverse", "Metne göre Sokrates hiç kitap yazmadı."),
      option("o3", "A trial that ended Plato's teaching career", false, "context", "Yargılanan Platon değil Sokrates'tir."),
      option("o4", "A modern guide to memorising legal answers quickly", false, "reverse", "Metin yöntemin ezber yerine akıl yürütmeyi incelettiğini söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "What usually happened after Socrates asked for a definition?", evidence: ev("then raise examples that did not fit it"), options: [
      option("o1", "He raised examples that did not fit it", true, null, "Metin tanımı istedikten sonra ona uymayan örnekler getirdiğini söyler."),
      option("o2", "He wrote the definition in a book", false, "reverse", "Sokrates hiç kitap yazmadı."),
      option("o3", "He gave a long lecture on the true meaning", false, "reverse", "Metne göre ders vermek değil soru sormak onun tercihiydi."),
      option("o4", "He asked Plato to judge the answer", false, "notstated", "Metinde böyle bir şey yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “contradicted” mean in paragraph 2?", evidence: ev("his confident answer contradicted his other beliefs"), options: [
      option("o1", "Went against or conflicted with", true, null, "Contradict, bir şeyle çelişmek, ona ters düşmek demektir."),
      option("o2", "Agreed with and supported", false, "reverse", "Tam ters anlamdır."),
      option("o3", "Was later written down by a student", false, "context", "Platon'un diyalogları yazması ayrı bir bilgidir; kelime bunu anlatmaz."),
      option("o4", "Explained in a much simpler way", false, "notstated", "Kelimenin basitleştirmeyle ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage suggest about why Socrates was put on trial?", evidence: ev("Not everyone enjoyed being questioned in public."), options: [
      option("o1", "His questioning may have angered some citizens", true, null, "Yargılanmadan hemen önce herkesin herkesin önünde sorgulanmaktan hoşlanmadığı söylenir; bu, sorularının bazılarını kızdırmış olabileceğini düşündürür."),
      option("o2", "He refused to ask anyone any questions", false, "reverse", "Metin onun sürekli soru sorduğunu anlatır."),
      option("o3", "He had published several books that attacked the gods", false, "reverse", "Sokrates hiç kitap yazmadı."),
      option("o4", "Plato reported him to the city's judges", false, "notstated", "Metinde böyle bir bilgi yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Sokrates MÖ 5. yüzyılda Atina'da yaşadı, hiçbir şey yazmadı; onun hakkında bildiklerimizin büyük kısmı başta öğrencisi Platon'un diyaloglarından gelir.", source: sep, checkedOn: "2026-11-23" },
    { claim: "Sokrates cesaret, adalet gibi kavramların tanımını sorup karşı örneklerle muhatabının inançları arasındaki çelişkiyi gösterirdi; Platon'a göre kendi bilgeliğini ne kadar az bildiğinin farkında olmasında görürdü.", source: sep, checkedOn: "2026-11-23" },
    { claim: "MÖ 399'da Sokrates şehrin tanrılarını tanımamak (dinsizlik) ve gençleri yozlaştırmakla suçlanarak yargılandı ve ölüme mahkum edildi.", source: sep, checkedOn: "2026-11-25" },
    { claim: "Hukuk fakülteleri ders zamanının önemli bölümünü Sokratik diyaloğa ayırır; Sokratik sorgulama hukuk eğitiminde bugün de kullanılan bir yöntemdir.", source: minnlr, checkedOn: "2026-11-25" },
  ] },
};
