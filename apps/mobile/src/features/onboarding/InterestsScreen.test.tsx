import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { InterestsScreen } from "./InterestsScreen";
import { OnboardingFlow } from "./OnboardingFlow";

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
