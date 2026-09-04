import { expect, test } from "vitest";

import { Utilities } from "./Utilities";

const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAN47s5YcpJF2Vvzu
b3mVdwoVf5wwTsNg+1gA0UGlb8al7dpW183VmlxjwC0sZJNtddC5q8COOfDvOqhY
fjKj+I7ePZ83wMGAwX3FaDrsUm0lJmuqCtfLBl4p/xdlEO8XdGxepnSWX50htHdw
QYDxevSQGfrmrjE1VTzMPGZTdUCpAgMBAAECgYEAuObzhPJP+rd7qPa5yW+Sm9FH
W6zV27nVZmNHuFbtqVpljES1SY1v4W8ddnh5NjDc1c2mGZA8pTpmk6sNVRUYuDkA
8aOQkaEcREj5Luape7Eoso1e+Z6syzzIKO4yQS8FNHXcoVOGHoUoMmhpsYzm1G9w
vPl8NZgcVdl+M7DWgAECQQD3lTC2q7RNo0t4k5uo/b0UpeRJM2kXVycjuynQiuN8
5pZoj2kZSPcoOy169LOyC8Nwy5cem9gyi0TWe3tjP9kRAkEA5cniUGVT4JLnTvIb
NRgh0TuNvBoalNsv6yHMRfk0Asl2b2ZCjIcW5elnU4P3W5BjMjYkyQFM5Y8pSOO1
1bguGQJBAMCqYNZGmHEyejDC7Yd8rf+7eQNd9pIrSFIN/GRFMPKpnrKPp4H9vhiY
tLPSaWRMszK7vEYdkQkER/WA8mwx64ECQANZNMYNI/LC0UISPxk/98Yvwvn5u2dt
5j3b6Tkfz4U24FXxPIkFsuy4wPuzkZgw+3EQ3upa7X7u3iAkyVKK84kCQQDXdQCd
3A2j3jTbMgr5JGs8qx8OI+vDP7iIlV3ps0YQ4jQ/ZG5Np+Pcx/QLOleoqeQUdP+j
WDYYWeQKiijlJ14h
-----END PRIVATE KEY-----`;

function toBase64(utilities: Utilities, value: GoogleAppsScript.Byte[]) {
  return utilities.base64Encode(value);
}

test("computeHmacSignature() preserves characterized GAS charset semantics", () => {
  const utilities = new Utilities();

  const value = "café";
  const key = "clé";

  const defaultSignature = utilities.computeHmacSignature(
    utilities.MacAlgorithm.HMAC_SHA_256,
    value,
    key,
  );

  const usAsciiSignature = utilities.computeHmacSignature(
    utilities.MacAlgorithm.HMAC_SHA_256,
    value,
    key,
    utilities.Charset.US_ASCII,
  );

  const utf8Signature = utilities.computeHmacSignature(
    utilities.MacAlgorithm.HMAC_SHA_256,
    value,
    key,
    utilities.Charset.UTF_8,
  );

  expect(toBase64(utilities, defaultSignature)).toBe(
    "uhmK2ZoGRDZ+iKK2aEs8Q3nyl5fMiB4+z4CRGmDOOf8=",
  );

  expect(usAsciiSignature).toStrictEqual(defaultSignature);

  expect(toBase64(utilities, utf8Signature)).toBe("bp3jhrUVgPPu4SotAab6eDSuma16lJTiR/KLtChLHxM=");

  expect(utilities.computeHmacSha256Signature(value, key)).toStrictEqual(defaultSignature);

  expect(
    utilities.computeHmacSha256Signature(value, key, utilities.Charset.US_ASCII),
  ).toStrictEqual(usAsciiSignature);
});

test("computeRsaSha1Signature() matches the characterized generic RSA SHA-1 signature", () => {
  const utilities = new Utilities();

  const generic = utilities.computeRsaSignature(
    utilities.RsaAlgorithm.RSA_SHA_1,
    "café",
    RSA_PRIVATE_KEY,
  );

  const shortcut = utilities.computeRsaSha1Signature("café", RSA_PRIVATE_KEY);

  expect(generic).toHaveLength(128);

  expect(shortcut).toStrictEqual(generic);

  expect(toBase64(utilities, generic)).toBe(
    "B9RxPr4DAzkXcNJDYkZX1sFgLAsBfI7RJb7Sm5c4em+zpKLm/SOXVrpbLreaqn9BRIUZySHpvXy1TucP7uMLHgUDLulyANq/se+5KihiTpIfDUMoLhc88IM4WJYtjNY+BmOIrYqYrtt/BPFHHL9rVrQJgiVUvvfvYlqA7z0pDlQ=",
  );
});

test("computeRsaSha256Signature() preserves characterized GAS charset semantics", () => {
  const utilities = new Utilities();

  const defaultSignature = utilities.computeRsaSignature(
    utilities.RsaAlgorithm.RSA_SHA_256,
    "café",
    RSA_PRIVATE_KEY,
  );

  const usAsciiSignature = utilities.computeRsaSignature(
    utilities.RsaAlgorithm.RSA_SHA_256,
    "café",
    RSA_PRIVATE_KEY,
    utilities.Charset.US_ASCII,
  );

  const utf8Signature = utilities.computeRsaSignature(
    utilities.RsaAlgorithm.RSA_SHA_256,
    "café",
    RSA_PRIVATE_KEY,
    utilities.Charset.UTF_8,
  );

  expect(defaultSignature).toHaveLength(128);

  expect(usAsciiSignature).toStrictEqual(defaultSignature);

  expect(toBase64(utilities, defaultSignature)).toBe(
    "Zr4B7B9kUROGls2NpK5i1shdBY7Qgq2Plcg/iByy+q6pFZDdDWqGs0Ebjdxjngy1gjlipuBNmaoNbwXTp5PH0tyjqjS0J4V3XnK2wsVIgEvEM7njeXvCJESfon79xOd0/wen19RK+NvsJHI3T9zUgh9pnpU5h3w/VsswNHk1OkE=",
  );

  expect(toBase64(utilities, utf8Signature)).toBe(
    "K6Qvjc/L2L2KjaZc/m6HO1qSlHICLmd2goqxItKKC0rdXH/xn+NIH/Y8RFnrdK04b5KosFOxiJuDhMgugFUoBODx85b4Sd5V0EesweocJBHUQHD6bGReMIOWM1ckZ5D1Cm/3oaqwJOtyTHPSQjJknkk5jaPXBDk1cMWFcuohlXU=",
  );

  expect(utilities.computeRsaSha256Signature("café", RSA_PRIVATE_KEY)).toStrictEqual(
    defaultSignature,
  );

  expect(
    utilities.computeRsaSha256Signature("café", RSA_PRIVATE_KEY, utilities.Charset.US_ASCII),
  ).toStrictEqual(usAsciiSignature);
});
