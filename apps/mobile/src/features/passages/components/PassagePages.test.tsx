import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeAnswer, makeLockedPassage, makeOpenPassage } from "../passages-test-helpers";
import { PassageLockedPage } from "./PassageLockedPage";
import { PassageQuestionPage } from "./PassageQuestionPage";
import { PassageSummaryCard } from "./PassageSummaryCard";
import { PassageTextPage } from "./PassageTextPage";

jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));
jest.setTimeout(60_000);

describe("PassageSummaryCard (skor özeti kartı)", () => {
  it("canlı özet metni ve soru başına durum; hiç cevap yokken hepsi cevaplanmadı", async () => {
    const passage = makeOpenPassage(1);
    await render(<PassageSummaryCard questions={passage.questions} />);

    expect(screen.getByText("0/4")).toBeTruthy();
    expect(screen.getByText("0 doğru · 0 yanlış · 4 cevaplanmadı")).toBeTruthy();
    expect(screen.getAllByText("Cevaplanmadı")).toHaveLength(4);
    expect(screen.getByText(/seviye ölçümü değildir/)).toBeTruthy(); // "öğrenme pratiği" çerçevesi
  });

  it("karışık sonuç: 2 doğru · 1 yanlış · 1 cevaplanmadı", async () => {
    const passage = makeOpenPassage(1);
    const [q1, q2, q3] = passage.questions;
    const questions = [
      { ...q1!, result: makeAnswer(q1!, 0, 0) },
      { ...q2!, result: makeAnswer(q2!, 1, 1) },
      { ...q3!, result: makeAnswer(q3!, 0, 2) },
      passage.questions[3]!,
    ];
    await render(<PassageSummaryCard questions={questions} />);

    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.getByText("2 doğru · 1 yanlış · 1 cevaplanmadı")).toBeTruthy();
    expect(screen.getAllByText("Doğru")).toHaveLength(2);
    expect(screen.getByText("Yanlış")).toBeTruthy();
  });
});

describe("skor özeti 4. sorunun İÇİNDE (metin toplam 5 sayfa; ayrı 6. sayfa yok)", () => {
  const baseProps = (passage: ReturnType<typeof makeOpenPassage>, index: number) => ({
    question: passage.questions[index]!,
    questions: passage.questions,
    index,
    total: passage.questions.length,
    height: 800,
    width: 400,
    selectedOptionId: null,
    eliminated: new Set<string>(),
    pendingOptionId: undefined,
    error: undefined,
    onSelect: () => {},
    onToggleElimination: () => {},
    onCheck: () => {},
    onRecheck: () => {},
    onShowText: () => {},
    onNext: () => {},
  });
  const answered = (passage: ReturnType<typeof makeOpenPassage>, count: number) => ({
    ...passage,
    questions: passage.questions.map((question, i) => (i < count ? { ...question, result: makeAnswer(question, 0, 0) } : question)),
  });

  it("son soruda tüm sorular cevaplanınca özet kartı görünür ve etiket 'Sonraki metin'", async () => {
    const passage = answered(makeOpenPassage(1), 4);
    await render(<PassageQuestionPage {...baseProps(passage, 3)} />);
    expect(screen.getByLabelText("Skor özeti")).toBeTruthy();
    expect(screen.getByText("4/4")).toBeTruthy();
    expect(screen.getByText("Sonraki metin ›")).toBeTruthy();
  });

  it("son soruda ama henüz TÜM sorular cevaplanmadıysa özet görünmez (kısmi skor ekranı yok)", async () => {
    const passage = answered(makeOpenPassage(1), 3);
    await render(<PassageQuestionPage {...baseProps(passage, 3)} />);
    expect(screen.queryByLabelText("Skor özeti")).toBeNull();
    expect(screen.getByText("3 doğru · 0 yanlış · 1 cevaplanmadı")).toBeTruthy(); // canlı özet satırı yine var
  });

  it("son OLMAYAN soruda özet kartı hiç çıkmaz (hepsi cevaplı olsa bile); etiket 'Sonraki soru'", async () => {
    const passage = answered(makeOpenPassage(1), 4);
    await render(<PassageQuestionPage {...baseProps(passage, 1)} />);
    expect(screen.queryByLabelText("Skor özeti")).toBeNull();
    expect(screen.getByText("Sonraki soru ›")).toBeTruthy();
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
