import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{} the{} late{son dönem} eighteenth{on sekizinci} century{yüzyıl}, many{birçok} people{insanlar} in{} Britain{Britanya} lived{yaşardı} in{} the{} countryside{kırsal}.", "On sekizinci yüzyılın sonlarında Britanya'da birçok insan kırsalda yaşardı."],
    ["They{} worked{çalışırdı} the{} land{toprak} or{} made{yapardı} things{şeyler} at{} home{ev}, using{kullanarak} simple{basit} tools{aletler}.", "Toprakta çalışır ya da evde basit aletler kullanarak bir şeyler yapardı."],
    ["Then{sonra} came{geldi} machines{makineler} that{ki} could{-ebilirdi} do{yapmak} the{} same{aynı} work{iş} faster{daha hızlı}, and{} steam{buhar} engines{makineler} that{ki} could{-ebilirdi} drive{çalıştırmak} them{}.", "Sonra aynı işi daha hızlı yapabilen makineler ve onları çalıştırabilen buhar makineleri geldi."],
    ["Because{çünkü} these{} engines{makineler} burned{yaktı} coal{kömür}, a{} new{yeni} industrial{sanayi} economy{ekonomi} was{} built{inşa edildi} on{üzerine} it{}, and{} production{üretim} moved{taşındı} out{dışarı} of{} the{} cottage{kır evi} and{} into{içine} the{} factory{fabrika}.", "Bu makineler kömür yaktığı için kömür üzerine yeni bir sanayi ekonomisi kuruldu ve üretim kır evinden çıkıp fabrikaya taşındı."],
  ],
  [
    ["Factories{fabrikalar} drew{çekti} people{insanlar} towards{-e doğru} them{}.", "Fabrikalar insanları kendilerine çekti."],
    ["Towns{kasabalar} near{yakınındaki} coalfields{kömür havzaları} swelled{hızla büyüdü}, and{} Manchester{Manchester}, a{} small{küçük} place{yer} in{} earlier{daha önceki} centuries{yüzyıllar}, became{oldu} a{} symbol{simge} of{} the{} change{değişim}.", "Kömür havzalarına yakın kasabalar hızla büyüdü ve önceki yüzyıllarda küçük bir yer olan Manchester bu değişimin simgesi oldu."],
    ["Many{birçok} households{haneler} probably{muhtemelen} were{} not{} connected{bağlı} to{-e} clean{temiz} water{su} or{} sewers{kanalizasyon}.", "Birçok hane muhtemelen temiz suya ya da kanalizasyona bağlı değildi."],
    ["Deadly{ölümcül} diseases{hastalıklar} such{(such as) gibi} as{(such as) gibi} cholera{kolera} returned{geri döndü} to{-e} these{bu} districts{mahalleler} again{tekrar} and{} again{tekrar}.", "Kolera gibi ölümcül hastalıklar bu mahallelere tekrar tekrar geri döndü."],
    ["By{-e kadar} 1851, more{daha fazla} than{-den} half{yarı} of{} the{} people{insanlar} in{} Britain{Britanya} lived{yaşıyordu} in{} towns{kasabalar} or{} cities{şehirler}.", "1851'e gelindiğinde Britanya'daki insanların yarısından fazlası kasabalarda ya da şehirlerde yaşıyordu."],
  ],
  [
    ["The{} crisis{kriz} forced{zorladı} a{} response{tepki}.", "Kriz bir tepkiyi zorunlu kıldı."],
    ["Councils{belediyeler} were{} told{söylendi} to{-mek} supply{sağlamak} clean{temiz} water{su}, keep{tutmak} sewers{kanalizasyonlar} in{} good{iyi} condition{durum}, and{} appoint{atamak} officers{görevliler} to{-mek için} look{(look after) bakmak} after{(look after) bakmak} public{halk} health{sağlık}.", "Belediyelere temiz su sağlamaları, kanalizasyonları iyi durumda tutmaları ve halk sağlığına bakacak görevliler atamaları söylendi."],
    ["As{(as a result) sonuç olarak} a{(as a result) sonuç olarak} result{(as a result) sonuç olarak}, people{insanlar} began{başladı} to{-mek} live{yaşamak} longer{daha uzun}, healthier{daha sağlıklı} lives{hayatlar}.", "Sonuç olarak insanlar daha uzun, daha sağlıklı yaşamaya başladı."],
    ["Railways{demiryolları} brought{getirdi} a{} wider{daha geniş} variety{çeşit} of{} affordable{uygun fiyatlı} food{yiyecek} into{içine} large{büyük} towns{kasabalar} and{} cities{şehirler}.", "Demiryolları büyük kasabalara ve şehirlere daha geniş çeşitte, uygun fiyatlı yiyecek getirdi."],
    ["The{} industrial{sanayi} city{şehir} was{} thus{böylece} a{} problem{sorun} and{} a{} laboratory{laboratuvar} at{} the{} same{aynı} time{zaman}.", "Böylece sanayi şehri aynı anda hem bir sorun hem de bir laboratuvardı."],
    ["Many{birçok} of{} the{} services{hizmetler} a{} modern{modern} town{kasaba} takes{alır} for{(take for granted) olağan saymak} granted{verilmiş} grew{(grow out of) doğmak} out{(grow out of) doğmak} of{} this{bu} crisis{kriz}.", "Modern bir kasabanın olağan saydığı hizmetlerin çoğu bu krizden doğdu."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-industrial-revolution-cities", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const smg = "Science Museum Group Blog, Climate and the collection; https://blog.sciencemuseumgroup.org.uk/climate-and-the-collection/";
const campop = "Cambridge Group for the History of Population and Social Structure, Urban society; https://www.campop.geog.cam.ac.uk/blog/2024/10/31/urban-society/";
const uom = "The University of Manchester, Cottonopolis: origins of global Manchester opens; https://www.manchester.ac.uk/about/news/cottonopolis-origins-of-global-manchester-opens/";
const ncl = "Newcastle University, Health and the People, Public Health Reforms; https://healthandthepeople.ncl.ac.uk/?p=792";
const oxf = "University of Oxford Department for Continuing Education, Railways, Economy and Society in the Nineteenth Century; https://lifelong-learning.ox.ac.uk/courses/railways-economy-and-society-in-the-nineteenth-century";

export default {
  slug: "b2-industrial-revolution-cities", level: "B2", title: "Smoke, Crowds and Sewers", topic: "Tarih", sortOrder: 31, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(0, "production moved out of the cottage and into the factory"), options: [
      option("o1", "How factories reshaped British towns", true, null, "Metin fabrikaların insanları kasabalara çekmesini, sorunları ve getirilen çözümleri anlatır."),
      option("o2", "How steam engines were invented and sold abroad", false, "notstated", "İcat ya da ihracat anlatılmaz."),
      option("o3", "Why cholera was first found in Manchester", false, "notstated", "Koleranın ilk nerede görüldüğü söylenmez."),
      option("o4", "Why farming grew in British villages", false, "reverse", "Metin insanların topraktan fabrikaya geçtiğini anlatır."),
    ] },
    { key: "q2", type: "detail", prompt: "What were many households not connected to?", evidence: ev(1, "households probably were not connected to clean water or sewers"), options: [
      option("o1", "Clean water or sewers", true, null, "Metin birçok hanenin temiz suya ya da kanalizasyona bağlı olmadığını söyler."),
      option("o2", "Churches and local schools", false, "notstated", "Kilise ve okullardan söz edilmez."),
      option("o3", "Coal for the steam engines", false, "context", "Kömür makineler ve sanayi ekonomisi için geçer, hanelerin bağlantısıyla ilgili değildir."),
      option("o4", "Railway lines to the farms", false, "context", "Demiryolları yiyecek taşımayla ilgili geçer."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "swelled" mean in the second paragraph?', evidence: ev(1, "Towns near coalfields swelled"), options: [
      option("o1", "Grew much larger", true, null, "Swell burada nüfusun hızla artıp kasabanın büyümesi demektir."),
      option("o2", "Became much emptier", false, "reverse", "İnsanlar fabrikalara çekildiği için tersi olur."),
      option("o3", "Filled with seawater", false, "context", "Kelimenin fiziksel şişme anlamı bu bağlama uymaz."),
      option("o4", "Turned into farmland", false, "reverse", "Kasabalar tarım alanına dönüşmedi."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the last paragraph suggest about modern city services?", evidence: findEvidence(paragraphs, "Many of the services a modern town takes for granted grew out of this crisis."), options: [
      option("o1", "Today's city services grew out of past crises", true, null, "Metin hizmetlerin bu krizden doğduğunu söyler; yani geçmiş sorunlara yanıt olarak ortaya çıktılar."),
      option("o2", "Industrial cities solved every problem before they grew large", false, "extreme", "Sorunlar şehirler büyüdükten sonra çözülmeye çalışıldı."),
      option("o3", "Public services began in quiet country villages", false, "reverse", "Metin bu hizmetlerin sanayi şehrinin krizinden doğduğunu söyler."),
      option("o4", "Modern towns have no need for public services", false, "reverse", "Metin bu hizmetlerin olağan sayıldığını söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "18. yüzyıl sonunda birçok insan kırsalda yaşıyor, toprakta çalışıyor ya da evde basit aletlerle bir şeyler yapıyordu; fabrikalar ilk kez çalışmaya başladı ve kömür yakmaya dayalı yeni bir sanayi ekonomisi doğdu.", source: smg, checkedOn: "2026-11-25" },
    { claim: "Hızla büyüyen kasabaların ortak özelliği kömür havzalarına yakınlıktı; Liverpool ve Manchester gibi kasabalar önceki yüzyıllarda küçük ya da önemsizdi. Manchester pamuk sanayisinin merkezi oldu ('Cottonopolis').", source: campop + "; " + uom, checkedOn: "2026-11-25" },
    { claim: "Sağlık yasaları yerel yönetimleri tüm hanelere temiz su ve kanalizasyon bağlamaya yöneltti (1848, 1875); kolera tekrar tekrar geri döndü; belediyelerden temiz su sağlamaları, kanalizasyonları iyi durumda tutmaları, tıbbi görevli ve sağlık müfettişi atamaları istendi; insanlar daha uzun ve sağlıklı yaşamaya başladı. (Kaynak, hanelerin bağlı olmadığını doğrudan değil, tüm hanelerin bağlanması hedefi üzerinden ima eder.)", source: ncl, checkedOn: "2026-11-25" },
    { claim: "1851'e gelindiğinde nüfusun yarısından fazlası kasaba ve şehirlerde yaşıyordu; Britanya ilk ağırlıklı kentli toplumdu.", source: campop, checkedOn: "2026-11-25" },
    { claim: "Demiryolları büyük kasaba ve şehirlere daha geniş çeşitte, daha uygun fiyatlı yiyecek getirilmesini sağladı.", source: oxf, checkedOn: "2026-11-25" },
  ] },
};
