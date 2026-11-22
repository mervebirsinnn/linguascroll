// 2026-11-22 — seviye değişikliğinin kalıcılığı: hook'un yazdığı state, yeni bir okuma (uygulamanın yeniden açılması) ile aynı döner.
const mockStore = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));

import { buildCompletedState, withLevel } from "./onboarding-state";
import { getStoredOnboardingState, storeOnboardingState } from "./storage";

beforeEach(() => mockStore.clear());

it("Hesabım'da seçilen seviye saklanır ve yeniden açılışta aynen okunur", async () => {
  const completed = buildCompletedState({ level: "B1", topics: ["travel", "dating", "food", "career"] });
  await storeOnboardingState(completed);
  await storeOnboardingState(withLevel(await getStoredOnboardingState(), "C1"));

  const reopened = await getStoredOnboardingState();
  expect(reopened.preferences.level).toBe("C1");
  expect(reopened.completed).toBe(true);
  expect(reopened.preferences.topics).toEqual(["travel", "dating", "food", "career"]);
});
