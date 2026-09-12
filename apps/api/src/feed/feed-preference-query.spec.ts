import { parseFeedPreferenceQuery } from "./feed-preference-query";

describe("parseFeedPreferenceQuery", () => {
  it("level ve topics verilmediğinde güvenli varsayımı döner", () => {
    expect(parseFeedPreferenceQuery(undefined, undefined)).toEqual({ level: null, topics: [] });
  });

  it("geçerli bir level'ı parse eder", () => {
    expect(parseFeedPreferenceQuery("B1", undefined)).toEqual({ level: "B1", topics: [] });
  });

  it("geçersiz bir level'ı REDDETMEZ — sessizce null'a düşer", () => {
    expect(parseFeedPreferenceQuery("Z9", undefined)).toEqual({ level: null, topics: [] });
  });

  it("virgülle ayrılmış geçerli topic'leri parse eder", () => {
    expect(parseFeedPreferenceQuery(undefined, "travel,dating")).toEqual({ level: null, topics: ["travel", "dating"] });
  });

  it("boşluklu topic listesini trim eder", () => {
    expect(parseFeedPreferenceQuery(undefined, " travel , dating ")).toEqual({ level: null, topics: ["travel", "dating"] });
  });

  it("geçersiz bir topic'i SESSİZCE eler, geçerli olanları korur — TÜM isteği reddetmez", () => {
    expect(parseFeedPreferenceQuery(undefined, "travel,not-a-real-topic,dating")).toEqual({
      level: null,
      topics: ["travel", "dating"],
    });
  });

  it("boş string topics'i boş dizi olarak ele alır", () => {
    expect(parseFeedPreferenceQuery(undefined, "")).toEqual({ level: null, topics: [] });
  });

  it("hem level hem topics birlikte doğru parse edilir", () => {
    expect(parseFeedPreferenceQuery("A2", "humor,career")).toEqual({ level: "A2", topics: ["humor", "career"] });
  });
});
