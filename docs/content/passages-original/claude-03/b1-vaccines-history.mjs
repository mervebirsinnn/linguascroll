import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["For{boyunca} hundreds{yüzlerce} of{} years{yıl}, smallpox{çiçek hastalığı} was{} one{biri} of{} the{} most{en} feared{korkulan} diseases{hastalıklar} in{} the{} world{dünya}.", "Yüzlerce yıl boyunca çiçek hastalığı dünyanın en korkulan hastalıklarından biriydi."],
    ["It{} killed{öldürdü} many{birçok} people{insanlar} and{} spread{yayıldı} from{-den} person{kişi} to{-e} person{kişi}.", "Birçok insanı öldürdü ve kişiden kişiye yayıldı."],
    ["Doctors{doktorlar} had{sahipti} no{hiç} good{iyi} way{yol} to{-mek için} stop{durdurmak} it{}.", "Doktorların onu durdurmak için iyi bir yolu yoktu."],
  ],
  [
    ["In{} 1796, an{} English{İngiliz} doctor{doktor} named{adlı} Edward{Edward} Jenner{Jenner} tried{denedi} a{} new{yeni} idea{fikir}.", "1796'da Edward Jenner adlı İngiliz bir doktor yeni bir fikir denedi."],
    ["He{} had{} heard{duymuş} that{-dığını} milkmaids{sütçü kızlar} who{ki} caught{yakalanan} cowpox{inek çiçeği}, a{} mild{hafif} illness{hastalık} from{-den} cows{inekler}, did{} not{} get{yakalanmak} smallpox{çiçek hastalığı}.", "İneklerden geçen hafif bir hastalık olan inek çiçeğine yakalanan sütçü kızların çiçek hastalığına yakalanmadığını duymuştu."],
    ["So{bu yüzden} he{} put{koydu} a{} little{biraz} cowpox{inek çiçeği} material{madde} into{içine} a{} cut{kesik} on{} a{} young{genç} boy's{çocuğun} arm{kol}.", "Bu yüzden genç bir çocuğun kolundaki bir kesiğe biraz inek çiçeği maddesi koydu."],
    ["Later{daha sonra}, Jenner{Jenner} tested{denedi} the{} boy{çocuk} with{} smallpox{çiçek hastalığı}, and{} the{} boy{çocuk} did{} not{} get{olmak} sick{hasta}.", "Daha sonra Jenner çocuğu çiçek hastalığıyla denedi ve çocuk hastalanmadı."],
  ],
  [
    ["The{} word{kelime} vaccine{aşı} comes{gelir} from{-den} the{} Latin{Latince} word{kelime} for{} cow{inek}.", "Aşı anlamındaki vaccine kelimesi, Latincede inek anlamına gelen kelimeden gelir."],
    ["Later{daha sonra}, the{} French{Fransız} scientist{bilim insanı} Louis{Louis} Pasteur{Pasteur} made{yaptı} vaccines{aşılar} against{karşı} other{diğer} diseases{hastalıklar}, such{gibi} as{örneğin} rabies{kuduz}.", "Daha sonra Fransız bilim insanı Louis Pasteur kuduz gibi başka hastalıklara karşı aşılar yaptı."],
    ["Over{boyunca} time{zaman}, vaccines{aşılar} saved{kurtardı} millions{milyonlarca} of{} lives{hayatlar}.", "Zamanla aşılar milyonlarca hayat kurtardı."],
    ["After{sonra} many{birçok} years{yıl} of{} work{çalışma} around{çevresinde} the{} world{dünya}, smallpox{çiçek hastalığı} was{} finally{sonunda} wiped{silindi} out{tamamen} in{} 1980.", "Dünya çapında uzun yıllar süren çalışmalardan sonra çiçek hastalığı sonunda 1980'de tamamen yok edildi."],
    ["It{} is{} still{hâlâ} the{} only{tek} human{insan} disease{hastalık} that{ki} people{insanlar} have{sahip} ever{hiç} wiped{silmek} out{tamamen}.", "Hâlâ insanların şimdiye kadar tamamen yok ettiği tek insan hastalığıdır."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-vaccines-history", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const who = "World Health Organization, Smallpox (health topic); https://www.who.int/health-topics/smallpox";
const whoHistory = "World Health Organization, A brief history of vaccination; https://www.who.int/news-room/spotlight/history-of-vaccination/a-brief-history-of-vaccination";
const nlmSmallpox = "U.S. National Library of Medicine, Smallpox exhibition - Vaccination; https://nlm.nih.gov/exhibition/smallpox/sp_vaccination.html";
const pbsJenner = "PBS NewsHour (H. Markel), The day doctors began to conquer smallpox; https://www.pbs.org/newshour/health/the-day-doctors-began-to-conquer-smallpox";

export default {
  slug: "b1-vaccines-history", level: "B1", title: "A Lesson From the Cows", topic: "Tıp", sortOrder: 32, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(2, "Over time, vaccines saved millions of lives."), options: [
      option("o1", "How vaccines began and what they achieved", true, null, "Metin aşının nasıl başladığını ve neler başardığını anlatır."),
      option("o2", "Why cows often get sick from human diseases", false, "notstated", "İneklerin insan hastalıklarına yakalanması anlatılmaz."),
      option("o3", "How doctors cured smallpox with new medicine", false, "context", "Metin bir ilaçla tedaviyi değil, hastalığı önleyen aşıyı anlatır."),
      option("o4", "The daily life of milkmaids on English farms", false, "context", "Sütçü kızlar yalnız fikrin çıkış noktasıdır; konu bu değildir."),
    ] },
    { key: "q2", type: "detail", prompt: "What did Jenner put into the boy's arm?", evidence: ev(1, "So he put a little cowpox material into a cut on a young boy's arm."), options: [
      option("o1", "A little material from cowpox", true, null, "Metin kesiğe biraz inek çiçeği maddesi konduğunu söyler."),
      option("o2", "Medicine made by Louis Pasteur", false, "context", "Pasteur daha sonra çalışmıştır; Jenner onun ilacını kullanmadı."),
      option("o3", "A strong dose of smallpox medicine", false, "context", "Kola çiçek hastalığı ilacı değil, inek çiçeği maddesi kondu."),
      option("o4", "Milk taken from a healthy cow", false, "context", "Süt değil, inek çiçeği maddesi kullanıldı."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “wiped out” mean in the third paragraph?", evidence: ev(2, "smallpox was finally wiped out in 1980"), options: [
      option("o1", "Removed so it no longer exists", true, null, "Sonraki cümle bunun insanların yok ettiği tek hastalık olduğunu söyler; wiped out, tamamen yok edilmek demektir."),
      option("o2", "Made stronger and more dangerous", false, "reverse", "Hastalık güçlenmedi, yok oldu."),
      option("o3", "Moved to a different country", false, "context", "Bir ülkeden diğerine geçmekten söz edilmez."),
      option("o4", "Studied closely in a laboratory", false, "context", "Laboratuvar çalışması bu kelimenin anlamı değildir."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about Jenner's idea?", evidence: findEvidence(paragraphs, "He had heard that milkmaids who caught cowpox, a mild illness from cows, did not get smallpox."), options: [
      option("o1", "A mild illness may protect from a worse one", true, null, "Hafif inek çiçeğini geçirenlerin çiçek hastalığına yakalanmaması bu fikri doğurdu."),
      option("o2", "Jenner learned the idea from Louis Pasteur's books", false, "reverse", "Pasteur Jenner'den sonra gelir; fikir sütçü kızlardan çıktı."),
      option("o3", "Milkmaids caught smallpox more often than others", false, "reverse", "Metin sütçü kızların çiçek hastalığına yakalanmadığını söyler."),
      option("o4", "Cowpox was more dangerous than smallpox", false, "reverse", "Metin inek çiçeğini hafif bir hastalık olarak tanımlar."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Çiçek hastalığı milyonlarca ölüme yol açtı, vakaların yüzde 30'una kadarında ölümcül oldu; DSÖ 1980'de yok edildiğini ilan etti ve bu başarıya ulaşan tek bulaşıcı hastalık olduğunu belirtir.", source: who, checkedOn: "2026-11-25" },
    { claim: "Edward Jenner 1796'da sütçü kızların inek çiçeğinden sonra çiçek hastalığına yakalanmadığını gözlemledi, genç James Phipps'e inek çiçeği maddesi uyguladı; Phipps sonra çiçek hastalığına maruz bırakıldığında hastalanmadı.", source: nlmSmallpox, checkedOn: "2026-11-25" },
    { claim: "Vaccine kelimesi Latince inek anlamına gelen vacca'dan gelir (14 Mayıs 1796 deneyi).", source: pbsJenner, checkedOn: "2026-11-25" },
    { claim: "Louis Pasteur 1885'te kuduz için ilk koruyucu aşı uygulamasını yaptı (Joseph Meister); 1872'de tavuk kolerası için ilk laboratuvar aşısını üretti; aşılar tıbbın başka hiçbir buluşundan daha fazla hayat kurtardı.", source: whoHistory, checkedOn: "2026-11-25" },
  ] },
};
