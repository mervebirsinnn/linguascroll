import { buildFromRows, findEvidence, option } from "./lib.mjs";

const rows = [
  [
    ["An{} electricity{elektrik} grid{şebekesi} has{sahiptir} a{} demanding{zorlu} job{görev}: at{} every{her} moment{an}, the{} amount{miktar} of{} power{elektrik, güç} produced{üretilen} must{zorunda} match{eşleşmek} the{} amount{miktar} being{-mekte olan} used{kullanılan}.", "Bir elektrik şebekesinin zorlu bir görevi vardır: her an üretilen elektrik miktarı, kullanılan miktarla eşleşmek zorundadır."],
    ["For{boyunca} most{çoğu} of{} the{} last{geçen} century{yüzyıl}, operators{işletmeciler} managed{yönetti} this{} by{-erek} burning{yakmak} more{daha çok} or{} less{daha az} fuel{yakıt} in{} large{büyük} power{elektrik} stations{santraller}.", "Geçen yüzyılın büyük bölümünde işletmeciler bunu büyük santrallerde daha çok ya da daha az yakıt yakarak yönetti."],
    ["Sun{güneş} and{} wind{rüzgar} are{} cleaner{daha temiz} sources{kaynaklar}, but{} they{} cannot{-amaz} be{} switched{açılmak} on{(switch on: açmak)} when{-dığında} needed{gerekli}.", "Güneş ve rüzgar daha temiz kaynaklardır, ama gerektiğinde açılamazlar."],
    ["Solar{güneş} panels{panelleri} produce{üretir} nothing{hiçbir şey} at{} night{gece}, and{} wind{rüzgar} farms{çiftlikleri} slow{yavaşlar} down{(slow down: yavaşlamak)} when{-dığında} the{} air{hava} is{} calm{durgun}.", "Güneş panelleri gece hiçbir şey üretmez, rüzgar çiftlikleri de hava durgun olduğunda yavaşlar."],
  ],
  [
    ["Engineers{mühendisler} are{} tackling{ele alıyor} this{} variability{değişkenlik} in{} several{birkaç} ways{yol}.", "Mühendisler bu değişkenliği birkaç yolla ele alıyor."],
    ["Batteries{bataryalar} can{-ebilir} store{depolamak} extra{fazla} energy{enerji} on{} a{} sunny{güneşli} afternoon{öğleden sonra} and{} release{salmak} it{} after{sonra} sunset{gün batımı}.", "Bataryalar güneşli bir öğleden sonra fazla enerjiyi depolayıp gün batımından sonra salabilir."],
    ["Pumped{pompajlı} hydro{hidroelektrik} plants{santraller} use{kullanır} electricity{elektrik} to{-mek için} pump{pompalamak} water{su} uphill{yokuş yukarı}, then{sonra} let{izin vermek} it{} flow{akmak} down{aşağı} through{içinden} turbines{türbinler} to{-mek için} generate{üretmek} power{elektrik} when{-dığında} it{} is{} needed{gerekli}.", "Pompajlı hidroelektrik santralleri suyu yukarı pompalamak için elektrik kullanır, sonra gerektiğinde elektrik üretmek için suyun türbinlerden aşağı akmasına izin verir."],
    ["Long{uzun} transmission{iletim} lines{hatları} help{yardım eder} as{(as well: de, da)} well{(as well: de, da)}, because{çünkü} the{} wind{rüzgar} is{} rarely{nadiren} calm{durgun} everywhere{her yerde} at{(at once: aynı anda)} once{(at once: aynı anda)}, so{bu yüzden} a{} wider{daha geniş} grid{şebeke} can{-ebilir} share{paylaşmak} power{elektrik} between{arasında} regions{bölgeler}.", "Uzun iletim hatları da yardımcı olur, çünkü rüzgar nadiren her yerde aynı anda durgundur; bu yüzden daha geniş bir şebeke elektriği bölgeler arasında paylaşabilir."],
    ["Better{daha iyi} weather{hava} forecasts{tahminleri} allow{olanak tanır} operators{işletmeciler} to{-mesine} plan{planlamak} hours{saatler} or{} days{günler} ahead{önceden}.", "Daha iyi hava tahminleri işletmecilerin saatler ya da günler önceden plan yapmasına olanak tanır."],
  ],
  [
    ["Demand{talep} can{-ebilir} also{de} become{olmak} more{daha} flexible{esnek}.", "Talep de daha esnek hâle gelebilir."],
    ["Some{bazı} factories{fabrikalar} and{} electric{elektrikli} cars{arabalar} can{-ebilir} be{} set{ayarlanmak} to{-mek} use{kullanmak} power{elektrik} when{-dığında} it{} is{} plentiful{bol} and{} cheap{ucuz}, instead{yerine} of{(instead of: yerine)} when{-dığında} it{} is{} scarce{kıt}.", "Bazı fabrikalar ve elektrikli arabalar, elektriği kıt olduğunda değil, bol ve ucuz olduğunda kullanacak şekilde ayarlanabilir."],
    ["None{hiçbiri} of{} these{} tools{araçlar} is{} enough{yeterli} on{(on its own: tek başına)} its{} own{kendi}, but{} together{birlikte} they{} make{yapar} a{} grid{şebeke} with{} a{} large{büyük} share{pay} of{} renewables{yenilenebilir kaynaklar} far{çok} more{daha} reliable{güvenilir}.", "Bu araçların hiçbiri tek başına yeterli değildir, ama birlikte, yenilenebilir kaynakların payı büyük olan bir şebekeyi çok daha güvenilir kılar."],
    ["The{} challenge{zorluk}, in{} other{başka} words{sözcükler}, is{} less{daha az} about{ile ilgili} producing{üretmek} clean{temiz} energy{enerji} and{} more{daha çok} about{ile ilgili} managing{yönetmek} it{} wisely{akıllıca}.", "Başka bir deyişle zorluk, temiz enerji üretmekten çok onu akıllıca yönetmekle ilgilidir."],
  ],
];
const { paragraphs, words } = buildFromRows("b2-renewable-grid", rows);
const ev = (t) => findEvidence(paragraphs, t);
const iea = "International Energy Agency, Integrating Solar and Wind (Executive summary); https://www.iea.org/reports/integrating-solar-and-wind/executive-summary";
const eia = "U.S. Energy Information Administration, U.S. electric system is made up of interconnections and balancing authorities (Today in Energy); https://www.eia.gov/todayinenergy/detail.php?id=27152";
const doeRel = "U.S. Department of Energy, Maintaining Reliability in the Modern Power System; https://www.energy.gov/sites/prod/files/2017/01/f34/Maintaining%20Reliability%20in%20the%20Modern%20Power%20System.pdf";
const doe = "U.S. Department of Energy, Pumped Storage Hydropower; https://www.energy.gov/eere/water/pumped-storage-hydropower";

export default {
  slug: "b2-renewable-grid", level: "B2", title: "Keeping the Lights On", topic: "Teknoloji", sortOrder: 38, isFreeSample: false,
  paragraphs, words,
  questions: [
    { key: "q1", type: "main-idea", prompt: "What is the passage mainly about?", evidence: ev("together they make a grid with a large share of renewables far more reliable"), options: [
      option("o1", "Ways to balance a grid that relies on renewables", true, null, "Metin güneş ve rüzgarın değişkenliğini ve şebekeyi dengelemenin yollarını anlatır."),
      option("o2", "Why solar panels work better than wind farms", false, "notstated", "Metin iki kaynağı karşılaştırıp birini üstün tutmaz."),
      option("o3", "How old power stations burned more fuel", false, "context", "Eski santraller yalnızca giriş bağlamında anılır."),
      option("o4", "Reasons to stop building transmission lines entirely", false, "reverse", "Metin iletim hatlarını bir çözüm olarak sunar."),
    ] },
    { key: "q2", type: "detail", prompt: "How does a pumped hydro plant store energy?", evidence: ev("Pumped hydro plants use electricity to pump water uphill"), options: [
      option("o1", "By pumping water uphill using electricity", true, null, "Metin elektrik kullanılarak suyun yukarı pompalandığını açıkça söyler."),
      option("o2", "By keeping batteries charged at night", false, "context", "Bataryalar ayrı bir çözüm olarak anlatılır."),
      option("o3", "By burning extra fuel during the day", false, "context", "Yakıt yakmak eski santrallerin yöntemidir."),
      option("o4", "By sending power along long transmission lines", false, "context", "İletim hatları ayrı bir çözümdür; depolama yapmaz."),
    ] },
    { key: "q3", type: "vocabulary", prompt: "What does “plentiful” mean in paragraph 3?", evidence: ev("use power when it is plentiful and cheap"), options: [
      option("o1", "Available in large amounts", true, null, "Plentiful, bol miktarda bulunan demektir; cümlede 'scarce' (kıt) ile karşıtlık kurulur."),
      option("o2", "Produced mainly during the night hours", false, "context", "Metin güneş panellerinin gece üretmediğini söyler; kelimeyle ilgisi yoktur."),
      option("o3", "Difficult to find or to obtain", false, "reverse", "Bu anlam cümledeki 'scarce' kelimesine aittir."),
      option("o4", "Too expensive for most people to buy", false, "reverse", "Cümlede plentiful 'cheap' (ucuz) ile birlikte geçer."),
    ] },
    { key: "q4", type: "inference", prompt: "What does the passage suggest about a grid with many renewables?", evidence: ev("None of these tools is enough on its own"), options: [
      option("o1", "It needs several solutions working together", true, null, "Hiçbir araç tek başına yetmediği, ama birlikte şebekeyi güvenilir kıldığı için birden çok çözüm gerekir."),
      option("o2", "One large battery can fully solve its problems", false, "extreme", "Metin tek bir aracın yeterli olmadığını söyler."),
      option("o3", "It cannot be made reliable at all", false, "reverse", "Metin araçların birlikte şebekeyi çok daha güvenilir kıldığını söyler."),
      option("o4", "Its main problem is producing enough clean power", false, "reverse", "Metne göre asıl zorluk üretmek değil, yönetmektir."),
    ] },
  ],
  editorial: { original: true, sources: [
    { claim: "Şebeke işletmecisi talep ve arzı gerçek zamanlı olarak dengede tutar; dengesizlik yerel ya da geniş çaplı elektrik kesintilerine yol açabilir.", source: eia, checkedOn: "2026-11-25" },
    { claim: "Rüzgar ve güneş gibi değişken üretim, rüzgar durduğunda ya da güneş battığında esnek kapasite gerektirir; iletim değişkenliğin bir kısmını ortalayabilir, bu kaynakların toplanması değişkenliği azaltır; talep tepkisi ve depolama dengelemeye yardım eder.", source: doeRel, checkedOn: "2026-11-25" },
    { claim: "Değişken yenilenebilir kaynakların şebekeye entegrasyonu için depolama (bataryalar), iletim hatlarının genişletilmesi, talep esnekliği ve daha iyi tahminler kullanılır.", source: iea, checkedOn: "2026-11-25" },
    { claim: "Pompajlı hidroelektrik depolama suyu yukarıdaki bir hazneye pompalar ve gerektiğinde suyu türbinlerden geçirerek elektrik üretir.", source: doe, checkedOn: "2026-11-25" },
  ] },
};
