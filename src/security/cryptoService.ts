import forge from "node-forge";

const IV_LENGTH_BYTES = 16;

export type EncryptedBlob = {
  iv: string;
  encryptedPayload: string;
};

const hashToHex = (value: string): string => {
  const digest = forge.md.sha256.create();
  digest.update(value, "utf8");
  return digest.digest().toHex();
};

export class CryptoService {
  deriveSessionKey(input: {
    pairingToken: string;
    sessionNonce: string;
  }): string {
    const base = `${input.pairingToken}${input.sessionNonce}`;
    return hashToHex(base);
  }

  encryptJson(payload: unknown, sessionKeyHex: string): EncryptedBlob {
    const jsonPayload = JSON.stringify(payload);
    const keyBytes = forge.util.hexToBytes(sessionKeyHex);
    const ivBytes = forge.random.getBytesSync(IV_LENGTH_BYTES);
    const cipher = forge.cipher.createCipher("AES-CBC", keyBytes);

    cipher.start({ iv: ivBytes });
    cipher.update(forge.util.createBuffer(jsonPayload, "utf8"));
    const success = cipher.finish();

    if (!success) {
      throw new Error("Failed to encrypt payload.");
    }

    return {
      iv: forge.util.encode64(ivBytes),
      encryptedPayload: forge.util.encode64(cipher.output.bytes()),
    };
  }

  decryptJson<T>(blob: EncryptedBlob, sessionKeyHex: string): T {
    const keyBytes = forge.util.hexToBytes(sessionKeyHex);
    const ivBytes = forge.util.decode64(blob.iv);
    const encryptedBytes = forge.util.decode64(blob.encryptedPayload);
    const decipher = forge.cipher.createDecipher("AES-CBC", keyBytes);

    decipher.start({ iv: ivBytes });
    decipher.update(forge.util.createBuffer(encryptedBytes));
    const success = decipher.finish();

    if (!success) {
      throw new Error("Failed to decrypt payload.");
    }

    const rawJson = decipher.output.bytes();
    return JSON.parse(rawJson) as T;
  }
}

export const cryptoService = new CryptoService();
