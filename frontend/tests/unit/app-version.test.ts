/** Historical restore/edit suggestions move forward without occupying another immutable snapshot. */
import { expect, it } from "vitest";
import { nextAppVersion } from "../../src/admin/developer/app-version";
it("copies an old version after the latest and archived versions", () => {
  expect(nextAppVersion("0.1.0", ["0.1.1", "0.2.0", "0.2.3"])).toBe("0.2.4");
  expect(nextAppVersion("1.9.9", ["2.0.0", "1.99.99"])).toBe("2.0.1");
});
it("handles prereleases and large semantic-version numbers without float rounding", () => {
  expect(nextAppVersion("1.0.0-beta.2", ["1.0.0+build"])).toBe("1.0.1");
  expect(nextAppVersion("9007199254740993.0.0", [])).toBe(
    "9007199254740993.0.1",
  );
});
