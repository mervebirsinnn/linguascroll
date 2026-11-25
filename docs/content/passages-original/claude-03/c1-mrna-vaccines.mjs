import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} most{çoğu} of{} the{} history{tarih} of{} vaccination{aşılama}, protecting{korumak} the{} body{vücut} meant{anlamına gelmek} showing{göstermek} it{} a{} weakened{zayıflatılmış}, inactivated{etkisizleştirilmiş} or{} partial{kısmi} version{sürüm} of{} a{} pathogen{patojen (hastalık etkeni)} so{böylece (so that)} that{böylece (so that)} the{} immune{bağışıklık} system{sistem} could{-ebilirdi} learn{öğrenmek} to{-meyi} recognise{tanımak} the{} real{gerçek} thing{şey}.", "Aşılamanın tarihinin büyük bölümünde vücudu korumak, bağışıklık sisteminin gerçeğini tanımayı öğrenebilmesi için ona bir patojenin zayıflatılmış, etkisizleştirilmiş ya da kısmi bir sürümünü göstermek anlamına geliyordu."],
    ["Messenger{haberci} RNA{RNA} vaccines{aşılar} take{izlemek (yol)} a{} less{daha az} direct{doğrudan} route{yol}.", "Haberci RNA aşıları daha dolaylı bir yol izler."],
    ["Instead{yerine (instead of)} of{yerine (instead of)} supplying{sağlamak} the{} foreign{yabancı} protein{protein} itself{kendisi}, they{} deliver{ulaştırmak} genetic{genetik} instructions{talimatlar}, wrapped{sarılmış} in{} tiny{minik} fatty{yağlı} particles{parçacıklar}, that{ki bunlar} prompt{yönlendirmek} the{} recipient's{alıcının (aşı olan kişinin)} own{kendi} cells{hücreler} to{-meye} manufacture{üretmek} a{} harmless{zararsız} fragment{parça} of{} it{} for{} a{} short{kısa} time{süre}.", "Yabancı proteinin kendisini sağlamak yerine, minik yağlı parçacıklara sarılmış genetik talimatlar ulaştırırlar; bu talimatlar alıcının kendi hücrelerini kısa bir süre için onun zararsız bir parçasını üretmeye yönlendirir."],
    ["In{} the{} case{durum} of{} the{} COVID{COVID}-19 vaccines{aşılar}, that{o} fragment{parça} was{} the{} spike{diken (spike proteini)} protein{protein} found{bulunan} on{} the{} surface{yüzey} of{} the{} coronavirus{koronavirüs}.", "COVID-19 aşıları söz konusu olduğunda bu parça, koronavirüsün yüzeyinde bulunan spike (diken) proteiniydi."],
  ],
  [
    ["A{} persistent{süregelen} worry{endişe} is{} that{-dığı (ki)} such{böyle} instructions{talimatlar} might{-ebilir (olasılık)} rewrite{yeniden yazmak} a{} person's{kişinin} genes{genler}.", "Süregelen bir endişe, bu tür talimatların bir kişinin genlerini yeniden yazabileceğidir."],
    ["According{göre (according to)} to{göre (according to)} the{} US{ABD} Centers{merkezler} for{} Disease{hastalık} Control{kontrol} and{} Prevention{önleme}, however{ancak}, the{} messenger{haberci} molecule{molekül} never{asla} enters{girmek} the{} nucleus{çekirdek (hücre çekirdeği)}, where{-dığı yer} DNA{DNA} is{} kept{tutulmak}, and{} cells{hücreler} break{parçalamak (break down)} it{} down{parçalamak (break down)} after{sonra} the{} protein{protein} has{} been{} made{yapılmak}.", "Ancak ABD Hastalık Kontrol ve Önleme Merkezleri'ne göre haberci molekül DNA'nın tutulduğu çekirdeğe asla girmez ve hücreler protein yapıldıktan sonra onu parçalar."],
    ["The{} instructions{talimatlar}, in{} other{diğer} words{sözcükler}, are{} read{okunmak} and{} then{sonra} discarded{atılmak} rather{yerine (rather than)} than{yerine (rather than)} stored{saklanmak}.", "Başka bir deyişle talimatlar saklanmak yerine okunur ve sonra atılır."],
  ],
  [
    ["The{} technology{teknoloji} also{ayrıca} appeared{görünmek}, to{-e (göre)} many{birçok} observers{gözlemciler}, to{-mış gibi} have{} emerged{ortaya çıkmak} from{-den} nowhere{hiçbir yer}.", "Teknoloji birçok gözlemciye hiçbir yerden birdenbire ortaya çıkmış gibi de göründü."],
    ["In{} reality{gerçeklik} it{} rested{dayanmak} on{-e} decades{onlarca yıl} of{} slow{yavaş} and{} frequently{sıklıkla} unfashionable{rağbet görmeyen} laboratory{laboratuvar} work{çalışma}.", "Gerçekte onlarca yıllık yavaş ve çoğu zaman rağbet görmeyen laboratuvar çalışmasına dayanıyordu."],
    ["One{bir} early{erken} obstacle{engel} was{} that{-dığı (ki)} synthetic{sentetik} messenger{haberci} RNA{RNA} tended{eğiliminde olmak} to{-meye} provoke{tetiklemek} inflammation{iltihaplanma}, which{ki bu} made{kılmak} it{} unsuitable{uygunsuz} for{} use{kullanım} in{} people{insanlar}.", "İlk engellerden biri, sentetik haberci RNA'nın iltihaplanmayı tetikleme eğiliminde olmasıydı; bu da onu insanlarda kullanıma uygunsuz kılıyordu."],
    ["Katalin{Katalin} Kariko{Kariko} and{} Drew{Drew} Weissman{Weissman} showed{göstermek} that{-dığını} chemically{kimyasal olarak} modifying{değiştirmek} certain{belirli} building{yapı (building blocks)} blocks{taşları (building blocks: yapı taşları)} of{} the{} molecule{molekül} largely{büyük ölçüde} dampened{bastırmak, hafifletmek} that{o} reaction{tepki}, a{} discovery{keşif} for{} which{ki onun} they{} shared{paylaşmak} the{} 2023 Nobel{Nobel} Prize{ödül} in{} Physiology{fizyoloji} or{} Medicine{tıp}.", "Katalin Kariko ve Drew Weissman, molekülün belirli yapı taşlarını kimyasal olarak değiştirmenin bu tepkiyi büyük ölçüde bastırdığını gösterdi; bu keşifle 2023 Nobel Fizyoloji veya Tıp Ödülü'nü paylaştılar."],
  ],
  [
    ["When{-dığında} the{} pandemic{pandemi} arrived{gelmek}, this{} groundwork{temel hazırlık} allowed{olanak tanımak} vaccines{aşılar} to{-mesine} be{} developed{geliştirilmek} at{} an{} unprecedented{eşi görülmemiş} pace{hız, tempo}, and{} one{biri} of{} the{} first{ilk} received{almak} emergency{acil durum} authorisation{izin} in{} the{} United{birleşik} States{devletler} in{} December{aralık} 2020.", "Pandemi geldiğinde bu temel hazırlık aşıların eşi görülmemiş bir hızla geliştirilmesine olanak tanıdı ve ilklerden biri Aralık 2020'de Amerika Birleşik Devletleri'nde acil kullanım izni aldı."],
    ["The{} speed{hız} reflected{yansıtmak} years{yıllar} of{} accumulated{birikmiş} knowledge{bilgi}, not{} the{} omission{atlanma} of{} safety{güvenlik} testing{test etme}: the{} authorisation{izin} followed{ardından gelmek} a{} review{inceleme} of{} data{veri} from{-den} a{} large{büyük} clinical{klinik} trial{deneme}.", "Bu hız güvenlik testlerinin atlanmasını değil, yılların birikmiş bilgisini yansıtıyordu: izin, büyük bir klinik denemeden elde edilen verilerin incelenmesinin ardından geldi."],
    ["Whether{-ip -mediği} the{} same{aynı} approach{yaklaşım} can{-ebilir} be{} extended{genişletilmek} to{-e} other{diğer} diseases{hastalıklar}, including{dahil} some{bazı} cancers{kanserler}, remains{kalmak} an{} open{açık} question{soru} for{} researchers{araştırmacılar}.", "Aynı yaklaşımın bazı kanserler dahil başka hastalıklara genişletilip genişletilemeyeceği araştırmacılar için açık bir soru olmayı sürdürüyor."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-mrna-vaccines", rows);
const cdc = "U.S. Centers for Disease Control and Prevention, How COVID-19 Vaccines Work; https://www.cdc.gov/covid/vaccines/how-they-work.html";
const nobel = "The Nobel Prize, Press release: The Nobel Prize in Physiology or Medicine 2023; https://www.nobelprize.org/prizes/medicine/2023/press-release/";
const fda = "U.S. Food and Drug Administration, Pfizer-BioNTech COVID-19 Vaccine EUA Letter of Authorization (11 Aralık 2020 EUA, 10 Mayıs 2021 revizyonu); https://www.fda.gov/media/144412/download";

export default {
  slug: "c1-mrna-vaccines", level: "C1", title: "Instructions, Not Invaders", topic: "Tıp", sortOrder: 36, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best captures the main point of the passage?", evidence: findEvidence(paragraphs, "In reality it rested on decades of slow and frequently unfashionable laboratory work."), options: [
      option("o1", "An indirect vaccine method grounded in long research", true, null, "Metin mRNA aşılarının dolaylı işleyişini anlatır ve bu teknolojinin onlarca yıllık araştırmaya dayandığını vurgular."),
      option("o2", "A method that has replaced older vaccines everywhere", false, "extreme", "Metin eski aşıların her yerde yerini aldığını söylemez; yalnızca farklı bir yol izlediğini anlatır."),
      option("o3", "A rushed technology whose safety tests were shortened", false, "reverse", "Metin hızın güvenlik testlerinin atlanmasından kaynaklanmadığını açıkça söyler."),
      option("o4", "A debate over whether mRNA can permanently change our genes", false, "reverse", "Gen endişesi yalnızca bir paragrafta anılır ve hemen yanıtlanır; metnin ana konusu değildir."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about the vaccine's genetic instructions is supported?", evidence: findEvidence(paragraphs, "cells break it down after the protein has been made"), options: [
      option("o1", "Cells break them down once the protein is made", true, null, "CDC'ye göre hücreler mesajcı molekülü protein yapıldıktan sonra parçalar."),
      option("o2", "They are stored in the nucleus until the protein is needed", false, "detail", "Molekül çekirdeğe hiç girmez ve saklanmaz; okunur ve atılır."),
      option("o3", "They are carried inside a weakened form of the pathogen", false, "detail", "Talimatlar zayıflatılmış patojenle değil, küçük yağlı parçacıklarla taşınır."),
      option("o4", "They make cells produce the whole virus for a short time", false, "detail", "Hücreler virüsün tamamını değil, zararsız bir parçasını üretir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “prompt” mean in “instructions ... that prompt the recipient's own cells to manufacture”?", evidence: findEvidence(paragraphs, "that prompt the recipient's own cells to manufacture a harmless fragment"), options: [
      option("o1", "Cause to act", true, null, "Prompt burada bir şeyi harekete geçirmek, tetiklemek anlamında fiildir."),
      option("o2", "Feed lines to a speaker", false, "context", "Tiyatroda suflörlük anlamı gerçektir ama bu bağlama uymaz."),
      option("o3", "Be done on time", false, "context", "'Prompt' sıfatı hızlı demektir; burada fiil olarak kullanılmıştır."),
      option("o4", "Ask for payment", false, "context", "Ödeme isteme anlamı yoktur; talimatlar hücreleri harekete geçirir."),
    ] },
    { key: "q4", type: "inference", prompt: 'What can be inferred about the impression that the technology "emerged from nowhere"?', evidence: findEvidence(paragraphs, "The technology also appeared, to many observers, to have emerged from nowhere."), options: [
      option("o1", "It overlooked a long history of research", true, null, "Yazar hemen ardından teknolojinin onlarca yıllık çalışmaya dayandığını söyleyerek bu izlenimi düzeltir."),
      option("o2", "It was accurate, given how fast the vaccines arrived", false, "reverse", "Yazar bu izlenimi doğrulamaz; 'In reality' diyerek ona karşı çıkar."),
      option("o3", "It came mainly from the vaccine companies", false, "notstated", "İzlenimin kaynağının şirketler olduğu söylenmez; 'many observers' denir."),
      option("o4", "It showed that safety checks had been skipped", false, "reverse", "Metin güvenlik testlerinin atlanmadığını belirtir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "mRNA aşıları hücrelere zararsız bir protein parçası (COVID-19 aşılarında spike proteini) üretme talimatı verir; mRNA hücre çekirdeğine girmez, DNA'yı değiştirmez ve protein üretildikten sonra hücre tarafından parçalanır.", source: cdc, checkedOn: "2026-11-23" },
    { claim: "Katalin Kariko ve Drew Weissman, mRNA'daki nükleozit baz modifikasyonlarının iltihabi tepkiyi azalttığını keşfettikleri için 2023 Nobel Fizyoloji veya Tıp Ödülü'nü paylaştı; bu çalışma COVID-19 aşılarının eşi görülmemiş hızda geliştirilmesine katkıda bulundu.", source: nobel, checkedOn: "2026-11-23" },
    { claim: "FDA 11 Aralık 2020'de Pfizer-BioNTech aşısına 16 yaş ve üzeri için acil kullanım izni (EUA) verdi; FDA, yaklaşık 44.000 katılımcılı devam eden faz 1/2/3 denemesinden güvenlik ve etkinlik verilerini inceledi (güvenlik verisi 37.586 katılımcıdan; etkinlik %95). Metindeki 'ilk' iddiası doğrudan açılan belgede yer almadığı için 'ilklerden biri' olarak yumuşatıldı.", source: fda, checkedOn: "2026-11-25" },
  ] },
};
