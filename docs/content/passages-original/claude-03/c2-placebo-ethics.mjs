import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} most{çoğu} of{} medical{tıbbi} history{tarih}, the{} placebo{plasebo} was{} regarded{kabul edilmek} as{} a{} polite{kibar} deception{aldatma}.", "Tıp tarihinin büyük bölümünde plasebo kibar bir aldatma olarak kabul edildi."],
    ["A{} physician{hekim} who{ki o} prescribed{reçete etmek} a{} sugar{şeker} pill{hap} to{-e} a{} demanding{talepkâr} patient{hasta} was{} thought{düşünülmek} to{-mek} be{} offering{sunmak} comfort{teselli} rather{yerine (rather than)} than{yerine (rather than)} treatment{tedavi}, and{} the{} comfort{teselli} depended{bağlı olmak} on{-e} the{} patient{hasta} never{asla} learning{öğrenmek} the{} truth{gerçek}.", "Talepkâr bir hastaya şeker hapı reçete eden bir hekimin tedavi yerine teselli sunduğu düşünülürdü ve bu teselli hastanın gerçeği asla öğrenmemesine bağlıydı."],
    ["Much{çok} later{sonraki} thinking{düşünce} inherited{miras almak} this{} assumption{varsayım}, which{ki bu} reduces{indirgenmek} to{-e} a{} tidy{derli toplu} rule{kural}: if{} a{} placebo{plasebo} works{işe yaramak} only{yalnızca} through{aracılığıyla} belief{inanç}, then{o halde} honesty{dürüstlük} must{-meli} destroy{yok etmek} it{onu}.", "Sonraki düşüncenin çoğu bu varsayımı miras aldı; varsayım derli toplu bir kurala indirgenir: plasebo yalnızca inanç aracılığıyla işe yarıyorsa, dürüstlük onu yok etmelidir."],
  ],
  [
    ["The{} rule{kural} looks{görünmek} less{daha az} secure{sağlam} than{-den} it{} once{bir zamanlar} did{yapmak (yerine geçen fiil)}.", "Kural, bir zamanlar olduğundan daha az sağlam görünüyor."],
    ["In{} a{} small{küçük} randomized{rastgele dağıtımlı} trial{deneme} published{yayımlanmak} in{} two{iki} thousand{bin} and{} ten{on}, researchers{araştırmacılar} led{yönetilmek} by{tarafından} Ted{Ted} Kaptchuk{Kaptchuk} gave{vermek} patients{hastalar} with{-li (sahip)} irritable{huzursuz} bowel{bağırsak} syndrome{sendrom} pills{haplar} that{ki} were{} openly{açıkça} described{tanımlanmak} as{} placebos{plasebolar} containing{içeren} no{hiç} active{etken} ingredient{madde}.", "2010'da yayımlanan küçük, rastgele dağıtımlı bir denemede Ted Kaptchuk liderliğindeki araştırmacılar, huzursuz bağırsak sendromlu hastalara hiç etken madde içermeyen plasebolar olarak açıkça tanımlanan haplar verdi."],
    ["Those{o} patients{hastalar} reported{bildirmek} more{daha fazla} improvement{iyileşme} than{-den} a{} comparison{karşılaştırma} group{grup} that{ki} received{almak} no{hiç} treatment{tedavi}.", "Bu hastalar, hiç tedavi almayan bir karşılaştırma grubundan daha fazla iyileşme bildirdi."],
    ["Yet{yine de} the{} details{ayrıntılar} matter{önemli olmak}: participants{katılımcılar} were{} also{ayrıca} told{söylenmek} that{ki} placebo{plasebo} pills{haplar} had{} been{} shown{gösterilmek} to{-mek} produce{sağlamak} improvement{iyileşme} in{} earlier{önceki} clinical{klinik} studies{çalışmalar}.", "Yine de ayrıntılar önemlidir: katılımcılara ayrıca plasebo haplarının önceki klinik çalışmalarda iyileşme sağladığının gösterildiği söylendi."],
  ],
  [
    ["This{} detail{ayrıntı} is{} easy{kolay} to{-mek} overlook{gözden kaçırmak}, and{} it{} complicates{karmaşıklaştırmak} the{} triumphant{zafer havasındaki} reading{yorum (okuma)}.", "Bu ayrıntıyı gözden kaçırmak kolaydır ve zafer havasındaki yorumu karmaşıklaştırır."],
    ["The{} patients{hastalar} were{} not{} deceived{aldatılmak} about{hakkında} the{} pill{hap}, but{} they{} were{} hardly{pek değil} left{bırakılmak} without{-sız} expectations{beklentiler}; honesty{dürüstlük} about{hakkında} the{} contents{içerik} arrived{gelmek} together{birlikte} with{} persuasion{ikna} about{hakkında} the{} effect{etki}.", "Hastalar hap hakkında aldatılmadılar, ama beklentisiz de bırakılmadılar; içerik hakkındaki dürüstlük, etki hakkındaki iknayla birlikte geldi."],
    ["Whether{-ip -mediği} that{o} combination{birleşim} counts{sayılmak} as{} fully{tamamen} informed{bilgilendirilmiş} consent{onam}, or{} merely{yalnızca} as{} a{} more{daha} respectable{saygın} form{biçim} of{} suggestion{telkin}, is{} a{} question{soru} the{} trial{deneme} itself{kendisi} cannot{-emez} answer{yanıtlamak}.", "Bu birleşimin tam bilgilendirilmiş onam mı, yoksa yalnızca telkinin daha saygın bir biçimi mi sayılacağı, denemenin kendisinin yanıtlayamayacağı bir sorudur."],
  ],
  [
    ["None{hiçbiri} of{} this{} makes{kılmak} the{} old{eski} deception{aldatma} acceptable{kabul edilebilir}.", "Bunların hiçbiri eski aldatmayı kabul edilebilir kılmaz."],
    ["The{} American{Amerikan} Medical{Tabipler} Association{Birliği}, for{örneğin (for instance)} instance{örneğin (for instance)}, advises{tavsiye etmek} physicians{hekimler} to{-mesini} obtain{almak} a{} patient's{hastanın} general{genel} consent{onam} before{önce} using{kullanmak} a{} placebo{plasebo} in{} clinical{klinik} practice{uygulama}, and{} the{} reasoning{gerekçe} is{} not{} hard{zor} to{-mek} reconstruct{yeniden kurmak}: trust{güven} in{-e} medicine{tıp} is{} a{} shared{ortak} resource{kaynak} that{ki} one{tek} convenient{işe gelen} lie{yalan} can{-ebilir} quietly{sessizce} erode{aşındırmak}.", "Örneğin Amerikan Tabipler Birliği, hekimlere klinik uygulamada plasebo kullanmadan önce hastanın genel onamını almalarını tavsiye eder ve gerekçeyi yeniden kurmak zor değildir: tıbba güven, işe gelen tek bir yalanın sessizce aşındırabileceği ortak bir kaynaktır."],
    ["The{} interesting{ilginç} shift{kayma} is{} elsewhere{başka yerde}: the{} ethical{etik} problem{sorun} may{-ebilir} lie{yatmak} less{daha az} in{} the{} sugar{şeker} pill{hap} than{-den} in{} how{nasıl} the{} conversation{konuşma} around{etrafındaki} it{} is{} conducted{yürütülmek}.", "İlginç kayma başka yerdedir: etik sorun şeker hapından çok, onun etrafındaki konuşmanın nasıl yürütüldüğünde yatıyor olabilir."],
  ],
  [
    ["The{} open{açık}-label{etiketli} studies{çalışmalar}, then{öyleyse}, do{} not{} show{göstermek} that{ki} belief{inanç} is{} irrelevant{önemsiz}; they{} suggest{düşündürmek} that{ki} belief{inanç} and{} honesty{dürüstlük} need{gerek} not{} be{} enemies{düşmanlar}.", "Öyleyse açık etiketli çalışmalar inancın önemsiz olduğunu göstermez; inanç ile dürüstlüğün düşman olmak zorunda olmadığını düşündürür."],
    ["That{bu} is{} a{} more{daha} modest{mütevazı} conclusion{sonuç} than{-den} enthusiastic{coşkulu} summaries{özetler} sometimes{bazen} imply{ima etmek}, but{} it{} is{} also{aynı zamanda} a{} more{daha} useful{yararlı} one{olan}.", "Bu, coşkulu özetlerin bazen ima ettiğinden daha mütevazı bir sonuçtur, ama aynı zamanda daha yararlı bir sonuçtur."],
    ["A{} placebo{plasebo} that{ki} survives{hayatta kalmak} the{} truth{gerçek} is{} still{hâlâ} a{} placebo{plasebo}, yet{yine de} it{} is{} one{bir tane} a{} doctor{doktor} can{-ebilir} prescribe{reçete etmek} without{-meden} having{zorunda kalmak} to{-mek} hope{ummak} the{} patient{hasta} never{asla} asks{sormak}.", "Gerçeğe dayanabilen bir plasebo hâlâ bir plasebodur, yine de doktorun, hastanın asla sormamasını ummak zorunda kalmadan reçete edebileceği bir plasebodur."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-placebo-ethics", rows);
const kaptchuk = "Kaptchuk TJ ve ark., Placebos without Deception: A Randomized Controlled Trial in Irritable Bowel Syndrome, PLoS ONE (2010); https://doi.org/10.1371/journal.pone.0015591";
const ama = "American Medical Association, Code of Medical Ethics Opinion 2.1.4: Use of Placebo in Clinical Practice; https://code-medical-ethics.ama-assn.org/ethics-opinions/use-placebo-clinical-practice";

export default {
  slug: "c2-placebo-ethics", level: "C2", title: "Can a Placebo Survive the Truth?", topic: "Tıp", sortOrder: 30, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's overall position?", evidence: findEvidence(paragraphs, "they suggest that belief and honesty need not be enemies"), options: [
      option("o1", "Honesty and placebo effects may coexist", true, null, "Yazar, inanç ile dürüstlüğün düşman olmak zorunda olmadığını ölçülü bir sonuç olarak sunar."),
      option("o2", "Placebos work only when patients are deceived", false, "reverse", "Metin tam da bu eski kuralın artık sağlam görünmediğini söyler."),
      option("o3", "Open-label trials have settled the ethical debate", false, "extreme", "Yazar onam sorusunu denemenin yanıtlayamayacağını vurgular; tartışma kapanmış değildir."),
      option("o4", "Doctors should replace most drugs with placebos", false, "notstated", "Metinde ilaçların yerine plasebo önerisi yoktur."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the text, what did the trial participants receive besides the pills?", evidence: findEvidence(paragraphs, "participants were also told that placebo pills had been shown to produce improvement in earlier clinical studies"), options: [
      option("o1", "A claim that placebos had worked before", true, null, "Katılımcılara plasebo haplarının önceki çalışmalarda iyileşme sağladığı söylendi."),
      option("o2", "A promise that their symptoms would soon vanish", false, "extreme", "Önceki sonuçlardan söz edildi; belirtilerin yok olacağı vaat edilmedi."),
      option("o3", "No explanation of what the pills contained", false, "reverse", "Hapların etken madde içermediği açıkça söylendi."),
      option("o4", "A hidden active ingredient in each pill", false, "reverse", "Hapların hiç etken madde içermediği belirtilir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “the triumphant reading” mean in the third paragraph?", evidence: findEvidence(paragraphs, "it complicates the triumphant reading"), options: [
      option("o1", "An overly celebratory interpretation", true, null, "Reading burada yorum demektir; triumphant, sonucu zafer gibi kutlayan bir tavrı anlatır."),
      option("o2", "A loud reading of the trial results", false, "context", "Sesli okuma anlamı bağlama uymaz; söz konusu olan bir yorumdur."),
      option("o3", "A cautious statistical analysis of data", false, "reverse", "Triumphant temkinli değil, coşkulu bir tavırdır."),
      option("o4", "The patients' feeling of recovery", false, "context", "Hastaların iyileşme duygusu değil, sonucun nasıl yorumlandığı kastedilir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final sentence imply about the traditional, deceptive use of placebos?", evidence: findEvidence(paragraphs, "yet it is one a doctor can prescribe without having to hope the patient never asks"), options: [
      option("o1", "It relied on patients not asking questions", true, null, "Eski kullanım, hastanın gerçeği sormamasına ve öğrenmemesine dayanıyordu."),
      option("o2", "Patients usually knew they were given sugar", false, "reverse", "Teselli, hastanın gerçeği asla öğrenmemesine bağlıydı."),
      option("o3", "Doctors rarely prescribed placebos at all", false, "notstated", "Metin eski kullanımın sıklığı hakkında bilgi vermez."),
      option("o4", "It was more effective than honest placebos", false, "notstated", "Metinde böyle bir etkinlik karşılaştırması yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "2010'da yayımlanan küçük, rastgele dağıtımlı bir denemede (Kaptchuk ve ark.) huzursuz bağırsak sendromlu hastalara etken madde içermediği açıkça söylenen plasebo hapları verildi; hastalara ayrıca plasebo haplarının klinik çalışmalarda iyileşme sağladığının gösterildiği anlatıldı; bu grup, tedavi almayan kontrol grubundan daha fazla iyileşme bildirdi.", source: kaptchuk, checkedOn: "2026-11-23" },
    { claim: "AMA etik görüşüne göre hekim klinik uygulamada plasebo kullanmadan önce hastanın genel onamını almalıdır.", source: ama, checkedOn: "2026-11-23" },
  ] },
};
