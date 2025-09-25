export class MathService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  add(x: number, y: number) {
    return x + y;
  }
}

export const mathService = new MathService();
