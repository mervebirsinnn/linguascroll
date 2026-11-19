import { parseSaveWordResponse } from "./save-word";

jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

/** 2026-11-17 — PUT /words/:id/saved cevabı: yeni API created taşır; eski API boş gövde; bozuk gövde kaydı bozmaz. */
describe("parseSaveWordResponse", () => {
  it.each([
    ['{"created":true}', { created: true }],
    ['{"created":false}', { created: false }],
    ["", {}],
    ["   ", {}],
    ["{bozuk", {}],
    ['{"created":"evet"}', {}],
    ["{}", {}],
  ])("%p → %p", (text, expected) => {
    expect(parseSaveWordResponse(text)).toEqual(expected);
  });
});
