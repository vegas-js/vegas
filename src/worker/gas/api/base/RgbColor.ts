// https://developers.google.com/apps-script/reference/base/rgb-color
export class RgbColor implements GoogleAppsScript.Base.RgbColor {
  #argb: number;

  constructor() {
    this.#argb = 0;
  }

  asHexString = () => {
    return `0x${this.#argb.toString(16)}`;
  };
  getBlue = () => {
    return this.#argb & 0x000000ff;
  };
  getColorType = () => {
    throw new Error("Method not implemented.");
  };
  getGreen = () => {
    return this.#argb & 0x0000ff00;
  };
  getRed = () => {
    return this.#argb & 0x00ff0000;
  };
}
