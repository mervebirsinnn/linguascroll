import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["The{} word{sözcük} Bauhaus{Bauhaus} now{bugün} evokes{çağrıştırmak} a{} recognisable{tanınabilir} look{görünüm}: flat{düz} roofs{çatılar}, white{beyaz} walls{duvarlar}, steel{çelik} tubing{borular} and{} clean{yalın} sans{sans (tırnaksız)}-serif{serif (tırnaksız yazı)} lettering{harfler, yazı}.", "Bauhaus sözcüğü bugün tanınabilir bir görünümü çağrıştırır: düz çatılar, beyaz duvarlar, çelik borular ve yalın tırnaksız harfler."],
    ["Yet{yine de} the{} school{okul} that{ki} Walter{Walter} Gropius{Gropius} founded{kurmak} in{} Weimar{Weimar} in{} 1919 set{yola koyulmak (set out)} out{yola koyulmak (set out)} less{daha az} to{-mek} invent{icat etmek} a{} style{üslup} than{-den} to{-mek} reform{yeniden biçimlendirmek} how{nasıl} designers{tasarımcılar} were{} trained{yetiştirilmek}.", "Yine de Walter Gropius'un 1919'da Weimar'da kurduğu okul, bir üslup icat etmekten çok tasarımcıların nasıl yetiştirildiğini yeniden biçimlendirmek için yola koyuldu."],
    ["Gropius{Gropius} wanted{istemek} to{-mek} dissolve{eritmek, ortadan kaldırmak} the{} boundary{sınır} between{arasında} fine{güzel (fine art: güzel sanatlar)} art{sanat} and{} craft{zanaat}, so{böylece (so that)} that{böylece (so that)} artists{sanatçılar} and{} craftspeople{zanaatkarlar} would{-ecekti} learn{öğrenmek} side{yan yana (side by side)} by{yan yana (side by side)} side{yan yana (side by side)}.", "Gropius güzel sanatlar ile zanaat arasındaki sınırı ortadan kaldırmak istedi; böylece sanatçılar ve zanaatkarlar yan yana öğrenecekti."],
  ],
  [
    ["Teaching{öğretim} was{} organised{düzenlenmek} around{etrafında} workshops{atölyeler} rather{-den çok (rather than)} than{-den çok (rather than)} lecture{ders, konferans} halls{salonlar}.", "Öğretim konferans salonlarından çok atölyeler etrafında düzenlendi."],
    ["Students{öğrenciler} began{başlamak} with{} a{} preliminary{hazırlık} course{kurs} in{} which{ki} they{} experimented{denemeler yapmak} with{} materials{malzemeler} and{} form{biçim} before{önce} choosing{seçmek} a{} specialism{uzmanlık alanı} such{gibi (such as)} as{gibi (such as)} metalwork{metal işçiliği}, weaving{dokuma} or{} furniture{mobilya}.", "Öğrenciler, metal işçiliği, dokuma ya da mobilya gibi bir uzmanlık alanı seçmeden önce malzeme ve biçimle denemeler yaptıkları bir hazırlık kursuyla başlardı."],
    ["After{sonra} the{} school{okul} moved{taşınmak} to{-e} Dessau{Dessau} in{} 1925, its{} workshops{atölyeler} increasingly{giderek artan biçimde} produced{üretmek} prototypes{prototipler} intended{amaçlanmak} for{} industrial{endüstriyel} manufacture{üretim}, a{} shift{kayma, değişim} that{ki} brought{getirmek} the{} ideals{idealler} of{} the{} founders{kurucular} into{-e (into contact: temasa)} contact{temas} with{} the{} demands{talepler} of{} the{} market{piyasa}.", "Okul 1925'te Dessau'ya taşındıktan sonra atölyeleri giderek daha çok endüstriyel üretime yönelik prototipler üretti; bu kayma kurucuların ideallerini piyasanın talepleriyle temasa getirdi."],
  ],
  [
    ["The{} experiment{deney} was{} short{kısa}-lived{ömürlü}.", "Deney kısa ömürlü oldu."],
    ["The{} school{okul} relocated{yer değiştirmek} again{yeniden} to{-e} Berlin{Berlin} in{} 1932 under{yönetiminde} Ludwig{Ludwig} Mies{Mies} van{van} der{der} Rohe{Rohe} and{} closed{kapanmak} in{} 1933 under{altında} pressure{baskı} from{-den gelen} the{} new{yeni} Nazi{Nazi} government{hükümet}, which{ki o} regarded{bakmak, görmek} it{} with{} hostility{düşmanlık}.", "Okul 1932'de Ludwig Mies van der Rohe yönetiminde yeniden Berlin'e taşındı ve 1933'te ona düşmanlıkla bakan yeni Nazi hükümetinin baskısıyla kapandı."],
    ["Its{} teachers{öğretmenler} and{} students{öğrenciler} then{ardından} scattered{dağılmak} across{boyunca} Europe{Avrupa} and{} the{} United{Birleşik} States{Devletler}, carrying{taşımak} its{} methods{yöntemler} into{-e} schools{okullar}, firms{firmalar} and{} architectural{mimari} practices{bürolar} abroad{yurt dışında}.", "Öğretmenleri ve öğrencileri ardından Avrupa'ya ve ABD'ye dağıldı ve yöntemlerini yurt dışındaki okullara, firmalara ve mimarlık bürolarına taşıdı."],
    ["In{} 1996 UNESCO{UNESCO} added{eklemek} Bauhaus{Bauhaus} sites{alanlar, yapılar} in{} Weimar{Weimar} and{} Dessau{Dessau} to{-e} its{} World{Dünya} Heritage{Miras} List{Liste}.", "UNESCO 1996'da Weimar ve Dessau'daki Bauhaus yapılarını Dünya Mirası Listesi'ne ekledi."],
  ],
  [
    ["Popular{popüler} accounts{anlatımlar} often{sıklıkla} attach{iliştirmek} the{} slogan{slogan} 'form{biçim} follows{izlemek} function{işlev}' to{-e} the{} school{okul}, but{} the{} phrase{ifade} is{} usually{genellikle} credited{atfedilmek} to{-e} the{} American{Amerikalı} architect{mimar} Louis{Louis} Sullivan{Sullivan}, who{ki o} used{kullanmak} it{} before{önce} the{} Bauhaus{Bauhaus} existed{var olmak}.", "Popüler anlatımlar 'biçim işlevi izler' sloganını sıklıkla okula iliştirir, ama ifade genellikle onu Bauhaus var olmadan önce kullanan Amerikalı mimar Louis Sullivan'a atfedilir."],
    ["The{} confusion{karışıklık} is{} telling{anlamlı, çok şey anlatan}.", "Bu karışıklık çok şey anlatıyor."],
    ["Reducing{indirgemek} the{} Bauhaus{Bauhaus} to{-e} a{} set{takım, dizi} of{} visual{görsel} signatures{imzalar, ayırt edici işaretler} obscures{gölgelemek, örtmek} what{şey (ne)} was{} arguably{tartışmaya açık olsa da} its{} more{daha} durable{kalıcı} contribution{katkı}: the{} conviction{inanç} that{ki} design{tasarım} could{-ebilirdi} be{} taught{öğretilmek} as{olarak} a{} disciplined{disiplinli} inquiry{araştırma, sorgulama} into{-e dair} materials{malzemeler}, use{kullanım} and{} production{üretim}.", "Bauhaus'u bir dizi görsel imzaya indirgemek, belki de daha kalıcı katkısını gölgeler: tasarımın malzemeye, kullanıma ve üretime dair disiplinli bir sorgulama olarak öğretilebileceği inancı."],
  ],
];
const { paragraphs, words } = buildFromRows("c1-bauhaus-design", rows);
const gac = "Google Arts & Culture / Stiftung Bauhaus Dessau, Bauhaus: The School of Modernism; https://artsandculture.google.com/story/bauhaus-the-school-of-modernism/8QUh8UW9Rfa-Kw";
const chrono = "Stiftung Bauhaus Dessau, Chronology; https://bauhaus-dessau.de/en/institution/chronology/";
const guide = "Google Arts & Culture / Stiftung Bauhaus Dessau, A Study Guide to the Bauhaus; https://artsandculture.google.com/story/jQVxFU2WA-yZJw";
const unesco = "UNESCO World Heritage Centre, Bauhaus and its Sites in Weimar, Dessau and Bernau; https://whc.unesco.org/en/list/729";
const sullivan = "Encyclopaedia Britannica, Louis Sullivan; https://www.britannica.com/biography/Louis-Sullivan";

export default {
  slug: "c1-bauhaus-design", level: "C1", title: "More Than a Look", topic: "Sanat", sortOrder: 34, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's main argument?", evidence: findEvidence(paragraphs, "set out less to invent a style than to reform how designers were trained"), options: [
      option("o1", "It was a teaching method more than a style", true, null, "Yazar Bauhaus'un asıl katkısının bir üslup değil, tasarım eğitimine yaklaşım olduğunu savunur."),
      option("o2", "Its main aim was a recognisable white style", false, "reverse", "Metin okulun üslup icat etmekten çok eğitimi değiştirmeye yöneldiğini söyler."),
      option("o3", "Sullivan founded the school's teaching ideas", false, "reverse", "Sullivan yalnızca slogana adı karışan Amerikalı mimardır; okulu Gropius kurdu."),
      option("o4", "Its ideas died when the school closed in 1933", false, "reverse", "Öğretmen ve öğrenciler yöntemlerini yurt dışına taşıdı."),
    ] },
    { key: "q2", type: "detail", prompt: "According to the passage, what changed after the move to Dessau?", evidence: findEvidence(paragraphs, "its workshops increasingly produced prototypes intended for industrial manufacture"), options: [
      option("o1", "Workshops turned more toward industry", true, null, "Dessau'dan sonra atölyeler giderek endüstriyel üretime yönelik prototipler üretti."),
      option("o2", "Mies van der Rohe became its founder", false, "reverse", "Mies okulu Berlin'de yönetti; kurucu Gropius'tur."),
      option("o3", "The school was closed by the government", false, "reverse", "Kapanış 1933'te, Berlin döneminde oldu, Dessau taşınmasının hemen ardından değil."),
      option("o4", "UNESCO listed its buildings at once", false, "reverse", "UNESCO listesine giriş 1996'dadır, taşınmadan çok sonra."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “telling” mean in the last paragraph?", evidence: findEvidence(paragraphs, "The confusion is telling."), options: [
      option("o1", "Quite revealing", true, null, "Telling burada sıfattır: bir şeyi açığa vuran, çok şey anlatan."),
      option("o2", "Spoken aloud to others", false, "context", "Tell (anlatmak) fiiline benzerlik yanıltıcıdır; birine bir şey söylenmez."),
      option("o3", "Easily forgiven", false, "context", "Bağışlama anlamı yoktur."),
      option("o4", "Damaging to its name", false, "context", "Yazar karışıklığın okula zarar verdiğini değil, bir şeyi gösterdiğini söyler."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply about linking the slogan to the Bauhaus?", evidence: findEvidence(paragraphs, "Reducing the Bauhaus to a set of visual signatures obscures"), options: [
      option("o1", "It reflects an oversimplified view", true, null, "Karışıklık, Bauhaus'un görsel imzalara indirgendiği yüzeysel bir hatırlamayı yansıtır."),
      option("o2", "It was adopted as the school's official motto", false, "notstated", "Okulun resmi bir sloganı olduğundan söz edilmez."),
      option("o3", "Sullivan borrowed it from Gropius's writing", false, "reverse", "Sullivan ifadeyi Bauhaus var olmadan önce kullandı."),
      option("o4", "It perfectly sums up the school's teaching", false, "reverse", "Yazar bu tür indirgemenin okulun asıl katkısını gölgelediğini söyler."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Bauhaus 1919'da Walter Gropius tarafından Weimar'da kuruldu; sanat, zanaat ve teknolojiyi birleştirmeyi amaçlayan bir sanat okuludur (Google Arts & Culture / Stiftung Bauhaus Dessau).", source: gac, checkedOn: "2026-11-25" },
    { claim: "Okul 1925'te Dessau'ya taşındı; 1932'de siyasi baskı sonrası Mies van der Rohe Berlin'de özel kurum olarak sürdürdü; Nazilerce 20 Temmuz 1933'te kapatılmaya zorlandı; öğretmen ve öğrenciler ABD, Amsterdam, Şanghay, İsrail gibi yerlere dağıldı (Google Arts & Culture; Stiftung Bauhaus Dessau kronolojisi: Dessau meclisi 1932'de okulu kapattı, Gestapo baskınından sonra öğretmenler 1933'te kapatmaya karar verdi).", source: chrono, checkedOn: "2026-11-25" },
    { claim: "Atölyeye atanmadan önce hazırlık (temel) kursu zorunluydu; kursta çeşitli malzemelerle deneme yapılırdı; atölyeler yalnız eğitim değil üretim için de vardı; Dessau'da Bauhaus endüstri için üretilen prototiplerden gelir elde etti (Stiftung Bauhaus Dessau / Google Arts & Culture, Study Guide). Not: kaynak renk ve 'akademik alışkanlıkları söküp atma' ifadesini desteklemediği için metinden çıkarıldı.", source: guide, checkedOn: "2026-11-25" },
    { claim: "Weimar ve Dessau'daki Bauhaus yapıları 1996'da UNESCO Dünya Mirası Listesi'ne alındı.", source: unesco, checkedOn: "2026-11-23" },
    { claim: "'Form follows function' ifadesi Amerikalı mimar Louis Sullivan ile ilişkilendirilir (1896).", source: sullivan, checkedOn: "2026-11-23" },
  ] },
};
