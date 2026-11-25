import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["It{} is{} tempting{cazip} to{-mek} treat{saymak} The{} Starry{yıldızlı} Night{gece} as{olarak} a{} transcription{kopya} of{} what{ne} Vincent{Vincent} van{van} Gogh{Gogh} saw{gördü} from{-den} his{} window{pencere} at{-de} the{} asylum{akıl hastanesi} in{} Saint{Saint}-Remy{Remy}.", "Yıldızlı Gece'yi Vincent van Gogh'un Saint-Rémy'deki akıl hastanesinde penceresinden gördüğünün bir kopyası saymak cazip gelir."],
    ["That{o} reading{okuma} treats{ele almak} a{} complex{karmaşık} work{eser} as{olarak} a{} simple{basit} document{belge}.", "O okuma karmaşık bir eseri basit bir belge gibi ele alır."],
    ["The{} museum{müze} that{ki} owns{sahip olmak} it{}, the{} Museum{Müze} of{} Modern{Modern} Art{Sanat} in{} New{Yeni} York{York}, encourages{teşvik etmek} a{} subtler{daha ince} reading{okuma}.", "Ona sahip olan New York'taki Modern Sanat Müzesi daha ince bir okumayı teşvik eder."],
    ["The{} painting{tablo}, made{yapılmak} in{} mid{orta}-June{Haziran} of{} eighteen{on sekiz} eighty{seksen} nine{dokuz} during{sırasında} the{} roughly{kabaca} twelve{on iki} months{ay} Van{van} Gogh{Gogh} spent{harcamak} there{orada}, rests{dayanmak} on{-e} his{} direct{doğrudan} observation{gözlem} as{kadar} well{iyi} as{} on{-e} his{} imagination{hayal gücü}, memories{anılar} and{} emotions{duygular}.", "Van Gogh'un orada geçirdiği yaklaşık on iki ay sırasında Haziran 1889'un ortasında yapılan tablo, hayal gücüne, anılarına ve duygularına olduğu kadar doğrudan gözlemine de dayanır."],
  ],
  [
    ["The{} evidence{kanıt} for{için} that{o} mixture{karışım} is{} visible{görünür} in{} the{} picture{resim}.", "O karışımın kanıtı resimde görünür."],
    ["Close{yakın} looking{bakmak} rewards{ödüllendirmek} patience{sabır}: the{} brushwork{fırça işi}, the{} colour{renk} and{} the{} composition{kompozisyon} all{hepsi} serve{hizmet etmek} the{} mood{ruh hali} more{daha fazla} than{-den} the{} map{harita}.", "Yakından bakmak sabrı ödüllendirir: fırça işi, renk ve kompozisyon haritadan çok ruh haline hizmet eder."],
    ["The{} morning{sabah} star{yıldız} glows{parlar} as{olarak} it{} did{(önceki fiilin yerine) olduğu gibi} before{önce} dawn{şafak}; Van{van} Gogh{Gogh} described{tanımlamak} seeing{görmek} it{} from{-den} his{} window{pencere} in{} a{} letter{mektup} to{-e} his{} brother{kardeş} Theo{Theo}.", "Sabah yıldızı şafaktan önce olduğu gibi parlar; Van Gogh onu penceresinden gördüğünü kardeşi Theo'ya yazdığı bir mektupta anlattı."],
    ["The{} village{köy} below{aşağıdaki}, by{tarafından} contrast{zıtlık}, is{} an{} invention{icat}: it{} belongs{ait} to{-e} the{} landscape{manzara} of{} memory{bellek} and{} imagination{hayal gücü} rather{yerine (rather than)} than{yerine (rather than)} to{-e} the{} view{manzara} outside{dışarıdaki}.", "Aşağıdaki köy ise bir icattır: dışarıdaki manzaraya değil, bellek ve hayal gücünün manzarasına aittir."],
    ["The{} sweeping{süpürücü} cypress{selvi} in{} the{} foreground{ön plan} links{bağlamak} the{} two{iki} realms{alemler}, rising{yükselmek} from{-den} the{} sleeping{uyuyan} earth{yeryüzü} into{içine} the{} restless{huzursuz} sky{gökyüzü}.", "Ön plandaki süpürücü selvi iki âlemi bağlar; uyuyan yeryüzünden huzursuz gökyüzüne yükselir."],
  ],
  [
    ["Why{neden} does{} this{bu} blend{karışım} matter{önemli olmak}?", "Bu karışım neden önemlidir?"],
    ["Partly{kısmen} because{çünkü} it{} shows{göstermek} that{ki} the{} painting{tablo} is{} not{} a{} record{kayıt} of{} a{} place{yer} so{kadar} much{çok} as{} a{} record{kayıt} of{} an{} experience{deneyim}.", "Kısmen, tablonun bir yerin kaydından çok bir deneyimin kaydı olduğunu gösterdiği için."],
    ["Viewers{izleyiciler} who{ki onlar} look{bakmak} for{için} a{} photographic{fotoğrafik} match{eşleşme} with{ile} the{} real{gerçek} sky{gökyüzü} will{-ecek} miss{kaçırmak} the{} point{nokta}; those{o kişiler} who{ki onlar} look{bakmak} for{için} feeling{his} will{-ecek} find{bulmak} it{} in{} every{her} swirl{girdap}.", "Gerçek gökyüzüyle fotoğrafik bir eşleşme arayan izleyiciler asıl noktayı kaçırır; duygu arayanlar onu her girdapta bulur."],
    ["That{o} is{} perhaps{belki} why{neden} the{} image{imge} has{} outlived{daha uzun yaşadı} so{çok} many{birçok} more{daha} literal{harfi harfine} depictions{tasvirler} of{} the{} night{gece}.", "Belki de bu yüzden imge, gecenin daha birçok harfi harfine tasvirinden daha uzun yaşadı."],
    ["No{hiçbir} single{tek} explanation{açıklama} can{-ebilir} exhaust{tüketmek} a{} picture{resim} like{gibi} this{bu}.", "Hiçbir tek açıklama böyle bir resmi tüketemez."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-starry-night-invention", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const moma = "MoMA, Vincent van Gogh, The Starry Night, 1889 (koleksiyon kaydı); https://www.moma.org/collection/works/79802";

export default {
  slug: "c1-starry-night-invention", level: "C1", title: "Part Observation, Part Invention", topic: "Sanat", sortOrder: 17, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the central claim of the passage?", evidence: ev(2, "the painting is not a record of a place so much as a record of an experience"), options: [
      option("o1", "The painting blends seeing with imagining", true, null, "Metin tablonun gözlem ve hayal gücünü karıştırdığını savunur."),
      option("o2", "The painting records the asylum garden exactly", false, "reverse", "Köy bir icat olarak sunulur."),
      option("o3", "The painting was designed to sell abroad", false, "notstated", "Satış amacı anlatılmaz."),
      option("o4", "The painting maps real constellations", false, "extreme", "Metin böyle bir iddia taşımaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Van Gogh write about to his brother Theo?", evidence: findEvidence(paragraphs, "Van Gogh described seeing it from his window in a letter to his brother Theo"), options: [
      option("o1", "The morning star he saw", true, null, "Metin sabah yıldızını söyler."),
      option("o2", "The cypress tree in the foreground", false, "context", "Selvi tabloda geçer ama mektupta anılmaz."),
      option("o3", "The village below the hill", false, "context", "Köy tabloda geçer ama mektupta anılmaz."),
      option("o4", "The route of the stars he mapped", false, "notstated", "Yıldız haritası anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “literal” mean in the final paragraph?", evidence: ev(2, "so many more literal depictions of the night"), options: [
      option("o1", "True to the exact appearance", true, null, "Literal, harfi harfine, gerçek görünüşe sadık demektir."),
      option("o2", "Painted in very bright colours", false, "context", "Renk anlamı yok."),
      option("o3", "Made for a wealthy collector", false, "notstated", "Koleksiyoncu anlatılmaz."),
      option("o4", "Based mainly on a dream", false, "reverse", "Hayalle ilgili olan tablonun kendisidir; literal bunun tersidir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage imply about “photographic” accuracy?", evidence: ev(2, "Viewers who look for a photographic match with the real sky will miss the point"), options: [
      option("o1", "It is not what the painting aims at", true, null, "Fotoğrafik eşleşme arayanlar asıl noktayı kaçırır."),
      option("o2", "It is the highest quality in painting", false, "reverse", "Metin tersini ima eder."),
      option("o3", "It is impossible for any painter", false, "extreme", "Metin böyle bir şey söylemez."),
      option("o4", "It was demanded by the museum owners", false, "notstated", "Müze talebi yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "The Starry Night Haziran 1889 ortasında, van Gogh'un Saint-Rémy'deki Saint-Paul-de-Mausole akıl hastanesinde geçirdiği yaklaşık on iki ay sırasında yapıldı ve MoMA (New York) koleksiyonundadır.", source: moma, checkedOn: "2026-11-23" },
    { claim: "Tablo van Gogh'un doğrudan gözlemine, hayal gücüne, anılarına ve duygularına dayanır; ressam penceresinden gördüğü sabah yıldızını kardeşi Theo'ya yazdığı bir mektupta anlatmıştır.", source: moma, checkedOn: "2026-11-23" },
  ] },
};
