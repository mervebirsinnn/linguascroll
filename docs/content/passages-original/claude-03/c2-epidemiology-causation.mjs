import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Epidemiology{epidemiyoloji} is{} often{sıklıkla} described{tanımlanmak} as{olarak} the{} science{bilim} of{} counting{sayma}, but{} its{} harder{daha zor} task{görev} is{} deciding{karar vermek} what{neyi} the{} counts{sayımlar} mean{anlamına gelmek}.", "Epidemiyoloji sıklıkla sayma bilimi olarak tanımlanır, ama daha zor görevi sayımların ne anlama geldiğine karar vermektir."],
    ["A{} correlation{korelasyon} between{arasında} an{} exposure{maruz kalma} and{} a{} disease{hastalık} is{} cheap{ucuz}; an{} argument{argüman} that{ki} the{} exposure{maruz kalma} produces{yol açmak} the{} disease{hastalık} is{} expensive{pahalı}, and{} the{} price{bedel} is{} paid{ödenmek} in{cinsinden} alternatives{alternatifler} ruled{dışlamak (rule out)} out{dışlamak (rule out)} rather{yerine (rather than)} than{yerine (rather than)} in{cinsinden} data{veri} collected{toplanmak}.", "Bir maruziyet ile bir hastalık arasındaki korelasyon ucuzdur; maruziyetin hastalığa yol açtığı argümanı pahalıdır ve bedel toplanan veriyle değil, dışlanan alternatiflerle ödenir."],
    ["The{} discipline's{disiplinin} history{tarih} is{} largely{büyük ölçüde} a{} history{tarih} of{} learning{öğrenmek} which{hangi} alternatives{alternatifler} matter{önemli olmak}.", "Disiplinin tarihi büyük ölçüde hangi alternatiflerin önemli olduğunu öğrenmenin tarihidir."],
  ],
  [
    ["The{} episode{olay} most{en} often{sık} cited{anılmak} is{} John{John} Snow's{Snow'un} investigation{inceleme} of{} the{} cholera{kolera} outbreak{salgın} around{çevresinde} Broad{Broad} Street{Sokağı} in{} London{Londra} in{-de} eighteen{on sekiz} fifty{elli} four{dört}.", "En sık anılan olay, John Snow'un 1854'te Londra'da Broad Street çevresindeki kolera salgınını incelemesidir."],
    ["Snow{Snow} mapped{haritalamak} deaths{ölümler}, noticed{fark etmek} that{ki} they{} clustered{kümelenmek} near{yakınında} one{tek bir} public{kamuya ait} water{su} pump{pompa}, and{} persuaded{ikna etmek} local{yerel} officials{yetkililer} to{-meye} remove{sökmek} its{} handle{kol}.", "Snow ölümleri haritaladı, bunların tek bir kamu su pompası yakınında kümelendiğini fark etti ve yerel yetkilileri pompanın kolunu sökmeye ikna etti."],
    ["The{} story{hikaye} is{} usually{genellikle} told{anlatılmak} as{olarak} a{} triumph{zafer} of{} observation{gözlem} over{-e karşı} the{} prevailing{yaygın} belief{inanç} that{ki} cholera{kolera} spread{yayılmak} through{yoluyla} bad{kötü} air{hava}.", "Hikaye genellikle gözlemin, koleranın kötü hava yoluyla yayıldığına dair yaygın inanca karşı zaferi olarak anlatılır."],
    ["It{} was{} such{öyle} a{} triumph{zafer}, but{} a{} qualified{kayıtlı, sınırlı} one{bir tane}: Snow{Snow} himself{kendisi} acknowledged{kabul etmek} that{ki} the{} outbreak{salgın} was{} already{zaten} declining{azalmak} when{-dığında} the{} handle{kol} came{çıkmak (come off)} off{çıkmak (come off)}, so{bu yüzden} the{} removal{sökülme} could{-ebilmek} not{} by{tek başına (by itself)} itself{tek başına (by itself)} prove{kanıtlamak} his{} case{iddia}.", "Gerçekten öyle bir zaferdi, ama kayıtlı bir zafer: Snow'un kendisi kol söküldüğünde salgının zaten azalmakta olduğunu kabul etti; dolayısıyla sökülme tek başına iddiasını kanıtlayamazdı."],
  ],
  [
    ["What{-en şey} actually{aslında} carried{taşımak} the{} argument{argüman} was{} a{} comparison{karşılaştırma}.", "Argümanı asıl taşıyan şey bir karşılaştırmaydı."],
    ["Snow{Snow} also{ayrıca} examined{incelemek} households{haneler} supplied{su verilmek, tedarik edilmek} by{tarafından} two{iki} water{su} companies{şirketler}, one{biri} of{} which{ki onlardan} drew{çekmek} from{-den} a{} stretch{kesim} of{} the{} Thames{Thames} contaminated{kirlenmiş} by{tarafından} sewage{kanalizasyon atığı}, and{} found{bulmak} far{çok daha} higher{yüksek} cholera{kolera} mortality{ölüm oranı} among{arasında} its{} customers{müşteriler}.", "Snow ayrıca iki su şirketinin su verdiği haneleri inceledi; şirketlerden biri Thames'in kanalizasyonla kirlenmiş bir kesiminden su çekiyordu ve onun müşterileri arasında çok daha yüksek kolera ölüm oranı buldu."],
    ["Because{çünkü} the{} pipes{borular} of{} both{her iki} companies{şirketler} ran{uzanmak} along{boyunca} the{} same{aynı} streets{sokaklar}, the{} households{haneler} differed{farklılaşmak} in{bakımından} water{su} but{} resembled{benzemek} each{birbiri (each other)} other{birbiri (each other)} in{bakımından} most{çoğu} other{diğer} respects{açılar}.", "Her iki şirketin boruları aynı sokaklar boyunca uzandığı için haneler su bakımından farklıydı ama diğer çoğu açıdan birbirine benziyordu."],
    ["The{} design{tasarım} did{yapmak} quietly{sessizce} what{-eni} later{sonraki} methods{yöntemler} would{-ecekti} do{yapmak} formally{resmi biçimde}: it{} made{kılmak} rival{rakip} explanations{açıklamalar} implausible{akla yatmaz} rather{yerine (rather than)} than{yerine (rather than)} merely{yalnızca} unexamined{incelenmemiş}.", "Tasarım, sonraki yöntemlerin resmi biçimde yapacağını sessizce yaptı: rakip açıklamaları yalnızca incelenmemiş bırakmak yerine akla yatmaz kıldı."],
  ],
  [
    ["Roughly{aşağı yukarı} a{} century{yüzyıl} later{sonra}, Austin{Austin} Bradford{Bradford} Hill{Hill} proposed{önermek} a{} set{dizi} of{} considerations{ölçütler} for{} moving{geçmek} from{-den} association{ilişki, birliktelik} to{-e} causation{nedensellik}, including{dahil} the{} strength{güç} of{} an{} association{ilişki, birliktelik}, its{} consistency{tutarlılık} across{arasında} studies{çalışmalar}, and{} whether{-ip -mediği} the{} exposure{maruz kalma} preceded{önce gelmek} the{} disease{hastalık}.", "Aşağı yukarı bir yüzyıl sonra Austin Bradford Hill ilişkiden nedenselliğe geçmek için bir dizi ölçüt önerdi; bunlar arasında ilişkinin gücü, çalışmalar arasındaki tutarlılığı ve maruziyetin hastalıktan önce gelip gelmediği vardı."],
    ["They{} are{} frequently{sıklıkla} taught{öğretilmek} as{olarak} a{} checklist{kontrol listesi}.", "Bunlar sıklıkla bir kontrol listesi olarak öğretilir."],
    ["Hill{Hill}, however{ancak}, insisted{ısrarla belirtmek} that{ki} none{hiçbiri} of{} them{} was{} indispensable{vazgeçilmez} and{} that{ki} none{hiçbiri} could{-ebilmek} settle{karara bağlamak} the{} question{soru} alone{tek başına}, which{ki bu} makes{kılmak} the{} checklist{kontrol listesi} reading{okuma, yorum} a{} curious{tuhaf} inversion{tersine çevirme} of{} his{} intent{niyet}: what{-en şey} he{} offered{sunmak} as{olarak} aids{yardımcılar} to{-e} judgment{muhakeme} is{} routinely{rutin olarak} used{kullanılmak} as{olarak} a{} substitute{yerine geçen şey} for{-in yerine} it{onu}.", "Ancak Hill bunların hiçbirinin vazgeçilmez olmadığını ve hiçbirinin soruyu tek başına karara bağlayamayacağını ısrarla belirtti; bu da kontrol listesi yorumunu niyetinin tuhaf bir tersine çevrilmesi yapar: muhakemeye yardımcı olarak sunduğu şey rutin olarak muhakemenin yerine kullanılır."],
  ],
  [
    ["None{hiçbiri} of{} this{} licenses{meşru kılmak} the{} opposite{karşıt} error{hata} of{} treating{saymak, ele almak} every{her} observed{gözlenen} link{bağlantı} as{olarak} hopelessly{umutsuzca} confounded{karıştırıcı etkenlerle bozulmuş}.", "Bunların hiçbiri, gözlenen her bağlantıyı umutsuzca karıştırıcı etkenlerle bozulmuş sayma şeklindeki karşıt hatayı meşru kılmaz."],
    ["The{} lesson{ders} is{} narrower{daha dar} and{} more{daha} demanding{zorlu}: causal{nedensel} claims{iddialar} in{} epidemiology{epidemiyoloji} are{} earned{kazanılmak} by{yoluyla} the{} patient{sabırlı} elimination{eleme} of{} competitors{rakipler}, and{} a{} count{sayım} is{} only{ancak} as{kadar} informative{bilgilendirici} as{kadar} the{} alternatives{alternatifler} it{} was{} designed{tasarlanmak} to{-mek} exclude{dışlamak}.", "Ders daha dar ve daha zorludur: epidemiyolojide nedensel iddialar rakiplerin sabırla elenmesiyle kazanılır ve bir sayım ancak dışlamak üzere tasarlandığı alternatifler kadar bilgilendiricidir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-epidemiology-causation", rows);
const snowBrit = "Encyclopaedia Britannica, John Snow; https://www.britannica.com/biography/John-Snow";
const snowUcla = "UCLA Fielding School of Public Health, John Snow site; https://www.ph.ucla.edu/epi/snow.html";
const hill = "Hill AB (1965), The Environment and Disease: Association or Causation?, Proc R Soc Med (PMC); https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1898525/";

export default {
  slug: "c2-epidemiology-causation", level: "C2", title: "Counting and Causing", topic: "Tıp", sortOrder: 36, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central claim?", evidence: findEvidence(paragraphs, "causal claims in epidemiology are earned by the patient elimination of competitors"), options: [
      option("o1", "Causal claims rest on ruling out rival explanations", true, null, "Yazar nedensel iddiaların rakip açıklamaların sabırla elenmesiyle kazanıldığını savunur."),
      option("o2", "Counting cases is usually enough to prove a cause", false, "reverse", "Metin korelasyonun ucuz olduğunu, saymanın yetmediğini söyler."),
      option("o3", "Every observed link in epidemiology is confounded", false, "extreme", "Yazar bunu açıkça 'karşıt hata' olarak reddeder."),
      option("o4", "Removing the pump handle proved Snow's theory beyond doubt", false, "detail", "Metin kolun sökülmesinin tek başına kanıt olamayacağını söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the author, what made Snow's comparison of the two water companies persuasive?", evidence: findEvidence(paragraphs, "the households differed in water but resembled each other in most other respects"), options: [
      option("o1", "Households differed mainly in their water", true, null, "Haneler su bakımından farklı, diğer çoğu açıdan benzerdi; bu rakip açıklamaları zayıflattı."),
      option("o2", "Both companies drew water from the same clean stretch", false, "detail", "Şirketlerden biri kirlenmiş bir kesimden su çekiyordu."),
      option("o3", "Customers of both companies died at similar rates", false, "reverse", "Bir şirketin müşterilerinde ölüm oranı çok daha yüksekti."),
      option("o4", "Officials ordered every pump in London closed", false, "notstated", "Metinde böyle bir emir yoktur; yalnız bir pompanın kolu söküldü."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the final paragraph, what does “confounded” mean?", evidence: findEvidence(paragraphs, "treating every observed link as hopelessly confounded"), options: [
      option("o1", "Distorted by other hidden factors", true, null, "Epidemiyolojide 'confounded', ilişkinin gizli üçüncü etkenlerle bozulmuş olması demektir."),
      option("o2", "Proved beyond any reasonable doubt", false, "reverse", "Anlam neredeyse tam tersidir."),
      option("o3", "Feeling puzzled and embarrassed", false, "context", "Gündelik 'şaşkın' anlamı bu teknik bağlama uymaz."),
      option("o4", "Counted twice by mistake", false, "context", "Sayma geçer ama kelime çift sayım demek değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "Why does the author open the final paragraph by rejecting “the opposite error”?", evidence: findEvidence(paragraphs, "None of this licenses the opposite error of treating every observed link as hopelessly confounded."), options: [
      option("o1", "To guard against blanket scepticism", true, null, "Yazar, eleştirisinin her bağlantıyı reddetmeye dönüşmesini önlemek ister."),
      option("o2", "To argue that correlations prove causation", false, "reverse", "Metin korelasyonun nedenselliği kanıtlamadığını savunur."),
      option("o3", "To show that Hill's ideas were mistaken", false, "notstated", "Yazar Hill'i değil, onun yanlış okunmasını eleştirir."),
      option("o4", "To claim that Snow's methods are outdated", false, "notstated", "Snow'un yöntemi metinde örnek olarak övülür."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "John Snow 1854'te Londra'da Broad Street çevresindeki kolera salgınını inceledi, ölümlerin bir kamu su pompası yakınında kümelendiğini gösterdi ve yerel yetkilileri pompanın kolunu söktürmeye ikna etti; kolera o dönemde yaygın olarak kötü havaya (miasma) bağlanıyordu.", source: snowBrit, checkedOn: "2026-11-23" },
    { claim: "Snow iki su şirketinin (biri Thames'in kanalizasyonla kirlenmiş kesiminden su çeken) müşterilerini karşılaştırdı; boruları aynı sokaklarda iç içeydi ve kirli suyu alan hanelerde ölüm çok daha yüksekti; Snow salgının kol sökülmeden önce zaten azaldığını kendisi kabul etti.", source: snowUcla, checkedOn: "2026-11-23" },
    { claim: "Austin Bradford Hill 1965'te ilişkiden nedenselliğe geçiş için güç, tutarlılık ve zamansallık dahil bir dizi bakış açısı önerdi ve bunların hiçbirinin vazgeçilmez olmadığını, hiçbirinin tek başına kesin kanıt sunmadığını vurguladı.", source: hill, checkedOn: "2026-11-23" },
  ] },
};
