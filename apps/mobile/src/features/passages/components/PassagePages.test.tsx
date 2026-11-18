import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeAnswer, makeLockedPassage, makeOpenPassage } from "../passages-test-helpers";
import { PassageLockedPage } from "./PassageLockedPage";
import { PassageSummaryPage } from "./PassageSummaryPage";
import { PassageTextPage } from "./PassageTextPage";

jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));
jest.setTimeout(60_000);

describe("PassageSummaryPage (skor özeti)", () => {
  it("canlı özet metni ve soru başına durum; hepsi cevaplanmadıysa yönlendirme notu", async () => {
    const passage = makeOpenPassage(1);
    await render(<PassageSummaryPage title="T1" questions={passage.questions} height={800} width={400} onNext={() => {}} />);

    expect(screen.getByText("0/4")).toBeTruthy();
    expect(screen.getByText("0 doğru · 0 yanlış · 4 cevaplanmadı")).toBeTruthy();
    expect(screen.getAllByText("Cevaplanmadı")).toHaveLength(4);
    expect(screen.getByText(/geri dönüp tamamlayabilirsin/)).toBeTruthy();
    expect(screen.getByText(/seviye ölçümü değildir/)).toBeTruthy(); // "öğrenme pratiği" çerçevesi
  });

  it("karışık sonuç: 2 doğru · 1 yanlış · 1 cevaplanmadı; tamamlanmadığı için not görünür; 'Sonraki metin' onNext'i çağırır", async () => {
    const passage = makeOpenPassage(1);
    const [q1, q2, q3] = passage.questions;
    const questions = [
      { ...q1!, result: makeAnswer(q1!, 0, 0) },
      { ...q2!, result: makeAnswer(q2!, 1, 1) },
      { ...q3!, result: makeAnswer(q3!, 0, 2) },
      passage.questions[3]!,
    ];
    const onNext = jest.fn();
    await render(<PassageSummaryPage title="T1" questions={questions} height={800} width={400} onNext={onNext} />);

    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.getByText("2 doğru · 1 yanlış · 1 cevaplanmadı")).toBeTruthy();
    expect(screen.getAllByText("Doğru")).toHaveLength(2);
    expect(screen.getByText("Yanlış")).toBeTruthy();

    await fireEvent.press(screen.getByText("Sonraki metin ›"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("hepsi cevaplanınca yönlendirme notu çıkmaz", async () => {
    const passage = makeOpenPassage(1);
    const questions = passage.questions.map((question) => ({ ...question, result: makeAnswer(question, 0, 0) }));
    await render(<PassageSummaryPage title="T1" questions={questions} height={800} width={400} onNext={() => {}} />);
    expect(screen.getByText("4/4")).toBeTruthy();
    expect(screen.queryByText(/geri dönüp tamamlayabilirsin/)).toBeNull();
  });
});

describe("PassageLockedPage", () => {
  it("yalnız başlık/seviye/konu; paragraf ve soru ipucu yok; düğme onUnlock'u çağırır", async () => {
    const locked = makeLockedPassage(7);
    const onUnlock = jest.fn();
    await render(<PassageLockedPage title={locked.title} level={locked.level} topic={locked.topic} height={800} width={400} onUnlock={onUnlock} />);

    expect(screen.getByText("L7")).toBeTruthy();
    expect(screen.getByText("B2 · K")).toBeTruthy();
    expect(screen.queryByText(/Soru/)).toBeNull();
    await fireEvent.press(screen.getByText("Premium'u gör"));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});

describe("PassageTextPage erişilebilirlik ve kayıtlı kelime", () => {
  it("kelimeler 'button' rolünde ve anlamlı etiketli; düz metin dokunulamaz; kayıtlı kelime farklı stilde", async () => {
    const passage = makeOpenPassage(1);
    passage.paragraphs = [[
      { text: "A " },
      { text: "cat", word: { wordId: "00000000-0000-4000-8000-000000000999", gloss: "kedi", saved: true, spanId: "00000000-0000-4000-8000-000000000998", contextSentence: "A cat sat." } },
      { text: " sat." },
    ]];
    const onPressWord = jest.fn();
    await render(<PassageTextPage passage={passage} height={800} width={400} onPressWord={onPressWord} onNext={() => {}} />);

    const word = screen.getByRole("button", { name: "cat, anlamını göster" });
    expect(word).toHaveStyle({ fontWeight: "700", textDecorationLine: "underline" }); // kayıtlı: yalnız renk değil kalın + alt çizgi
    await fireEvent.press(word);
    expect(onPressWord).toHaveBeenCalledWith(expect.objectContaining({ displayText: "cat", gloss: "kedi", saved: true, sentence: "A cat sat." }));
    expect(screen.queryByRole("button", { name: /sat/ })).toBeNull(); // düz metin run'ı düğme değil
  });
});
