import { describe, expect, it } from "vitest";
import { InvalidPhoneNumberError, normalizePhoneNumber } from "./phone";

describe("normalizePhoneNumber", () => {
  it("normalizes an already-clean E.164 number", () => {
    expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
  });

  it("normalizes numbers with dashes", () => {
    expect(normalizePhoneNumber("+1-415-555-2671")).toBe("+14155552671");
  });

  it("normalizes numbers with spaces", () => {
    expect(normalizePhoneNumber("+1 415 555 2671")).toBe("+14155552671");
  });

  it("normalizes numbers with parentheses", () => {
    expect(normalizePhoneNumber("+1 (415) 555-2671")).toBe("+14155552671");
  });

  it("normalizes a local format when given the country", () => {
    expect(normalizePhoneNumber("(415) 555-2671", "US")).toBe("+14155552671");
  });

  it("normalizes a UK number with punctuation and no leading 0, given GB", () => {
    expect(normalizePhoneNumber("(44784) 196-6039", "GB")).toBe("+447841966039");
  });

  it("normalizes a UK number missing its '+' but with the '44' country code, given GB", () => {
    expect(normalizePhoneNumber("447841966039", "GB")).toBe("+447841966039");
  });

  it("normalizes a UK national number with its leading 0, given GB", () => {
    expect(normalizePhoneNumber("07841966039", "GB")).toBe("+447841966039");
  });

  it("normalizes a UK national number with the leading 0 stripped (Excel numeric-cell case), given GB", () => {
    expect(normalizePhoneNumber("7841966039", "GB")).toBe("+447841966039");
  });

  it("normalizes an ambiguous 10-digit number as UK national format, given GB", () => {
    expect(normalizePhoneNumber("7537 149707", "GB")).toBe("+447537149707");
  });

  it("still rejects a too-short number even with GB given", () => {
    expect(() => normalizePhoneNumber("12345", "GB")).toThrow(InvalidPhoneNumberError);
  });

  it("still rejects non-numeric garbage even with GB given", () => {
    expect(() => normalizePhoneNumber("not a phone number", "GB")).toThrow(InvalidPhoneNumberError);
  });

  it("normalizes a different country's number", () => {
    expect(normalizePhoneNumber("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("normalizes the leading 00 international prefix (interpreted against a default country's IDD exit code)", () => {
    expect(normalizePhoneNumber("0044 20 7946 0958", "FR")).toBe("+442079460958");
  });

  it("rejects a local format with no default country to interpret it against", () => {
    expect(() => normalizePhoneNumber("415-555-2671")).toThrow(InvalidPhoneNumberError);
  });

  it("rejects an empty string", () => {
    expect(() => normalizePhoneNumber("")).toThrow(InvalidPhoneNumberError);
  });

  it("rejects a string with no digits", () => {
    expect(() => normalizePhoneNumber("not a phone number")).toThrow(InvalidPhoneNumberError);
  });

  it("rejects a too-short number", () => {
    expect(() => normalizePhoneNumber("+1234")).toThrow(InvalidPhoneNumberError);
  });

  it("rejects a number with invalid digit patterns for its country", () => {
    // Valid length for a US number, but not a real US number (invalid area code).
    expect(() => normalizePhoneNumber("+11115551234")).toThrow(InvalidPhoneNumberError);
  });

  it("never returns a malformed string instead of throwing", () => {
    try {
      normalizePhoneNumber("garbage");
      expect.unreachable("expected normalizePhoneNumber to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidPhoneNumberError);
    }
  });
});
