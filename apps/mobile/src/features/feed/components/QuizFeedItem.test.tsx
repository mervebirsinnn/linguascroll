import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { FeedQuiz } from "@linguascroll/shared-types";
import { getOptionStatus, QuizFeedItem } from "./QuizFeedItem";
import { answerQuiz } from "../api/answer-quiz";

jest.mock("../api/answer-quiz", () => ({ answerQuiz: jest.fn() }));

const answerQuizMock = answerQuiz as jest.MockedFunction<typeof answerQuiz>;

const OPTION_A = "11111111-1111-4111-8111-111111111111";
const OPTION_B = "22222222-2222-4222-8222-222222222222";
const OPTION_C = "33333333-3333-4333-8333-333333333333";

const quiz: FeedQuiz = {
  id: "99999999-9999-4999-8999-999999999999",
  question: "Videodaki cut ne demek?",
  options: [
    { id: OPTION_A, text: "Kesmek" },
    { id: OPTION_B, text: "Pişirmek" },
    { id: OPTION_C, text: "Yıkamak" },
  ],
};

let view: Awaited<ReturnType<typeof render>>;

async function renderQuiz() {
  view = await render(<QuizFeedItem quiz={quiz} height={800} width={400} userId="user-1" />);
}

beforeEach(() => {
  answerQuizMock.mockReset();
});

describe("getOptionStatus", () => {
  it("cevap gelmeden sadece basılan seçenek 'selected', diğerleri 'idle'", () => {
    expect(getOptionStatus({ optionId: OPTION_A, selectedOptionId: OPTION_A, result: null })).toBe("selected");
    expect(getOptionStatus({ optionId: OPTION_B, selectedOptionId: OPTION_A, result: null })).toBe("idle");
  });

  it("cevap gelince doğru seçenek 'correct', yanlış seçim 'wrong', geri kalanlar 'dimmed'", () => {
    const result = { correct: false, correctOptionId: OPTION_A };
    expect(getOptionStatus({ optionId: OPTION_A, selectedOptionId: OPTION_B, result })).toBe("correct");
    expect(getOptionStatus({ optionId: OPTION_B, selectedOptionId: OPTION_B, result })).toBe("wrong");
    expect(getOptionStatus({ optionId: OPTION_C, selectedOptionId: OPTION_B, result })).toBe("dimmed");
  });

  it("doğru cevapta seçilen seçenek 'correct' olur (asla 'wrong' değil)", () => {
    const result = { correct: true, correctOptionId: OPTION_A };
    expect(getOptionStatus({ optionId: OPTION_A, selectedOptionId: OPTION_A, result })).toBe("correct");
  });
});

describe("QuizFeedItem", () => {
  it("soruyu ve harf rozetli seçenekleri gösterir", async () => {
    await renderQuiz();

    expect(view.getByText("Videodaki cut ne demek?")).toBeTruthy();
    expect(view.getByText("Kesmek")).toBeTruthy();
    expect(view.getByText("A")).toBeTruthy();
    expect(view.getByText("C")).toBeTruthy();
  });

  it("doğru cevapta ✓ ve olumlu geri bildirim gösterir", async () => {
    answerQuizMock.mockResolvedValue({ correct: true, correctOptionId: OPTION_A });
    await renderQuiz();

    await fireEvent.press(view.getByLabelText("A: Kesmek"));

    await waitFor(() => expect(view.getByText("✓")).toBeTruthy());
    expect(view.getByText(/Süper/)).toBeTruthy();
    expect(answerQuizMock).toHaveBeenCalledWith(quiz.id, OPTION_A);
  });

  it("yanlış cevapta seçimi ✕, doğru cevabı ✓ olarak işaretler (renk tek başına anlam taşımaz)", async () => {
    answerQuizMock.mockResolvedValue({ correct: false, correctOptionId: OPTION_A });
    await renderQuiz();

    await fireEvent.press(view.getByLabelText("B: Pişirmek"));

    await waitFor(() => expect(view.getByText("✕")).toBeTruthy());
    expect(view.getByText("✓")).toBeTruthy();
    expect(view.getByLabelText("A: Kesmek, doğru")).toBeTruthy();
    expect(view.getByLabelText("B: Pişirmek, yanlış")).toBeTruthy();
    expect(view.getByText(/Az kalmıştı/)).toBeTruthy();
  });

  it("cevaplandıktan sonra tekrar basmak ikinci bir istek göndermez", async () => {
    answerQuizMock.mockResolvedValue({ correct: true, correctOptionId: OPTION_A });
    await renderQuiz();

    await fireEvent.press(view.getByLabelText("A: Kesmek"));
    await waitFor(() => expect(view.getByText("✓")).toBeTruthy());
    await fireEvent.press(view.getByText("Pişirmek"));

    expect(answerQuizMock).toHaveBeenCalledTimes(1);
  });

  it("hata olursa seçimi korur, mesaj gösterir ve 'Tekrar dene' AYNI seçimle yeniden dener", async () => {
    answerQuizMock.mockRejectedValueOnce(new Error("network"));
    answerQuizMock.mockResolvedValueOnce({ correct: true, correctOptionId: OPTION_B });
    await renderQuiz();

    await fireEvent.press(view.getByLabelText("B: Pişirmek"));
    await waitFor(() => expect(view.getByText(/Bağlantı koptu/)).toBeTruthy());

    await act(async () => {
      await fireEvent.press(view.getByText("Tekrar dene"));
    });

    await waitFor(() => expect(view.getByText("✓")).toBeTruthy());
    expect(answerQuizMock).toHaveBeenCalledTimes(2);
    expect(answerQuizMock).toHaveBeenNthCalledWith(2, quiz.id, OPTION_B);
  });
});
