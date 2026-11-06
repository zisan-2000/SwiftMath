declare module "heic-decode" {
  interface Image {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  interface PendingImage {
    width: number;
    height: number;
    decode(): Promise<Image>;
  }
  interface Images extends Array<PendingImage> {
    dispose(): void;
  }
  const decode: {
    (input: { buffer: Uint8Array }): Promise<Image>;
    all(input: { buffer: Uint8Array }): Promise<Images>;
  };
  export default decode;
}
