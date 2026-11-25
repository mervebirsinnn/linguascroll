import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["An{} octopus{ahtapot} is{} a{} soft{yumuşak} sea{deniz} animal{hayvan} with{} eight{sekiz} arms{kollar}.", "Ahtapot, sekiz kolu olan yumuşak bir deniz hayvanıdır."],
    ["It{} has{sahiptir} no{hiç} bones{kemikler}, so{bu yüzden} it{} can{-ebilir} squeeze{sıkışmak} through{içinden} very{çok} small{küçük} holes{delikler}.", "Hiç kemiği yoktur, bu yüzden çok küçük deliklerden sıkışarak geçebilir."],
    ["But{ama} the{} most{en} surprising{şaşırtıcı} things{şeyler} about{hakkında} it{} are{} inside{içinde} its{onun} body{vücut}.", "Ama en şaşırtıcı şeyler vücudunun içindedir."],
    ["Scientists{bilim insanları} often{sık sık} study{incelemek} it{} to{-mek için} learn{öğrenmek} how{ne kadar} clever{zeki} animals{hayvanlar} can{-ebilir} be{}.", "Bilim insanları hayvanların ne kadar zeki olabileceğini öğrenmek için onu sık sık inceler."],
  ],
  [
    ["First{ilk olarak}, an{} octopus{ahtapot} has{sahiptir} three{üç} hearts{kalpler}.", "Birincisi, bir ahtapotun üç kalbi vardır."],
    ["Two{iki} hearts{kalpler} push{itmek} blood{kan} through{içinden} the{} gills{solungaçlar}, and{} the{} third{üçüncü} sends{gönderir} it{} around{çevresine} the{} rest{geri kalan} of{} the{} body{vücut}.", "İki kalp kanı solungaçlardan geçirir, üçüncüsü ise onu vücudun geri kalanına gönderir."],
    ["Its{onun} blood{kan} is{} blue{mavi}, because{çünkü} it{} carries{taşır} oxygen{oksijen} with{ile} a{} substance{madde} that{ki} contains{içerir} copper{bakır}.", "Kanı mavidir, çünkü oksijeni bakır içeren bir maddeyle taşır."],
    ["Our{bizim} blood{kan} is{} red{kırmızı}, because{çünkü} it{} uses{kullanır} iron{demir}.", "Bizim kanımız kırmızıdır, çünkü demir kullanır."],
    ["Without{olmadan} these{bu} special{özel} hearts{kalpler}, an{} octopus{ahtapot} could{-ebilirdi} not{değil} live{yaşamak} for{} long{uzun}.", "Bu özel kalpler olmadan bir ahtapot uzun süre yaşayamazdı."],
  ],
  [
    ["An{} octopus{ahtapot} also{ayrıca} has{sahiptir} a{} clever{zeki} nervous{sinir} system{sistem}.", "Bir ahtapotun ayrıca zeki bir sinir sistemi vardır."],
    ["About{yaklaşık} two{iki} thirds{üçte} of{} its{onun} nerve{sinir} cells{hücreler} are{} in{} its{} arms{kollar}, not{değil} in{} its{} head{baş}.", "Sinir hücrelerinin yaklaşık üçte ikisi başında değil, kollarındadır."],
    ["Because{çünkü} of{-den dolayı} this{}, each{her} arm{kol} can{-ebilir} do{yapmak} some{bazı} work{iş} by{ile} itself{kendi başına}.", "Bu yüzden her kol bazı işleri kendi başına yapabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-octopus-hearts", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const pbs = "PBS Nature, Octopus (other species); https://www.pbs.org/wnet/nature/group/other-species/octopus/";
const smith = "Smithsonian Magazine, Ten wild facts about octopuses: they have three hearts, big brains and blue blood; https://www.smithsonianmag.com/science-nature/ten-wild-facts-about-octopuses-they-have-three-hearts-big-brains-and-blue-blood-7625828/";

export default {
  slug: "b1-octopus-hearts", level: "B1", title: "The Animal With Three Hearts", topic: "Biyoloji", sortOrder: 17, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "But the most surprising things about it are inside its body."), options: [
      option("o1", "Surprising octopus body facts", true, null, "Metin ahtapotun vücudundaki şaşırtıcı özellikleri anlatır."),
      option("o2", "How octopuses hunt in the dark sea", false, "notstated", "Avlanma anlatılmaz."),
      option("o3", "Why octopuses change colour to hide", false, "notstated", "Renk değiştirme anlatılmaz."),
      option("o4", "How octopuses walk across the sea floor", false, "notstated", "Yürüme anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Why is an octopus's blood blue?", evidence: ev(1, "Its blood is blue, because it carries oxygen with a substance that contains copper."), options: [
      option("o1", "It uses a substance with copper.", true, null, "Metin mavi rengi bakırlı maddeye bağlar."),
      option("o2", "It lives very deep under the cold sea.", false, "context", "Metin derinlikten söz etmez."),
      option("o3", "It uses iron, just like human blood does.", false, "reverse", "Demir insan kanı içindir."),
      option("o4", "It has three hearts that make it blue.", false, "context", "Kalp sayısı rengi açıklamaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “squeeze” mean in the first paragraph?", evidence: ev(0, "it can squeeze through very small holes"), options: [
      option("o1", "Push into a very tight space", true, null, "Squeeze, dar bir yerden zorla geçmek demektir."),
      option("o2", "Grow very tall very quickly", false, "context", "Büyümeyle ilgili değil."),
      option("o3", "Shine in the dark sea water", false, "context", "Işıkla ilgisi yok."),
      option("o4", "Sleep for hours on the sea floor", false, "context", "Uyumak anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about an octopus's arms?", evidence: findEvidence(paragraphs, "About two thirds of its nerve cells are in its arms, not in its head."), options: [
      option("o1", "The head may not control every move.", true, null, "Sinir hücrelerinin çoğu kollarda olduğu için baş her hareketi yönetmeyebilir."),
      option("o2", "The arms are controlled only by the hearts.", false, "notstated", "Kalplerin kolları yönettiği söylenmez."),
      option("o3", "The arms cannot sense anything at all.", false, "reverse", "Sinir hücreleri kolların hissedebildiğini ima eder."),
      option("o4", "The head has two thirds of the nerve cells.", false, "reverse", "Oran kollar içindir; baş için değil."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Ahtapotun üç kalbi vardır: ikisi kanı solungaçlara, biri vücuda pompalar.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Kanı, bakır içeren hemosiyanin proteini yüzünden mavidir; insan kanı demirli hemoglobin kullanır.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Sinir hücrelerinin yaklaşık üçte ikisi kollardadır (kaynaklar oranı biraz farklı verir; en yaygın değer üçte iki).", source: pbs, checkedOn: "2026-11-23" },
  ] },
};
