// https://www.rfc-editor.org/info/rfc1319
const PI_SUBST = [
  41, 46, 67, 201, 162, 216, 124, 1, 61, 54, 84, 161, 236, 240, 6, 19, 98, 167, 5, 243, 192, 199,
  115, 140, 152, 147, 43, 217, 188, 76, 130, 202, 30, 155, 87, 60, 253, 212, 224, 22, 103, 66, 111,
  24, 138, 23, 229, 18, 190, 78, 196, 214, 218, 158, 222, 73, 160, 251, 245, 142, 187, 47, 238, 122,
  169, 104, 121, 145, 21, 178, 7, 63, 148, 194, 16, 137, 11, 34, 95, 33, 128, 127, 93, 154, 90, 144,
  50, 39, 53, 62, 204, 231, 191, 247, 151, 3, 255, 25, 48, 179, 72, 165, 181, 209, 215, 94, 146, 42,
  172, 86, 170, 198, 79, 184, 56, 210, 150, 164, 125, 182, 118, 252, 107, 226, 156, 116, 4, 241, 69,
  157, 112, 89, 100, 113, 135, 32, 134, 91, 207, 101, 230, 45, 168, 2, 27, 96, 37, 173, 174, 176,
  185, 246, 28, 70, 97, 105, 52, 64, 126, 15, 85, 71, 163, 35, 221, 81, 175, 58, 195, 92, 249, 206,
  186, 197, 234, 38, 44, 83, 13, 110, 133, 40, 132, 9, 211, 223, 205, 244, 65, 129, 77, 82, 106,
  220, 55, 200, 108, 193, 171, 250, 36, 225, 123, 8, 12, 189, 177, 74, 120, 136, 149, 139, 227, 99,
  232, 109, 233, 203, 213, 254, 59, 0, 29, 57, 242, 239, 183, 14, 102, 88, 208, 228, 166, 119, 114,
  248, 235, 117, 75, 10, 49, 68, 80, 180, 143, 237, 31, 26, 219, 153, 141, 51, 159, 17, 131, 20,
];

const PADDING = [
  "",
  "\x01",
  "\x02\x02",
  "\x03\x03\x03",
  "\x04\x04\x04\x04",
  "\x05\x05\x05\x05\x05",
  "\x06\x06\x06\x06\x06\x06",
  "\x07\x07\x07\x07\x07\x07\x07",
  "\x08\x08\x08\x08\x08\x08\x08\x08",
  "\x09\x09\x09\x09\x09\x09\x09\x09\x09",
  "\x0a\x0a\x0a\x0a\x0a\x0a\x0a\x0a\x0a\x0a",
  "\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b\x0b",
  "\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c\x0c",
  "\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d\x0d",
  "\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e\x0e",
  "\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f\x0f",
  "\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10\x10",
];

export class MD2Hash {
  #state: Uint8Array;
  #checksum: Uint8Array;
  #count: number;
  #buffer: Uint8Array;

  constructor() {
    this.#state = new Uint8Array(16);
    this.#checksum = new Uint8Array(16);
    this.#count = 0;
    this.#buffer = new Uint8Array(16);
  }

  #transform(block: Buffer) {
    const x = new Uint8Array(48);
    for (let i = 0; i < 16; i++) {
      x[i] = this.#state[i];
      x[i + 16] = block[i];
      x[i + 32] = this.#state[i] ^ block[i];
    }

    let t = 0;
    for (let i = 0; i < 18; i++) {
      for (let j = 0; j < 48; j++) {
        x[j] ^= PI_SUBST[t];
        t = x[j];
      }
      t = (t + i) & 0xff;
    }

    for (let i = 0; i < 16; i++) {
      this.#state[i] = x[i];
    }

    t = this.#checksum[15];
    for (let i = 0; i < 16; i++) {
      this.#checksum[i] ^= PI_SUBST[block[i] ^ t];
      t = this.#checksum[i];
    }

    for (let i = 0; i < x.length; i++) {
      x[i] = 0;
    }
  }

  update(data: Buffer): void {
    let index = this.#count;
    this.#count = (index + data.length) & 0x0f;

    const partLen = 16 - index;

    let i = 0;
    if (data.length >= partLen) {
      for (let i = 0; i < partLen; i++) {
        this.#buffer[index + i] = data[i];
      }
      this.#transform(Buffer.from(this.#buffer));

      for (i = partLen; i + 15 < data.length; i += 16) {
        this.#transform(data.subarray(i, i + 16));
      }

      index = 0;
    }

    for (let j = 0; j < data.length - i; j++) {
      this.#buffer[index + j] = data[i + j];
    }
  }

  digest(): Buffer<ArrayBuffer> {
    const padLen = 16 - this.#count;

    this.update(Buffer.from(PADDING[padLen]));
    this.update(Buffer.from(this.#checksum));

    const digest = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      digest[i] = this.#state[i];
    }

    for (let i = 0; i < 16; i++) {
      this.#buffer[i] = 0;
      this.#checksum[i] = 0;
      this.#count = 0;
      this.#state[i] = 0;
    }

    return Buffer.from(digest);
  }
}
