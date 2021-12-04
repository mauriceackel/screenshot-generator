import { Canvas, CanvasRenderingContext2D } from 'skia-canvas';
import { Annotation } from './annotation';

export interface DrawConfig {
  annotations: Annotation[];
  canvas?: Canvas;
  ctx?: CanvasRenderingContext2D;
}

export interface DrawJob {
  zIndex: number;
  drawFunction: (config: DrawConfig) => void;
}
