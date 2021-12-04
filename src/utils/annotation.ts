import { Annotation } from '../models/annotation';
import { Rectangle } from '../models/geometry';

function intersect(a: Rectangle, b: Rectangle): boolean {
  // Intersection if not no intersection
  return !(
    (
      a.x >= b.x + b.width || // a to the right of b
      a.x + a.width <= b.x || // a to the left of b
      a.y >= b.y + b.height || // a below b
      a.y + a.height <= b.y
    ) // a above b
  );
}

// Splits rectangle a into smaller rectangles based on location of b. Assumes rectangles overlap
function splitRectangle(a: Rectangle, b: Rectangle): Rectangle[] {
  const newRectangles: Rectangle[] = [];

  const slicePointsX: number[] = [a.x];
  // Left edge of b
  if (b.x < a.x + a.width && b.x > a.x) {
    slicePointsX.push(b.x);
  }
  // Right edge of b
  if (b.x + b.width < a.x + a.width && b.x + b.width > a.x) {
    slicePointsX.push(b.x + b.width);
  }
  slicePointsX.push(a.x + a.width);

  const slicePointsY: number[] = [a.y];
  // Top edge of b
  if (b.y < a.y + a.height && b.y > a.y) {
    slicePointsY.push(b.y);
  }
  // Bottom edge of b
  if (b.y + b.height < a.y + a.height && b.y + b.height > a.y) {
    slicePointsY.push(b.y + b.height);
  }
  slicePointsY.push(a.y + a.height);

  // Early return if rect b completely occludes a
  if (slicePointsX.length === 2 && slicePointsY.length === 2) {
    return [];
  }

  // Generate new rectangles
  for (let i = 1; i < slicePointsX.length; i++) {
    for (let j = 1; j < slicePointsY.length; j++) {
      // Ignore rectangles that are very small
      if (slicePointsX[i] - slicePointsX[i - 1] < 2 || slicePointsY[j] - slicePointsY[j - 1] < 2) continue;

      const newRect: Rectangle = {
        x: slicePointsX[i - 1],
        y: slicePointsY[j - 1],
        width: slicePointsX[i] - slicePointsX[i - 1],
        height: slicePointsY[j] - slicePointsY[j - 1],
      };
      
      // Ignore rectangles that overlap b
      if (intersect(newRect, b)) continue;

      newRectangles.push(newRect);
    }
  }

  return newRectangles;
}

function removeOccluded(annotations: Annotation[]): Annotation[] {
  return annotations.filter((annotation) => {
    const intersectingHigherLevelAnnotations = annotations.filter((other) => {
      // Exclude all annotation on the same or lower level
      if (other.zIndex <= annotation.zIndex) return false;

      return intersect(annotation, other);
    });

    // Check if annotation is fully occluded by all intersecting higher-level annotations
    const rectanglesToCheck: Rectangle[] = [{ x: annotation.x, y: annotation.y, width: annotation.width, height: annotation.height }];

    for (const intersectingAnnotation of intersectingHigherLevelAnnotations) {
      const newRectangles: Rectangle[] = [];
      for (let i = 0; i < rectanglesToCheck.length; i++) {
        const checkRect = rectanglesToCheck[i];
        if (intersect(intersectingAnnotation, checkRect)) {
          newRectangles.push(...splitRectangle(checkRect, intersectingAnnotation));
          rectanglesToCheck.splice(i, 1);
          i--;
        }
      }
      rectanglesToCheck.push(...newRectangles);
    }

    // Keep if we still have some non-occluded part
    return rectanglesToCheck.length > 0; // TODO: Maybe check if the remaining rectangles area is > epsilon
  });
}

function clipAnnotation(annotations: Annotation[], totalWidth: number, totalHeight: number): Annotation[] {
  return annotations.map((annotation) => {
    // Clipping
    const xMin = Math.min(Math.max(annotation.x, 0), totalWidth);
    const yMin = Math.min(Math.max(annotation.y, 0), totalHeight);
    const xMax = Math.max(Math.min(totalWidth, annotation.x + annotation.width), 0);
    const yMax = Math.max(Math.min(totalHeight, annotation.y + annotation.height), 0);

    return {
      ...annotation,
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax- yMin,
    };
  });
}

export function cleanAnnotations(annotations: Annotation[], totalWidth: number, totalHeight: number): Annotation[] {
  const clipped = clipAnnotation(annotations, totalWidth, totalHeight);
  const cleaned = removeOccluded(clipped);

  return cleaned;
}

export function toYolo(annotations: Annotation[], totalWidth: number, totalHeight: number): string {
  let result: string = '';

  for (const annotation of annotations) {
    // Conversion
    const x = (annotation.x + annotation.width / 2) / totalWidth; // Get center and normalize
    const y = (annotation.y + annotation.height / 2) / totalHeight;
    const width = annotation.width / totalWidth; // Normalize
    const height = annotation.height / totalHeight;

    result += `${annotation.class} ${x} ${y} ${width} ${height}\n`;
  }

  return result;
}
