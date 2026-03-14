import { defineInputs } from "./defineInputs";

export default defineInputs({
  // https://developers.google.com/apps-script/reference/utilities/utilities
  utilities: {
    // https://www.rfc-editor.org/info/rfc4648
    //  > 10. Test Vectors
    base64: {
      decode: [
        "",
        "Zg==",
        "Zm8=",
        "Zm9v",
        "Zm9vYg==",
        "Zm9vYmE=",
        "Zm9vYmFy",
        "QSBzdHJpbmcgaGVyZQ==",
        "R29vZ2xlIOOCsOODq-ODvOODlw==",
      ],
      encode: ["", "f", "fo", "foo", "foob", "fooba", "foobar", "A string here", "Google グループ"],
    },
    digest: {
      // https://www.rfc-editor.org/info/rfc1319
      //  > A.5 Test suite
      md2: [
        "",
        "a",
        "abc",
        "message digest",
        "abcdefghijklmnopqrstuvwxyz",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      ],
      // https://www.rfc-editor.org/info/rfc1321
      //  > A.5 Test suite
      md5: [
        "",
        "a",
        "abc",
        "message digest",
        "abcdefghijklmnopqrstuvwxyz",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
        "input to hash",
      ],
    },
    hmac: {
      // https://www.rfc-editor.org/rfc/rfc2202.txt
      //  > 2. Test Cases for HMAC-MD5
      md5: [
        {
          key: new Int8Array(Buffer.from("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "hex")),
          data: "Hi There",
        },
        {
          key: "Jefe",
          data: "what do ya want for nothing?",
        },
        {
          key: new Int8Array(Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex")),
          data: new Int8Array(
            Buffer.from(
              "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from("0102030405060708090a0b0c0d0e0f10111213141516171819", "hex"),
          ),
          data: new Int8Array(
            Buffer.from(
              "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(Buffer.from("0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", "hex")),
          data: "Test With Truncation",
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: "Test Using Larger Than Block-Size Key - Hash Key First",
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: "Test Using Larger Than Block-Size Key and Larger Than One Block-Size Data",
        },
      ],
      // https://www.rfc-editor.org/rfc/rfc2202.txt
      //  > 2. Test Cases for HMAC-MD5
      sha1: [
        {
          key: new Int8Array(Buffer.from("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "hex")),
          data: "Hi There",
        },
        {
          key: "Jefe",
          data: "what do ya want for nothing?",
        },
        {
          key: new Int8Array(Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex")),
          data: new Int8Array(
            Buffer.from("dddddddddddddddddddddddddddddddddddddddddddddddddd", "hex"),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from("0102030405060708090a0b0c0d0e0f10111213141516171819", "hex"),
          ),
          data: new Int8Array(
            Buffer.from("cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd", "hex"),
          ),
        },
        {
          key: new Int8Array(Buffer.from("0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", "hex")),
          data: "Test With Truncation",
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: "Test Using Larger Than Block-Size Key - Hash Key First",
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: "Test Using Larger Than Block-Size Key and Larger Than One Block-Size Data",
        },
      ],
      // https://www.rfc-editor.org/info/rfc4231
      //  > 4. Test Vectors
      sha256: [
        {
          key: new Int8Array(Buffer.from("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "hex")),
          data: new Int8Array(Buffer.from("4869205468657265", "hex")),
        },
        {
          key: new Int8Array(Buffer.from("4a656665", "hex")),
          data: new Int8Array(
            Buffer.from("7768617420646f2079612077616e7420666f72206e6f7468696e673f", "hex"),
          ),
        },
        {
          key: new Int8Array(Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex")),
          data: new Int8Array(
            Buffer.from(
              "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from("0102030405060708090a0b0c0d0e0f10111213141516171819", "hex"),
          ),
          data: new Int8Array(
            Buffer.from(
              "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(Buffer.from("0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", "hex")),
          data: new Int8Array(Buffer.from("546573742057697468205472756e636174696f6e", "hex")),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b6579202d2048617368204b6579204669727374",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "5468697320697320612074657374207573696e672061206c6172676572207468616e20626c6f636b2d73697a65206b657920616e642061206c6172676572207468616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565647320746f20626520686173686564206265666f7265206265696e6720757365642062792074686520484d414320616c676f726974686d2e",
              "hex",
            ),
          ),
        },
      ],
      // https://www.rfc-editor.org/info/rfc4231
      //  > 4. Test Vectors
      sha384: [
        {
          key: new Int8Array(Buffer.from("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "hex")),
          data: new Int8Array(Buffer.from("4869205468657265", "hex")),
        },
        {
          key: new Int8Array(Buffer.from("4a656665", "hex")),
          data: new Int8Array(
            Buffer.from("7768617420646f2079612077616e7420666f72206e6f7468696e673f", "hex"),
          ),
        },
        {
          key: new Int8Array(Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex")),
          data: new Int8Array(
            Buffer.from(
              "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from("0102030405060708090a0b0c0d0e0f10111213141516171819", "hex"),
          ),
          data: new Int8Array(
            Buffer.from(
              "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(Buffer.from("0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", "hex")),
          data: new Int8Array(Buffer.from("546573742057697468205472756e636174696f6e", "hex")),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b6579202d2048617368204b6579204669727374",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "5468697320697320612074657374207573696e672061206c6172676572207468616e20626c6f636b2d73697a65206b657920616e642061206c6172676572207468616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565647320746f20626520686173686564206265666f7265206265696e6720757365642062792074686520484d414320616c676f726974686d2e",
              "hex",
            ),
          ),
        },
      ],
      // https://www.rfc-editor.org/info/rfc4231
      //  > 4. Test Vectors
      sha512: [
        {
          key: new Int8Array(Buffer.from("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", "hex")),
          data: new Int8Array(Buffer.from("4869205468657265", "hex")),
        },
        {
          key: new Int8Array(Buffer.from("4a656665", "hex")),
          data: new Int8Array(
            Buffer.from("7768617420646f2079612077616e7420666f72206e6f7468696e673f", "hex"),
          ),
        },
        {
          key: new Int8Array(Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex")),
          data: new Int8Array(
            Buffer.from(
              "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from("0102030405060708090a0b0c0d0e0f10111213141516171819", "hex"),
          ),
          data: new Int8Array(
            Buffer.from(
              "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(Buffer.from("0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", "hex")),
          data: new Int8Array(Buffer.from("546573742057697468205472756e636174696f6e", "hex")),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b6579202d2048617368204b6579204669727374",
              "hex",
            ),
          ),
        },
        {
          key: new Int8Array(
            Buffer.from(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "hex",
            ),
          ),
          data: new Int8Array(
            Buffer.from(
              "5468697320697320612074657374207573696e672061206c6172676572207468616e20626c6f636b2d73697a65206b657920616e642061206c6172676572207468616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565647320746f20626520686173686564206265666f7265206265696e6720757365642062792074686520484d414320616c676f726974686d2e",
              "hex",
            ),
          ),
        },
      ],
    },
    // https://www.rfc-editor.org/info/rfc8017
    rsa: {
      sha1: [
        {
          key: "this is my input",
          data: "YOUR_PRIVATE_KEY",
        },
      ],
      sha256: [
        {
          key: "this is my input",
          data: "YOUR_PRIVATE_KEY",
        },
      ],
    },
    format: {
      date: {},
      string: {},
    },
    gzip: [new Int8Array(Buffer.from("Some text to compress using gzip compression"))],
  },
});
