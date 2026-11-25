import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["Readers{okurlar} who{ki} praise{övmek} a{} translation{çeviri} for{-dığı için} being{olmak} faithful{sadık} rarely{nadiren} say{söylemek} what{neye} it{} is{} faithful{sadık} to{-e}.", "Bir çeviriyi sadık olduğu için öven okurlar nadiren neye sadık olduğunu söyler."],
    ["The{} words{sözcükler} of{} the{} original{asıl metin}, its{} rhythm{ritim}, its{} tone{ton}, the{} effect{etki} it{} had{yaratmak (have an effect)} on{üzerinde} its{} first{ilk} audience{kitle}: these{} pull{çekmek} in{} different{farklı} directions{yönler}, and{} loyalty{bağlılık} to{-e} one{biri} is{} frequently{sıklıkla} a{} betrayal{ihanet} of{} another{diğeri}.", "Asıl metnin sözcükleri, ritmi, tonu, ilk kitlesi üzerinde yarattığı etki: bunlar farklı yönlere çeker ve birine bağlılık sıklıkla diğerine ihanettir."],
    ["The{} Italian{İtalyan} pun{kelime oyunu} that{ki} turns{dönüştürmek} the{} translator{çevirmen} into{-e} a{} traitor{hain} captures{yakalamak} the{} anxiety{kaygı} but{} not{} the{} structure{yapı} of{} the{} problem{sorun}.", "Çevirmeni haine dönüştüren İtalyan kelime oyunu sorunun kaygısını yakalar ama yapısını yakalamaz."],
  ],
  [
    ["A{} more{daha} useful{yararlı} framing{çerçeveleme} goes{dayanmak (go back to)} back{dayanmak (go back to)} to{-e} Friedrich{Friedrich} Schleiermacher{Schleiermacher}, who{ki o} argued{savunmak} in{} a{} lecture{konferans} of{tarihli} eighteen{on sekiz} thirteen{on üç} that{ki} a{} translator{çevirmen} can{-ebilmek} either{ya} leave{bırakmak} the{} writer{yazar} undisturbed{rahat, rahatsız edilmemiş} and{} move{taşımak} the{} reader{okur} towards{-e doğru} him{ona}, or{} leave{bırakmak} the{} reader{okur} undisturbed{rahat, rahatsız edilmemiş} and{} move{taşımak} the{} writer{yazar} towards{-e doğru} the{} reader{okur}.", "Daha yararlı bir çerçeveleme, 1813 tarihli bir konferansta çevirmenin ya yazarı rahat bırakıp okuru ona doğru taşıyabileceğini ya da okuru rahat bırakıp yazarı okura doğru taşıyabileceğini savunan Friedrich Schleiermacher'e dayanır."],
    ["Much{çok} later{sonra}, the{} translation{çeviri} scholar{akademisyen} Lawrence{Lawrence} Venuti{Venuti} recast{yeniden biçimlendirmek} this{} as{olarak} a{} contrast{karşıtlık} between{arasında} foreignizing{yabancılaştırıcı} and{} domesticating{yerlileştirici} strategies{stratejiler}, and{} argued{savunmak} that{ki} English{İngilizce}-language{dil} publishing{yayıncılık} had{} long{uzun süredir} favoured{kayırmak} the{} second{ikinci}, prizing{değer vermek} translations{çeviriler} that{ki} read{okunmak} as{sanki (as though)} though{sanki (as though)} they{} had{} never{hiç} been{} translated{çevrilmek}.", "Çok sonra çeviri akademisyeni Lawrence Venuti bunu yabancılaştırıcı ve yerlileştirici stratejiler arasındaki bir karşıtlık olarak yeniden biçimlendirdi ve İngilizce yayıncılığın uzun süredir ikincisini kayırdığını, sanki hiç çevrilmemiş gibi okunan çevirilere değer verdiğini savundu."],
  ],
  [
    ["Neither{hiçbiri} strategy{strateji} is{} innocent{masum, bedelsiz}.", "Hiçbir strateji masum değildir."],
    ["A{} domesticating{yerlileştirici} translation{çeviri} can{-ebilmek} make{kılmak} a{} foreign{yabancı} novel{roman} feel{hissettirmek} effortlessly{zahmetsizce} familiar{tanıdık}, and{} in{-erek (in doing so)} doing{yapmak} so{böyle} erase{silmek} precisely{tam olarak} the{} strangeness{yabancılık} that{ki} made{kılmak} it{onu} worth{değer} translating{çevirmek}.", "Yerlileştirici bir çeviri yabancı bir romanı zahmetsizce tanıdık hissettirebilir ve bunu yaparken onu çevirmeye değer kılan yabancılığı tam olarak silebilir."],
    ["A{} foreignizing{yabancılaştırıcı} one{olan} can{-ebilmek} preserve{korumak} that{o} strangeness{yabancılık} at{pahasına (at the cost of)} the{} cost{bedel} of{} prose{düzyazı} so{öylesine} awkward{hantal} that{ki} readers{okurlar} abandon{bırakmak} it{onu}, which{ki bu} protects{korumak} the{} original{asıl metin} only{yalnızca} in{} the{} sense{anlam} that{ki} an{} unread{okunmamış} book{kitap} cannot{-emez} be{} misunderstood{yanlış anlaşılmak}.", "Yabancılaştırıcı olanı ise bu yabancılığı okurların bırakacağı kadar hantal bir düzyazı pahasına koruyabilir; bu da asıl metni ancak okunmamış bir kitabın yanlış anlaşılamayacağı anlamında korur."],
  ],
  [
    ["Vladimir{Vladimir} Nabokov{Nabokov} pushed{itmek} something{bir şey} like{gibi} the{} foreignizing{yabancılaştırıcı} path{yol} about{aşağı yukarı} as{kadar (as far as)} far{uzak (as far as)} as{kadar (as far as)} it{} can{-ebilmek} go{gitmek}.", "Vladimir Nabokov yabancılaştırıcı yola benzer bir şeyi aşağı yukarı gidebileceği en uç noktaya kadar itti."],
    ["His{} English{İngilizce} version{versiyon} of{} Pushkin's{Puşkin'in} Eugene{Eugene} Onegin{Onegin} abandoned{terk etmek} rhyme{uyak} in{lehine (in favour of)} favour{lehine (in favour of)} of{lehine (in favour of)} strict{katı} literal{harfi harfine} sense{anlam}, supported{desteklenmek} by{tarafından} a{} commentary{şerh} far{çok} longer{daha uzun} than{-den} the{} poem{şiir} itself{kendisi}.", "Puşkin'in Yevgeni Onegin'inin İngilizce versiyonu uyağı katı harfi harfine anlam lehine terk etti ve şiirin kendisinden çok daha uzun bir şerhle desteklendi."],
    ["Admirers{hayranlar} saw{görmek} scholarly{akademik} honesty{dürüstlük}; detractors{eleştirenler}, famously{bilindiği üzere} including{dahil} his{} longtime{uzun süreli} friend{arkadaş} Edmund{Edmund} Wilson{Wilson}, attacked{saldırmak} it{onu} harshly{sertçe}.", "Hayranlar akademik dürüstlük gördü; bilindiği üzere uzun süreli arkadaşı Edmund Wilson'ın da aralarında olduğu eleştirenler ona sertçe saldırdı."],
    ["Both{her iki} responses{tepkiler} can{-ebilmek} be{} fair{adil} at{aynı anda (at once)} once{aynı anda (at once)}, since{çünkü} a{} version{versiyon} may{-ebilir} be{} accurate{doğru} line{satır} by{satır satır (line by line)} line{satır} and{} lifeless{cansız} as{bütün olarak (as a whole)} a{} whole{bütün}.", "Her iki tepki de aynı anda adil olabilir, çünkü bir versiyon satır satır doğru ve bütün olarak cansız olabilir."],
  ],
  [
    ["Fidelity{sadakat}, then{o halde}, is{} not{} a{} single{tek} virtue{erdem} that{ki} translations{çeviriler} possess{sahip olmak} in{} greater{daha büyük} or{} lesser{daha küçük} amounts{miktarlar}.", "O halde sadakat, çevirilerin daha büyük ya da daha küçük miktarlarda sahip olduğu tek bir erdem değildir."],
    ["It{} is{} a{} choice{seçim} among{arasında} loyalties{bağlılıklar}, and{} the{} most{en} honest{dürüst} translators{çevirmenler} are{} perhaps{belki} those{olanlar} who{ki} tell{söylemek} their{} readers{okurlar} which{hangi} loyalty{bağlılık} they{} chose{seçmek} and{} what{neye} it{} cost{mal olmak}.", "Bağlılıklar arasında bir seçimdir ve en dürüst çevirmenler belki de okurlarına hangi bağlılığı seçtiklerini ve bunun neye mal olduğunu söyleyenlerdir."],
  ],
];
const { paragraphs, words } = buildFromRows("c2-translation-fidelity", rows);
const domestication = "Wikipedia, Domestication and foreignization; https://en.wikipedia.org/wiki/Domestication_and_foreignization";
const nabokov = "Wikipedia, Vladimir Nabokov; https://en.wikipedia.org/wiki/Vladimir_Nabokov";
const pun = "Wiktionary, traduttore, traditore; https://en.wiktionary.org/wiki/traduttore,_traditore";

export default {
  slug: "c2-translation-fidelity", level: "C2", title: "Faithful to What?", topic: "Sanat", sortOrder: 41, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the author's central claim about fidelity?", evidence: findEvidence(paragraphs, "It is a choice among loyalties"), options: [
      option("o1", "It means choosing among competing loyalties", true, null, "Yazar sadakatin tek bir erdem değil, bağlılıklar arasında bir seçim olduğunu savunur."),
      option("o2", "It is a single measurable virtue", false, "reverse", "Metin bunu açıkça reddeder."),
      option("o3", "Literal translation is the most faithful kind", false, "extreme", "Nabokov örneği harfi harfine çevirinin bedelini de gösterir."),
      option("o4", "Translators are inevitably traitors to authors", false, "context", "Yazar bu kelime oyununun sorunun yapısını yakalamadığını söyler."),
    ] },
    { key: "q2", type: "detail", prompt: "Which statement about Nabokov's Eugene Onegin is supported by the text?", evidence: findEvidence(paragraphs, "abandoned rhyme in favour of strict literal sense, supported by a commentary far longer than the poem itself"), options: [
      option("o1", "It dropped rhyme and added a commentary longer than the poem", true, null, "Nabokov kafiyeyi bırakıp şiirden çok daha uzun bir yorumla desteklemiştir."),
      option("o2", "Edmund Wilson defended it as an act of scholarly honesty", false, "detail", "Bilimsel dürüstlüğü öven hayranlardır; Wilson ise sert eleştirmiştir."),
      option("o3", "Venuti condemned it for making Pushkin sound too familiar", false, "notstated", "Venuti'nin Nabokov'a yönelik bir eleştirisi anılmaz; çeviri de yabancılaştırıcıdır."),
      option("o4", "It kept the rhyme but surrounded it with a very brief commentary", false, "reverse", "Kafiye bırakıldı ve yorum çok uzundu."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "In the third paragraph, what does “innocent” mean as the author uses it?", evidence: findEvidence(paragraphs, "Neither strategy is innocent."), options: [
      option("o1", "Without any cost or drawback", true, null, "Yazar her stratejinin bir bedeli olduğunu anlatır; 'innocent' burada bedelsiz, kusursuz demektir."),
      option("o2", "Free of legal blame", false, "context", "Hukuki suçsuzluk anlamı bu bağlamda kastedilmez."),
      option("o3", "Naive about the original text", false, "context", "Saflık anlamı stratejilere uymaz."),
      option("o4", "Popular with most readers", false, "notstated", "Kabul görme anlamı yoktur; metin okurların bazılarının bırakabileceğini söyler."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the author imply by noting that an unread book “cannot be misunderstood”?", evidence: findEvidence(paragraphs, "which protects the original only in the sense that an unread book cannot be misunderstood"), options: [
      option("o1", "The protection it offers is hollow", true, null, "İroni: okunmayan kitabı 'korumak' gerçek bir kazanç değildir."),
      option("o2", "Foreignizing translations are always misunderstood", false, "extreme", "Metin böyle bir genelleme yapmaz."),
      option("o3", "Unread books are the most faithful translations", false, "reverse", "İroni gerçek bir övgü gibi okunmuştur."),
      option("o4", "Readers should avoid difficult translations", false, "notstated", "Yazar okura böyle bir öneride bulunmaz."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Schleiermacher 1813 tarihli konferansında çevirmenin ya yazarı rahat bırakıp okuru ona taşıyacağını ya da okuru rahat bırakıp yazarı okura taşıyacağını söyledi; Lawrence Venuti bunu yabancılaştırma/yerlileştirme karşıtlığı olarak yeniden biçimlendirdi ve İngilizce yayıncılığın akıcı, 'görünmez' çevirileri kayırdığını savundu.", source: domestication, checkedOn: "2026-11-23" },
    { claim: "Nabokov Puşkin'in Yevgeni Onegin'ini uyaksız, harfi harfine bir çeviriyle ve şiirden çok daha uzun bir şerhle yayımladı; uzun süreli arkadaşı Edmund Wilson çeviriyi sert biçimde eleştirdi.", source: nabokov, checkedOn: "2026-11-23" },
    { claim: "İtalyanca 'traduttore, traditore' (çevirmen, hain) kelime oyunu çevirinin ihanet sayılabileceği kaygısını dile getirir.", source: pun, checkedOn: "2026-11-23" },
  ] },
};
