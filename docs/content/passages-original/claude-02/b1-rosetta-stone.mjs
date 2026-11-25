import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} seventeen{on yedi} ninety{doksan} nine{dokuz}, French{Fransız} soldiers{askerler} in{} Egypt{Mısır} found{buldu} a{} large{büyük} stone{taş} near{yakınında} the{} town{kasaba} of{} Rosetta{Rosetta}.", "1799'da Mısır'daki Fransız askerler, Rosetta kasabasının yakınında büyük bir taş buldu."],
    ["The{} stone{taş} had{vardı} the{} same{aynı} message{mesaj} written{yazılmış} three{üç} times{kez}.", "Taşta aynı mesaj üç kez yazılıydı."],
    ["One{biri} version{sürüm} used{kullandı} Greek{Yunanca} letters{harfler}, and{} two{iki} others{diğerleri} used{kullandı} ancient{eski} Egyptian{Mısır} writing{yazı}.", "Bir sürüm Yunan harflerini, diğer ikisi eski Mısır yazısını kullanıyordu."],
  ],
  [
    ["Few{az} people{insanlar} could{-ebilirdi} read{okumak} the{} Egyptian{Mısır} signs{işaretler} at{-de} that{o} time{zaman}, but{ama} many{birçok} could{-ebilirdi} read{okumak} Greek{Yunanca}.", "O zamanlar çok az kişi Mısır işaretlerini okuyabiliyordu ama birçok kişi Yunancayı okuyabiliyordu."],
    ["So{bu yüzden} the{} Greek{Yunanca} lines{satırlar} gave{verdi} scholars{bilginler} a{} key{anahtar} to{-e} the{} other{diğer} two{iki}.", "Bu yüzden Yunanca satırlar bilginlere diğer ikisinin anahtarını verdi."],
    ["Britain{İngiltere} took{aldı} the{} stone{taş} after{sonra} the{} French{Fransız} army{ordu} lost{kaybetti}, and{} it{} has{sahip} been{olmuş} in{-de} the{} British{İngiliz} Museum{Müze} since{-den beri} eighteen{on sekiz} oh{sıfır} two{iki}.", "Fransız ordusu yenildikten sonra İngiltere taşı aldı ve taş 1802'den beri British Museum'da."],
  ],
  [
    ["In{-de} eighteen{on sekiz} twenty{yirmi} two{iki}, a{} French{Fransız} scholar{bilgin} named{adlı} Champollion{Champollion} showed{gösterdi} how{nasıl} to{-mek} read{okumak} the{} Egyptian{Mısır} signs{işaretler}.", "1822'de Champollion adlı Fransız bir bilgin, Mısır işaretlerinin nasıl okunacağını gösterdi."],
    ["After{sonra} that{o}, people{insanlar} could{-ebildi} finally{sonunda} read{okumak} the{} old{eski} writing{yazı} on{üzerindeki} temples{tapınaklar} and{} tombs{mezarlar}.", "Bundan sonra insanlar tapınaklardaki ve mezarlardaki eski yazıyı sonunda okuyabildi."],
    ["Their{onların} work{çalışma} started{başlattı} a{} new{yeni} chapter{bölüm} in{} the{} study{inceleme} of{} ancient{eski} Egypt{Mısır}.", "Çalışmaları, eski Mısır'ın incelenmesinde yeni bir bölüm başlattı."],
    ["Because{çünkü} of{-den dolayı} this{} stone{taş}, a{} lost{kayıp} language{dil} could{-ebildi} speak{konuşmak} again{tekrar}.", "Bu taş sayesinde kayıp bir dil yeniden konuşabildi."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-rosetta-stone", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const brit = "Encyclopaedia Britannica, Rosetta Stone; https://britannica.com/topic/Rosetta-Stone";
const smith = "Smithsonian Magazine, Rosetta Stone, hieroglyphs and Champollion's decipherment; https://www.smithsonianmag.com/history/rosetta-stone-hieroglyphs-champollion-decipherment-egypt-180980834/";

export default {
  slug: "b1-rosetta-stone", level: "B1", title: "The Stone That Opened a Door", topic: "Tarih", sortOrder: 13, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main idea of the passage?", evidence: ev(1, "So the Greek lines gave scholars a key to the other two."), options: [
      option("o1", "A stone that unlocked Egyptian writing", true, null, "Metin taşın Mısır yazısını okumaya nasıl yardım ettiğini anlatır."),
      option("o2", "How Greek replaced Egyptian writing", false, "reverse", "Yunanca Mısır yazısının yerini almadı; ona anahtar oldu."),
      option("o3", "Why a museum bought a famous stone", false, "detail", "Müze yalnızca ayrıntıdır."),
      option("o4", "How Egyptians carved stones for temples", false, "notstated", "Taş oyma anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "In which year was the stone found?", evidence: ev(0, "In seventeen ninety nine, French soldiers in Egypt found a large stone"), options: [
      option("o1", "In the year 1822", false, "detail", "1822 yazının okunduğu yıldır."),
      option("o2", "In the year 1802", false, "detail", "1802 taşın müzeye geldiği yıldır."),
      option("o3", "In 1799", true, null, "Metin taşın 1799'da bulunduğunu söyler."),
      option("o4", "In the year 1900", false, "notstated", "Metinde 1900 yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “scholars” mean in the second paragraph?", evidence: ev(1, "the Greek lines gave scholars a key to the other two"), options: [
      option("o1", "People who study a subject", true, null, "Scholar, bir konuyu dikkatle inceleyen bilgindir."),
      option("o2", "Soldiers who travel to hot Egypt", false, "context", "Askerler ilk paragrafta geçer; scholars farklıdır."),
      option("o3", "Workers who build big temples", false, "context", "Tapınaklar geçer ama scholar işçi demek değildir."),
      option("o4", "Visitors who buy old stone", false, "notstated", "Taş satın alma anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "Why did the Greek lines help so much?", evidence: ev(1, "Few people could read the Egyptian signs at that time, but many could read Greek."), options: [
      option("o1", "Greek was the oldest writing in all Egypt.", false, "notstated", "Yunancanın en eski yazı olduğu söylenmez."),
      option("o2", "Egyptians had stopped writing for good.", false, "extreme", "Metin böyle bir şey demez."),
      option("o3", "People read Greek and compared.", true, null, "Yunancayı okuyabildikleri için diğer satırlarla karşılaştırabildiler."),
      option("o4", "The Greek part was the longest one.", false, "notstated", "Uzunluktan söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Taş 1799'da Mısır'da Fransız askerlerce bulundu; aynı metin hiyeroglif, Demotik ve Yunanca olmak üzere üç yazıyla yazılıydı.", source: brit, checkedOn: "2026-11-23" },
    { claim: "Taş, Fransız yenilgisinden sonra İngiltere'ye geçti ve 1802'den beri British Museum'da sergileniyor.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Champollion 1822'de hiyeroglifleri çözdüğünü duyurdu.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
