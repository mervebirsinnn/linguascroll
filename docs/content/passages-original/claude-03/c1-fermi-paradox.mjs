import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{} 1950, during{sırasında} a{} lunchtime{öğle yemeği} conversation{sohbet} at{} Los{Los} Alamos{Alamos}, the{} physicist{fizikçi} Enrico{Enrico} Fermi{Fermi} is{} said{söylenmek} to{-dığı} have{} asked{sormak} a{} deceptively{aldatıcı biçimde} simple{basit} question{soru}: where{nerede} is{} everybody{herkes}?", "1950'de Los Alamos'ta bir öğle yemeği sohbeti sırasında fizikçi Enrico Fermi'nin aldatıcı biçimde basit bir soru sorduğu söylenir: herkes nerede?"],
    ["His{} reasoning{akıl yürütme}, as{} later{daha sonra} reconstructed{yeniden kurulmak}, ran{işlemek, ilerlemek} roughly{kabaca} as{şöyle (as follows)} follows{şöyle (as follows)}.", "Daha sonra yeniden kurulduğu biçimiyle akıl yürütmesi kabaca şöyleydi."],
    ["The{} Milky{Samanyolu (Milky Way)} Way{Samanyolu (Milky Way)} contains{içermek} a{} vast{muazzam} number{sayı} of{} stars{yıldızlar}, many{birçoğu} of{} them{} far{çok} older{daha yaşlı} than{-den} the{} Sun{Güneş}, and{} even{bile} a{} civilisation{uygarlık} that{ki} travelled{yolculuk etmek} slowly{yavaşça} could{-ebilirdi}, in{ilke olarak (in principle)} principle{ilke olarak (in principle)}, spread{yayılmak} across{boyunca} the{} galaxy{gökada} in{} a{} period{süre} that{ki} is{} short{kısa} compared{karşılaştırılmak} with{} its{} age{yaş}.", "Samanyolu muazzam sayıda yıldız içerir, birçoğu Güneş'ten çok daha yaşlıdır; yavaş yolculuk eden bir uygarlık bile ilke olarak gökadaya, onun yaşına kıyasla kısa bir sürede yayılabilirdi."],
    ["If{} intelligent{zeki} life{yaşam} were{} at{hiç (at all)} all{hiç (at all)} common{yaygın}, some{bir, bazı} sign{iz, işaret} of{} it{} ought{-meli (ought to)} to{-meli (ought to)} be{} obvious{apaçık} by{-e kadar (by now)} now{şimdi}.", "Zeki yaşam biraz olsun yaygın olsaydı, şimdiye kadar ona dair bir iz apaçık görünmeliydi."],
  ],
  [
    ["The{} paradox{paradoks} is{} not{} a{} proof{kanıt} that{-dığının} we{} are{} alone{yalnız}, and{} it{} is{} worth{değer} being{olmak} precise{kesin} about{hakkında} what{ne} it{} assumes{varsaymak}.", "Paradoks yalnız olduğumuzun kanıtı değildir ve neyi varsaydığı konusunda kesin olmaya değer."],
    ["In{} 1961 the{} astronomer{gökbilimci} Frank{Frank} Drake{Drake} wrote{yazmak (write down: kâğıda dökmek)} down{kâğıda dökmek (write down)} an{} equation{denklem} that{ki} breaks{bölmek (break into)} the{} question{soru} into{-e} factors{etkenler}, from{-den} the{} rate{hız, oran} at{} which{ki} stars{yıldızlar} form{oluşmak} to{-e kadar} the{} fraction{oran, kesir} of{} planets{gezegenler} on{} which{ki} life{yaşam} arises{ortaya çıkmak} and{} the{} length{uzunluk} of{} time{zaman} a{} technological{teknolojik} society{toplum} remains{kalmak} detectable{saptanabilir}.", "1961'de gökbilimci Frank Drake, soruyu etkenlere bölen bir denklem yazdı; yıldızların oluşma hızından yaşamın ortaya çıktığı gezegenlerin oranına ve teknolojik bir toplumun saptanabilir kaldığı süreye kadar."],
    ["Astronomers{gökbilimciler} now{artık} have{sahip olmak} reasonable{makul} estimates{tahminler} for{} the{} first{ilk} few{birkaç} terms{terimler}; observations{gözlemler} from{-den} missions{görevler} such{gibi (such as)} as{gibi (such as)} Kepler{Kepler} suggest{işaret etmek} that{-dığına} planets{gezegenler} are{} common{yaygın}.", "Gökbilimcilerin artık ilk birkaç terim için makul tahminleri var; Kepler gibi görevlerden gelen gözlemler gezegenlerin yaygın olduğuna işaret ediyor."],
    ["The{} later{sonraki} terms{terimler}, however{ancak}, remain{kalmak} almost{neredeyse} entirely{tamamen} guesswork{tahmin yürütme}.", "Ancak sonraki terimler neredeyse tamamen tahmine dayanıyor."],
  ],
  [
    ["Proposed{önerilen} resolutions{çözümler} divide{ayrılmak} into{-e} broad{geniş} families{aileler}.", "Önerilen çözümler geniş ailelere ayrılır."],
    ["Some{bazıları} suggest{öne sürmek} that{-dığını} life{yaşam}, or{} at{en azından (at least)} least{en azından (at least)} complex{karmaşık} life{yaşam}, is{} genuinely{gerçekten} rare{nadir}, perhaps{belki} because{çünkü} some{bir, bazı} improbable{olası olmayan} step{adım} lies{bulunmak} between{arasında} simple{basit} chemistry{kimya} and{} intelligence{zekâ}.", "Bazıları yaşamın ya da en azından karmaşık yaşamın gerçekten nadir olduğunu öne sürer; belki de basit kimya ile zekâ arasında olası olmayan bir adım bulunduğu için."],
    ["Others{diğerleri} propose{önermek} that{-dığını} civilisations{uygarlıklar} tend{eğiliminde olmak} not{} to{-meye} last{sürmek, dayanmak}, or{} that{-dığını} they{} choose{seçmek} not{} to{-meyi} expand{genişlemek} or{} communicate{iletişim kurmak}.", "Diğerleri uygarlıkların uzun sürmeme eğiliminde olduğunu ya da genişlememeyi veya iletişim kurmamayı seçtiklerini önerir."],
    ["A{} more{daha} modest{ölçülü, alçakgönüllü} group{grup} argues{savunmak} that{-dığını} the{} silence{sessizlik} is{} less{daha az} surprising{şaşırtıcı} than{-den} it{} seems{görünmek}, because{çünkü} our{} searches{aramalar} have{} covered{kapsamak} only{yalnızca} a{} small{küçük} portion{kısım} of{} the{} sky{gökyüzü} and{} the{} radio{radyo} spectrum{spektrum}, for{} a{} few{birkaç} decades{on yıllar}.", "Daha ölçülü bir grup ise sessizliğin göründüğünden daha az şaşırtıcı olduğunu savunur; çünkü aramalarımız yalnızca birkaç on yıl boyunca gökyüzünün ve radyo spektrumunun küçük bir kısmını kapsadı."],
  ],
  [
    ["What{-en şey} makes{kılmak} the{} question{soru} unusually{alışılmadık biçimde} uncomfortable{rahatsız edici} is{} that{-dığı} some{bazı} of{} these{} answers{yanıtlar} concern{ilgilendirmek} our{} own{kendi} future{gelecek}.", "Soruyu alışılmadık biçimde rahatsız edici kılan, bu yanıtların bazılarının kendi geleceğimizi ilgilendirmesidir."],
    ["If{} the{} improbable{olası olmayan} step{adım} lies{bulunmak} behind{arkasında} us{}, our{} existence{varoluş} is{} remarkable{dikkat çekici}; if{} it{} lies{bulunmak} ahead{ileride}, the{} silence{sessizlik} may{-ebilir} be{} a{} warning{uyarı}.", "Olası olmayan adım geride kaldıysa varoluşumuz dikkat çekicidir; ileride bekliyorsa sessizlik bir uyarı olabilir."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-fermi-paradox", rows);
const jones = "University of Nevada Las Vegas (UNLV) physics, 'Where Is Everybody?': An Account of Fermi's Question (E. M. Jones, Los Alamos report, 1985); https://www.physics.unlv.edu/~jeffery/astro/astronomer/enrico_fermi_question.txt";
const nasaHome = "NASA Science, Among Trillions of Planets, Are We 'Home Alone?'; https://science.nasa.gov/universe/exoplanets/among-trillions-of-planets-are-we-home-alone/";
const nrao = "NRAO Historical Radio Astronomy Working Group, Frank D. Drake; https://rahist.nrao.edu/drake_bio-memoir.shtml";
const setiDrake = "SETI Institute, Drake Equation; https://www.seti.org/research/seti-101/drake-equation/";
const kepler = "NASA, Kepler / K2 mission; https://science.nasa.gov/mission/kepler/";

export default {
  slug: "c1-fermi-paradox", level: "C1", title: "The Great Silence", topic: "Bilim", sortOrder: 40, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "Which statement best expresses the main idea of the passage?", evidence: findEvidence(paragraphs, "The paradox is not a proof that we are alone"), options: [
      option("o1", "The silence has many possible explanations, none yet proven", true, null, "Metin paradoksu tanıtır, onun yalnız olduğumuzun kanıtı olmadığını söyler ve birbiriyle yarışan çözüm ailelerini sıralar."),
      option("o2", "Fermi proved that intelligent life does not exist elsewhere", false, "reverse", "Fermi bir soru sordu; metin paradoksun yalnızlığımızı kanıtlamadığını açıkça belirtir."),
      option("o3", "The Drake equation has now fully solved the question of alien life", false, "extreme", "Denklemin sonraki terimlerinin neredeyse tamamen tahmine dayandığı söylenir."),
      option("o4", "Kepler has detected signals from distant civilisations", false, "notstated", "Kepler gözlemleri gezegenlerin yaygın olduğuna işaret eder; sinyal tespitinden söz edilmez."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage say about the terms of the Drake equation?", evidence: findEvidence(paragraphs, "Astronomers now have reasonable estimates for the first few terms"), options: [
      option("o1", "The early terms are better known than the later ones", true, null, "İlk birkaç terim için makul tahminler varken sonraki terimler neredeyse tamamen tahmine dayanır."),
      option("o2", "All of its terms are now known with fair accuracy", false, "extreme", "Makul tahminler yalnızca ilk birkaç terim için vardır."),
      option("o3", "Kepler measured how long civilisations remain detectable", false, "reverse", "Kepler gezegenlerle ilgili bilgi sağladı; uygarlıkların saptanabilir kalma süresi tahmine dayalı bir terimdir."),
      option("o4", "Its first terms are the most uncertain ones", false, "reverse", "En belirsiz olanlar sonraki terimlerdir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: 'What does "deceptively simple" mean in the first paragraph?', evidence: findEvidence(paragraphs, "asked a deceptively simple question"), options: [
      option("o1", "Simpler in appearance than in reality", true, null, "Deceptively simple, basit görünen ama aslında derin ve karmaşık olan anlamına gelir; paragrafın geri kalanı sorunun ardındaki akıl yürütmeyi açar."),
      option("o2", "Dishonest and intended to mislead listeners", false, "context", "Deceive kökü aldatmayı çağrıştırsa da Fermi'nin dinleyicileri kandırmak istediği söylenmez; aldatıcı olan sorunun görünüşüdür."),
      option("o3", "Clearly and completely simple", false, "reverse", "İfade sorunun göründüğü kadar basit olmadığını vurgular."),
      option("o4", "Asked in a humorous way", false, "context", "Sorunun üslubundan, mizahından söz edilmez."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply in the final paragraph?", evidence: findEvidence(paragraphs, "if it lies ahead, the silence may be a warning"), options: [
      option("o1", "Silence would be worse news if the hard step is ahead", true, null, "Olası olmayan adım ileride ise sessizlik, uygarlıkların o adımı aşamadığını düşündürür ve bizim için bir uyarı olabilir."),
      option("o2", "Humanity has already passed every difficult step", false, "notstated", "Yazar adımın geride mi ileride mi olduğunu açık bırakır."),
      option("o3", "The search for alien life should stop because it is dangerous", false, "notstated", "Aramanın durdurulması gerektiği önerilmez."),
      option("o4", "Our existence proves that life is common in space", false, "reverse", "Adım geride kaldıysa varoluşumuz yaygınlığı değil, dikkat çekici bir istisnayı gösterir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Los Alamos'ta Fermi, Teller, Konopinski ve York'un katıldığı öğle yemeği sohbeti; soru 'Where is everybody?' (tanıkların ifadeleri farklı); tarih yaz 1950 olasıdır ama kesin değildir; Fermi'nin akıl yürütmesi yalnızca York'un hatırlamasıyla sonradan aktarılmıştır (metindeki 'is said to have' ve 'as later reconstructed' ifadeleri bu yüzden korunmuştur).", source: jones, checkedOn: "2026-11-25" },
    { claim: "NASA: Fermi 1950'de 'Where is everybody?' diye sordu; ışıktan yavaş hızlarda bile uzay yolculuğu yapan bir uygarlık gökadayı birkaç milyon yılda aşabilir; gökada yaklaşık 14 milyar yıllıktır ve Dünya'dan çok daha yaşlı gezegen sistemleri içerir; Samanyolu'nda trilyonlarca gezegen olması muhtemeldir.", source: nasaHome, checkedOn: "2026-11-25" },
    { claim: "Drake 1961'deki Green Bank toplantısına hazırlanırken denklemini formüle etti.", source: nrao, checkedOn: "2026-11-25" },
    { claim: "Denklemin etkenleri (yıldız oluşum hızı, gezegen sistemi oranı, yaşamın ortaya çıktığı gezegen oranı, uygarlığın sinyal ürettiği süre vb.); R* ve gezegen oranı dışındakiler fiilen kısıtlanmamıştır, L en belirsiz olandır.", source: setiDrake, checkedOn: "2026-11-25" },
    { claim: "Kepler görevinin gözlemleri gezegenlerin yaygın olduğunu gösterdi.", source: kepler, checkedOn: "2026-11-23" },
  ] },
};
