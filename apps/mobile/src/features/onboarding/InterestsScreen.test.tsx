import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { InterestsScreen } from "./InterestsScreen";
import { OnboardingFlow } from "./OnboardingFlow";

// 2026-11-17 — kök neden (ölçüldü): dosyadaki İLK render, RN modüllerini ilk erişimde Babel'den geçirip yüklüyor.
// Jest dönüştürme önbelleği sıcakken ilk test 1,4 sn; `--no-cache` ile (önbelleği boş makine/CI) 5 sn'yi aşıp
// zaman aşımına düşüyordu — sonraki testler 65–240 ms. Bu bir ürün yavaşlığı değil, ilk testin süresine eklenen
// soğuk yükleme. Adım ölçümü: önbelleksiz render 8,8 sn / sıcak 1,1 sn; sorgular ve dokunmalar < 100 ms.
// Zaman sınırını büyütmek yerine bu maliyet ayrı bir ısınma adımına alındı: testlerin kendi 5 sn sınırı aynen
// duruyor (gerçek bir yavaşlama yine yakalanır), yalnız ısınmanın kendi sınırı var. Isınma InterestsScreen'in
// KENDİSİNİ çizer: OnboardingFlow önce seviye ekranını açtığı için bu ekranın RN bileşenlerini yüklemiyordu.
beforeAll(async () => {
  const warmup = await render(<InterestsScreen onContinue={() => {}} />);
  await warmup.unmount();
}, 60_000);

it("dört seçimde çerçeveler kırmızıdan yeşile döner; seçim azaltılırsa devam kapanır", async () => {
  const next = jest.fn();
  await render(<InterestsScreen onContinue={next} />);
  const button = () => screen.getByRole("button", {name:"Akışa devam et"});
  const topic = (name: string) => screen.getByRole("checkbox", {name});
  expect(button().props.accessibilityState.disabled).toBe(true);
  for(const name of ["İlişkiler", "Seyahat", "Kariyer"]) await fireEvent.press(topic(name));
  expect(StyleSheet.flatten(topic("İlişkiler").props.style).borderColor).toBe("#ff7b87");
  await fireEvent.press(button()); expect(next).not.toHaveBeenCalled();
  await fireEvent.press(topic("Mizah"));
  expect(StyleSheet.flatten(topic("İlişkiler").props.style).borderColor).toBe("#7bd88f");
  expect(button().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(topic("Yaşam Tarzı"));
  expect(button().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(topic("Mizah")); await fireEvent.press(topic("Yaşam Tarzı"));
  expect(button().props.accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(topic("İlişkiler").props.style).borderColor).toBe("#ff7b87");
  await fireEvent.press(topic("Mizah")); await fireEvent.press(button());
  expect(next).toHaveBeenCalledWith(["dating", "travel", "career", "humor"]);
});

it("seviyeyi atlamak ilgi alanlarını atlamaz; dört konuyla tamamlanır", async () => {
  const complete = jest.fn(); await render(<OnboardingFlow onComplete={complete} />);
  await fireEvent.press(screen.getByText("Atla"));
  expect(screen.queryByText("Atla")).toBeNull(); expect(complete).not.toHaveBeenCalled();
  for(const name of ["İlişkiler", "Seyahat", "Kariyer", "Mizah"]) await fireEvent.press(screen.getByRole("checkbox", {name}));
  await fireEvent.press(screen.getByRole("button", {name:"Akışa devam et"}));
  expect(complete).toHaveBeenCalledWith({level:null, topics:["dating", "travel", "career", "humor"]});
});

 it("yeni konular seçilebilir; önceki seçimler korunur", async () => {
   const next = jest.fn(); await render(<InterestsScreen onContinue={next} initialTopics={["travel"]} />);
   for(const name of ["Bilim ve keşif", "Müzik", "Yemek ve mutfak"]) await fireEvent.press(screen.getByRole("checkbox", {name}));
   await fireEvent.press(screen.getByRole("button", {name:"Akışa devam et"}));
   expect(next).toHaveBeenCalledWith(["travel", "science", "music", "food"]);
 });
