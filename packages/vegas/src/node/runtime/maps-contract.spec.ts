import { describe, expect, test } from "vitest";

import { createMaps, Maps } from "./index";

const DOCUMENTED_POINTS = [38.5, -120.2, 40.7, -120.95, 43.252, -126.453] as const;
const DOCUMENTED_POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

// Public contracts:
// https://developers.google.com/apps-script/reference/maps/maps
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm
describe("Maps polyline public contracts", () => {
  test("encode and decode the documented encoded polyline format", () => {
    const maps = createMaps();

    expect(maps).toBeInstanceOf(Maps);
    expect(maps.encodePolyline([...DOCUMENTED_POINTS])).toBe(DOCUMENTED_POLYLINE);
    expect(maps.decodePolyline(DOCUMENTED_POLYLINE)).toStrictEqual([...DOCUMENTED_POINTS]);
  });

  test("round coordinates to encoded polyline precision", () => {
    const maps = createMaps();
    const encoded = maps.encodePolyline([1.234567, 2.345678]);

    expect(maps.decodePolyline(encoded)).toStrictEqual([1.23457, 2.34568]);
  });

  test("reject malformed local polyline input", () => {
    const maps = createMaps();

    expect(() => maps.encodePolyline([1])).toThrow(
      "Polyline points must contain latitude/longitude pairs.",
    );
    expect(() => maps.encodePolyline([Number.NaN, 1])).toThrow(
      "Polyline points must contain finite latitude/longitude pairs.",
    );
    expect(() => maps.decodePolyline("?")).toThrow("Invalid encoded polyline.");
  });
});
