const POLYLINE_PRECISION = 100_000;
const POLYLINE_ASCII_OFFSET = 63;
const POLYLINE_CHUNK_BASE = 32;
const POLYLINE_CHUNK_MASK = 0x1f;
const POLYLINE_CONTINUATION_BIT = 0x20;

interface DecodedPolylineValue {
  readonly value: number;
  readonly nextIndex: number;
}

function encodePolylineDelta(delta: number): string {
  let value = delta < 0 ? -delta * 2 - 1 : delta * 2;
  let encoded = "";

  while (value >= POLYLINE_CHUNK_BASE) {
    const chunk = (value % POLYLINE_CHUNK_BASE) | POLYLINE_CONTINUATION_BIT;
    encoded += String.fromCharCode(chunk + POLYLINE_ASCII_OFFSET);
    value = Math.floor(value / POLYLINE_CHUNK_BASE);
  }

  return encoded + String.fromCharCode(value + POLYLINE_ASCII_OFFSET);
}

function decodePolylineValue(polyline: string, startIndex: number): DecodedPolylineValue {
  let value = 0;
  let factor = 1;
  let index = startIndex;

  // Google specifies the valid encoding but not malformed-input errors. Vegas fails closed instead
  // of returning coordinates decoded from truncated or out-of-range chunks.
  while (true) {
    if (index >= polyline.length) {
      throw new RangeError("Invalid encoded polyline.");
    }

    const chunk = polyline.charCodeAt(index) - POLYLINE_ASCII_OFFSET;

    if (chunk < 0 || chunk > 0x3f) {
      throw new RangeError("Invalid encoded polyline.");
    }

    value += (chunk & POLYLINE_CHUNK_MASK) * factor;

    if (!Number.isSafeInteger(value)) {
      throw new RangeError("Invalid encoded polyline.");
    }

    index += 1;

    if ((chunk & POLYLINE_CONTINUATION_BIT) === 0) {
      break;
    }

    factor *= POLYLINE_CHUNK_BASE;

    if (!Number.isSafeInteger(factor)) {
      throw new RangeError("Invalid encoded polyline.");
    }
  }

  return {
    value: value % 2 === 0 ? value / 2 : -(Math.floor(value / 2) + 1),
    nextIndex: index,
  };
}

function scaleCoordinate(value: number): number {
  const scaled = Math.round(value * POLYLINE_PRECISION);

  if (!Number.isFinite(value) || !Number.isSafeInteger(scaled)) {
    throw new RangeError("Polyline points must contain finite latitude/longitude pairs.");
  }

  return scaled;
}

// https://developers.google.com/apps-script/reference/maps/maps
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export class Maps {
  decodePolyline(polyline: string): number[] {
    const points: number[] = [];
    let latitude = 0;
    let longitude = 0;
    let index = 0;

    while (index < polyline.length) {
      const latitudeDelta = decodePolylineValue(polyline, index);
      const longitudeDelta = decodePolylineValue(polyline, latitudeDelta.nextIndex);

      latitude += latitudeDelta.value;
      longitude += longitudeDelta.value;
      points.push(latitude / POLYLINE_PRECISION, longitude / POLYLINE_PRECISION);
      index = longitudeDelta.nextIndex;
    }

    return points;
  }

  encodePolyline(points: number[]): string {
    // Google specifies latitude/longitude pairs but does not define malformed-input behavior.
    // Vegas rejects incomplete or non-finite pairs instead of emitting an invalid polyline.
    if (points.length % 2 !== 0) {
      throw new RangeError("Polyline points must contain latitude/longitude pairs.");
    }

    let encoded = "";
    let latitude = 0;
    let longitude = 0;

    for (let index = 0; index < points.length; index += 2) {
      const nextLatitude = scaleCoordinate(points[index]);
      const nextLongitude = scaleCoordinate(points[index + 1]);

      encoded += encodePolylineDelta(nextLatitude - latitude);
      encoded += encodePolylineDelta(nextLongitude - longitude);
      latitude = nextLatitude;
      longitude = nextLongitude;
    }

    return encoded;
  }
}

export function createMaps(): Maps {
  return new Maps();
}
