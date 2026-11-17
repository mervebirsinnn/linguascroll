import { fireEvent, render, screen } from "@testing-library/react-native";
import { WordGlossSheet } from "./WordGlossSheet";
import { saveGloss } from "./api/save-gloss";
import { loopiStore } from "../loopi/loopi-store-instance";
jest.mock("./api/save-gloss", () => ({ saveGloss: jest.fn() }));
jest.mock("../loopi/loopi-store-instance", () => ({ loopiStore: { recordWordCreated: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  return { __esModule: true, default: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) => visible ? ReactActual.createElement(ReactActual.Fragment, null, children) : null };
});
const WORD = { id: "00000000-0000-4000-8000-000000000001", language: "en" as const, lemma: "bank", gloss: "nehir kıyısı" };
const ENTRY = { word: "bank", gloss: "nehir kıyısı", segmentId: "segment", sentence: "We sat by the bank." };
beforeEach(() => jest.clearAllMocks());
it("hazırlanmış anlam anında görünür; yalnızca Kaydet eylemi API çağırır ve tekrar kaydetmez", async () => {
  jest.mocked(saveGloss).mockResolvedValue({ saved: true, word: WORD });
  await render(<WordGlossSheet entry={ENTRY} onClose={jest.fn()} userId="user-1" />);
  expect(screen.getByText("We sat by the bank.")).toBeTruthy();
  expect(screen.getByText("nehir kıyısı")).toBeTruthy(); expect(saveGloss).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  await screen.findByText("Kelimelerine eklendi ✓");
  expect(saveGloss).toHaveBeenCalledWith("segment", "bank");
  await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓"));
  expect(saveGloss).toHaveBeenCalledTimes(1);
});
// 2026-11-17 — Loopi: yalnız sunucunun gerçekten yeni dediği kayıt kuyruğa girer.
it("created:true → Loopi kuyruğuna bu kullanıcı ve kelimeyle BİR kez yazılır", async () => {
  jest.mocked(saveGloss).mockResolvedValue({ saved: true, word: WORD, created: true });
  await render(<WordGlossSheet entry={ENTRY} onClose={jest.fn()} userId="user-1" />);
  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  await screen.findByText("Kelimelerine eklendi ✓");
  expect(loopiStore.recordWordCreated).toHaveBeenCalledTimes(1);
  expect(loopiStore.recordWordCreated).toHaveBeenCalledWith("user-1", WORD.id);
});
it.each([{ created: false }, {}])("created yok/false (%o) → Loopi kuyruğuna hiç yazılmaz, kayıt yine başarılı", async (extra) => {
  jest.mocked(saveGloss).mockResolvedValue({ saved: true, word: WORD, ...extra });
  await render(<WordGlossSheet entry={ENTRY} onClose={jest.fn()} userId="user-1" />);
  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  await screen.findByText("Kelimelerine eklendi ✓");
  expect(loopiStore.recordWordCreated).not.toHaveBeenCalled();
});
