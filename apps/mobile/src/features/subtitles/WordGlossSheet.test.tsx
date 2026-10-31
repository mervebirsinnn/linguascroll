import { fireEvent, render, screen } from "@testing-library/react-native";
import { WordGlossSheet } from "./WordGlossSheet";
import { saveGloss } from "./api/save-gloss";
jest.mock("./api/save-gloss", () => ({ saveGloss: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  return { __esModule: true, default: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) => visible ? ReactActual.createElement(ReactActual.Fragment, null, children) : null };
});
it("hazırlanmış anlam anında görünür; yalnızca Kaydet eylemi API çağırır ve tekrar kaydetmez", async () => {
  jest.mocked(saveGloss).mockResolvedValue({ saved: true, word: { id: "00000000-0000-4000-8000-000000000001", language: "en", lemma: "bank", gloss: "nehir kıyısı" } });
  await render(<WordGlossSheet entry={{ word: "bank", gloss: "nehir kıyısı", segmentId: "segment", sentence: "We sat by the bank." }} onClose={jest.fn()} />);
  expect(screen.getByText("We sat by the bank.")).toBeTruthy();
  expect(screen.getByText("nehir kıyısı")).toBeTruthy(); expect(saveGloss).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
  await screen.findByText("Kelimelerine eklendi ✓");
  expect(saveGloss).toHaveBeenCalledWith("segment", "bank");
  await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓"));
  expect(saveGloss).toHaveBeenCalledTimes(1);
});
