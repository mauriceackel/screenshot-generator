export type AnnotationType = 'yolo' | 'raw';

export interface Annotation {
  zIndex: number;
  class: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
