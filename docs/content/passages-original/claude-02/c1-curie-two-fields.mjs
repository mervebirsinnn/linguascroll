import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Marie{Marie} Curie's{Curie (iyelik)} reputation{itibar} rests{dayanmak} on{-e} a{} rare{nadir} double{çift} distinction{ayrım}: she{} remains{kalmak} the{} only{tek} person{kişi} to{-mek} have{} won{kazanmak} Nobel{Nobel} Prizes{Ödüller} in{} two{iki} different{farklı} scientific{bilimsel} fields{alanlar}.", "Marie Curie'nin itibarı nadir bir çifte ayrıma dayanır: iki farklı bilim alanında Nobel Ödülü kazanan tek kişi olmaya devam ediyor."],
    ["Such{böyle} a{} record{kayıt} invites{davet etmek} the{} question{soru} of{} how{nasıl} she{} managed{başarmak} it{}.", "Böyle bir sicil, bunu nasıl başardığı sorusunu doğurur."],
    ["The{} answer{cevap} lies{yatar} partly{kısmen} in{} temperament{mizaç} and{} partly{kısmen} in{} circumstance{koşul}, as{olarak} the{} next{sonraki} paragraphs{paragraflar} show{göstermek}.", "Cevap kısmen mizaçta, kısmen koşullarda yatar; sonraki paragraflar bunu gösterir."],
    ["Born{doğmak} in{-de} Warsaw{Varşova} in{} eighteen{on sekiz} sixty{altmış} seven{yedi}, she{} left{ayrılmak} for{-e} Paris{Paris} to{-mek için} study{okumak}, partly{kısmen} because{çünkü} women{kadınlar} could{-ebilirdi} not{değil} attend{katılmak} the{} university{üniversite} in{} her{} homeland{vatan}.", "1867'de Varşova'da doğan, kısmen vatanındaki üniversiteye kadınlar giremediği için okumak üzere Paris'e gitti."],
    ["Her{onun} husband{koca} Pierre{Pierre}, whom{kimi} she{} met{tanışmak} in{-de} eighteen{on sekiz} ninety{doksan} four{dört}, became{olmak} both{hem} her{} partner{eş} and{} her{} closest{en yakın} collaborator{işbirlikçi}.", "1894'te tanıştığı kocası Pierre, hem eşi hem de en yakın işbirlikçisi oldu."],
  ],
  [
    ["The{} couple's{çift (iyelik)} decisive{belirleyici} insight{kavrayış} concerned{ilgili olmak} a{} mineral{mineral} called{denen} pitchblende{uranit}.", "Çiftin belirleyici kavrayışı uranit denen bir mineralle ilgiliydi."],
    ["It{} was{} more{daha} radioactive{radyoaktif} than{-den} the{} uranium{uranyum} it{} contained{içermek} could{-ebilirdi} account{açıklamak (account for)} for{açıklamak (account for)}, which{ki bu} implied{ima etmek} that{ki} an{} unknown{bilinmeyen} source{kaynak} of{} radiation{ışıma} was{} hidden{gizli} inside{içinde}.", "İçerdiği uranyumun açıklayabileceğinden daha radyoaktifti; bu, içinde bilinmeyen bir ışıma kaynağının gizli olduğunu ima ediyordu."],
    ["After{sonra} laborious{zahmetli} chemical{kimyasal} separation{ayırma}, they{} isolated{ayrıştırmak} two{iki} new{yeni} elements{elementler}: polonium{polonyum}, which{ki o} Marie{Marie} named{adlandırmak} after{-nin adına} her{} native{doğduğu} Poland{Polonya}, and{} radium{radyum}.", "Zahmetli kimyasal ayırmadan sonra iki yeni element ayrıştırdılar: Marie'nin doğduğu Polonya'nın adını verdiği polonyum ve radyum."],
    ["Their{onların} method{yöntem} was{} patient{sabırlı} and{} physically{fiziksel olarak} exhausting{yorucu}, and{} it{} left{bırakmak} little{az} room{yer} for{için} shortcuts{kestirmeler}.", "Yöntemleri sabırlı ve fiziksel olarak yorucuydu ve kestirmelere az yer bırakıyordu."],
    ["The{} Nobel{Nobel} Prize{Ödül} in{} Physics{Fizik} for{için} nineteen{on dokuz} oh{sıfır} three{üç} was{} shared{paylaşılmak} between{arasında} the{} two{iki} of{} them{onlar} and{} Henri{Henri} Becquerel{Becquerel}.", "1903 Nobel Fizik Ödülü, ikisi ve Henri Becquerel arasında paylaşıldı."],
  ],
  [
    ["Pierre's{Pierre (iyelik)} death{ölüm} in{-de} nineteen{on dokuz} oh{sıfır} six{altı} could{-ebilirdi} have{} ended{bitirmek} the{} partnership{ortaklık}, yet{yine de} Marie{Marie} took{devralmak (take over)} over{devralmak (take over)} his{} professorship{profesörlük} and{} continued{sürdürmek} the{} research{araştırma}.", "Pierre'in 1906'daki ölümü ortaklığı bitirebilirdi; yine de Marie onun profesörlüğünü devralıp araştırmayı sürdürdü."],
    ["In{-de} nineteen{on dokuz} eleven{on bir} she{} received{almak} the{} Nobel{Nobel} Prize{Ödül} in{} Chemistry{Kimya}, awarded{verilmek} to{-e} her{} alone{tek başına} for{için} the{} discovery{keşif} of{} radium{radyum} and{} polonium{polonyum}.", "1911'de radyum ve polonyumun keşfi için yalnızca ona verilen Nobel Kimya Ödülü'nü aldı."],
    ["Her{onun} career{kariyer} illustrates{göstermek} how{nasıl} persistence{azim} can{-ebilir} turn{dönüştürmek} personal{kişisel} loss{kayıp} and{} institutional{kurumsal} barriers{engeller} into{-e} lasting{kalıcı} achievement{başarı}.", "Kariyeri, azmin kişisel kaybı ve kurumsal engelleri nasıl kalıcı başarıya dönüştürebileceğini gösterir."],
    ["Her{onun} example{örnek} is{} often{sıklıkla} cited{anılmak} in{} discussions{tartışmalar} of{} women{kadınlar} in{} science{bilim}, although{rağmen} her{} own{kendi} focus{odak} remained{kalmak} on{-e} the{} work{iş}.", "Örneği bilimde kadınlar üzerine tartışmalarda sıkça anılır; ancak kendi odağı hep işte kaldı."],
    ["It{} is{} an{} example{örnek} worth{değer} remembering{hatırlamak}.", "Hatırlamaya değer bir örnektir."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-curie-two-fields", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobelP = "Nobel Prize Outreach, Marie Curie - Biographical / Physics 1903; https://www.nobelprize.org/prizes/physics/1903/marie-curie/biographical/";
const nobelC = "Nobel Prize Outreach, Marie Curie - Facts / Chemistry 1911; https://www.nobelprize.org/prizes/chemistry/1911/marie-curie/facts";

export default {
  slug: "c1-curie-two-fields", level: "C1", title: "Distinction in Two Fields", topic: "Önemli insanlar", sortOrder: 19, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: findEvidence(paragraphs, "she remains the only person to have won Nobel Prizes in two different scientific fields"), options: [
      option("o1", "Curie's work and setbacks", true, null, "Metin Curie'nin çalışmalarını, kayıplarını ve başarılarını anlatır."),
      option("o2", "The method Becquerel used in his lab", false, "context", "Becquerel yalnızca bir arka plan ismidir."),
      option("o3", "Why women were admitted to Paris universities", false, "notstated", "Kabul koşulları anlatılmaz."),
      option("o4", "How radium was used in medicine", false, "notstated", "Tıbbi kullanım anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Why did the Curies suspect a hidden source of radiation?", evidence: ev(1, "It was more radioactive than the uranium it contained could account for"), options: [
      option("o1", "It was surprisingly radioactive", true, null, "Metin bunu söyler."),
      option("o2", "The ore had been taken from Poland", false, "notstated", "Cevherin yeri anlatılmaz."),
      option("o3", "The ore glowed in the dark for days", false, "notstated", "Parıldama anlatılmaz."),
      option("o4", "The ore was lighter than uranium", false, "notstated", "Ağırlık karşılaştırması yoktur."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “laborious” mean in the second paragraph?", evidence: ev(1, "After laborious chemical separation, they isolated two new elements"), options: [
      option("o1", "Needing much hard effort", true, null, "Laborious, çok emek gerektiren demektir."),
      option("o2", "Done by a single person", false, "notstated", "Tek kişi anlatılmaz."),
      option("o3", "Completed in a single afternoon", false, "reverse", "Zahmetli, hızlı bitmenin tersidir."),
      option("o4", "Paid for by a university", false, "notstated", "Finansman anlatılmaz."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the sequence of events in the final paragraph suggest?", evidence: findEvidence(paragraphs, "Pierre's death in nineteen oh six could have ended the partnership, yet Marie took over his professorship and continued the research."), options: [
      option("o1", "Her later success came without Pierre", true, null, "Pierre 1906'da öldü; 1911'deki ödülü Marie tek başına aldı."),
      option("o2", "Pierre's death ended her scientific career", false, "reverse", "Metin sürdürdüğünü söyler."),
      option("o3", "The two prizes were awarded in one year", false, "reverse", "Ödüller 1903 ve 1911'dedir."),
      option("o4", "She stopped using his laboratory after 1906", false, "notstated", "Böyle bir bilgi yoktur."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Marie Curie 1867'de Varşova'da doğdu, Paris'te okudu, 1894'te Pierre Curie ile tanıştı; Pierre 1906'da öldü, Marie profesörlüğünü devraldı.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "Curie'ler uranyumdan daha radyoaktif uranit cevherinden polonyum (Polonya'nın adını taşır) ve radyum elementlerini ayırdı.", source: nobelP, checkedOn: "2026-11-23" },
    { claim: "1903 Nobel Fizik Ödülü Marie, Pierre ve Henri Becquerel arasında paylaşıldı; 1911 Nobel Kimya Ödülü'nü Marie tek başına aldı; iki bilim alanında Nobel kazanan tek kişidir.", source: nobelC, checkedOn: "2026-11-23" },
  ] },
};
