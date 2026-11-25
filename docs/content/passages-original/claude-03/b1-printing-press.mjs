import { buildFromRows, evidenceOf, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Long{uzun} ago{zaman önce} in{} Europe{Avrupa}, people{insanlar} made{yaptı} books{kitaplar} by{ile} hand{el}.", "Uzun zaman önce Avrupa'da insanlar kitapları elle yapardı."],
    ["A{} writer{yazıcı} copied{kopyaladı} every{her} page{sayfa} with{} a{} pen{kalem}, one{bir} letter{harf} at{} a{} time{seferde}.", "Bir yazıcı her sayfayı kalemle, harf harf kopyalardı."],
    ["One{bir} book{kitap} could{-ebilirdi} take{sürmek} months{aylar}, so{bu yüzden} books{kitaplar} were{} rare{nadir} and{} very{çok} expensive{pahalı}.", "Bir kitap aylar sürebilirdi, bu yüzden kitaplar nadir ve çok pahalıydı."],
    ["Few{az} people{insanlar} could{-ebilirdi} afford{gücü yetmek} to{-mek} own{sahip olmak} books{kitaplar}.", "Az sayıda insanın kitap sahibi olmaya gücü yetiyordu."],
  ],
  [
    ["In{} the{} fifteenth{on beşinci} century{yüzyıl}, a{} German{Alman} man{adam} named{adlı} Johannes{Johannes} Gutenberg{Gutenberg} changed{değiştirdi} this{}.", "On beşinci yüzyılda Johannes Gutenberg adlı bir Alman bunu değiştirdi."],
    ["He{} built{yaptı} a{} printing{baskı} press{makinesi} that{ki} used{kullandı} small{küçük} metal{metal} letters{harfler}.", "Küçük metal harfler kullanan bir baskı makinesi yaptı."],
    ["The{} letters{harfler} could{-ebilirdi} be{} moved{taşınmak} and{} used{kullanılmak} again{tekrar} and{} again{tekrar}.", "Harfler yerinden oynatılabilir ve tekrar tekrar kullanılabilirdi."],
    ["Workers{işçiler} put{koydu} them{} in{} lines{satırlar}, covered{kapladı} them{} with{} ink{mürekkep}, and{} pressed{bastırdı} paper{kağıt} on{} top{üst}.", "İşçiler onları satırlara dizer, mürekkeple kaplar ve üstüne kağıt bastırırdı."],
    ["Now{artık} a{} shop{atölye} could{-ebilirdi} make{yapmak} many{birçok} copies{kopyalar} of{} the{} same{aynı} page{sayfa} in{} one{bir} day{gün}.", "Artık bir atölye aynı sayfanın birçok kopyasını bir günde yapabiliyordu."],
  ],
  [
    ["Gutenberg{Gutenberg} was{} not{} the{} first{ilk} person{kişi} to{-en} print{basmak} with{} movable{hareketli} letters{harfler}.", "Gutenberg hareketli harflerle baskı yapan ilk kişi değildi."],
    ["People{insanlar} in{} Korea{Kore} had{} done{yapmış} it{} with{} metal{metal} letters{harfler} earlier{daha önce}.", "Kore'deki insanlar bunu daha önce metal harflerle yapmıştı."],
    ["But{} his{} press{baskı makinesi} spread{yayıldı} quickly{hızla} across{boyunca} Europe{Avrupa}.", "Ama onun baskı makinesi Avrupa'ya hızla yayıldı."],
    ["Books{kitaplar} became{oldu} cheaper{daha ucuz}, and{} more{daha fazla} people{insanlar} learned{öğrendi} to{-meyi} read{okumak}.", "Kitaplar ucuzladı ve daha fazla insan okumayı öğrendi."],
    ["New{yeni} ideas{fikirler} about{hakkında} religion{din} and{} learning{öğrenme} could{-ebilirdi} now{artık} travel{yayılmak} much{çok} faster{daha hızlı} than{-den} before{önce}.", "Din ve öğrenme hakkındaki yeni fikirler artık eskisinden çok daha hızlı yayılabiliyordu."],
  ],
];
const { paragraphs, words } = buildFromRows("b1-printing-press", rows);
const ev = (pi, t) => evidenceOf(paragraphs, pi, t);
const locGuide = "Library of Congress, The Gutenberg Bible at the Library of Congress: A Resource Guide; https://guides.loc.gov/gutenberg";
const locBible = "Library of Congress, The Gutenberg Bible (Bible Collection); https://www.loc.gov/exhibits/bibles/the-gutenberg-bible.html";
const utahJikji = "University of Utah Marriott Library, From Jikji to Gutenberg; https://blog.lib.utah.edu/from-jikji-to-gutenberg/";
const randall = "Manchester University course reading, Randall, Johannes Gutenberg's Printing Press (kurs okuma metni; ikincil); https://users.manchester.edu/facstaff/ssnaragon/kant/lp/Readings/Randall,%20Printing%20Press.html";

export default {
  slug: "b1-printing-press", level: "B1", title: "Books for Many People", topic: "Tarih", sortOrder: 31, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev(1, "In the fifteenth century, a German man named Johannes Gutenberg changed this."), options: [
      option("o1", "How a new press changed the way books were made", true, null, "Metin elle kopyalamadan baskı makinesine geçişi ve sonuçlarını anlatır."),
      option("o2", "How monks decorated old books with gold and paint", false, "notstated", "Kitap süslemesinden söz edilmez."),
      option("o3", "Why people in Europe stopped reading for many years", false, "reverse", "Metin tersine daha fazla insanın okumayı öğrendiğini söyler."),
      option("o4", "The life story of a famous German painter", false, "notstated", "Gutenberg ressam değildir; hayat hikâyesi anlatılmaz."),
    ] },
    { key: "q2", type: "detail", prompt: "Why were books expensive before Gutenberg's press?", evidence: ev(0, "One book could take months, so books were rare and very expensive."), options: [
      option("o1", "Each copy was written by hand", true, null, "Her sayfa elle kopyalandığı için bir kitap aylar sürüyordu."),
      option("o2", "Paper had to come from China", false, "notstated", "Kağıdın nereden geldiği anlatılmaz."),
      option("o3", "Metal letters cost a lot of money", false, "context", "Metal harfler sonradan, baskı makinesiyle gelir."),
      option("o4", "Only kings were allowed to read them", false, "notstated", "Okuma yasağından söz edilmez."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “rare” mean in the first paragraph?", evidence: ev(0, "so books were rare and very expensive"), options: [
      option("o1", "Not easy to find or get", true, null, "Kitaplar az olduğu ve çoğu insanın kitabı olmadığı için rare, az bulunan demektir."),
      option("o2", "Very large and heavy to carry", false, "context", "Boyut ve ağırlıktan söz edilmez."),
      option("o3", "Written in a foreign language", false, "context", "Kitapların dili anlatılmaz."),
      option("o4", "Easy to buy in any shop", false, "reverse", "Kitaplar pahalıydı ve çoğu insanın kitabı yoktu."),
    ] },
    { key: "q4", type: "inference", prompt: "What can we infer about reading before the printing press?", evidence: findEvidence(paragraphs, "Books became cheaper, and more people learned to read."), options: [
      option("o1", "Fewer people could read before the press", true, null, "Baskıdan sonra daha fazla insan okumayı öğrendiyse, önce daha az kişi okuyabiliyordu."),
      option("o2", "Gutenberg invented printing before anyone else", false, "reverse", "Metin Kore'de bunun daha önce yapıldığını söyler."),
      option("o3", "Printed books cost more than hand copies", false, "reverse", "Metin kitapların ucuzladığını söyler."),
      option("o4", "The press made new ideas travel more slowly", false, "reverse", "Metin fikirlerin daha hızlı yayıldığını söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Baskıdan önce bir metin yazıcılar tarafından elle kopyalanırdı; tek bir el yazması için aylar ya da yıllar gerekirdi.", source: locGuide, checkedOn: "2026-11-25" },
    { claim: "Gutenberg 15. yüzyılda Mainz'da hareketli metal harflerle ilk büyük kitabı (İncil, 1454/1455) bastırdı.", source: locBible, checkedOn: "2026-11-25" },
    { claim: "Kore'de hareketli metal harfle baskı Gutenberg'den daha önce yapılmıştı (Jikji, Gutenberg'den 70 yıldan fazla önce).", source: utahJikji, checkedOn: "2026-11-25" },
    { claim: "Baskı 1500'e kadar çoğu Avrupa ülkesine yayıldı; kitaplar yaklaşık sekizde bir fiyata düştü; daha fazla insanın okumayı öğrenmek için nedeni oldu ve fikirler daha geniş kitlelere ulaştı (ikincil kurs okuması).", source: randall, checkedOn: "2026-11-25" },
  ] },
};
