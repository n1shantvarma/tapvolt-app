declare module "node-forge" {
  type ByteBuffer = {
    bytes(): string;
    toHex(): string;
  };

  type MessageDigest = {
    update(data: string, encoding?: "utf8"): void;
    digest(): ByteBuffer;
  };

  type Cipher = {
    start(options: { iv: string }): void;
    update(buffer: ByteBuffer): void;
    finish(): boolean;
    output: ByteBuffer;
  };

  type ForgeStatic = {
    md: {
      sha256: {
        create(): MessageDigest;
      };
    };
    random: {
      getBytesSync(count: number): string;
    };
    util: {
      createBuffer(data: string, encoding?: "utf8"): ByteBuffer;
      hexToBytes(hex: string): string;
      encode64(data: string): string;
      decode64(data: string): string;
    };
    cipher: {
      createCipher(algorithm: "AES-CBC", key: string): Cipher;
      createDecipher(algorithm: "AES-CBC", key: string): Cipher;
    };
  };

  const forge: ForgeStatic;
  export default forge;
}
