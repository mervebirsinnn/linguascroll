import { fireEvent, render } from "@testing-library/react-native";
import type { TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { SubtitleOverlay } from "./SubtitleOverlay";

/**
 * Bu testler SADECE JS tarafını doğrular (gloss'lu kelimenin tıklanabilir olduğu,
 * doğru argümanlarla callback'i çağırdığı, gloss'suz kelimenin tıklanamadığı,
 * kürate kelimenin eski yolunu koruduğu). Gerçek cihazda iç içe Text'in dokunma
 * alanının yeterli olup olmadığı (küçük kelimelere parmakla isabet) Jest ile
 * DOĞRULANAMAZ — cihaz kontrolü gerekir.
 */
const segment: TranscriptSegment = {
  id: "00000000-0000-4000-8000-000000000001",
  ordinal: 1,
  startMs: 0,
  endMs: 2000,
  text: "I went home, ok?",
  englishExplanation: "e",
  turkishExplanation: "t",
  learningPoints: [],
};

const vocabularyItem: VideoVocabularyItem = {
  word: { id: "00000000-0000-4000-8000-0000000000aa", language: "en", lemma: "home", gloss: "ev" },
  saved: false,
};

describe("SubtitleOverlay — tıklanabilir kelimeler", () => {
  it("anlamı olan kelimeye dokununca onPressGloss(kelime, anlam) çağrılır; cümle onPress'i ÇAĞRILMAZ", async () => {
    const onPress = jest.fn();
    const onPressGloss = jest.fn();
    const result = await render(
      <SubtitleOverlay segment={segment} onPress={onPress} vocabulary={[]} onPressWord={jest.fn()} glosses={{ went: "gitti", i: "ben" }} onPressGloss={onPressGloss} />,
    );

    await fireEvent.press(result.getByText("went"));

    expect(onPressGloss).toHaveBeenCalledWith("went", "gitti");
    expect(onPress).not.toHaveBeenCalled();
  });

  it("anlamı olmayan kelime tıklanabilir değildir (onPressGloss çağrılmaz)", async () => {
    const onPressGloss = jest.fn();
    const result = await render(
      <SubtitleOverlay segment={segment} onPress={jest.fn()} vocabulary={[]} onPressWord={jest.fn()} glosses={{ went: "gitti" }} onPressGloss={onPressGloss} />,
    );

    // "home" gloss haritasında yok → ayrı bir Text değil, düz metnin parçası.
    expect(result.queryByText("home")).toBeNull();
    expect(onPressGloss).not.toHaveBeenCalled();
  });

  it("glosses verilmezse hiçbir kelime ayrı tıklanabilir olmaz (eski davranış)", async () => {
    const result = await render(
      <SubtitleOverlay segment={segment} onPress={jest.fn()} vocabulary={[]} onPressWord={jest.fn()} onPressGloss={jest.fn()} />,
    );
    expect(result.queryByText("went")).toBeNull();
    expect(result.getByText("I went home, ok?")).toBeTruthy();
  });

  it("kürate vocabulary kelimesi onPressWord yolunu korur, onPressGloss'u çağırmaz", async () => {
    const onPressWord = jest.fn();
    const onPressGloss = jest.fn();
    const result = await render(
      <SubtitleOverlay segment={segment} onPress={jest.fn()} vocabulary={[vocabularyItem]} onPressWord={onPressWord} glosses={{ home: "ev", went: "gitti" }} onPressGloss={onPressGloss} />,
    );

    await fireEvent.press(result.getByText("home"));

    expect(onPressWord).toHaveBeenCalledWith(vocabularyItem, segment);
    expect(onPressGloss).not.toHaveBeenCalled();
  });

  it("segment null ise hiçbir şey render etmez", async () => {
    const result = await render(
      <SubtitleOverlay segment={null} onPress={jest.fn()} vocabulary={[]} onPressWord={jest.fn()} onPressGloss={jest.fn()} />,
    );
    expect(result.toJSON()).toBeNull();
  });
});
