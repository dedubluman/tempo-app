/**
 * NFC Payment URL Writer — Progressive Enhancement for POS.
 * Uses Web NFC API (NDEFReader) when available.
 * Gated behind FeatureFlag.NFC_PAYMENT.
 */

export function isNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

interface NfcWriteOptions {
  paymentUrl: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

/**
 * Write a payment URL to an NFC tag.
 * The tag will contain a NDEF URL record identical to the QR code URL.
 * Returns an AbortController to cancel the write operation.
 */
export function writeNfcPaymentUrl(options: NfcWriteOptions): AbortController | null {
  if (!isNfcSupported()) {
    options.onError(new Error("Web NFC not supported on this device"));
    return null;
  }

  const controller = new AbortController();

  (async () => {
    try {
      // NDEFReader is only available in secure contexts on Android Chrome
      const NDEFReaderClass = (window as unknown as { NDEFReader: new () => NDEFReader }).NDEFReader;
      const reader = new NDEFReaderClass();
      await reader.write(
        {
          records: [
            {
              recordType: "url",
              data: options.paymentUrl,
            } as NDEFRecordInit,
          ],
        },
        { signal: controller.signal },
      );
      options.onSuccess();
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  })();

  return controller;
}

// Type augmentation for Web NFC API (not in standard lib.dom.d.ts)
interface NDEFReader {
  write(message: NDEFMessageInit, options?: { signal?: AbortSignal }): Promise<void>;
}

interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

interface NDEFRecordInit {
  recordType: string;
  data?: string | BufferSource;
}
