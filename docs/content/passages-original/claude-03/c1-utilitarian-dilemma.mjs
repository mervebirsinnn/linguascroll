import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Utilitarianism{faydacılık}, in{} the{} form{biçim} developed{geliştirilmek} by{tarafından} Jeremy{Jeremy} Bentham{Bentham} and{} later{daha sonra} refined{inceltilmek} by{tarafından} John{John} Stuart{Stuart} Mill{Mill}, holds{savunmak} that{ki} the{} right{doğru} action{eylem} is{} the{} one{olan} that{ki} produces{üretmek} the{} greatest{en büyük} overall{toplam} happiness{mutluluk}.", "Jeremy Bentham'ın geliştirdiği ve daha sonra John Stuart Mill'in incelttiği biçimiyle faydacılık, doğru eylemin en büyük toplam mutluluğu üreten eylem olduğunu savunur."],
    ["Its{} appeal{çekicilik} lies{yatmak} in{} its{} impartiality{tarafsızlık}: each{her} person's{kişinin} welfare{refah} counts{sayılmak} equally{eşit olarak}, and{} no{hiçbir} one's{kimsenin} interests{çıkarlar} are{} privileged{ayrıcalıklı kılınmak} by{yoluyla} rank{rütbe, statü} or{} relationship{ilişki}.", "Çekiciliği tarafsızlığında yatar: Her kişinin refahı eşit sayılır ve hiç kimsenin çıkarı statü ya da yakınlık yüzünden ayrıcalıklı kılınmaz."],
    ["Yet{yine de} a{} theory{kuram} judged{yargılanmak} purely{yalnızca} by{-e göre} outcomes{sonuçlar} invites{davet etmek} an{} awkward{rahatsız edici} question{soru} about{hakkında} the{} means{araçlar} used{kullanılmak} to{-mek için} reach{ulaşmak} them{}.", "Yine de yalnızca sonuçlarına göre yargılanan bir kuram, bu sonuçlara ulaşmak için kullanılan araçlar hakkında rahatsız edici bir soruyu davet eder."],
  ],
  [
    ["In{} 1967 the{} philosopher{filozof} Philippa{Philippa} Foot{Foot} described{betimlemek} a{} runaway{kontrolden çıkmış} tram{tramvay} heading{yönelmek} towards{-e doğru} five{beş} workers{işçiler}, which{ki onu} a{} driver{sürücü} could{-ebilirdi} steer{yönlendirmek} onto{üzerine} a{} side{yan} track{hat, ray} where{ki orada} it{} would{-ecekti} kill{öldürmek} one{bir kişi}.", "1967'de filozof Philippa Foot, beş işçiye doğru giden kontrolden çıkmış bir tramvayı betimledi; sürücü onu bir kişiyi öldüreceği yan hatta yönlendirebilirdi."],
    ["Most{çoğu} people{insanlar} asked{sorulmak} about{hakkında} such{böyle} a{} case{durum} say{söylemek} that{ki} turning{çevirmek} the{} tram{tramvay} is{} permissible{izin verilebilir}.", "Böyle bir durum sorulan insanların çoğu tramvayı çevirmenin kabul edilebilir olduğunu söyler."],
    ["Judith{Judith} Jarvis{Jarvis} Thomson{Thomson}, who{ki o} later{daha sonra} gave{vermek} the{} puzzle{bilmece} its{} name{ad}, added{eklemek} a{} variant{varyant, çeşitleme} in{} which{ki onda} the{} only{tek} way{yol} to{-mek için} save{kurtarmak} the{} five{beş kişi} is{} to{-mek} push{itmek} a{} large{iri} stranger{yabancı} from{-den} a{} footbridge{yaya köprüsü} into{içine} the{} tram's{tramvayın} path{yol}.", "Bilmeceye daha sonra adını veren Judith Jarvis Thomson, beş kişiyi kurtarmanın tek yolunun iri bir yabancıyı yaya köprüsünden tramvayın yoluna itmek olduğu bir çeşitleme ekledi."],
    ["Here{burada}, although{-e rağmen} the{} arithmetic{aritmetik, hesap} is{} identical{aynı}, a{} clear{açık} majority{çoğunluk} refuses{reddetmek}.", "Burada hesap aynı olmasına rağmen açık bir çoğunluk reddeder."],
  ],
  [
    ["Strict{katı} utilitarians{faydacılar} can{-ebilir} bite{ısırmak (bite the bullet: acı gerçeği kabullenmek)} the{} bullet{kurşun (bite the bullet: acı gerçeği kabullenmek)} and{} insist{ısrar etmek} that{ki} pushing{itmek} is{} the{} right{doğru} choice{seçim}, treating{saymak} the{} widespread{yaygın} reluctance{isteksizlik} as{olarak} a{} bias{önyargı} to{-ecek} be{} overcome{üstesinden gelinmek}.", "Katı faydacılar acı sonucu kabullenip itmenin doğru seçim olduğunda ısrar edebilir ve yaygın isteksizliği aşılması gereken bir önyargı sayabilir."],
    ["Others{diğerleri} appeal{başvurmak} to{-e} the{} doctrine{öğreti} of{} double{çifte} effect{etki}, an{} older{daha eski} principle{ilke} distinguishing{ayırt etmek} harm{zarar} that{ki} is{} intended{amaçlanmak} as{olarak} a{} means{araç} from{-den} harm{zarar} that{ki} is{} merely{yalnızca} foreseen{öngörülmek} as{olarak} a{} side{yan} effect{etki}.", "Diğerleri çifte etki öğretisine başvurur; bu, araç olarak amaçlanan zararı yalnızca yan etki olarak öngörülen zarardan ayıran daha eski bir ilkedir."],
    ["On{-e göre (on this view)} this{} view{görüş} the{} stranger{yabancı} on{} the{} bridge{köprü} is{} used{kullanılmak} as{olarak} a{} tool{alet}, whereas{oysa} the{} worker{işçi} on{} the{} side{yan} track{hat, ray} is{} not{}.", "Bu görüşe göre köprüdeki yabancı bir alet olarak kullanılır, oysa yan hattaki işçi kullanılmaz."],
    ["Neither{hiçbiri} response{yanıt} is{} free{arınmış} of{} difficulty{güçlük}, and{} the{} debate{tartışma} has{} continued{sürmek} for{} decades{onlarca yıl}.", "İki yanıt da güçlükten arınmış değildir ve tartışma onlarca yıldır sürüyor."],
  ],
  [
    ["What{şey (ne)} the{} cases{durumlar} reveal{ortaya koymak}, perhaps{belki}, is{} less{daha az} a{} verdict{hüküm} on{hakkında} utilitarianism{faydacılık} than{-den} a{} fact{olgu} about{hakkında} moral{ahlaki} thinking{düşünme} itself{kendisi}.", "Bu durumların ortaya koyduğu şey, belki de, faydacılık hakkında bir hükümden çok ahlaki düşünmenin kendisi hakkında bir olgudur."],
    ["Our{} judgements{yargılar} seem{görünmek} sensitive{duyarlı} not{} only{yalnızca} to{-e} how{kaç (how many)} many{kaç (how many)} lives{hayatlar} are{} at{söz konusu (at stake)} stake{söz konusu (at stake)} but{} to{-e} how{nasıl} harm{zarar} is{} brought{getirilmek (bring about: yol açmak)} about{(bring about: yol açmak)}, and{} any{herhangi bir} credible{inandırıcı} theory{kuram} must{-meli} either{ya} explain{açıklamak} that{o} sensitivity{duyarlılık} or{} argue{savunmak} convincingly{ikna edici biçimde} that{ki} it{} should{-meli} be{} abandoned{bırakılmak}.", "Yargılarımız yalnızca kaç hayatın söz konusu olduğuna değil, zararın nasıl verildiğine de duyarlı görünüyor; inandırıcı her kuram ya bu duyarlılığı açıklamalı ya da bırakılması gerektiğini ikna edici biçimde savunmalıdır."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-utilitarian-dilemma", rows);
const util = "Encyclopaedia Britannica, Utilitarianism; https://www.britannica.com/topic/utilitarianism-philosophy";
const dde = "Stanford Encyclopedia of Philosophy, Doctrine of Double Effect; https://plato.stanford.edu/entries/double-effect/";
const da = "Stanford Encyclopedia of Philosophy, Doing vs. Allowing Harm; https://plato.stanford.edu/entries/doing-allowing/";
const trolley = "Foot P (1967), The Problem of Abortion and the Doctrine of the Double Effect, Oxford Review 5: 5-15; Thomson JJ (1976), Killing, Letting Die, and the Trolley Problem, The Monist 59(2): 204-217; Thomson JJ (1985), The Trolley Problem, Yale Law Journal 94(6): 1395-1415; ayrica Encyclopaedia Britannica, trolley problem";
const gazette = "Harvard Gazette, Is doing the right thing hard-wired? (2007); https://news.harvard.edu/gazette/story/2007/05/is-doing-the-right-thing-hard-wired/";
const pmcMeth = "PMC (NIH), Methodological Issues in the Neuroscience of Moral Judgement; https://pmc.ncbi.nlm.nih.gov/articles/PMC3303120/";
const pmcCrit = "PMC (NIH), Untested Assumptions and Tenuous Evidence: A Critique of the Dual-Process Account of Moral Judgment; https://pmc.ncbi.nlm.nih.gov/articles/PMC12838211/";
const princeton = "Princeton University, Greene et al. (2001) An fMRI investigation of emotional engagement in moral judgment (abstract record); https://collaborate.princeton.edu/en/publications/an-fmri-investigation-of-emotional-engagement-in-moral-judgment/";

export default {
  slug: "c1-utilitarian-dilemma", level: "C1", title: "Same Numbers, Different Answers", topic: "Felsefe", sortOrder: 33, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central claim?", evidence: findEvidence(paragraphs, "any credible theory must either explain that sensitivity or argue convincingly that it should be abandoned"), options: [
      option("o1", "Theories must address how harm is caused", true, null, "Yazar yargılarımızın zararın nasıl verildiğine duyarlı olduğunu ve kuramların bunu hesaba katması gerektiğini savunur."),
      option("o2", "The trolley cases prove utilitarianism wrong", false, "extreme", "Yazar bu durumların bir hükümden çok ahlaki düşünme hakkında bir olgu gösterdiğini söyler."),
      option("o3", "Pushing the stranger is clearly the right act", false, "reverse", "Bu yalnızca katı faydacıların görüşüdür; yazar onu benimsemez."),
      option("o4", "Bentham devised the trolley puzzle in 1967", false, "reverse", "1967'de bilmeceyi betimleyen Philippa Foot'tur."),
    ] },
    { key: "q2", type: "detail", prompt: "What does the passage say about the footbridge case?", evidence: findEvidence(paragraphs, "although the arithmetic is identical, a clear majority refuses"), options: [
      option("o1", "The numbers match, but most refuse", true, null, "Hesap aynıdır (beşe karşı bir) ama açık bir çoğunluk itmeyi reddeder."),
      option("o2", "Most people agree to push the stranger", false, "reverse", "Çoğunluk itmeyi reddeder; kabul edilen tramvayı çevirmektir."),
      option("o3", "Philippa Foot devised it in 1967", false, "reverse", "Foot 1967'de ilk durumu betimledi; köprü çeşitlemesini Thomson ekledi."),
      option("o4", "It saves more lives than the first case", false, "reverse", "Metin hesabın aynı olduğunu söyler."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “bite the bullet” mean in the third paragraph?", evidence: findEvidence(paragraphs, "Strict utilitarians can bite the bullet"), options: [
      option("o1", "Accept a hard conclusion", true, null, "Bite the bullet, hoş olmayan bir sonucu kabullenmek demektir; burada itmenin doğru olduğu sonucu."),
      option("o2", "Refuse to answer the question", false, "context", "Katı faydacılar yanıt vermekten kaçınmaz; açık bir yanıtta ısrar eder."),
      option("o3", "Change their theory entirely", false, "reverse", "Tersine, kuramlarına sadık kalırlar."),
      option("o4", "Act violently against others", false, "context", "Kurşun sözcüğü yanıltıcıdır; deyimin şiddetle ilgisi yoktur."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author stress that the arithmetic is “identical”?", evidence: findEvidence(paragraphs, "although the arithmetic is identical"), options: [
      option("o1", "To show numbers cannot explain the shift", true, null, "Sayılar aynıyken yanıtlar değişiyorsa, farkı sonuçlar değil zararın veriliş biçimi açıklamalıdır."),
      option("o2", "To prove that pushing is morally required", false, "extreme", "Yazar bir zorunluluk ileri sürmez."),
      option("o3", "To show the survey results were miscounted", false, "context", "Sayım hatasından söz edilmez; aritmetik vakadaki hayat sayısıdır."),
      option("o4", "To suggest that Foot's case was a mistake", false, "notstated", "Foot'un örneğinin hatalı olduğu ima edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Faydacılık Bentham tarafından geliştirilip Mill tarafından inceltildi; doğru eylemi en büyük mutluluğu üreten eylem sayar ve herkesin refahını eşit sayar.", source: util, checkedOn: "2026-11-23" },
    { claim: "Philippa Foot 1967 tarihli makalesinde kontrolden çıkmış tramvay örneğini verdi; Judith Jarvis Thomson daha sonra 'trolley problem' adını verip köprüden itme çeşitlemesini ekledi.", source: trolley, checkedOn: "2026-11-23" },
    { claim: "Çifte etki öğretisi, araç olarak amaçlanan zarar ile yalnızca yan etki olarak öngörülen zarar arasında ayrım yapar ve tramvay örneklerinde sıkça kullanılır.", source: dde, checkedOn: "2026-11-23" },
    { claim: "Moral Sense Test'te katılımcıların %90'ı tramvayı çevirip bir kişiyi öldürmeyi beşini kurtarmak için kabul edilebilir buldu.", source: gazette, checkedOn: "2026-11-25" },
    { claim: "Köprüden itme (Footbridge) durumunda Borg ve ark. (2006) örnekleminde %69 böyle bir eylemi yanlış buldu (%31 kabul edilebilir); yani açık çoğunluk reddeder.", source: pmcMeth, checkedOn: "2026-11-25" },
    { claim: "Kaldıraç ve köprü senaryolarında sonuçlar özdeştir; buna rağmen insanlar kaldıraç durumunda eylemi köprü durumundan daha sık onaylar; Greene ve ark. (2001) bunu duygusal katılımla ilişkilendirdi ve kişisel (köprü) dilemmalarda 'uygun' yanıtların daha yavaş verildiğini bildirdi.", source: pmcCrit, checkedOn: "2026-11-25" },
    { claim: "Greene ve ark. (2001) ahlaki ikilemlerin duygusal işlemeyi farklı ölçüde devreye soktuğunu savunur (özet kaydı).", source: princeton, checkedOn: "2026-11-25" },
  ] },
};
