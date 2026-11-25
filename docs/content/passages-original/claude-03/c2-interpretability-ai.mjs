import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Modern{modern} neural{sinir} networks{ağlar} can{-ebilir} classify{sınıflandırmak} images{görüntüler}, translate{çevirmek} text{metin} and{} predict{tahmin etmek} the{} structure{yapı} of{} proteins{proteinler}, yet{yine de} the{} people{insanlar} who{ki onlar} build{kurmak} them{} often{sıklıkla} cannot{-emez} say{söylemek} why{neden} a{} particular{belirli} output{çıktı} was{} produced{üretilmek}.", "Modern sinir ağları görüntüleri sınıflandırabilir, metin çevirebilir ve proteinlerin yapısını tahmin edebilir; yine de onları kuran insanlar çoğu zaman belirli bir çıktının neden üretildiğini söyleyemez."],
    ["A{} model's{modelin} knowledge{bilgi} is{} spread{yayılmak} across{boyunca} millions{milyonlar} or{} billions{milyarlar} of{} numerical{sayısal} weights{ağırlıklar}, few{azı} of{} which{ki bunlar} correspond{karşılık gelmek} neatly{düzgünce} to{-e} a{} concept{kavram} a{} human{insan} would{-ecek} recognise{tanımak}.", "Bir modelin bilgisi milyonlarca ya da milyarlarca sayısal ağırlığa yayılmıştır ve bunların pek azı bir insanın tanıyacağı bir kavrama düzgünce karşılık gelir."],
    ["This{} is{} what{ne} researchers{araştırmacılar} mean{kastetmek} when{-dığında} they{} call{nitelemek} such{böyle} systems{sistemler} opaque{opak (içi görülmeyen)}.", "Araştırmacılar böyle sistemleri opak diye nitelediklerinde bunu kastederler."],
  ],
  [
    ["One{bir} popular{yaygın} response{yanıt} is{} the{} explanation{açıklama} produced{üretilmek} after{sonra} the{} fact{olgu (after the fact: olup bittikten sonra)}.", "Yaygın yanıtlardan biri, olup bittikten sonra üretilen açıklamadır."],
    ["Saliency{belirginlik} maps{haritalar}, for{örneğin (for example)} example{örneğin (for example)}, highlight{vurgulamak} the{} pixels{pikseller} that{ki} most{en çok} influenced{etkilemek} an{} image{görüntü} classifier's{sınıflandırıcının} decision{karar}, and{} they{} look{görünmek} reassuringly{insanı rahatlatırcasına} like{gibi} an{} answer{yanıt}.", "Örneğin belirginlik haritaları bir görüntü sınıflandırıcısının kararını en çok etkileyen pikselleri vurgular ve insanı rahatlatırcasına bir yanıta benzer."],
    ["But{} in{} two{iki} thousand{bin} and{} eighteen{on sekiz}, a{} group{grup} of{} researchers{araştırmacılar} showed{göstermek} that{ki} some{bazı} saliency{belirginlik} methods{yöntemler} produced{üretmek} almost{neredeyse} the{} same{aynı} maps{haritalar} even{bile} when{-dığında} the{} model's{modelin} learned{öğrenilmiş} weights{ağırlıklar} had{} been{} randomised{rastgeleleştirilmek}.", "Ama 2018'de bir grup araştırmacı, bazı belirginlik yöntemlerinin modelin öğrenilmiş ağırlıkları rastgeleleştirildiğinde bile neredeyse aynı haritaları ürettiğini gösterdi."],
    ["An{} explanation{açıklama} that{ki} barely{zar zor} changes{değişmek} when{-dığında} the{} model{model} is{} scrambled{karıştırılmak} may{-ebilir} be{} describing{betimlemek} the{} image{görüntü} rather{yerine (rather than)} than{yerine (rather than)} the{} model{model}.", "Model karıştırıldığında zar zor değişen bir açıklama, modeli değil görüntüyü betimliyor olabilir."],
  ],
  [
    ["The{} computer{bilgisayar} scientist{bilimci} Cynthia{Cynthia} Rudin{Rudin} has{} drawn{çıkarmak (sonuç)} a{} sharper{daha keskin} conclusion{sonuç}.", "Bilgisayar bilimci Cynthia Rudin daha keskin bir sonuç çıkarmıştır."],
    ["For{} high{yüksek} stakes{riskler} decisions{kararlar}, such{gibi (such as)} as{gibi (such as)} those{onlar} in{} criminal{ceza} justice{adalet} or{} healthcare{sağlık hizmetleri}, she{} argues{savunmak} that{ki} we{} should{-meli} stop{bırakmak} explaining{açıklamak} black{kara} boxes{kutular} and{} use{kullanmak} models{modeller} that{ki} are{} interpretable{yorumlanabilir} by{gereği (by design)} design{tasarım}.", "Ceza adaleti ya da sağlık hizmetlerindeki gibi yüksek riskli kararlarda kara kutuları açıklamayı bırakıp tasarımı gereği yorumlanabilir modeller kullanmamız gerektiğini savunur."],
    ["Others{diğerleri} reply{yanıt vermek} that{ki} the{} point{nokta} depends{bağlı olmak} on{-e} the{} data{veri}: for{} raw{ham} images{görüntüler} or{} speech{konuşma}, the{} most{en} accurate{doğru} systems{sistemler} remain{kalmak} stubbornly{inatla} complex{karmaşık}.", "Diğerleri bu noktanın veriye bağlı olduğunu yanıtlar: ham görüntüler ya da konuşma için en doğru sistemler inatla karmaşık kalır."],
  ],
  [
    ["Both{her iki} sides{taraflar} share{paylaşmak} an{} assumption{varsayım} worth{değer} examining{incelemek}: that{ki} an{} explanation{açıklama} is{} something{bir şey} a{} model{model} either{ya} has{sahip olmak} or{ya da} lacks{yoksun olmak}.", "Her iki taraf da incelemeye değer bir varsayımı paylaşır: açıklamanın bir modelin ya sahip olduğu ya da yoksun olduğu bir şey olduğu."],
    ["In{} practice{uygulama}, explanations{açıklamalar} are{} written{yazılmak} for{} someone{biri}.", "Uygulamada açıklamalar biri için yazılır."],
    ["A{} regulator{düzenleyici}, a{} doctor{doktor} and{} a{} defendant{sanık} may{-ebilir} need{ihtiyaç duymak} quite{oldukça} different{farklı} accounts{açıklamalar} of{} the{} same{aynı} decision{karar}, and{} an{} account{açıklama} that{ki} satisfies{tatmin etmek} the{} engineer{mühendis} may{-ebilir} leave{bırakmak} the{} person{kişi} it{} concerns{ilgilendirmek} no{hiç} wiser{daha bilge (no wiser: hiç daha bilgili değil)}.", "Bir düzenleyici, bir doktor ve bir sanık aynı karar için oldukça farklı açıklamalara ihtiyaç duyabilir; mühendisi tatmin eden bir açıklama, kararın ilgilendirdiği kişiyi hiç daha bilgili bırakmayabilir."],
  ],
  [
    ["Interpretability{yorumlanabilirlik}, then{öyleyse}, is{} less{daha az} a{} property{özellik} hidden{gizli} inside{içinde} the{} network{ağ} than{-den} a{} relationship{ilişki} between{arasında} a{} system{sistem} and{} the{} people{insanlar} who{ki onlar} must{-meli} trust{güvenmek} or{} contest{itiraz etmek} it{ona}.", "Öyleyse yorumlanabilirlik, ağın içinde gizli bir özellikten çok, bir sistem ile ona güvenmesi ya da itiraz etmesi gereken insanlar arasındaki bir ilişkidir."],
    ["Treating{ele almak} it{onu} that{o} way{biçim} does{} not{} make{kılmak} the{} technical{teknik} problem{sorun} easier{daha kolay}.", "Onu bu biçimde ele almak teknik sorunu kolaylaştırmaz."],
    ["It{} does{gerçekten (vurgu)}, however{ancak}, make{kılmak} it{} harder{daha zor} to{-mek} mistake{karıştırmak} a{} persuasive{ikna edici} picture{resim} for{ile (mistake for)} an{} honest{dürüst} one{olan}.", "Ancak ikna edici bir resmi dürüst bir resimle karıştırmayı gerçekten zorlaştırır."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-interpretability-ai", rows);
const sanity = "Adebayo J. ve ark., Sanity Checks for Saliency Maps, NeurIPS 2018; https://arxiv.org/abs/1810.03292";
const rudin = "Rudin C., Stop Explaining Black Box Machine Learning Models for High Stakes Decisions and Use Interpretable Models Instead, Nature Machine Intelligence (2019); https://arxiv.org/abs/1811.10154";
const alphafold = "EMBL-EBI, AlphaFold Protein Structure Database; https://alphafold.ebi.ac.uk/";

export default {
  slug: "c2-interpretability-ai", level: "C2", title: "Explanations for Whom?", topic: "Yapay zeka", sortOrder: 32, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main argument?", evidence: findEvidence(paragraphs, "is less a property hidden inside the network than a relationship between a system and the people who must trust or contest it"), options: [
      option("o1", "Interpretability depends on who needs the explanation", true, null, "Yazar yorumlanabilirliği ağın içindeki bir özellikten çok, insanlarla kurulan bir ilişki olarak görür."),
      option("o2", "Simple models should replace every complex system in use", false, "extreme", "Bu Rudin'in görüşünün aşırı genellemesidir; yazar iki tarafın da varsayımını sorgular."),
      option("o3", "Neural networks can never be understood by anyone", false, "extreme", "Yazar teknik sorunun zor olduğunu söyler, imkânsız olduğunu değil."),
      option("o4", "Saliency maps fully reveal how models reason", false, "reverse", "Metin bazı haritaların modeli değil görüntüyü betimleyebileceğini söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "What did the 2018 researchers establish about some saliency methods?", evidence: findEvidence(paragraphs, "some saliency methods produced almost the same maps even when the model's learned weights had been randomised"), options: [
      option("o1", "Maps were near-identical for trained and untrained models", true, null, "Ağırlıklar rastgeleleştirilince bile haritalar neredeyse aynı kaldı; yani eğitilmiş ve eğitilmemiş model benzer harita verdi."),
      option("o2", "Maps were near-identical once the input images were randomised", false, "detail", "Rastgeleleştirilen girdi görüntüleri değil, modelin öğrenilmiş ağırlıklarıdır; doğru olgu yanlış nesneye bağlanmış."),
      option("o3", "Maps changed sharply once the learned weights were randomised", false, "reverse", "Tam tersi: haritalar neredeyse hiç değişmedi."),
      option("o4", "Maps were reliable for speech but not for raw images", false, "notstated", "Konuşma ve ham görüntü, açıklanabilirlik tartışmasında geçer; çalışmanın bulgusu bu değildir."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “contest” mean in “people who must trust or contest it”?", evidence: findEvidence(paragraphs, "must trust or contest it"), options: [
      option("o1", "Challenge as mistaken or unfair", true, null, "Burada contest, bir karara itiraz etmek / karşı çıkmak anlamındadır; trust ile karşıt konumlanır."),
      option("o2", "Compete against it in a match", false, "context", "Contest'in 'yarışmak' anlamıdır; sistemle rekabet edilmez, karara itiraz edilir."),
      option("o3", "Hold a public competition over it", false, "context", "Contest'in 'yarışma düzenlemek' anlamıdır; bağlama uymaz."),
      option("o4", "Defend it against criticism", false, "reverse", "Anlamın tersi: contest eden taraf savunmaz, itiraz eder."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the final sentence imply about visual explanations such as saliency maps?", evidence: findEvidence(paragraphs, "make it harder to mistake a persuasive picture for an honest one"), options: [
      option("o1", "They can persuade without being faithful", true, null, "Yazar, ikna edici bir resmin modeli dürüstçe yansıtmayabileceğini ima eder."),
      option("o2", "They are deliberately designed to deceive", false, "extreme", "Metin kasıtlı aldatmadan söz etmez; sorun yanıltıcı görünüştür."),
      option("o3", "They are useless in every setting", false, "extreme", "Yazar yararsız olduklarını söylemez, yalnızca dikkat ister."),
      option("o4", "They are more honest than simple models", false, "notstated", "Metinde böyle bir karşılaştırma yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "2018'de yayımlanan bir çalışma, bazı belirginlik haritası yöntemlerinin modelin öğrenilmiş ağırlıkları rastgeleleştirildiğinde bile neredeyse aynı haritaları ürettiğini gösterdi.", source: sanity, checkedOn: "2026-11-23" },
    { claim: "Cynthia Rudin, yüksek riskli kararlarda kara kutu modelleri sonradan açıklamak yerine baştan yorumlanabilir modeller kullanılması gerektiğini savunur.", source: rudin, checkedOn: "2026-11-23" },
    { claim: "Sinir ağı tabanlı sistemler protein yapısı tahmininde kullanılır (AlphaFold).", source: alphafold, checkedOn: "2026-11-23" },
  ] },
};
