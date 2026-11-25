import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} Great{Büyük} Pyramid{Piramit} of{} Giza{Gize} was{} built{inşa edildi} for{} King{kral} Khufu{Keops} about{yaklaşık} 4,500 years{yıllar} ago{önce}.", "Gize'deki Büyük Piramit, yaklaşık 4.500 yıl önce Kral Keops için yapıldı."],
    ["It{} is{} the{} largest{en büyük} of{} the{} three{üç} famous{ünlü} pyramids{piramitler} there{orada}.", "Oradaki üç ünlü piramidin en büyüğüdür."],
    ["For{} a{} long{uzun} time{zaman}, many{birçok} people{insanlar} believed{inanmak} that{ki} slaves{köleler} built{inşa etti} it{}.", "Uzun süre birçok insan onu kölelerin yaptığına inandı."],
    ["Films{filmler} and{} stories{hikayeler} often{sık sık} showed{gösterdi} huge{çok büyük} groups{gruplar} of{} slaves{köleler} working{çalışan} under{altında} cruel{acımasız} masters{efendiler}.", "Filmler ve hikayeler sık sık acımasız efendilerin altında çalışan çok büyük köle gruplarını gösterdi."],
    ["However{ancak}, archaeologists{arkeologlar} now{şimdi} tell{anlatmak} a{} different{farklı} story{hikaye}.", "Ancak arkeologlar şimdi farklı bir hikaye anlatıyor."],
  ],
  [
    ["Near{yakınında} the{} pyramids{piramitler}, archaeologists{arkeologlar} found{buldu} the{} remains{kalıntılar} of{} a{} town{kasaba} where{-dığı yer} workers{işçiler} lived{yaşadı}.", "Arkeologlar piramitlerin yakınında işçilerin yaşadığı bir kasabanın kalıntılarını buldu."],
    ["They{} also{ayrıca} found{buldu} bakeries{fırınlar} and{} many{birçok} animal{hayvan} bones{kemikler}.", "Ayrıca fırınlar ve birçok hayvan kemiği buldular."],
    ["This{} suggests{düşündürmek} that{ki} the{} workers{işçiler} ate{yedi} bread{ekmek} and{} meat{et}.", "Bu, işçilerin ekmek ve et yediğini düşünür."],
  ],
  [
    ["Workers{işçiler} who{ki} died{öldü} were{} buried{gömüldü} in{} small{küçük} tombs{mezarlar} near{yakınında} the{} pyramids{piramitler}.", "Ölen işçiler piramitlerin yakınındaki küçük mezarlara gömüldü."],
    ["Many{birçok} archaeologists{arkeologlar} now{şimdi} think{düşünmek} that{ki} the{} workers{işçiler} were{} respected{saygı gören}, not{değil} treated{davranılmak} as{olarak} slaves{köleler}.", "Birçok arkeolog artık işçilere saygı gösterildiğini ve onlara köle gibi davranılmadığını düşünür."],
    ["Many{birçok} experts{uzmanlar} now{şimdi} think{düşünmek} the{} builders{yapımcılar} were{} paid{ücretli} Egyptian{Mısırlı} workers{işçiler}.", "Birçok uzman şimdi yapımcıların ücretli Mısırlı işçiler olduğunu düşünüyor."],
    ["Some{bazı} were{} skilled{usta} builders{inşaatçılar}, and{} others{diğerleri} worked{çalıştı} in{} rotating{dönüşümlü} teams{ekipler}.", "Bazıları usta inşaatçılardı, diğerleri ise dönüşümlü ekipler halinde çalıştı."],
    ["Together{birlikte}, they{} worked{çalıştılar} in{} large{büyük} organised{düzenli} teams{ekipler}.", "Birlikte büyük ve düzenli ekipler halinde çalıştılar."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-pyramids-builders", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const natgeo = "National Geographic, Standing Tall: Egypt's Great Pyramids; https://www.nationalgeographic.com/history/history-magazine/article/egypt-great-pyramids-giza-plateau";
const harvardFaq = "Harvard University, Digital Giza - Frequently Asked Questions; https://giza.fas.harvard.edu/faq/";
const harvardMag = "Harvard Magazine, Who Built the Pyramids? (2003); https://www.harvardmagazine.com/2003/07/who-built-the-pyramids.html";

export default {
  slug: "b1-pyramids-builders", level: "B1", title: "Who Really Built the Pyramids?", topic: "Tarih", sortOrder: 39, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "However, archaeologists now tell a different story."), options: [
      option("o1", "New evidence about who built the pyramids", true, null, "Metin piramitleri kimin yaptığına dair yeni arkeolojik bulguları anlatır."),
      option("o2", "How the ancient Egyptians cut and moved stone", false, "notstated", "Taşların nasıl kesilip taşındığı anlatılmaz."),
      option("o3", "Why King Khufu chose Giza for his great tomb", false, "notstated", "Kralın yer seçimi anlatılmaz."),
      option("o4", "How films about Egypt are made today", false, "context", "Filmler yalnızca eski inanışın örneği olarak geçer."),
    ] },
    { key: "q2", type: "detail", prompt: "What did archaeologists find near the pyramids?", evidence: ev(1, "Near the pyramids, archaeologists found the remains of a town where workers lived."), options: [
      option("o1", "A town where the workers once lived", true, null, "Metin işçilerin yaşadığı bir kasabanın kalıntılarının bulunduğunu söyler."),
      option("o2", "A large palace for King Khufu's family", false, "notstated", "Saraydan söz edilmez."),
      option("o3", "Gold that was paid to the slaves", false, "reverse", "Metin işçilerin köle değil, ücretli işçi olduğunu düşündürür; altından söz edilmez."),
      option("o4", "A school for young Egyptian builders", false, "notstated", "Okuldan söz edilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "buried" mean in the third paragraph?', evidence: ev(2, "Workers who died were buried in small tombs"), options: [
      option("o1", "Put in the ground after death", true, null, "Bury, gömmek demektir; ölen işçiler mezarlara gömüldü."),
      option("o2", "Carried far away from their homes", false, "context", "Cümle mezarın yakında olduğunu söyler; uzağa taşımaktan söz edilmez."),
      option("o3", "Taught how to build a royal tomb", false, "context", "Kelimenin öğretmekle ilgisi yoktur."),
      option("o4", "Given a new name by the king", false, "context", "Metinde isim verilmesinden söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the passage mention the tombs near the pyramid?", evidence: findEvidence(paragraphs, "Many archaeologists now think that the workers were respected, not treated as slaves."), options: [
      option("o1", "To show the workers were respected", true, null, "Metin, işçilerin mezarlarının piramitlerin yakınında olmasının onlara saygı gösterildiğini ve köle gibi davranılmadığını düşündürdüğünü söyler."),
      option("o2", "To show that the workers were very rich", false, "context", "Mezarlar küçüktür; zenginlikten söz edilmez."),
      option("o3", "To explain how the pyramid was built", false, "context", "Mezarlar yapım yöntemini açıklamaz."),
      option("o4", "To prove that the king was a cruel master", false, "reverse", "Mezarlar işçilere iyi davranıldığını düşündürür."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Büyük Piramit yaklaşık M.Ö. 2550 civarında (yaklaşık 4.500 yıl önce) Keops (Khufu) için başlandı; Giza'daki üç piramidin en büyüğüdür.", source: natgeo, checkedOn: "2026-11-25" },
    { claim: "Giza'da işçilerin kasabası bulundu; işçilere yiyecek (ekmek, bira) verildi, onlar köle değil ücretli yerli Mısırlılardı (yaklaşık 20.000-30.000 kişi).", source: harvardFaq, checkedOn: "2026-11-25" },
    { claim: "Kasabada fırınlar ve yeterince büyük miktarda sığır/koyun/keçi kemiği bulundu; Lehner'e göre piramit yapıcıları köle değildi, ekipler dönüşümlü çalıştı, işçiler usta ve iyi beslenmişti.", source: harvardMag, checkedOn: "2026-11-25" },
    { claim: "Piramitlerin yakınındaki platoda işçilere ait bir mezarlık bulundu; işçiler 'ayrıcalıklı devlet görevlileri' olarak tanımlanır.", source: natgeo, checkedOn: "2026-11-25" },
  ] },
};
