import { CanvasRenderingContext2D, Image } from 'skia-canvas';

export function drawScaledH(ctx: CanvasRenderingContext2D, image: Image, height: number, x: number, y: number, alignment: 'right' | 'left' | 'center' = 'left'): number {
  const scaledWidth = (height / image.height) * image.width;

  switch(alignment) {
    case 'left': {
      ctx.drawImage(image, x, y, scaledWidth, height);
    }; break;
    case 'right': {
      ctx.drawImage(image, x - scaledWidth, y, scaledWidth, height);
    }; break;
    case 'center': {
      ctx.drawImage(image, x - (scaledWidth / 2), y, scaledWidth, height);
    }; break;
  }

  return scaledWidth;
}
