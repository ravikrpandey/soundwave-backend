import { describe, expect, it } from "vitest";
import { isAllowedFrontendOrigin } from "./cors";

describe("strict frontend CORS origin matching", () => {
  it("accepts only the configured GitHub Pages origin", () => {
    expect(
      isAllowedFrontendOrigin(
        "https://ravikrpandey.github.io",
        "https://ravikrpandey.github.io/"
      )
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin("https://attacker.example", "https://ravikrpandey.github.io")
    ).toBe(false);
  });
});
