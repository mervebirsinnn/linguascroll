import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["A{} coral{mercan} reef{resif} looks{görünür} like{gibi} a{} garden{bahçe} of{} stone{taş}, but{} it{} is{} built{inşa edilmiş} by{tarafından} animals{hayvanlar}.", "Bir mercan resifi taştan bir bahçe gibi görünür ama onu hayvanlar inşa eder."],
    ["Each{her} coral{mercan} polyp{polip} grows{büyütür} a{} hard{sert} skeleton{iskelet}, and{} millions{milyonlar} of{} skeletons{iskeletler} together{birlikte} form{oluşturur} the{} reef{resif}.", "Her mercan polibi sert bir iskelet büyütür ve milyonlarca iskelet birlikte resifi oluşturur."],
    ["Inside{içinde} the{} tissues{dokular} of{} most{çoğu} reef{resif} corals{mercanlar} live{yaşar} tiny{minicik} algae{algler}.", "Resif mercanlarının çoğunun dokularının içinde minicik algler yaşar."],
    ["The{} algae{algler} use{kullanır} sunlight{güneş ışığı} to{-mek için} make{üretmek} sugars{şekerler}, and{} they{} pass{aktarır} much{çoğunu} of{} this{} food{besin} to{-e} their{} host{konak}.", "Algler şeker üretmek için güneş ışığını kullanır ve bu besinin çoğunu konaklarına aktarır."],
    ["They{} also{ayrıca} give{verir} the{} coral{mercan} most{çoğunu} of{} its{} colour{renk}.", "Ayrıca mercana renginin çoğunu da verirler."],
    ["This{} partnership{ortaklık} is{} so{o kadar} productive{verimli} that{ki} reefs{resifler} can{-ebilir} flourish{gelişmek} in{} clear{berrak} tropical{tropikal} water{su} where{-dığı yerde} food{besin} is{} scarce{kıt}.", "Bu ortaklık o kadar verimlidir ki resifler, besinin kıt olduğu berrak tropikal suda gelişebilir."],
  ],
  [
    ["When{-dığında} the{} sea{deniz} stays{kalır} warmer{daha sıcak} than{-den} usual{olağan}, the{} partnership{ortaklık} breaks{bozulur} down{(break down) bozulmak}.", "Deniz olağandan daha sıcak kaldığında ortaklık bozulur."],
    ["The{} stressed{baskı altındaki} coral{mercan} expels{dışarı atar} the{} algae{algler}, and{} the{} white{beyaz} skeleton{iskelet} shows{görünür} through{-nin arasından} its{} clear{saydam} tissue{doku}.", "Baskı altındaki mercan algleri dışarı atar ve beyaz iskelet saydam dokusunun arasından görünür."],
    ["Scientists{bilim insanları} call{adlandırır} this{} bleaching{beyazlaşma}.", "Bilim insanları buna beyazlaşma der."],
    ["A{} bleached{beyazlamış} coral{mercan} is{} not{} dead{ölü}, but{} it{} has{} lost{kaybetmek} its{} main{ana} source{kaynak} of{} food{besin}.", "Beyazlamış bir mercan ölü değildir ama ana besin kaynağını kaybetmiştir."],
    ["If{} the{} water{su} cools{soğur} soon{yakında} enough{yeterince}, the{} algae{algler} can{-ebilir} return{dönmek} and{} the{} colour{renk} comes{gelir} back{geri}.", "Su yeterince kısa sürede soğursa algler dönebilir ve renk geri gelir."],
    ["If{} the{} heat{sıcaklık} lasts{sürer}, the{} weakened{zayıflamış} animal{hayvan} may{-ebilir} die{ölmek}.", "Sıcaklık sürerse zayıflamış hayvan ölebilir."],
  ],
  [
    ["Reefs{resifler} matter{önemlidir} far{çok} beyond{ötesinde} their{} beauty{güzellik}.", "Resifler güzelliklerinin çok ötesinde önem taşır."],
    ["They{} shelter{barındırır} a{} remarkable{dikkat çekici} share{pay} of{} ocean{okyanus} species{türler}, and{} they{} absorb{emer} the{} force{güç} of{} waves{dalgalar} before{-den önce} it{} reaches{ulaşır} the{} shore{kıyı}.", "Okyanus türlerinin dikkat çekici bir bölümünü barındırırlar ve dalgaların gücünü kıyıya ulaşmadan önce emerler."],
    ["The{} Great{Büyük} Barrier{Bariyer} Reef{Resifi} has{} suffered{maruz kaldı} several{birkaç} mass{toplu} bleaching{beyazlaşma} events{olaylar} since{-den beri} the{} late{son} nineteen{on dokuz} nineties{doksanlar}.", "Büyük Bariyer Resifi, 1990'ların sonundan bu yana birkaç toplu beyazlaşma olayına maruz kaldı."],
    ["Reefs{resifler} can{-ebilir} regrow{yeniden büyümek}, yet{yine de} recovery{iyileşme} needs{gerektirir} time{zaman} without{-siz} new{yeni} heat{sıcaklık} stress{stres}, and{} repeated{tekrarlanan} heat{sıcaklık} leaves{bırakır} less{daha az} time{zaman} between{arasında} shocks{şoklar}.", "Resifler yeniden büyüyebilir ama iyileşme yeni sıcaklık stresi olmadan zaman gerektirir ve tekrarlanan sıcaklık şoklar arasında daha az zaman bırakır."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-coral-reefs-bleaching", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const noaa = "NOAA Ocean Service, What is coral bleaching?; https://oceanservice.noaa.gov/facts/coral_bleach.html";
const noaaAnimal = "NOAA Ocean Exploration, Are corals animals?; https://oceanexplorer.noaa.gov/facts/coral-animal.html; NOAA Ocean Service, What are corals made of?; https://oceanservice.noaa.gov/facts/coralmadeof.html";
const noaaCoast = "NOAA Office for Coastal Management, Fast Facts: Coral Reefs; https://coast.noaa.gov/states/fast-facts/coral-reefs.html";
const gbrmpa = "Great Barrier Reef Marine Park Authority, Reef health; https://www.gbrmpa.gov.au/";

export default {
  slug: "b2-coral-reefs-bleaching", level: "B2", title: "The Reef That Loses Its Colour", topic: "Biyoloji", sortOrder: 30, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "When the sea stays warmer than usual, the partnership breaks down."), options: [
      option("o1", "How reefs work and why heat harms them", true, null, "Metin resifin alg ortaklığıyla nasıl çalıştığını, sıcaklığın bu ortaklığı bozarak mercanı nasıl zayıflattığını ve resiflere etkisini anlatır."),
      option("o2", "How coral polyps grow hard skeletons for reefs", false, "detail", "İskelet oluşumu yalnızca ilk paragraftaki bir ayrıntıdır; metnin asıl konusu değildir."),
      option("o3", "Why storms are the main danger to reefs", false, "notstated", "Fırtınaların resiflere zarar verdiği anlatılmaz; tehdit sıcaklıktır."),
      option("o4", "How fishing has changed life on the reef", false, "notstated", "Balıkçılıktan söz edilmez."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, what has a bleached coral lost?", evidence: ev(1, "A bleached coral is not dead, but it has lost its main source of food."), options: [
      option("o1", "Its main supply of food", true, null, "Metin mercanın ana besin kaynağını kaybettiğini söyler."),
      option("o2", "Its hard stone skeleton", false, "reverse", "İskelet kalır; beyaz görünen de odur."),
      option("o3", "All of its living tissue", false, "context", "Doku saydam kalır, yok olmaz."),
      option("o4", "Its place on the reef", false, "notstated", "Yer değiştirmeden söz edilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "scarce" mean in the first paragraph?', evidence: ev(0, "where food is scarce"), options: [
      option("o1", "Available in small amounts", true, null, "Scarce, az bulunan demektir; bu yüzden alglerin ürettiği besin önemlidir."),
      option("o2", "Shared between two partners", false, "context", "Ortaklık ayrı bir fikirdir, kelimenin anlamı değil."),
      option("o3", "Warm and full of sunlight", false, "context", "Cümlede su berraktır ama kelime bunu anlatmaz."),
      option("o4", "Spread across a wide area", false, "notstated", "Yayılma ile ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about reefs that bleach often?", evidence: findEvidence(paragraphs, "Reefs can regrow, yet recovery needs time without new heat stress, and repeated heat leaves less time between shocks."), options: [
      option("o1", "Frequent heat makes recovery harder", true, null, "İyileşme yeni sıcaklık stresi olmadan zaman gerektirdiğinden şoklar sıklaşınca resifin toparlanma şansı azalır."),
      option("o2", "A bleached reef cannot recover at all", false, "extreme", "Metin suyun soğumasıyla renginin dönebileceğini söyler."),
      option("o3", "Reefs recover faster after each event", false, "reverse", "Metin bunun tersini ima eder."),
      option("o4", "Heat waves help young corals grow fast", false, "reverse", "Sıcaklık mercanı zayıflatır."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Resifleri oluşturan mercanlar hayvandır; polipler sert kalsiyum iskeleti büyütür ve bu iskeletler resifi oluşturur.", source: noaaAnimal, checkedOn: "2026-11-25" },
    { claim: "Resif mercanlarının dokularında yaşayan mikroskobik algler fotosentezle besin üretip mercana aktarır ve mercanın renginin büyük kısmını verir.", source: noaa, checkedOn: "2026-11-23" },
    { claim: "Su sıcaklığı olağandan yüksek kaldığında mercan alglerini dışarı atar, beyaz iskeleti görünür; mercan ölmemiştir ama temel besin kaynağını yitirdiği için baskı sürerse ölebilir, koşullar düzelirse iyileşebilir.", source: noaa, checkedOn: "2026-11-23" },
    { claim: "Resifler deniz türlerinin yaklaşık yüzde 25'ini barındırır ve sağlıklı resifler bir dalganın enerjisinin yüzde 97'sine kadarını emebilir.", source: noaaCoast, checkedOn: "2026-11-25" },
    { claim: "Büyük Bariyer Resifi 1990'ların sonundan bu yana birkaç toplu beyazlaşma olayı yaşadı ve iyileşme yeni sıcaklık stresi olmadan zaman gerektirir.", source: gbrmpa, checkedOn: "2026-11-23" },
  ] },
};
