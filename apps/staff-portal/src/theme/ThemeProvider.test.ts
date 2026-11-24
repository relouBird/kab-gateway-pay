import { resolveTheme } from "./ThemeProvider";

describe("resolveTheme", () => {
  it("uses a saved preference before the operating system theme", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("uses the operating system theme when there is no saved preference", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});
