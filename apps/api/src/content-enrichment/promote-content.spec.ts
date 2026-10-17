import { parsePromoteArgs } from "./promote-content";
import { PublishPipelineError } from "./publish-content";

describe("parsePromoteArgs", () => {
  it("varsayılan: ack yok, note yok, overwrite yok", () => {
    expect(parsePromoteArgs(["--content-id", "demo"])).toEqual({ contentId: "demo", acknowledgeNeedsReview: false, note: null, overwrite: false, mediaFile: null });
  });

  it("ack + note + overwrite açıkça verilebilir", () => {
    expect(parsePromoteArgs(["--content-id", "demo", "--acknowledge-needs-review", "--note", "false positive", "--overwrite"])).toEqual({
      contentId: "demo",
      acknowledgeNeedsReview: true,
      note: "false positive",
      overwrite: true,
      mediaFile: null,
    });
  });

  it("--media-file açık medya eşlemesini taşır; değersiz olamaz", () => {
    expect(parsePromoteArgs(["--content-id", "demo", "--media-file", "clip.mp4"]).mediaFile).toBe("clip.mp4");
    expect(() => parsePromoteArgs(["--content-id", "demo", "--media-file"])).toThrow(PublishPipelineError);
    expect(() => parsePromoteArgs(["--content-id", "demo", "--media-file", "--overwrite"])).toThrow(PublishPipelineError);
  });

  it("--content-id zorunlu; toplu/bilinmeyen argüman (ör. --all) reddedilir; --note değersiz olamaz", () => {
    expect(() => parsePromoteArgs([])).toThrow(PublishPipelineError);
    expect(() => parsePromoteArgs(["--all"])).toThrow(PublishPipelineError);
    expect(() => parsePromoteArgs(["--content-id", "demo", "--note"])).toThrow(PublishPipelineError);
    expect(() => parsePromoteArgs(["--content-id", "demo", "--note", "--overwrite"])).toThrow(PublishPipelineError);
  });
});
