/**
 * Type declarations for @abasb75/openjpeg based on actual decode() output.
 *
 * Example (redacted):
 * {
 *   "frameInfo":{"width":378,"height":472,"bitsPerSample":8,"componentCount":1,"isSigned":false},
 *   "decodedBuffer":"<redacted>",
 *   "colorSpace":2,
 *   "maxDecodeLevel":5,
 *   "maxDecodeLayer":1,
 *   "imageOffset":{"x":0,"y":0},
 *   "numberOfDecompositions":5,
 *   "blockDimensions":{"width":64,"height":64},
 *   "progressionOrder":0,
 *   "isReversible":true,
 *   "tileSize":{"width":378,"height":472},
 *   "tileOffset":{"x":0,"y":0},
 *   "resolutionAtLevel":{"width":378,"height":472}
 * }
 */

declare module "@abasb75/openjpeg" {
  export interface J2KFrameInfo {
    width: number;
    height: number;
    bitsPerSample: number;
    componentCount: number;
    isSigned: boolean;
  }

  export interface J2KSize {
    width: number;
    height: number;
  }

  export interface J2KPoint {
    x: number;
    y: number;
  }

  export interface Jpeg2000Decoded {
    frameInfo: J2KFrameInfo;

    /**
     * Decoded pixel buffer.
     * Some builds may expose this as a Uint8Array, others as a base64/hex string.
     * When componentCount=1 and colorSpace indicates grayscale, this buffer contains 8-bit samples.
     */
    decodedBuffer: Uint8Array | string;

    colorSpace: number;
    maxDecodeLevel: number;
    maxDecodeLayer: number;

    imageOffset: J2KPoint;
    numberOfDecompositions: number;
    blockDimensions: J2KSize;
    progressionOrder: number;
    isReversible: boolean;

    tileSize: J2KSize;
    tileOffset: J2KPoint;
    resolutionAtLevel: J2KSize;
  }

  /**
   * Decode JPEG2000 (J2K/JP2) bytes into a structured result.
   * Returns metadata and a decodedBuffer containing the pixel data.
   */
  export function decode(input: ArrayBuffer): Promise<Jpeg2000Decoded>;
}