import { describe, expect, it } from "vitest";

import { contactNumberSearchToken, parseContactNumber } from "@/lib/contact-number";

describe("contact number", () => {
  it("accepts an optional number and removes common separators", () => {
    expect(parseContactNumber(" 01712-345 678 ")).toEqual({
      ok: true,
      value: "01712345678",
    });
    expect(parseContactNumber("+880 (1712) 345678")).toEqual({
      ok: true,
      value: "+8801712345678",
    });
    expect(parseContactNumber("  ")).toEqual({ ok: true, value: null });
  });

  it("rejects invalid or implausible values", () => {
    expect(parseContactNumber("call-me").ok).toBe(false);
    expect(parseContactNumber("123").ok).toBe(false);
  });

  it("builds a digits-only search token", () => {
    expect(contactNumberSearchToken("01712-345 678")).toBe("01712345678");
  });
});
