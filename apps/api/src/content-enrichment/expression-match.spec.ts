import { expressionAppearsInText } from "./expression-match";

/**
 * expression-match.ts SADECE yüzey-biçim varlığını kontrol eder (anlamsal eşdeğerlik iddiası yok);
 * bu spec hem tolere edilen çekim/notation farklarını hem de matcher'ın bilerek EŞLEŞTİRMEDİĞİ
 * durumları (token sınırı, sıra, araya girme, aşırı suffix soyma, kısa kök, benzer-yazılışlı farklı
 * kelimeler) sabitler.
 */
describe("expressionAppearsInText — tolere edilen yüzey farkları", () => {
  it.each([
    ["take aback", "We were simply taken aback."],
    ["do the heavy lifting", "The void does the heavy lifting, the artist withholds."],
    ["hear out", "Then show us the plan and we'll hear you out."],
    ["hear someone out", "Then show us the plan and we'll hear you out."],
    ["be good at + V-ing", "I am not good at talking."],
    ["should have + past participle", "You should have taken the back roads instead."],
    ["double-edged sword", "Is remote work a double -edged sword? Undoubtedly."],
    ["apply for", "I want to apply for a job at the bakery."],
    ["end up + V-ing", "He ended up staying there."],
    ["go", "They went to the market."],
    ["black ice", "Black ice is practically invisible."],
  ])('"%s" ↔ "%s" eşleşir', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(true);
  });

  it("boş ifadeyi bayraklamaz", () => {
    expect(expressionAppearsInText("   ", "anything")).toBe(true);
  });
});

describe("expressionAppearsInText — bilerek eşleşmeyenler (negative)", () => {
  it.each([
    ["art", "He started the engine."], // alt-dize token sınırını aşmaz
    ["hear out", "She shear outlets nearby."],
    ["go", "The goat is very good."],
    ["be", "The beds fell."],
  ])('token sınırı: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it.each([
    ["take aback", "Aback we were taken by it."],
    ["hear out", "Out you hear them."],
    ["black ice", "The ice was black."],
  ])('yanlış kelime sırası: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it.each([
    ["hear out", "We hear the loud music out there."], // iki alakasız ara kelime
    ["hear someone out", "We hear the loud music out there."],
    ["black ice", "The black and ice road."], // 'and' dolgu listesinde yok
    ["take aback", "We take the cake aback."],
  ])('alakasız ara kelime: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it.each([
    ["ne", "We need help."], // need → "ne" olmamalı
    ["th", "That thing is big."],
    ["br", "She will bring tea."],
    ["se", "They seed the field."],
  ])('aşırı suffix soyma: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it.each([
    ["up", "He was upset."],
    ["at", "That cat sat."],
    ["us", "We used it."],
  ])('kısa token/kök: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it.each([
    ["complement", "It was a nice compliment."],
    ["affect", "It had a great effect."],
    ["adapt", "Please adopt the plan."],
    ["principle", "The principal agreed."],
    ["accept", "Everyone except him came."],
    ["loose", "Don't lose it."],
  ])('benzer yazılışlı farklı lemma: "%s" ↔ "%s" eşleşmez', (expression, text) => {
    expect(expressionAppearsInText(expression, text)).toBe(false);
  });

  it("notation yalnızca '+' sonrası atılır: placeholder olmadan ifade kelimeleri hâlâ gerekir", () => {
    expect(expressionAppearsInText("should have + past participle", "You have taken the back roads.")).toBe(false);
  });
});
