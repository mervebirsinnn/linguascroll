import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Every{her} telescope{teleskop} is{}, in{içinde} a{} sense{anlam}, a{} time{zaman} machine{makine}, but{ama} the{} James{James} Webb{Webb} Space{uzay} Telescope{teleskop} makes{yapmak} that{o} claim{iddia} unusually{olağandışı biçimde} literal{harfi harfine}.", "Her teleskop bir anlamda bir zaman makinesidir; ancak James Webb Uzay Teleskobu bu iddiayı olağandışı biçimde harfi harfine kılar."],
    ["Launched{fırlatılmak} on{-de (günler için)} Christmas{Noel} Day{günü} in{} two{iki} thousand{bin} twenty{yirmi} one{bir}, it{} now{şimdi} orbits{yörüngede dönmek} near{yakınında} the{} second{ikinci} Sun{Güneş}-Earth{Dünya} Lagrange{Lagrange} point{nokta}, roughly{kabaca} one{bir} and{} a{} half{buçuk} million{milyon} kilometres{kilometre} from{-den} Earth{Dünya}, where{ki orada} the{} combined{birleşik} gravity{yerçekimi} of{} the{} two{iki} bodies{cisimler} lets{izin vermek} it{} hold{tutmak} a{} stable{kararlı} position{konum} economically{ekonomik biçimde}.", "2021'de Noel günü fırlatılan teleskop, şimdi ikinci Güneş-Dünya Lagrange noktasının yakınında, Dünya'dan kabaca bir buçuk milyon kilometre uzakta yörüngede dönüyor; orada iki cismin birleşik yerçekimi onun kararlı bir konumu ekonomik biçimde korumasına izin veriyor."],
    ["Its{onun} purpose{amaç} is{} to{-mek} collect{toplamak} infrared{kızılötesi} light{ışık} from{-den} objects{nesneler} so{öyle} distant{uzak} that{ki} their{onların} radiation{ışıma} has{} been{} travelling{yolculuk etmek} for{boyunca} billions{milyarlarca} of{} years{yıl}.", "Amacı, ışımaları milyarlarca yıldır yol alan, öyle uzak nesnelerden kızılötesi ışık toplamaktır."],
  ],
  [
    ["Infrared{kızılötesi} observation{gözlem} demands{talep etmek} extreme{aşırı} thermal{ısıl} discipline{disiplin}, since{çünkü} warmth{sıcaklık} from{-den} the{} instrument{aygıt} itself{kendisi} would{-ecekti} drown{boğmak} out{dışarı} the{} faint{soluk} signals{sinyaller} it{} is{} built{inşa edilmek} to{-mek} detect{algılamak}.", "Kızılötesi gözlem aşırı ısıl disiplin gerektirir, çünkü aygıtın kendi sıcaklığı algılamak için yapıldığı soluk sinyalleri bastırırdı."],
    ["That{o} requirement{gereksinim} helps{yardım etmek} explain{açıklamak} both{ikisi de} the{} remote{uzak} orbit{yörünge} and{} the{} delicate{hassas} engineering{mühendislik} of{} the{} observatory{gözlemevi}.", "Bu gereksinim, gözlemevinin hem uzak yörüngesini hem de hassas mühendisliğini açıklamaya yardım eder."],
    ["Its{onun} primary{birincil} mirror{ayna}, about{yaklaşık} six{altı} and{} a{} half{buçuk} metres{metre} wide{geniş}, is{} assembled{birleştirilmek} from{-den} eighteen{on sekiz} hexagonal{altıgen} segments{parçalar} coated{kaplı} with{ile} gold{altın}, and{} the{} segments{parçalar} are{} aligned{hizalanmak} so{öyle} precisely{hassas biçimde} that{ki} they{} function{işlev görmek} as{olarak} a{} single{tek} surface{yüzey}.", "Yaklaşık altı buçuk metre genişliğindeki birincil ayna, altınla kaplı on sekiz altıgen parçadan birleştirilmiştir ve parçalar o kadar hassas hizalanmıştır ki tek bir yüzey gibi işlev görür."],
  ],
  [
    ["Collecting{toplamak} light{ışık}, however{ancak}, is{} only{yalnızca} the{} beginning{başlangıç} of{} the{} scientific{bilimsel} labour{emek}.", "Ancak ışık toplamak bilimsel emeğin yalnızca başlangıcıdır."],
    ["A{} faint{soluk} smear{leke} of{} infrared{kızılötesi} radiation{ışıma} does{} not{} announce{duyurmak} its{onun} own{kendi} meaning{anlam}; astronomers{gökbilimciler} must{-meli} infer{çıkarım yapmak} distance{mesafe}, age{yaş} and{} composition{bileşim} from{-den} patterns{örüntüler} in{} the{} signal{sinyal}, each{her biri} inference{çıkarım} resting{dayanmak} on{-e} models{modeller} that{ki} can{-ebilir} themselves{kendileri} be{olmak} revised{gözden geçirilmek}.", "Soluk bir kızılötesi ışıma lekesi kendi anlamını ilan etmez; gökbilimciler sinyaldeki örüntülerden mesafeyi, yaşı ve bileşimi çıkarmalıdır; her çıkarım da kendileri gözden geçirilebilen modellere dayanır."],
    ["Early{erken} results{sonuçlar} from{-den} any{herhangi bir} new{yeni} instrument{aygıt} therefore{bu nedenle} tend{eğilimli olmak} to{-mek} provoke{kışkırtmak} vigorous{güçlü} disagreement{anlaşmazlık} before{önce} they{} settle{yerleşmek} into{içine} consensus{uzlaşı}.", "Herhangi bir yeni aygıtın erken sonuçları bu nedenle uzlaşıya yerleşmeden önce güçlü bir anlaşmazlığı kışkırtma eğilimindedir."],
  ],
  [
    ["That{o} disagreement{anlaşmazlık} should{-meli} not{değil} be{olmak} mistaken{yanlış anlamak} for{için} failure{başarısızlık}.", "Bu anlaşmazlık başarısızlıkla karıştırılmamalı."],
    ["On{üzerinde} the{} contrary{tersine}, it{} is{} the{} ordinary{olağan} mechanism{mekanizma} by{ile} which{ki} a{} new{yeni} kind{tür} of{} evidence{kanıt} is{} tested{sınanmak} against{karşı} existing{mevcut} theory{teori}.", "Tersine, yeni türden bir kanıtın mevcut teoriye karşı sınanmasının olağan mekanizmasıdır."],
    ["A{} telescope{teleskop} that{ki} only{yalnızca} confirmed{doğrulamak} what{ne} astronomers{gökbilimciler} already{zaten} believed{inanmak} would{-ecekti} be{olmak} a{} poor{zayıf} investment{yatırım}, however{ne kadar olursa olsun} magnificent{muhteşem} its{onun} mirror{ayna}.", "Gökbilimcilerin zaten inandığını yalnızca doğrulayan bir teleskop, aynası ne kadar muhteşem olursa olsun zayıf bir yatırım olurdu."],
  ],
  [
    ["What{ne} Webb{Webb} ultimately{nihayetinde} offers{sunmak} is{} not{değil} a{} finished{tamamlanmış} picture{resim} of{} the{} early{erken} universe{evren} but{ama} a{} better{daha iyi} set{küme} of{} questions{sorular}.", "Webb'in nihayetinde sunduğu, erken evrenin tamamlanmış bir resmi değil, daha iyi bir soru kümesidir."],
    ["Whether{-ip -mediği} those{o} questions{sorular} will{-ecek} be{olmak} answered{cevaplanmak} within{içinde} a{} decade{on yıl} or{ya da} a{} generation{nesil} remains{kalmak} uncertain{belirsiz}, and{} honest{dürüst} accounts{anlatımlar} of{} the{} mission{görev} acknowledge{kabul etmek} as{kadar} much{çok}.", "Bu soruların bir on yıl içinde mi yoksa bir nesil içinde mi cevaplanacağı belirsiz kalıyor ve görevin dürüst anlatımları bunu kabul ediyor."],
    ["Looking{bakmak} further{daha uzağa} has{} rarely{nadiren} produced{üretmek} simpler{daha basit} answers{cevaplar}; it{} has{} usually{genellikle} produced{üretmek} better{daha iyi} arguments{tartışmalar}.", "Daha uzağa bakmak nadiren daha basit cevaplar üretti; genellikle daha iyi tartışmalar üretti."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-webb-reading-the-dark", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nasa = "NASA Scientific Visualization Studio, James Webb Space Telescope Launch and Orbit at L2; https://svs.gsfc.nasa.gov/4991/";
const brit = "Encyclopaedia Britannica, James Webb Space Telescope; https://www.britannica.com/topic/James-Webb-Space-Telescope";

export default {
  slug: "c2-webb-reading-the-dark", level: "C2", title: "Reading the Dark", topic: "Bilim", sortOrder: 12, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best captures the author's central argument?", evidence: ev(3, "On the contrary, it is the ordinary mechanism by which a new kind of evidence is tested against existing theory."), options: [
      option("o1", "Evidence advances via disagreement", true, null, "Metin anlaşmazlığı yeni kanıtın sınanmasının olağan mekanizması olarak sunar."),
      option("o2", "Webb has already settled the early universe", false, "reverse", "Metin sonuçların henüz uzlaşıya yerleşmediğini söyler."),
      option("o3", "Bigger mirrors guarantee reliable theory", false, "reverse", "Ayna büyüklüğü teori güvenilirliğini garanti etmez."),
      option("o4", "Infrared work is easier than visible light", false, "reverse", "Metin kızılötesi gözlemin ısıl disiplin gerektirdiğini anlatır."),
    ] },
    { key: "q2", type: "detail", prompt: "How is Webb's primary mirror constructed?", evidence: findEvidence(paragraphs, "assembled from eighteen hexagonal segments coated with gold"), options: [
      option("o1", "Eighteen gold-coated hexagonal segments", true, null, "Metin bunu açıkça söyler."),
      option("o2", "Eighteen hexagonal segments of polished glass", false, "detail", "Segmentler altın kaplıdır."),
      option("o3", "Eighteen square segments coated with gold", false, "detail", "Segmentler altıgendir."),
      option("o4", "Six large hexagonal segments with gold", false, "detail", "Segment sayısı on sekizdir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “provoke” mean in the third paragraph?", evidence: ev(2, "tend to provoke vigorous disagreement"), options: [
      option("o1", "Stir up a response", true, null, "Provoke, bir tepkiyi harekete geçirmek demektir."),
      option("o2", "Prevent from happening", false, "reverse", "Engellemenin tersidir."),
      option("o3", "Explain in detail", false, "context", "Açıklama anlamı yoktur."),
      option("o4", "Quietly record", false, "context", "Kayıt etme anlamı yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about a telescope that only confirmed old beliefs?", evidence: findEvidence(paragraphs, "A telescope that only confirmed what astronomers already believed would be a poor investment"), options: [
      option("o1", "A good telescope should challenge theory", true, null, "Yalnızca doğrulayan teleskop zayıf yatırım sayılır; yeni kanıt teoriyi sınamalıdır."),
      option("o2", "Its mirror would need to be bigger", false, "notstated", "Ayna büyüklüğünden değil, sonuçların değerinden söz edilir."),
      option("o3", "It would cost less to build and run", false, "notstated", "Maliyet karşılaştırması anlatılmaz."),
      option("o4", "It would be best for studying nearby stars", false, "notstated", "Yakın yıldızlar anlatılmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "JWST 25 Aralık 2021'de fırlatıldı ve Dünya'dan yaklaşık 1,5 milyon km uzaktaki Güneş-Dünya L2 noktası çevresinde yörüngededir; iki cismin birleşik yerçekimi kararlı bir konumu korumayı kolaylaştırır.", source: nasa, checkedOn: "2026-11-23" },
    { claim: "JWST bir kızılötesi gözlemevidir; yaklaşık 6,5 m'lik, altın kaplı ana aynası 18 altıgen parçadan oluşur; uzak nesnelerden gelen ışık milyarlarca yıl yol alır.", source: brit, checkedOn: "2026-11-23" },
  ] },
};
