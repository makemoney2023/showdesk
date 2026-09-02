import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_SESSION_MAX_AGE_SECONDS,
  demoSessionCookieOptions,
} from "./demo-cookie";

const originalNodeEnv = process.env.NODE_ENV;

function requestWithProto(proto?: string) {
  const headers = new Headers();
  if (proto) headers.set("x-forwarded-proto", proto);
  return new Request("http://localhost/api/auth/login", { headers });
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("demoSessionCookieOptions", () => {
  it("keeps httpOnly, sameSite lax, and path /", () => {
    process.env.NODE_ENV = "development";
    const options = demoSessionCookieOptions(requestWithProto("http"));
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets secure when x-forwarded-proto is https", () => {
    process.env.NODE_ENV = "development";
    const options = demoSessionCookieOptions(requestWithProto("https"));
    expect(options.secure).toBe(true);
  });

  it("sets secure when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    const options = demoSessionCookieOptions(requestWithProto("http"));
    expect(options.secure).toBe(true);
  });

  it("leaves secure false on local http outside production", () => {
    process.env.NODE_ENV = "development";
    const options = demoSessionCookieOptions(requestWithProto("http"));
    expect(options.secure).toBe(false);
  });

  it("outlives a show weekend instead of dying with the browser session", () => {
    const options = demoSessionCookieOptions(requestWithProto("https"));
    expect(options.maxAge).toBe(DEMO_SESSION_MAX_AGE_SECONDS);
    expect(DEMO_SESSION_MAX_AGE_SECONDS).toBeGreaterThanOrEqual(
      3 * 24 * 60 * 60,
    );
  });
});
