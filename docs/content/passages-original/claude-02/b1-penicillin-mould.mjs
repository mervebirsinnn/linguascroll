import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["In{-de} nineteen{on dokuz} twenty{yirmi} eight{sekiz}, a{} scientist{bilim insanı} named{adlı} Alexander{Alexander} Fleming{Fleming} came{geldi} back{geri} to{-e} his{} laboratory{laboratuvar} after{sonra} a{} holiday{tatil}.", "1928'de Alexander Fleming adlı bir bilim insanı bir tatilden sonra laboratuvarına geri döndü."],
    ["He{} saw{gördü} something{bir şey} strange{garip} in{} one{biri} of{} his{} dishes{kaplar}.", "Kaplarından birinde garip bir şey gördü."],
    ["Fleming{Fleming} was{} very{çok} curious{meraklı}, so{bu yüzden} he{} looked{baktı} at{-e (bakmak)} the{} dish{kap} carefully{dikkatle}.", "Fleming çok meraklıydı, bu yüzden kaba dikkatle baktı."],
    ["A{} mould{küf} was{} growing{büyüyordu} there{orada}, and{} the{} bacteria{bakteriler} around{çevresindeki} it{} were{} dying{ölüyordu}.", "Orada bir küf büyüyordu ve çevresindeki bakteriler ölüyordu."],
  ],
  [
    ["Fleming{Fleming} wrote{yazdı} about{hakkında} his{} discovery{keşif}, but{ama} he{} did{-medi (olumsuz yardımcı fiil)} not{} turn{dönüştürmek} it{} into{-e} a{} medicine{ilaç}.", "Fleming keşfini yazdı ama onu bir ilaca dönüştürmedi."],
    ["Years{yıllar} later{sonra}, two{iki} other{başka} scientists{bilim insanları}, Howard{Howard} Florey{Florey} and{} Ernst{Ernst} Chain{Chain}, worked{çalıştı} with{ile} their{} team{ekip} to{-mek için} make{yapmak} penicillin{penisilin} strong{güçlü} and{} safe{güvenli} enough{yeterince} for{için} patients{hastalar}.", "Yıllar sonra başka iki bilim insanı, Howard Florey ve Ernst Chain, ekipleriyle penisilini hastalar için yeterince güçlü ve güvenli hâle getirmek için çalıştı."],
    ["Their{onların} work{çalışma} began{başladı} to{-mek} save{kurtarmak} many{birçok} lives{hayat} in{} the{} nineteen{on dokuz} forties{kırklar}.", "Çalışmaları kırklı yıllarda birçok hayat kurtarmaya başladı."],
  ],
  [
    ["In{-de} nineteen{on dokuz} forty{kırk} five{beş}, Fleming{Fleming}, Florey{Florey} and{} Chain{Chain} shared{paylaştı} the{} Nobel{Nobel} Prize{Ödül} for{için} this{} discovery{keşif}.", "1945'te Fleming, Florey ve Chain bu keşif için Nobel Ödülü'nü paylaştı."],
    ["Today{bugün}, penicillin{penisilin} and{} similar{benzer} medicines{ilaçlar} are{} called{denir} antibiotics{antibiyotikler}, and{} they{} treat{tedavi etmek} many{birçok} infections{enfeksiyonlar}.", "Bugün penisilin ve benzer ilaçlara antibiyotik denir ve birçok enfeksiyonu tedavi ederler."],
    ["So{bu yüzden} a{} small{küçük} mould{küf} in{} a{} dish{kap} changed{değiştirdi} modern{modern} medicine{tıp}.", "Böylece bir kaptaki küçük bir küf modern tıbbı değiştirdi."],
    ["Doctors{doktorlar} still{hâlâ} use{kullanır} these{bu} medicines{ilaçlar} in{} hospitals{hastaneler} all{her} over{boyunca} the{} world{dünya}.", "Doktorlar bu ilaçları hâlâ dünyanın her yerindeki hastanelerde kullanır."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-penicillin-mould", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const nobel = "Nobel Prize Outreach, The Nobel Prize in Physiology or Medicine 1945 (Fleming, Chain, Florey); https://www.nobelprize.org/prizes/medicine/1945/summary/";
const pbs = "PBS NewsHour, The real story behind the world's first antibiotic; https://www.pbs.org/newshour/health/the-real-story-behind-the-worlds-first-antibiotic";

export default {
  slug: "b1-penicillin-mould", level: "B1", title: "The Mould That Saved Lives", topic: "Tıp", sortOrder: 16, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "So a small mould in a dish changed modern medicine."), options: [
      option("o1", "How a mould led to a new medicine", true, null, "Metin bir küften yeni bir ilaca giden yolu anlatır."),
      option("o2", "How Fleming won the Nobel Prize alone", false, "reverse", "Ödülü üç kişi paylaştı."),
      option("o3", "Why bacteria are good for patients", false, "reverse", "Metinde bakteriler öldürülen şeydir."),
      option("o4", "How doctors first invented the microscope", false, "notstated", "Mikroskop anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Who made penicillin safe enough for patients?", evidence: findEvidence(paragraphs, "two other scientists, Howard Florey and Ernst Chain, worked with their team to make penicillin strong and safe enough for patients"), options: [
      option("o1", "Florey, Chain and their team", true, null, "Metin bunu Florey, Chain ve ekibinin yaptığını söyler."),
      option("o2", "Fleming and a hospital team", false, "context", "Fleming keşfetti ama ilaca dönüştürmedi."),
      option("o3", "Florey and Fleming together", false, "copy", "Fleming ilaca dönüştürmeye katılmadı."),
      option("o4", "Two doctors from a London hospital", false, "notstated", "Böyle doktorlar anlatılmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “infections” mean in the last paragraph?", evidence: findEvidence(paragraphs, "they treat many infections"), options: [
      option("o1", "Illnesses caused by germs", true, null, "Infection, mikropların yol açtığı hastalıktır."),
      option("o2", "Medicines that stop germs", false, "context", "Antibiyotikler ilaçtır; enfeksiyonlar tedavi ettikleri hastalıklardır."),
      option("o3", "Tests done in a laboratory", false, "context", "Laboratuvar geçer ama enfeksiyon test değildir."),
      option("o4", "Marks left on a dish by mould", false, "context", "Küf geçer ama enfeksiyon iz değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about Fleming's discovery?", evidence: ev(1, "Fleming wrote about his discovery, but he did not turn it into a medicine."), options: [
      option("o1", "It needed more work from other people.", true, null, "Fleming ilaca dönüştürmedi; Florey ve Chain bunu yaptı."),
      option("o2", "It was ignored by the Nobel committee.", false, "reverse", "Üçü Nobel Ödülü'nü paylaştı."),
      option("o3", "It was a mistake that no one wrote about.", false, "reverse", "Fleming bu konuda yazdı."),
      option("o4", "It already worked on every illness.", false, "extreme", "Metin böyle bir şey söylemez."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Fleming 1928'de bir stafilokok kültürünü bulaştıran küfün çevresindeki bakterileri öldürdüğünü fark etti; sonraki on yılda ilacın tıbbi önemini tam kavramadı.", source: pbs, checkedOn: "2026-11-23" },
    { claim: "Howard Florey ve Ernst Chain ekibiyle penisilini tedavide kullanılabilir hâle getirdi (1940'larda hastalarda denendi).", source: pbs, checkedOn: "2026-11-23" },
    { claim: "1945 Nobel Fizyoloji veya Tıp Ödülü, Fleming, Chain ve Florey'e 'penisilinin keşfi ve çeşitli bulaşıcı hastalıklardaki iyileştirici etkisi' için verildi.", source: nobel, checkedOn: "2026-11-23" },
  ] },
};
