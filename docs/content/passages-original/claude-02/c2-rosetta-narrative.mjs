import { buildFromRows, evidenceOf, option } from "./lib.mjs";

const rows = [
  [
    ["Popular{popüler} accounts{anlatımlar} of{} the{} Rosetta{Rosetta} Stone{Taş} favour{tercih etmek} a{} tidy{düzenli} plot{olay örgüsü}: a{} mysterious{gizemli} slab{levha} is{} unearthed{gün yüzüne çıkarılmak}, a{} brilliant{parlak} scholar{bilgin} reads{okumak} it{}, and{} a{} lost{kayıp} civilisation{uygarlık} speaks{konuşmak} again{tekrar}.", "Rosetta Taşı'nın popüler anlatımları düzenli bir olay örgüsünü tercih eder: gizemli bir levha gün yüzüne çıkarılır, parlak bir bilgin onu okur ve kayıp bir uygarlık yeniden konuşur."],
    ["The{} historical{tarihsel} record{kayıt} resists{direnmek} such{böyle} neatness{düzenlilik}.", "Tarihsel kayıt böyle bir düzenliliğe direnir."],
    ["French{Fransız} soldiers{askerler} found{bulmak} the{} slab{levha} in{-de} seventeen{on yedi} ninety{doksan} nine{dokuz} during{sırasında} Napoleon's{Napolyon (iyelik)} Egyptian{Mısır} campaign{sefer}; after{sonra} the{} French{Fransız} surrender{teslim oluş} it{} passed{geçmek} to{-e} Britain{İngiltere}, which{ki orası} has{} displayed{sergilemek} it{} in{-de} the{} British{İngiliz} Museum{Müze} since{-den beri} eighteen{on sekiz} oh{sıfır} two{iki}.", "Fransız askerler levhayı 1799'da Napolyon'un Mısır seferi sırasında buldu; Fransız teslim oluşundan sonra levha İngiltere'ye geçti ve İngiltere onu 1802'den beri British Museum'da sergiliyor."],
  ],
  [
    ["The{} stone{taş} itself{kendisi} is{} a{} paradox{paradoks}.", "Taşın kendisi bir paradokstur."],
    ["It{} preserves{korumak} one{tek} decree{ferman} in{} three{üç} scripts{yazılar}, which{ki bu} is{} why{neden} some{bazı} specialists{uzmanlar} insist{ısrar etmek} that{ki} it{} is{} bilingual{iki dilli} rather{yerine (rather than)} than{yerine (rather than)} trilingual{üç dilli}: the{} Egyptian{Mısır} text{metin} appears{görünmek} twice{iki kez}, once{bir kez} in{} hieroglyphs{hiyeroglifler} and{} once{bir kez} in{} the{} cursive{el yazısı} Demotic{Demotik}, beside{yanında} a{} Greek{Yunanca} version{sürüm}.", "Tek bir fermanı üç yazıyla korur; bu yüzden bazı uzmanlar onun üç dilli değil iki dilli olduğunda ısrar eder: Mısırca metin bir kez hiyeroglifle, bir kez el yazısı Demotikle, bir Yunanca sürümün yanında iki kez görünür."],
    ["Because{çünkü} scholars{bilginler} could{-ebilirdi} read{okumak} Greek{Yunanca}, the{} slab{levha} promised{vaat etmek} a{} shortcut{kestirme} that{ki} proved{olduğu anlaşıldı (prove + sıfat)} deceptive{aldatıcı}.", "Bilginler Yunancayı okuyabildiği için levha, aldatıcı olduğu anlaşılan bir kestirme vaat etti."],
  ],
  [
    ["The{} obstacle{engel} was{} conceptual{kavramsal} rather{yerine (rather than)} than{yerine (rather than)} linguistic{dilsel}.", "Engel dilsel olmaktan çok kavramsaldı."],
    ["Many{birçok} early{erken} investigators{araştırmacılar} assumed{varsaymak} that{ki} hieroglyphs{hiyeroglifler} were{} purely{tamamen} symbolic{simgesel}, recording{kaydetmek} ideas{fikirler} rather{yerine (rather than)} than{yerine (rather than)} sounds{sesler}, and{} a{} script{yazı} read{okunmak} on{} that{o} premise{öncül} cannot{-amaz} be{olmak} matched{eşleştirilmek} word{sözcük} for{için} word{sözcük} against{karşı} a{} phonetic{fonetik (sesleri temsil eden)} one{olan} such{gibi (such as)} as{gibi (such as)} Greek{Yunanca}.", "Birçok erken araştırmacı hiyerogliflerin tamamen simgesel olduğunu, sesleri değil fikirleri kaydettiğini varsaydı ve bu öncülle okunan bir yazı, Yunanca gibi sesli bir yazıyla sözcük sözcük eşleştirilemez."],
    ["The{} English{İngiliz} polymath{çok yönlü bilgin} Thomas{Thomas} Young{Young} advanced{ilerletmek} the{} problem{sorun} by{-erek} showing{göstermek} that{ki} the{} hieroglyphic{hiyeroglif} and{} Demotic{Demotik} texts{metinler} were{} strikingly{çarpıcı biçimde} alike{benzer}, yet{yine de} he{} stopped{durmak} short{kısa} of{} a{} full{tam} system{sistem}.", "İngiliz çok yönlü bilgin Thomas Young, hiyeroglif ve Demotik metinlerin çarpıcı biçimde benzer olduğunu göstererek sorunu ilerletti; ancak tam bir sisteme ulaşmadan durdu."],
  ],
  [
    ["It{} was{} the{} Frenchman{Fransız} Jean{Jean}-Francois{Francois} Champollion{Champollion} who{ki o} announced{duyurmak} in{-de} eighteen{on sekiz} twenty{yirmi} two{iki} that{ki} many{birçok} signs{işaretler} also{ayrıca} stood{temsil etmek (stand for)} for{temsil etmek (stand for)} sounds{sesler}.", "Birçok işaretin ses de gösterdiğini 1822'de duyuran, Fransız Jean-François Champollion'du."],
    ["That{o} insight{kavrayış} allowed{izin vermek} the{} Egyptian{Mısır} words{sözcükler} to{-mek} be{olmak} read{okunmak} as{olarak} language{dil}, not{değil} merely{sadece} as{olarak} emblems{amblemler}.", "O kavrayış, Mısırca sözcüklerin yalnızca amblemler olarak değil, dil olarak okunmasına izin verdi."],
    ["Yet{yine de} his{onun} achievement{başarı} rested{dayanmak} on{-e} Young's{Young (iyelik)} partial{kısmi} advances{ilerlemeler}, and{} the{} rivalry{rekabet} between{arasında} their{onların} supporters{destekçiler} shaped{şekillendirmek} how{nasıl} the{} story{hikâye} was{} later{daha sonra} told{anlatılmak}.", "Yine de onun başarısı Young'ın kısmi ilerlemelerine dayanıyordu ve destekçileri arasındaki rekabet, hikâyenin sonradan nasıl anlatıldığını şekillendirdi."],
  ],
  [
    ["Seen{görülmek} this{bu} way{biçim}, the{} Rosetta{Rosetta} Stone{Taş} is{} less{daha az} a{} key{anahtar} than{-den} a{} prompt{uyarıcı}.", "Bu açıdan bakıldığında Rosetta Taşı bir anahtardan çok bir uyarıcıdır."],
    ["It{} gave{vermek} scholars{bilginler} the{} occasion{fırsat} to{-mek} question{sorgulamak} an{} assumption{varsayım} that{ki} had{} gone{gitmek} unchallenged{sorgulanmamış} for{boyunca} centuries{yüzyıllar}.", "Bilginlere yüzyıllardır sorgulanmamış bir varsayımı sorgulama fırsatı verdi."],
    ["The{} lesson{ders} for{için} historians{tarihçiler} is{} that{ki} the{} most{en} famous{ünlü} object{nesne} in{} a{} story{hikâye} is{} not{} always{her zaman} the{} most{en} important{önemli} one{olan}; the{} decisive{belirleyici} change{değişim} is{} often{sıklıkla} a{} change{değişim} in{} how{nasıl} people{insanlar} think{düşünmek}.", "Tarihçiler için ders, bir hikâyedeki en ünlü nesnenin her zaman en önemli olmadığıdır; belirleyici değişim çoğu zaman insanların nasıl düşündüğündeki değişimdir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-rosetta-narrative", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const brit = "Encyclopaedia Britannica, Rosetta Stone; https://britannica.com/topic/Rosetta-Stone";
const smith = "Smithsonian Magazine, Rosetta Stone, hieroglyphs and Champollion's decipherment; https://www.smithsonianmag.com/history/rosetta-stone-hieroglyphs-champollion-decipherment-egypt-180980834/";

export default {
  slug: "c2-rosetta-narrative", level: "C2", title: "Beyond the Tidy Plot", topic: "Tarih", sortOrder: 13, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central thesis?", evidence: ev(4, "The lesson for historians is that the most famous object in a story is not always the most important one"), options: [
      option("o1", "Thinking mattered more than the stone", true, null, "Metin belirleyici değişimin düşünme biçimindeki değişim olduğunu savunur."),
      option("o2", "The stone made decipherment straightforward", false, "reverse", "Metin bunun aldatıcı bir kestirme olduğunu söyler."),
      option("o3", "Greek mattered more than the Egyptian scripts", false, "reverse", "Metin Mısırca sistemin çözülmesini vurgular."),
      option("o4", "Champollion's role has been exaggerated", false, "extreme", "Metin Champollion'un başarısını kabul eder."),
    ] },
    { key: "q2", type: "detail", prompt: "Why do some specialists call the stone bilingual?", evidence: ev(1, "the Egyptian text appears twice, once in hieroglyphs and once in the cursive Demotic, beside a Greek version"), options: [
      option("o1", "Egyptian appears twice, beside Greek", true, null, "Mısırca iki kez, Yunancanın yanında görünür."),
      option("o2", "It carries only Greek and Latin text", false, "notstated", "Latince anlatılmaz."),
      option("o3", "It was carved by two different civilisations", false, "notstated", "Böyle bir bilgi yoktur."),
      option("o4", "It has been repaired using other inscriptions", false, "notstated", "Onarım anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “deceptive” mean in the second paragraph?", evidence: ev(1, "a shortcut that proved deceptive"), options: [
      option("o1", "Misleading in appearance", true, null, "Deceptive, görünüşteki kolaylığıyla yanıltıcı demektir."),
      option("o2", "Carefully planned in advance", false, "reverse", "Tersini anlatır."),
      option("o3", "Fully understood by everyone", false, "reverse", "Tersini anlatır."),
      option("o4", "Secretly controlled by Britain", false, "notstated", "Gizli denetim anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about popular accounts?", evidence: ev(0, "Popular accounts of the Rosetta Stone favour a tidy plot"), options: [
      option("o1", "They simplify a more complicated history", true, null, "Metin popüler anlatımların düzenli bir olay örgüsünü tercih ettiğini söyler."),
      option("o2", "They are mostly written by Egyptian scholars", false, "notstated", "Yazarlar anlatılmaz."),
      option("o3", "They avoid mentioning any scholar at all", false, "reverse", "Bir bilgin anılır."),
      option("o4", "They describe the stone's weight in detail", false, "notstated", "Ağırlık anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Taş 1799'da Mısır'da Fransız askerlerce bulundu; aynı ferman hiyeroglif, Demotik ve Yunanca yazılıdır (bazı bilginlere göre iki dilli, üç yazılı).", source: brit, checkedOn: "2026-11-23" },
    { claim: "Fransız teslimiyetinden sonra taş İngiltere'ye geçti; 1802'den beri British Museum'da sergileniyor.", source: smith, checkedOn: "2026-11-23" },
    { claim: "Thomas Young hiyeroglif ve Demotik metinler arasındaki benzerlikleri gösterdi; Champollion 1822'de birçok işaretin ses de gösterdiğini duyurdu.", source: smith, checkedOn: "2026-11-23" },
  ] },
};
