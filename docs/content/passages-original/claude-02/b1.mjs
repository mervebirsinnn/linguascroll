import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Many{birçok} people{insan} think{düşünür} dinosaurs{dinozorlar} disappeared{yok oldu} a{bir} very{çok} long{uzun} time{zaman} ago{önce}.", "Birçok insan dinozorların çok uzun zaman önce yok olduğunu düşünür."],
    ["In{aslında (in fact kalıbı)} fact{aslında (in fact kalıbı)}, one{bir} group{grup} of{-nin} dinosaurs{dinozorlar} is{-dır} still{hâlâ} alive{canlı} today{bugün}.", "Aslında dinozorların bir grubu bugün hâlâ yaşıyor."],
    ["You{sen} can{-ebilirsin} see{görmek} them{onları} in{-de} your{senin} garden{bahçe}, in{-de} the{belirli tanımlık} park{park} and{ve} on{üzerinde} the{belirli tanımlık} roof{çatı} of{-nin} your{senin} house{ev}.", "Onları bahçende, parkta ve evinin çatısında görebilirsin."],
    ["They{onlar} are{-dır} birds{kuşlar}.", "Onlar kuşlardır."],
  ],
  [
    ["Scientists{bilim insanları} studied{inceledi} fossils{fosiller} and{ve} found{buldu} that{ki} birds{kuşlar} are{-dır} close{yakın} relatives{akrabalar} of{-nin} small{küçük}, meat{et}-eating{yiyen} dinosaurs{dinozorlar}.", "Bilim insanları fosilleri inceledi ve kuşların küçük, etobur dinozorların yakın akrabaları olduğunu buldu."],
    ["These{bu} animals{hayvanlar} walked{yürüdü} on{üzerinde} two{iki} legs{bacak}, and{ve} many{birçoğu} of{-nin} them{onlar} had{vardı} feathers{tüyler}.", "Bu hayvanlar iki bacak üzerinde yürüyordu ve birçoğunun tüyleri vardı."],
    ["The{belirli tanımlık} first{ilk} feathered{tüylü} dinosaurs{dinozorlar} were{idi} found{bulundu} in{-de} China{Çin} more{daha fazla} than{-den (karşılaştırma)} thirty{otuz} years{yıl} ago{önce}.", "İlk tüylü dinozorlar Çin'de otuz yıldan uzun süre önce bulundu."],
    ["Since{-den beri} then{o zaman}, scientists{bilim insanları} have{-miştir} found{buldu} dozens{düzinelerce} more{daha fazla}.", "O zamandan beri bilim insanları düzinelerce tane daha buldu."],
  ],
  [
    ["Scientists{bilim insanları} are{-dır} still{hâlâ} not{değil} sure{emin} why{neden} feathers{tüyler} first{ilk} appeared{ortaya çıktı}.", "Bilim insanları tüylerin ilk kez neden ortaya çıktığından hâlâ emin değil."],
    ["Some{bazıları} think{düşünür} that{ki} feathers{tüyler} kept{tuttu} the{belirli tanımlık} animals{hayvanlar} warm{sıcak}, and{ve} others{diğerleri} think{düşünür} they{onlar} helped{yardım etti} animals{hayvanlar} to{-mek için} attract{çekmek} partners{eşler}.", "Bazıları tüylerin hayvanları sıcak tuttuğunu, bazıları da eş çekmelerine yardım ettiğini düşünüyor."],
    ["The{belirli tanımlık} change{değişim} from{-den} running{koşan} dinosaurs{dinozorlar} to{-e} flying{uçan} birds{kuşlar} probably{muhtemelen} began{başladı} about{yaklaşık} one{bir} hundred{yüz} and{ve} sixty{altmış} million{milyon} years{yıl} ago{önce}.", "Koşan dinozorlardan uçan kuşlara değişim muhtemelen yaklaşık yüz altmış milyon yıl önce başladı."],
    ["So{bu yüzden} the{belirli tanımlık} next{bir sonraki} time{kez} you{sen} see{görmek} a{bir} bird{kuş}, remember{hatırla} that{ki} it{o} is{-dır} a{bir} living{yaşayan} dinosaur{dinozor}.", "Bu yüzden bir dahaki sefere bir kuş gördüğünde, onun yaşayan bir dinozor olduğunu hatırla."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-dinosaurs-still-here", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nhm = "Natural History Museum, Londra, How dinosaurs evolved into birds; https://www.nhm.ac.uk/discover/how-dinosaurs-evolved-into-birds";

export default {
  slug: "b1-dinosaurs-still-here", level: "B1", title: "Dinosaurs Are Still Here", topic: "Dinozorlar", sortOrder: 11, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main idea of the passage?", evidence: ev(0, "In fact, one group of dinosaurs is still alive today. You can see them in your garden, in the park and on the roof of your house. They are birds."), options: [
      option("o1", "All dinosaurs learned to fly after a big change.", false, "extreme", "Metin yalnızca küçük, tüylü bir dinozor grubundan söz eder; tüm dinozorların uçtuğunu söylemez."),
      option("o2", "Birds belong to the dinosaur family.", true, null, "Metin kuşların dinozorların yaşayan bir grubu olduğunu anlatır."),
      option("o3", "Scientists know why feathers first appeared.", false, "reverse", "Metinde bilim insanlarının bunu hâlâ bilmediği söylenir."),
      option("o4", "The first feathered dinosaurs lived in China.", false, "detail", "Bu doğru bir ayrıntıdır ama metnin ana fikri değildir."),
    ] },
    { key: "q2", type: "detail", prompt: "Where were the first feathered dinosaurs found?", evidence: ev(1, "The first feathered dinosaurs were found in China more than thirty years ago."), options: [
      option("o1", "In a garden", false, "context", "Bahçe, kuşları nerede görebileceğimiz örneklerden biridir."),
      option("o2", "In Africa", false, "notstated", "Metinde Afrika'dan söz edilmez."),
      option("o3", "In a park", false, "context", "Park da kuşları görebileceğimiz bir yerdir; fosillerin bulunduğu yer değil."),
      option("o4", "In China", true, null, "Metin ilk tüylü dinozorların Çin'de bulunduğunu söyler."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “attract” mean in the last paragraph?", evidence: ev(2, "others think they helped animals to attract partners"), options: [
      option("o1", "Push away", false, "reverse", "Eş çekmek, uzaklaştırmanın tersidir."),
      option("o2", "Bring closer", true, null, "Attract, birini kendine doğru çekmek, yaklaştırmak demektir."),
      option("o3", "Look for food", false, "context", "Cümlede yiyecek aramaktan değil, eş bulmaktan söz edilir."),
      option("o4", "Hide from", false, "reverse", "Saklanmak, çekmenin tersidir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about feathers?", evidence: ev(2, "Scientists are still not sure why feathers first appeared. Some think that feathers kept the animals warm"), options: [
      option("o1", "Every feathered dinosaur could fly above the trees.", false, "extreme", "Metin tüylü dinozorların hepsinin uçtuğunu söylemez; birçoğu yerde yürüyordu."),
      option("o2", "Scientists already know the one true reason for feathers.", false, "reverse", "Metin bilim insanlarının hâlâ emin olmadığını söyler."),
      option("o3", "Only the dinosaurs of China had feathers on them.", false, "extreme", "Çin yalnızca ilk bulgunun yeridir; başka tüylü dinozorlar da bulundu."),
      option("o4", "Feathers may not have started for flying.", true, null, "Tüylerin sıcak tutma ya da eş çekme gibi başka amaçlarla ortaya çıkmış olabileceği anlatılıyor."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Kuşlar canlı dinozorlardır (theropod soyundan); tüylü dinozorlar 1990'lardan beri bulunuyor ve onlarca tür biliniyor.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "Koşan, yerde yaşayan theropodlardan uçan kuşlara geçiş muhtemelen yaklaşık 160 milyon yıl önce başladı.", source: nhm, checkedOn: "2026-11-23" },
    { claim: "Tüylerin ilk kez ne için ortaya çıktığı tartışmalıdır (sıcak tutma, gösteriş vb.); bilim insanları bu konuda hemfikir değildir.", source: nhm, checkedOn: "2026-11-23" },
  ] },
};
