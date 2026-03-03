interface UtilitiesInput {
  base64: {
    decode: string[];
    encode: string[];
  };
  digest: {
    md2: string[];
    md5: string[];
  };
  hmac: {
    md5: { key: string | Int8Array; data: string | Int8Array }[];
    sha1: { key: string | Int8Array; data: string | Int8Array }[];
    sha256: { key: string | Int8Array; data: string | Int8Array }[];
    sha384: { key: string | Int8Array; data: string | Int8Array }[];
    sha512: { key: string | Int8Array; data: string | Int8Array }[];
  };
  rsa: {
    sha1: { key: string; data: string }[];
    sha256: { key: string; data: string }[];
  };
  format: {
    date: {};
    string: {};
  };
  // skip UUID
  gzip: Int8Array[];
  // blob: any;
  // parse: any;
  // zip: any;
}

interface TestInput {
  utilities: UtilitiesInput;
}

export function defineInputs(input: TestInput): TestInput {
  return input;
}
