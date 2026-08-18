import { describe, expect, it } from "vitest";
import { parseAuthCredentials } from "./credentials";

describe("parseAuthCredentials", () => {
  it("accepts a valid email and password", () => {
    expect(
      parseAuthCredentials({
        email: " judge@blacksage.test ",
        password: "secret12",
      }),
    ).toEqual({
      ok: true,
      email: "judge@blacksage.test",
      password: "secret12",
    });
  });

  it("rejects missing email", () => {
    expect(parseAuthCredentials({ password: "secret12" })).toEqual({
      ok: false,
      error: "Email is required",
    });
  });

  it("rejects invalid email", () => {
    expect(
      parseAuthCredentials({ email: "not-an-email", password: "secret12" }),
    ).toEqual({
      ok: false,
      error: "Enter a valid email address",
    });
  });

  it("rejects short passwords", () => {
    expect(
      parseAuthCredentials({ email: "a@b.co", password: "12345" }),
    ).toEqual({
      ok: false,
      error: "Password must be at least 6 characters",
    });
  });
});
