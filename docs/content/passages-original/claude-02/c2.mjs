import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Plutarch{Plutarkhos} records{kaydeder} that{ki} the{belirli tanımlık} Athenians{Atinalılar} preserved{korudu} the{belirli tanımlık} ship{gemi} on{üzerinde} which{ki onun} Theseus{Theseus} had{-mişti} returned{döndü} from{-den} Crete{Girit}, removing{çıkararak} planks{tahtalar} as{-dıkça} they{onlar} decayed{çürüdü} and{ve} fitting{yerleştirerek} sound{sağlam} timber{kereste} in{içine} their{onların} place{yer}.", "Plutarkhos, Atinalıların Theseus'un Girit'ten döndüğü gemiyi koruduğunu, çürüyen tahtaları çıkarıp yerlerine sağlam kereste yerleştirdiğini kaydeder."],
    ["Philosophers{filozoflar} who{ki onlar} later{daha sonra} examined{inceledi} the{belirli tanımlık} story{hikâye} disagreed{aynı fikirde olmadı} about{hakkında} whether{-ip -mediği}, after{sonra} the{belirli tanımlık} last{son} original{özgün} plank{tahta} had{-mişti} gone{gitti}, the{belirli tanımlık} vessel{gemi} was{idi} still{hâlâ} the{belirli tanımlık} same{aynı} ship{gemi}.", "Hikâyeyi sonradan inceleyen filozoflar, son özgün tahta da gittikten sonra geminin hâlâ aynı gemi olup olmadığı konusunda anlaşamadı."],
  ],
  [
    ["Those{o kişiler} who{ki onlar} answered{cevapladı} yes{evet} pointed{işaret etti} to{-e} continuity{süreklilik}: at{-de} no{hiçbir} moment{an} did{-di} anyone{kimse} abandon{terk etmek} the{belirli tanımlık} ship{gemi}, and{ve} each{her} repair{onarım} was{idi} too{fazla} small{küçük} to{-mek için} destroy{yok etmek} its{onun} identity{kimlik}.", "Evet diyenler sürekliliğe işaret etti: hiçbir anda kimse gemiyi terk etmemişti ve her onarım kimliğini yok edemeyecek kadar küçüktü."],
    ["A{bir} river{nehir}, after{sonuçta (after all)} all{sonuçta (after all)} remains{kalır} a{bir} river{nehir} although{rağmen} none{hiçbiri} of{-nin} its{onun} water{su} stays{kalır}.", "Sonuçta bir nehir, suyunun hiçbiri kalmasa da nehir olarak kalır."],
    ["Those{o kişiler} who{ki onlar} answered{cevapladı} no{hayır} argued{ileri sürdü} that{ki} identity{kimlik} depends{bağlıdır} on{-e} the{belirli tanımlık} original{özgün} matter{madde}, so{bu yüzden} a{bir} ship{gemi} built{inşa edilmiş} entirely{tamamen} of{-den} new{yeni} wood{ahşap} is{-dır}, strictly{kesin olarak} speaking{konuşmak gerekirse}, a{bir} replica{kopya}.", "Hayır diyenler, kimliğin özgün maddeye bağlı olduğunu, bu yüzden tamamen yeni ahşaptan yapılmış bir geminin kesin konuşmak gerekirse bir kopya olduğunu savundu."],
  ],
  [
    ["Thomas{Thomas} Hobbes{Hobbes} sharpened{keskinleştirdi} the{belirli tanımlık} puzzle{bilmece} in{-de} the{belirli tanımlık} seventeenth{on yedinci} century{yüzyıl} by{-erek} adding{eklemek} a{bir} rival{rakip} claimant{hak iddia eden}.", "Thomas Hobbes, on yedinci yüzyılda bilmeceye rakip bir hak iddia edeni ekleyerek onu keskinleştirdi."],
    ["Suppose{varsay}, he{o} said{dedi}, that{ki} someone{biri} collected{topladı} the{belirli tanımlık} discarded{atılmış} planks{tahtalar} and{ve} reassembled{yeniden birleştirdi} them{onları} in{-de} their{onların} original{özgün} order{sıra}.", "Birinin atılan tahtaları toplayıp özgün sıralarıyla yeniden birleştirdiğini varsay, dedi."],
    ["Two{iki} ships{gemi} would{-ecekti} then{o zaman} exist{var olmak}, and{ve} each{her biri} would{-ecekti} have{sahip olmak} a{bir} plausible{makul} claim{iddia} to{-mek için} be{olmak} the{belirli tanımlık} original{özgün}.", "O zaman iki gemi var olurdu ve her birinin özgün gemi olduğuna dair makul bir iddiası olurdu."],
    ["Continuity{süreklilik} of{-nin} form{biçim} favours{lehine olur} the{belirli tanımlık} repaired{onarılmış} vessel{gemi}, whereas{oysa} continuity{süreklilik} of{-nin} material{malzeme} favours{lehine olur} the{belirli tanımlık} reassembled{yeniden birleştirilmiş} one{olan}.", "Biçimin sürekliliği onarılmış geminin, malzemenin sürekliliği ise yeniden birleştirilmiş geminin lehinedir."],
  ],
  [
    ["The{belirli tanımlık} difficulty{zorluk} is{-dır} not{değil} that{ki} the{belirli tanımlık} evidence{kanıt} is{-dır} missing{eksik}, but{ama} that{ki} the{belirli tanımlık} word{sözcük} same{aynı} is{-dır} doing{yapmak} two{iki} jobs{iş}.", "Zorluk kanıtın eksik olması değil, aynı sözcüğünün iki iş görmesidir."],
    ["In{-de} one{bir} sense{anlam} it{o} asks{sorar} whether{-ip -mediğini} a{bir} thing{şey} has{-miştir} persisted{sürdü} through{boyunca} time{zaman}; in{-de} another{başka} it{o} asks{sorar} whether{-ip -mediğini} it{o} is{-dır} made{yapılmış} of{-den} the{belirli tanımlık} same{aynı} stuff{madde}.", "Bir anlamda bir şeyin zaman boyunca sürüp sürmediğini sorar; başka bir anlamda aynı maddeden yapılıp yapılmadığını."],
    ["Ordinary{olağan} language{dil} usually{genellikle} keeps{tutar} these{bu} questions{sorular} apart{ayrı} because{çünkü}, in{-de} everyday{gündelik} life{hayat}, they{onlar} rarely{nadiren} collide{çarpışmak}.", "Olağan dil bu soruları genellikle ayrı tutar, çünkü gündelik hayatta nadiren çakışırlar."],
    ["The{belirli tanımlık} ship{gemi} forces{zorlar} them{onları} into{-e} conflict{çatışma}.", "Gemi onları çatışmaya zorlar."],
  ],
  [
    ["Perhaps{belki} that{o} is{-dır} why{neden} the{belirli tanımlık} puzzle{bilmece} has{-miştir} survived{ayakta kaldı} for{boyunca} nearly{neredeyse} two{iki} thousand{bin} years{yıl}.", "Belki de bilmece bu yüzden neredeyse iki bin yıldır ayakta kaldı."],
    ["It{o} does{-r} not{değil} hide{saklamak} a{bir} secret{gizli} fact{olgu} waiting{bekleyen} to{-mek için} be{olmak} found{bulunmuş}; it{o} reveals{ortaya koyar} that{ki} our{bizim} concept{kavram} of{-nin} identity{kimlik} was{idi} never{asla} as{kadar} tidy{düzenli} as{-dığı gibi} it{o} seemed{göründü}.", "Bulunmayı bekleyen gizli bir olguyu saklamaz; kimlik kavramımızın göründüğü kadar düzenli olmadığını ortaya koyar."],
    ["Every{her} person{kişi} who{ki o} has{-miştir} changed{değişti} over{boyunca} the{belirli tanımlık} years{yıllar} while{iken} still{hâlâ} insisting{ısrar etmek} on{-de} being{olmak} the{belirli tanımlık} same{aynı} self{benlik} has{-dir} a{bir} stake{pay} in{-de} the{belirli tanımlık} answer{cevap}.", "Yıllar içinde değişirken hâlâ aynı benlik olmakta ısrar eden herkesin cevapta bir payı vardır."],
    ["Whichever{hangisi olursa olsun} answer{cevap} we{biz} choose{seçmek}, we{biz} should{-meli} admit{kabul etmek} exactly{tam olarak} what{ne} it{o} costs{bedeli olmak} us{biz}.", "Hangi cevabı seçersek seçelim, bize tam olarak neye mal olduğunu kabul etmeliyiz."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-ship-of-theseus-identity", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const plutarch = "Plutarkhos, Theseus'un Yaşamı (Life of Theseus) 23.1, Perseus Digital Library; https://www.perseus.tufts.edu/hopper/text?doc=Plut.+Thes.+23";
const hobbes = "Thomas Hobbes, De Corpore (1655), Bölüm II.11.7 (gemi bilmecesine ikinci hak iddia eden eklenir)";

export default {
  slug: "c2-ship-of-theseus-identity", level: "C2", title: "The Ship That Was Never Quite the Same", topic: "Felsefe", sortOrder: 11, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the main point of the passage?", evidence: ev(3, "the word same is doing two jobs"), options: [
      option("o1", "The puzzle was settled once the original planks were found.", false, "reverse", "Bilmece çözülmedi; metin onun neden hâlâ yaşadığını anlatır."),
      option("o2", "The puzzle proves that nothing stays the same thing.", false, "extreme", "Metin hiçbir şeyin aynı kalmadığını kanıtlamaya çalışmaz; iki farklı 'aynı olma' anlamını ayırır."),
      option("o3", "The puzzle matters only to historians of ancient Athens.", false, "extreme", "Metin bilmecenin kimlik kavramı için daha geniş bir önemi olduğunu söyler."),
      option("o4", "The puzzle reveals two senses of being the same.", true, null, "Metin, aynı olma ifadesinin hem süreklilik hem de aynı maddeden yapılma anlamına geldiğini gösterir."),
    ] },
    { key: "q2", type: "detail", prompt: "What could someone do with the discarded planks, according to Hobbes?", evidence: findEvidence(paragraphs, "someone collected the discarded planks and reassembled them in their original order"), options: [
      option("o1", "Rebuild a ship from them", true, null, "Hobbes, atılan tahtaların özgün sıralarıyla yeniden birleştirilmesini önerir."),
      option("o2", "Use them to repair the first ship", false, "reverse", "Onarımda yeni keresteler kullanılır; atılan tahtalar değil."),
      option("o3", "Burn them as an offering to Theseus", false, "notstated", "Adak anlatılmaz."),
      option("o4", "Hand them to philosophers to study", false, "notstated", "Böyle bir bilgi yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “replica” mean in the second paragraph?", evidence: ev(1, "a ship built entirely of new wood is, strictly speaking, a replica"), options: [
      option("o1", "A sacred monument to Theseus", false, "context", "Theseus metinde geçer ama replica anıt anlamına gelmez."),
      option("o2", "A copy of the original", true, null, "Replica, özgün olanın kopyası demektir."),
      option("o3", "A written record of voyages", false, "notstated", "Metinde seyahat kaydı yoktur."),
      option("o4", "A remedy for slow decay", false, "context", "Çürüme geçer ama replica bir çare değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage suggest about ordinary language?", evidence: ev(3, "Ordinary language usually keeps these questions apart because, in everyday life, they rarely collide."), options: [
      option("o1", "It cannot express the idea of persistence at all.", false, "extreme", "Metin böyle bir yetersizlikten söz etmez; iki soruyu genellikle ayrı tuttuğunu söyler."),
      option("o2", "It was invented by Plutarch to solve the puzzle.", false, "notstated", "Plutarkhos bilmeceyi aktarır; dili o icat etmedi."),
      option("o3", "It seldom forces us to separate the two ideas.", true, null, "Gündelik hayatta iki soru nadiren çakıştığı için ayırma ihtiyacı doğmaz."),
      option("o4", "It treats the two ideas as completely unrelated.", false, "reverse", "Metne göre dil onları ayrı tutar ama zorlayıcı bir durumda çatıştıklarını da gösterir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Plutarkhos, Atinalıların Theseus'un gemisini koruduğunu ve çürüyen tahtaları sağlam keresteyle değiştirdiğini, filozofların geminin aynı gemi olup olmadığı konusunda ayrıldığını aktarır.", source: plutarch, checkedOn: "2026-11-23" },
    { claim: "Hobbes bilmeceye, atılan tahtaların toplanıp yeniden birleştirilmesi durumunu ekleyerek iki rakip 'özgün gemi' ortaya koyar.", source: hobbes, checkedOn: "2026-11-23" },
  ] },
};
