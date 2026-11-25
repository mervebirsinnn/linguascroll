import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Mary{Mary (kişi adı)} Anning{Anning (soyadı)} was{} born{doğdu} in{} 1799 in{} Lyme{Lyme (yer adı)} Regis{Regis (yer adı)}, a{} small{küçük} town{kasaba} on{} the{} south{güney} coast{kıyı} of{} England{İngiltere}.", "Mary Anning 1799'da İngiltere'nin güney kıyısındaki küçük bir kasaba olan Lyme Regis'te doğdu."],
    ["Her{} family{aile} was{} poor{yoksul}, and{} her{} father{baba} made{yaptı} furniture{mobilya} and{} sold{sattı} fossils{fosiller} to{-e} visitors{ziyaretçiler} from{-den} a{} table{masa} outside{dışında} their{} home{ev}.", "Ailesi yoksuldu ve babası mobilya yapıp evlerinin önündeki bir masadan ziyaretçilere fosil satardı."],
    ["As{} a{} child{çocuk}, she{} and{} her{} brother{erkek kardeş} found{buldu} the{} remains{kalıntılar} of{} an{} ichthyosaur{ihtiyozor}, a{} large{büyük} sea{deniz} reptile{sürüngen} that{ki o} lived{yaşadı} millions{milyonlarca} of{} years{yıl} ago{önce}.", "Çocukken erkek kardeşiyle birlikte, milyonlarca yıl önce yaşamış büyük bir deniz sürüngeni olan ihtiyozorun kalıntılarını buldu."],
    ["The{} find{buluntu} attracted{çekti} the{} attention{dikkat} of{} collectors{koleksiyoncular} and{} scholars{bilim insanları} far{çok} beyond{ötesinde} her{} small{küçük} town{kasaba}.", "Bu buluntu, küçük kasabasının çok ötesindeki koleksiyoncuların ve bilim insanlarının dikkatini çekti."],
  ],
  [
    ["After{sonra} her{} father{baba} died{öldü}, Mary{Mary (kişi adı)} kept{sürdürdü} searching{aramayı} the{} cliffs{uçurumlar} and{} the{} beach{plaj}, often{sık sık} just{hemen} after{sonra} a{} storm{fırtına}.", "Babası öldükten sonra Mary, çoğu zaman bir fırtınanın hemen ardından uçurumlarda ve plajda aramaya devam etti."],
    ["That{o} is{} still{hâlâ} the{} best{en iyi} time{zaman} to{-mek için} find{bulmak} fossils{fosiller} on{} that{o} coast{kıyı}.", "Bu, o kıyıda fosil bulmak için hâlâ en iyi zamandır."],
    ["In{} 1823 she{} found{buldu} the{} first{ilk} complete{eksiksiz} plesiosaur{plesiyozor} skeleton{iskelet}, which{ki o} the{} famous{ünlü} scientist{bilim insanı} Georges{Georges (kişi adı)} Cuvier{Cuvier (soyadı)} at{(at first: önce)} first{(at first: önce)} thought{düşündü} was{} a{} fake{sahte}.", "1823'te ilk eksiksiz plesiyozor iskeletini buldu; ünlü bilim insanı Georges Cuvier başta bunun sahte olduğunu düşündü."],
    ["She{} sold{sattı} her{} fossils{fosiller} to{-e} collectors{koleksiyoncular} and{} scholars{bilim insanları}, and{} this{} trade{ticaret} helped{yardım etti} support{desteklemek} her{} family{aile}.", "Fosillerini koleksiyoncu ve bilim insanlarına sattı ve bu ticaret ailesini desteklemeye yardım etti."],
    ["She{} also{ayrıca} taught{öğretti} herself{kendi kendine} anatomy{anatomi} and{} geology{jeoloji}, even{-e rağmen} though{(even though: -e rağmen)} she{} had{} little{az} formal{resmi} education{eğitim}.", "Ayrıca az resmi eğitimi olmasına rağmen kendi kendine anatomi ve jeoloji öğrendi."],
  ],
  [
    ["The{} Geological{Jeoloji (sıfat)} Society{Cemiyet} of{} London{Londra} did{} not{} accept{kabul etmek} women{kadınlar} as{(as: olarak)} members{üyeler}, so{bu yüzden} she{} was{} never{asla} one{biri} of{} them{onlardan}.", "Londra Jeoloji Cemiyeti kadınları üye olarak kabul etmiyordu; bu yüzden o hiçbir zaman üyelerinden biri olmadı."],
    ["Scholars{bilim insanları} studied{inceledi} and{} wrote{yazdı} about{hakkında} her{} fossils{fosiller}, but{} they{} often{sık sık} did{} not{} credit{takdir etmek} her{} discoveries{keşifler}.", "Bilim insanları onun fosillerini inceleyip hakkında yazdı ama keşiflerinin hakkını çoğu zaman teslim etmedi."],
    ["Today{bugün}, historians{tarihçiler} recognise{tanır} her{} as{(as: olarak)} an{} important{önemli} pioneer{öncü} of{} palaeontology{paleontoloji}.", "Bugün tarihçiler onu paleontolojinin önemli bir öncüsü olarak tanır."],
    ["Her{} story{hikâye} shows{gösterir} how{nasıl} class{sınıf} and{} gender{cinsiyet} once{bir zamanlar} decided{belirledi} whose{kimin} work{çalışma} was{} celebrated{övüldü}.", "Hikâyesi, sınıfın ve cinsiyetin bir zamanlar kimin çalışmasının övüleceğini nasıl belirlediğini gösterir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-mary-anning", rows);
const ev = (t) => findEvidence(paragraphs, t);
const nhm = "Natural History Museum, London, Mary Anning: unsung hero; https://www.nhm.ac.uk/discover/mary-anning-unsung-hero.html";
const lrm = "Lyme Regis Museum, Mary Anning; https://www.lymeregismuseum.co.uk/collection/mary-anning/";
const gsl = "Geological Society of London, Plesiosaurus dolichodeirus, found 1823; https://www.geolsoc.org.uk/the-library/online-exhibitions/mary-anning-and-the-geological-society/reconstruction-of-life/plesiosaurus-dolichodeirus/";
const gslExcl = "Geological Society of London, Mary Anning and the Geological Society; https://www.geolsoc.org.uk/the-library/online-exhibitions/mary-anning-and-the-geological-society/";
const murchison = "Geological Society of London, Murchison's account of meeting Mary Anning; https://www.geolsoc.org.uk/the-library/online-exhibitions/mary-anning-and-the-geological-society/geologising-with-mary-anning/murchisons-account-of-meeting-mary-anning/";

export default {
  slug: "b2-mary-anning", level: "B2", title: "The Fossil Hunter of Lyme Regis", topic: "Bilim Tarihi", sortOrder: 35, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("often did not credit her discoveries"), options: [
      option("o1", "A fossil hunter who was undervalued in her time", true, null, "Metin Mary Anning'in keşiflerini ve cinsiyet ile sınıf yüzünden hak ettiği tanınmayı geç aldığını anlatır."),
      option("o2", "A wealthy collector who ran a famous museum", false, "reverse", "Anning yoksul bir aileden gelen bir fosil toplayıcısıydı; zengin koleksiyoncular başkalarıydı."),
      option("o3", "A storm that destroyed a town on the English coast", false, "detail", "Fırtınalar yalnızca fosillerin ortaya çıkmasına yardım eden ayrıntıdır; ana konu değildir."),
      option("o4", "An early experiment in teaching anatomy to children", false, "context", "Anning'in kendi kendine anatomi öğrenmesi küçük bir ayrıntıdır; metin çocuklara anatomi öğretmeyi anlatmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Mary Anning find in 1823?", evidence: ev("she found the first complete plesiosaur skeleton"), options: [
      option("o1", "A complete plesiosaur skeleton", true, null, "Metin 1823'te ilk eksiksiz plesiyozor iskeletini bulduğunu söyler."),
      option("o2", "An ichthyosaur skeleton found as a child", false, "detail", "İhtiyozor iskeletini çocukken buldu; 1823'te değil."),
      option("o3", "Hidden records kept by the Geological Society", false, "notstated", "Metinde böyle bir buluntudan söz edilmez."),
      option("o4", "A rare book about anatomy", false, "notstated", "Metinde böyle bir kitap bulunduğu söylenmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does 'credit' mean in paragraph 3?", evidence: ev("often did not credit her discoveries"), options: [
      option("o1", "Give recognition for", true, null, "Credit, bir kişinin başarısını açıkça kabul edip ona hakkını vermek demektir."),
      option("o2", "Pay a sum of money for", false, "context", "Credit'in para ödemek anlamı vardır ama burada keşiflerin hakkının teslim edilmesinden söz edilir."),
      option("o3", "Disagree with the findings", false, "reverse", "Metin keşiflere itiraz edildiğini değil, sahibinin anılmadığını söyler."),
      option("o4", "Look at it very closely", false, "context", "Bilim insanları fosilleri zaten inceledi; sorun hakkın teslim edilmemesiydi."),
    ] },
    { key: "q4", type: "inference", prompt: "What can be inferred about the Geological Society of London in her time?", evidence: ev("did not accept women as members"), options: [
      option("o1", "Its rules made it hard for women to join", true, null, "Cemiyet kadınları üye olarak kabul etmiyordu; bu, kurallarının kadınlar için engel olduğunu gösterir."),
      option("o2", "It paid her a regular salary for her work", false, "notstated", "Metinde cemiyetin ona maaş ödediği söylenmez; geçimini fosil satarak sağladı."),
      option("o3", "It welcomed people from every background", false, "reverse", "Metin tam tersini söyler; kadınlar üye olamıyordu."),
      option("o4", "It ignored fossils from Lyme Regis", false, "extreme", "Metin bilim insanlarının onun fosillerini incelediğini söyler; tamamen yok saymaktan söz edilmez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Mary Anning 1799'da Lyme Regis'te doğdu; ailesi çok yoksuldu; babası marangoz/mobilya ustasıydı (cabinetmaker) ve fosil toplayıp satıyordu.", source: nhm, checkedOn: "2026-11-25" },
    { claim: "Anning ailesi buluntularını evlerinin dışındaki bir masadan ziyaretçilere satardı; baba çocuklara fosil bulmayı ve hazırlamayı öğretti.", source: lrm, checkedOn: "2026-11-25" },
    { claim: "Erkek kardeşi Joseph dev bir kafatası buldu, Mary iskeletin geri kalanını çıkardı (ihtiyozor); Mary 1823'te ilk eksiksiz plesiyozor iskeletini buldu.", source: lrm, checkedOn: "2026-11-25" },
    { claim: "Plesiyozor 10 Aralık 1823'te bulundu; Cuvier başta bunun sahte olduğunu düşündü.", source: gsl, checkedOn: "2026-11-25" },
    { claim: "Fırtınadan hemen sonra fosil aramak Lyme Regis'te hâlâ en iyi zamandır; Anning fırtına sonrası arama yapardı.", source: murchison, checkedOn: "2026-11-25" },
    { claim: "Az resmi eğitim almasına rağmen okumayı biliyordu ve jeoloji ile anatomiyi kendi kendine öğrendi; bilim insanları buluntularını satın aldı ama çoğu zaman keşiflerinin hakkını vermedi; Londra Jeoloji Cemiyeti onu kabul etmedi; fosil satışı ailenin borçlarına katkı sağladı; öncü paleontolog.", source: nhm, checkedOn: "2026-11-25" },
    { claim: "Cinsiyeti nedeniyle Anning hiçbir zaman Jeoloji Cemiyeti üyesi olmadı.", source: gslExcl, checkedOn: "2026-11-25" },
  ] },
};
