import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Large{büyük} language{dil} models{modeller} can{-ebilir} draft{taslağını yazmak} essays{denemeler}, summarise{özetlemek} reports{raporlar} and{} answer{yanıtlamak} questions{sorular} in{} fluent{akıcı} prose{düzyazı}, which{ki bu} makes{yapmak} it{} easy{kolay} to{-mek} forget{unutmak} how{nasıl} they{} are{} built{inşa edilmek}.", "Büyük dil modelleri akıcı bir düzyazıyla deneme taslağı yazabilir, rapor özetleyebilir ve soru yanıtlayabilir; bu da nasıl inşa edildiklerini unutmayı kolaylaştırır."],
    ["Most{çoğu} current{güncel} systems{sistemler} rest{dayanmak} on{} the{} transformer{dönüştürücü (transformer)}, an{} architecture{mimari} described{tanımlanmak} by{tarafından} researchers{araştırmacılar} at{} Google{Google} in{} 2017, and{} are{} trained{eğitilmek} on{üzerinde} enormous{devasa} collections{derlemler, koleksiyonlar} of{} text{metin} to{-mek için} predict{tahmin etmek} which{hangi} word{sözcük} fragment{parça}, or{} token{belirteç (token)}, is{} likely{muhtemel} to{-mesi} come{gelmek} next{sonra, ardından}.", "Güncel sistemlerin çoğu, 2017'de Google'daki araştırmacıların tanımladığı bir mimari olan transformer'a dayanır ve sırada hangi sözcük parçasının, yani belirtecin, gelmesinin muhtemel olduğunu tahmin etmek için devasa metin koleksiyonları üzerinde eğitilir."],
    ["Later{sonraki} stages{aşamalar} of{} training{eğitim}, often{sıklıkla} guided{yönlendirilmek} by{tarafından} human{insan} feedback{geri bildirim}, refine{inceltmek, iyileştirmek} its{} behaviour{davranış}, but{} the{} underlying{temeldeki} skill{beceri} remains{kalmak} statistical{istatistiksel} prediction{tahmin}.", "Sıklıkla insan geri bildirimiyle yönlendirilen sonraki eğitim aşamaları davranışını iyileştirir, ama temeldeki beceri istatistiksel tahmin olarak kalır."],
  ],
  [
    ["This{} design{tasarım} explains{açıklamak} both{hem} the{} strengths{güçlü yanlar} and{} the{} characteristic{karakteristik} failures{başarısızlıklar} of{} the{} technology{teknoloji}.", "Bu tasarım, teknolojinin hem güçlü yanlarını hem de karakteristik başarısızlıklarını açıklar."],
    ["Because{çünkü} a{} model{model} is{} trained{eğitilmek} to{-mek} produce{üretmek} plausible{akla yatkın} continuations{devamlar} rather{-den çok (rather than)} than{-den çok (rather than)} to{-mek} check{denetlemek} claims{iddialar} against{-e karşı} the{} world{dünya}, it{} can{-ebilir} state{ifade etmek} an{} invented{uydurma} citation{alıntı, kaynak gösterimi} or{} a{} wrong{yanlış} date{tarih} with{} the{} same{aynı} confidence{özgüven} as{} a{} correct{doğru} one{olan}.", "Bir model, iddiaları dünyaya karşı denetlemek yerine akla yatkın devamlar üretmek için eğitildiğinden, uydurma bir kaynak gösterimini ya da yanlış bir tarihi doğrusuyla aynı özgüvenle ifade edebilir."],
    ["Developers{geliştiriciler} call{adlandırmak} these{} errors{hatalar} hallucinations{halüsinasyonlar}, and{} OpenAI's{OpenAI'nin} own{kendi} technical{teknik} report{rapor} on{hakkında} GPT{GPT}-4 acknowledged{kabul etmek} in{} 2023 that{ki} the{} model{model} was{} not{} fully{tamamen} reliable{güvenilir}.", "Geliştiriciler bu hatalara halüsinasyon der; OpenAI'nin GPT-4 hakkındaki kendi teknik raporu da 2023'te modelin tamamen güvenilir olmadığını kabul etti."],
    ["The{} same{aynı} report{rapor} noted{belirtmek} that{ki} the{} system{sistem} generally{genel olarak} lacked{yoksun olmak} knowledge{bilgi} of{} events{olaylar} after{sonra} most{çoğu} of{} its{} training{eğitim} data{veri} had{} been{} collected{toplanmak}.", "Aynı rapor, sistemin eğitim verisinin çoğu toplandıktan sonraki olaylar hakkında genel olarak bilgiden yoksun olduğunu belirtti."],
  ],
  [
    ["Whether{-ip -madığı} such{böyle} systems{sistemler} understand{anlamak} anything{bir şey} remains{kalmak} contested{tartışmalı}.", "Böyle sistemlerin bir şey anlayıp anlamadığı tartışmalı olmayı sürdürüyor."],
    ["In{} a{} widely{yaygın olarak} cited{alıntılanan} 2021 paper{makale}, Emily{Emily} Bender{Bender}, Timnit{Timnit} Gebru{Gebru} and{} colleagues{meslektaşlar} described{tanımlamak} language{dil} models{modeller} as{olarak} stochastic{rastlantısal (olasılıksal)} parrots{papağanlar}, stitching{dikmek, eklemek} together{bir araya} linguistic{dilsel} forms{biçimler} without{-meden} reference{gönderme} to{-e} meaning{anlam}.", "Yaygın olarak alıntılanan 2021 tarihli bir makalede Emily Bender, Timnit Gebru ve meslektaşları dil modellerini, anlama gönderme yapmadan dilsel biçimleri bir araya ekleyen rastlantısal papağanlar olarak tanımladı."],
    ["Other{diğer} researchers{araştırmacılar} counter{karşı çıkarak yanıt vermek} that{ki} the{} ability{yetenek} to{-me} solve{çözmek} unfamiliar{tanıdık olmayan} problems{sorunlar} suggests{düşündürmek} some{bir tür} internal{iç} representation{temsil} of{} the{} world{dünya}, even{bile} if{} it{} differs{farklı olmak} from{-den} ours{bizimki}.", "Diğer araştırmacılar ise tanıdık olmayan sorunları çözebilmenin, bizimkinden farklı olsa bile dünyanın bir tür iç temsilini düşündürdüğünü söyleyerek karşı çıkıyor."],
  ],
  [
    ["For{} practical{pratik} purposes{amaçlar}, the{} philosophical{felsefi} debate{tartışma} matters{önemli olmak} less{daha az} than{-den} a{} simple{basit} discipline{disiplin}.", "Pratik amaçlar için felsefi tartışma, basit bir disiplinden daha az önemlidir."],
    ["Fluency{akıcılık} is{} evidence{kanıt} that{ki} a{} model{model} has{} absorbed{özümsemek} the{} patterns{örüntüler} of{} human{insan} writing{yazı}, not{} evidence{kanıt} that{ki} a{} particular{belirli} sentence{cümle} is{} true{doğru}.", "Akıcılık, bir modelin insan yazısının örüntülerini özümsediğinin kanıtıdır; belirli bir cümlenin doğru olduğunun kanıtı değil."],
    ["Treating{ele almak} its{} output{çıktı} as{olarak} a{} draft{taslak} to{-ecek} be{} verified{doğrulanmak}, rather{-den çok (rather than)} than{-den çok (rather than)} as{olarak} a{} verdict{hüküm} to{-ecek} be{} trusted{güvenilmek}, lets{izin vermek} users{kullanıcılar} benefit{yararlanmak} from{-den} the{} speed{hız} without{-meden} inheriting{devralmak} the{} errors{hatalar}.", "Çıktısını güvenilecek bir hüküm olarak değil de doğrulanacak bir taslak olarak ele almak, kullanıcıların hatalarını devralmadan hızından yararlanmasını sağlar."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-large-language-models", rows);
const vaswani = "Vaswani A. et al. (2017), Attention Is All You Need, arXiv:1706.03762; https://arxiv.org/abs/1706.03762";
const gpt4 = "OpenAI (2023), GPT-4 Technical Report, arXiv:2303.08774; https://arxiv.org/abs/2303.08774";
const bender = "Bender E.M., Gebru T. et al. (2021), On the Dangers of Stochastic Parrots, FAccT '21, ACM; https://dl.acm.org/doi/10.1145/3442188.3445922";
const pnas = "Mitchell M., Krakauer D.C. (2023), The debate over understanding in AI's large language models, PNAS; https://www.pnas.org/doi/10.1073/pnas.2215907120";

export default {
  slug: "c1-large-language-models", level: "C1", title: "Fluent Is Not the Same as True", topic: "Yapay zeka", sortOrder: 32, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main point?", evidence: findEvidence(paragraphs, "Fluency is evidence that a model has absorbed the patterns of human writing, not evidence that a particular sentence is true."), options: [
      option("o1", "Fluent output still needs checking", true, null, "Yazar akıcılığın doğruluğun kanıtı olmadığını, çıktının doğrulanacak bir taslak sayılması gerektiğini savunur."),
      option("o2", "Language models clearly understand what they say", false, "extreme", "Metin anlama sorusunun tartışmalı kaldığını söyler."),
      option("o3", "Human feedback has removed hallucinations", false, "reverse", "Geri bildirim davranışı iyileştirir ama hatalar sürer; rapor modelin tamamen güvenilir olmadığını kabul eder."),
      option("o4", "Transformers were built mainly to verify facts", false, "reverse", "Modeller olgu denetlemek için değil, sonraki belirteci tahmin etmek için eğitilir."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, why can a model state a wrong date confidently?", evidence: findEvidence(paragraphs, "trained to produce plausible continuations rather than to check claims against the world"), options: [
      option("o1", "It predicts likely text, not true facts", true, null, "Model akla yatkın devamlar üretmek için eğitilir; iddiaları dünyaya karşı denetlemez."),
      option("o2", "Its training data were gathered after 2023", false, "reverse", "2023 raporun yılıdır; metin verinin ne zaman toplandığını böyle söylemez."),
      option("o3", "Human feedback teaches it to sound certain", false, "notstated", "Geri bildirimin özgüven öğrettiği söylenmez."),
      option("o4", "It is designed to conceal its own doubts", false, "notstated", "Şüphe gizlemek için tasarlandığından söz edilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “counter” mean in the third paragraph?", evidence: findEvidence(paragraphs, "Other researchers counter that the ability to solve unfamiliar problems"), options: [
      option("o1", "Argue in response", true, null, "Burada counter fiildir: karşı görüşe yanıt olarak itiraz edip savunmak."),
      option("o2", "Count something carefully", false, "context", "Count ile benzerlik yanıltıcıdır; sayma anlamı yoktur."),
      option("o3", "Fully agree with them", false, "reverse", "Diğer araştırmacılar papağan görüşüne karşı çıkar, katılmaz."),
      option("o4", "Serve customers at a desk", false, "context", "Tezgah (isim) anlamı bu cümlede geçerli değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about the debate over whether models understand?", evidence: findEvidence(paragraphs, "the philosophical debate matters less than a simple discipline"), options: [
      option("o1", "It need not be settled to use models wisely", true, null, "Yazar pratikte tartışmadan çok doğrulama disiplininin önemli olduğunu söyler; tartışma çözülmeden de akıllıca kullanım mümkündür."),
      option("o2", "It proves models are stochastic parrots", false, "extreme", "Yazar bir tarafı kanıtlanmış saymaz; tartışmayı açık bırakır."),
      option("o3", "It has been resolved in favour of the models", false, "reverse", "Metin konunun tartışmalı kaldığını söyler."),
      option("o4", "It is the main cause of hallucinations", false, "notstated", "Halüsinasyonlar eğitim amacına bağlanır, tartışmaya değil."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Transformer mimarisi 2017'de Google'daki araştırmacıların 'Attention Is All You Need' makalesiyle tanımlandı.", source: vaswani, checkedOn: "2026-11-23" },
    { claim: "GPT-4 sonraki belirteci tahmin etmek üzere ön eğitilmiş, ardından insan geri bildirimiyle pekiştirmeli öğrenmeyle ince ayar yapılmıştır; rapor modelin tamamen güvenilir olmadığını (olguları 'halüsine ettiğini') ve ön eğitim verisinin büyük kısmının kesildiği tarihten sonraki olaylar hakkında genel olarak bilgisi olmadığını kabul eder.", source: gpt4, checkedOn: "2026-11-23" },
    { claim: "Bender, Gebru ve meslektaşları 2021'de dil modellerini anlama gönderme yapmadan dilsel biçimleri birleştiren 'stochastic parrots' olarak nitelendirdi.", source: bender, checkedOn: "2026-11-23" },
    { claim: "Büyük dil modellerinin bir tür anlama ya da dünya temsili taşıyıp taşımadığı araştırmacılar arasında tartışmalıdır; iki taraf da savunulmaktadır.", source: pnas, checkedOn: "2026-11-23" },
  ] },
};
