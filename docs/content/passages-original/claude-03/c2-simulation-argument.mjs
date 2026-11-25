import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} simulation{simülasyon} argument{argüman} is{} often{sıklıkla} summarised{özetlenmek} as{olarak} the{} claim{iddia} that{ki} we{} are{} probably{muhtemelen} living{yaşamak} inside{içinde} a{} computer{bilgisayar}.", "Simülasyon argümanı sıklıkla muhtemelen bir bilgisayarın içinde yaşadığımız iddiası olarak özetlenir."],
    ["That{o} summary{özet} gets{anlamak (get wrong: yanlış anlamak)} its{} author{yazar} wrong{yanlış}.", "Bu özet yazarını yanlış anlar."],
    ["In{} a{} paper{makale} published{yayımlanmak} in{-de} two{iki} thousand{bin} three{üç}, the{} philosopher{filozof} Nick{Nick} Bostrom{Bostrom} argued{savunmak (argue for)} for{savunmak (argue for)} something{bir şey} more{daha} cautious{temkinli}: that{ki} at{en az (at least)} least{en az (at least)} one{biri} of{} three{üç} propositions{önermeler} is{} true{doğru}.", "2003'te yayımlanan bir makalede filozof Nick Bostrom daha temkinli bir şeyi savundu: üç önermeden en az birinin doğru olduğunu."],
  ],
  [
    ["Either{ya} almost{neredeyse} every{her} civilisation{uygarlık} at{-de} our{} stage{aşama} dies{yok olmak (die out)} out{yok olmak (die out)} before{-meden önce} it{} becomes{olmak} technologically{teknolojik olarak} mature{olgun}; or{} mature{olgun} civilisations{uygarlıklar} are{} extremely{son derece} unlikely{olası olmayan} to{-mek} run{çalıştırmak} large{büyük} numbers{sayılar} of{} simulations{simülasyonlar} of{} their{} ancestors{atalar}; or{} we{} are{} almost{neredeyse} certainly{kesinlikle} simulated{simüle edilmiş} ourselves{kendimiz}.", "Ya bizim aşamamızdaki neredeyse her uygarlık teknolojik olarak olgunlaşmadan yok olur; ya olgun uygarlıkların atalarının çok sayıda simülasyonunu çalıştırması son derece düşük olasılıklıdır; ya da biz kendimiz neredeyse kesinlikle simüle edilmişizdir."],
    ["The{} reasoning{akıl yürütme} behind{arkasındaki} the{} third{üçüncü} option{seçenek} is{} statistical{istatistiksel} rather{-den çok (rather than)} than{-den çok (rather than)} mystical{mistik}.", "Üçüncü seçeneğin arkasındaki akıl yürütme mistik değil istatistikseldir."],
    ["If{} simulated{simüle edilmiş} minds{zihinler} vastly{büyük ölçüde} outnumbered{sayıca geçmek} biological{biyolojik} ones{olanlar}, then{o zaman} a{} mind{zihin} with{sahip} no{hiç} way{yol} of{} telling{ayırt etmek (tell the difference)} the{} difference{fark} should{-meli}, on{-e göre} ordinary{olağan} principles{ilkeler} of{} probability{olasılık}, expect{beklemek} to{-mek} be{} among{arasında} the{} majority{çoğunluk}.", "Simüle edilmiş zihinler biyolojik olanları büyük ölçüde sayıca geçseydi, farkı ayırt etmenin hiçbir yolu olmayan bir zihin, olağan olasılık ilkelerine göre çoğunluk arasında olmayı beklemelidir."],
  ],
  [
    ["Critics{eleştirmenler} have{} pressed{bastırmak} on{üzerine} several{birkaç} joints{eklem yerleri} of{} this{} structure{yapı}.", "Eleştirmenler bu yapının birkaç eklem yerine bastırdı."],
    ["Some{bazıları} doubt{şüphe etmek} that{ki} consciousness{bilinç} could{-ebilmek} arise{ortaya çıkmak} from{-den} computation{hesaplama} at{hiç (at all)} all{hiç (at all)}, an{} assumption{varsayım} the{} argument{argüman} needs{ihtiyaç duymak} but{} does{} not{} establish{kanıtlamak}.", "Bazıları bilincin hesaplamadan hiç ortaya çıkıp çıkamayacağından şüphe eder; bu, argümanın ihtiyaç duyduğu ama kanıtlamadığı bir varsayımdır."],
    ["Others{diğerleri} question{sorgulamak} the{} indifference{kayıtsızlık} principle{ilke} that{ki} licenses{izin vermek} the{} final{son} step{adım}, asking{sormak} why{neden} a{} mind{zihin} should{-meli} treat{görmek} itself{kendisini} as{olarak} a{} random{rastgele} sample{örneklem} from{-den} all{tüm} observers{gözlemciler} rather{-den çok (rather than)} than{-den çok (rather than)} from{-den} those{olanlar} with{sahip} experiences{deneyimler} like{gibi} its{} own{kendi}.", "Diğerleri son adıma izin veren kayıtsızlık ilkesini sorgular ve bir zihnin kendini neden kendi deneyimlerine benzer deneyimleri olanlardan değil de tüm gözlemcilerden alınmış rastgele bir örneklem olarak görmesi gerektiğini sorar."],
    ["These{} objections{itirazlar} do{} not{} refute{çürütmek} the{} argument{argüman} outright{doğrudan, tamamen}; they{} relocate{taşımak} the{} debate{tartışma} to{-e} premises{öncüller} that{ki} are{} themselves{kendileri} deeply{derinden} contested{tartışmalı}.", "Bu itirazlar argümanı doğrudan çürütmez; tartışmayı kendileri de derinden tartışmalı olan öncüllere taşır."],
  ],
  [
    ["The{} argument{argüman} also{ayrıca} has{sahip olmak} an{} older{daha eski} relative{akraba}.", "Argümanın daha eski bir akrabası da vardır."],
    ["Descartes{Descartes} imagined{hayal etmek} a{} deceiving{aldatan} demon{iblis} capable{yetenekli} of{-e} feeding{sunmak, beslemek} him{ona} a{} false{sahte} world{dünya}, and{} used{kullanmak} the{} possibility{olasılık} to{-mek için} ask{sormak} what{ne}, if{} anything{herhangi bir şey}, could{-ebilmek} be{} known{bilinmek} with{} certainty{kesinlik}.", "Descartes kendisine sahte bir dünya sunabilecek aldatıcı bir iblis hayal etti ve bu olasılığı, eğer varsa neyin kesinlikle bilinebileceğini sormak için kullandı."],
    ["Bostrom's{Bostrom'un} version{versiyon} differs{farklılaşmak} in{} an{} instructive{öğretici} way{şekil}: it{} does{} not{} ask{sormak} whether{-ip -mediğini} we{} can{-ebilmek} rule{dışlamak (rule out)} out{dışlamak (rule out)} deception{aldatma}, but{} how{ne kadar} likely{olası} deception{aldatma} is{}, given{göz önüne alındığında} assumptions{varsayımlar} about{hakkında} future{gelecek} technology{teknoloji}.", "Bostrom'un versiyonu öğretici bir şekilde farklılaşır: aldatmayı dışlayıp dışlayamayacağımızı değil, gelecek teknoloji hakkındaki varsayımlar göz önüne alındığında aldatmanın ne kadar olası olduğunu sorar."],
    ["It{} trades{takas etmek} the{} absolute{mutlak} doubt{şüphe} of{} the{} seventeenth{on yedinci} century{yüzyıl} for{karşılığında} a{} probabilistic{olasılıksal} doubt{şüphe} suited{uygun} to{-e} an{} age{çağ} of{} computers{bilgisayarlar}.", "On yedinci yüzyılın mutlak şüphesini bilgisayar çağına uygun olasılıksal bir şüpheyle takas eder."],
  ],
  [
    ["Whether{-ip -mediği} that{o} trade{takas} is{} progress{ilerleme} depends{bağlı olmak} on{-e} what{ne} one{kişi} wants{istemek} from{-den} philosophy{felsefe}.", "Bu takasın ilerleme olup olmadığı, kişinin felsefeden ne istediğine bağlıdır."],
    ["As{olarak} a{} forecast{tahmin}, the{} argument{argüman} is{} no{hiç} stronger{daha güçlü} than{-den} its{} premises{öncüller}.", "Bir tahmin olarak argüman öncüllerinden daha güçlü değildir."],
    ["As{olarak} a{} discipline{disiplin} for{} reasoning{akıl yürütme}, however{ancak}, it{} has{sahip olmak} real{gerçek} value{değer}, because{çünkü} it{} forces{zorlamak} anyone{herkes} who{ki} dismisses{reddetmek} it{onu} to{-meye} say{söylemek} exactly{tam olarak} which{hangi} premise{öncül} they{} reject{reddetmek}, and{} why{neden}.", "Ancak akıl yürütme disiplini olarak gerçek bir değeri vardır, çünkü onu reddeden herkesi tam olarak hangi öncülü neden reddettiğini söylemeye zorlar."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-simulation-argument", rows);
const bostrom = "Bostrom N (2003), Are You Living in a Computer Simulation?, Philosophical Quarterly; https://www.simulation-argument.com/simulation.pdf";
const descartes = "Stanford Encyclopedia of Philosophy, Descartes' Epistemology; https://plato.stanford.edu/entries/descartes-epistemology/";

export default {
  slug: "c2-simulation-argument", level: "C2", title: "A Trilemma, Not a Verdict", topic: "Felsefe", sortOrder: 39, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which best describes the author's view of the simulation argument?", evidence: findEvidence(paragraphs, "As a forecast, the argument is no stronger than its premises."), options: [
      option("o1", "Limited as a forecast, valuable for reasoning", true, null, "Yazar argümanı tahmin olarak öncüllerine bağlı, akıl yürütme disiplini olarak değerli bulur."),
      option("o2", "It proves that we live in a simulation", false, "reverse", "Yazar bu özetin Bostrom'u yanlış anladığını söyler."),
      option("o3", "It is a mystical idea without any logical basis", false, "reverse", "Metin akıl yürütmenin mistik değil istatistiksel olduğunu söyler."),
      option("o4", "Its premises have been decisively refuted", false, "reverse", "İtirazların argümanı doğrudan çürütmediği söylenir."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the first paragraph, what did Bostrom actually argue?", evidence: findEvidence(paragraphs, "that at least one of three propositions is true"), options: [
      option("o1", "At least one of three claims holds", true, null, "Bostrom üç önermeden en az birinin doğru olduğunu savunur."),
      option("o2", "We are most probably inside a computer", false, "detail", "Bu, yazarın yanlış bulduğu popüler özettir."),
      option("o3", "Civilisations never build any simulations", false, "extreme", "Bu, üç seçenekten birinin aşırılaştırılmış hâlidir; iddia bu değildir."),
      option("o4", "Consciousness cannot arise from computers", false, "notstated", "Bu, Bostrom'un değil bazı eleştirmenlerin şüphesidir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the third paragraph, what are the “joints” of the argument?", evidence: findEvidence(paragraphs, "Critics have pressed on several joints of this structure."), options: [
      option("o1", "Points where its parts connect", true, null, "Mecazen argümanın parçalarının birleştiği, zayıf olabilecek yerlerdir."),
      option("o2", "Places where bones meet in the body", false, "context", "Gerçek anatomik anlam bu bağlamda kastedilmez."),
      option("o3", "Shared research projects", false, "context", "'Joint' sıfat olarak ortak demektir; burada isimdir."),
      option("o4", "Final conclusions of the paper", false, "notstated", "Kelime sonuç anlamına gelmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What is the main purpose of the comparison with Descartes?", evidence: findEvidence(paragraphs, "It trades the absolute doubt of the seventeenth century for a probabilistic doubt suited to an age of computers."), options: [
      option("o1", "To show how the kind of doubt has shifted", true, null, "Karşılaştırma mutlak şüpheden olasılıksal şüpheye geçişi gösterir."),
      option("o2", "To suggest Descartes foresaw modern computers", false, "notstated", "Böyle bir öngörüden söz edilmez."),
      option("o3", "To argue that Bostrom copied Descartes", false, "extreme", "Metin 'akraba' der; kopyalama iddiası yoktur."),
      option("o4", "To show both thinkers reached certainty", false, "reverse", "Her iki düşünce de şüpheyle ilgilidir, kesinliğe varmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Nick Bostrom 2003'te Philosophical Quarterly'de yayımlanan makalesinde şu üç önermeden en az birinin doğru olduğunu savundu: insan düzeyindeki uygarlıklar olgunlaşmadan yok olur; olgun uygarlıklar çok sayıda ata simülasyonu çalıştırmaz; ya da neredeyse kesinlikle bir simülasyonda yaşıyoruz. Argüman bilincin hesaplamaya dayanabileceği varsayımını ve bir kayıtsızlık ilkesini kullanır.", source: bostrom, checkedOn: "2026-11-23" },
    { claim: "Descartes (17. yüzyıl) Meditasyonlar'da kendisini aldatan kötü bir varlık olasılığını kesin bilginin sınırlarını sınamak için kullandı.", source: descartes, checkedOn: "2026-11-23" },
  ] },
};
