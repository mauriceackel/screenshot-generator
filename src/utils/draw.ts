import { CanvasGradient, CanvasRenderingContext2D } from 'skia-canvas';

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  topRightRadius: number = radius,
  bottomRightRadius: number = radius,
  bottomLeftRadius: number = radius,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.lineTo(x + width - radius - topRightRadius, y);
  ctx.arcTo(x + width, y, x + width, y + topRightRadius, topRightRadius);
  ctx.lineTo(x + width, y + height - topRightRadius - bottomRightRadius);
  ctx.arcTo(x + width, y + height, x + width - bottomRightRadius, y + height, bottomRightRadius);
  ctx.lineTo(x + bottomLeftRadius, y + height);
  ctx.arcTo(x, y + height, x, y - bottomLeftRadius, bottomLeftRadius);
  ctx.lineTo(x, y + radius);
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, shadowWidth: number, top = true, bottom = true, right = true, left = true) {
  const startColor = '#00000000';
  const endColor = '#00000040';

  let gradient: CanvasGradient;

  // Top
  if (top) {
    gradient = ctx.createLinearGradient(x + width / 2, y - shadowWidth, x + width / 2, y);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y - shadowWidth, width, shadowWidth);
  }
  // Left
  if (left) {
    gradient = ctx.createLinearGradient(x - shadowWidth, y + height / 2, x, y + height / 2);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - shadowWidth, y, shadowWidth, height);
  }
  // Bottom
  if (bottom) {
    gradient = ctx.createLinearGradient(x + width / 2, y + height + shadowWidth, x + width / 2, y + height);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + height, width, shadowWidth);
  }
  // Right
  if (right) {
    gradient = ctx.createLinearGradient(x + width + shadowWidth, y + height / 2, x + width, y + height / 2);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + width, y, shadowWidth, height);
  }
  // Lop-Left
  if (top && left) {
    gradient = ctx.createRadialGradient(x, y, 0, x, y, shadowWidth);
    gradient.addColorStop(1, startColor);
    gradient.addColorStop(0, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - shadowWidth, y - shadowWidth, shadowWidth, shadowWidth);
  }
  // Bottom-Left
  if (bottom && left) {
    gradient = ctx.createRadialGradient(x, y + height, 0, x, y + height, shadowWidth);
    gradient.addColorStop(0, endColor);
    gradient.addColorStop(1, startColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - shadowWidth, y + height, shadowWidth, shadowWidth);
  }
  // Bottom-Right
  if (bottom && right) {
    gradient = ctx.createRadialGradient(x + width, y + height, 0, x + width, y + height, shadowWidth);
    gradient.addColorStop(0, endColor);
    gradient.addColorStop(1, startColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + width, y + height, shadowWidth, shadowWidth);
  }
  // Top-Right
  if (top && right) {
    gradient = ctx.createRadialGradient(x + width, y, 0, x + width, y, shadowWidth);
    gradient.addColorStop(0, endColor);
    gradient.addColorStop(1, startColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + width, y - shadowWidth, shadowWidth, shadowWidth);
  }
}

export function drawChromeTab(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const lineHeight = height - 2 * radius;
  const lineWidth = width;
  const offsetLeft = x - radius;

  ctx.beginPath();
  ctx.moveTo(offsetLeft, y);
  ctx.arcTo(offsetLeft + radius, y, offsetLeft + radius, y - radius, radius);
  ctx.lineTo(offsetLeft + radius, y - radius - lineHeight);
  ctx.arcTo(offsetLeft + radius, y - 2 * radius - lineHeight, offsetLeft + 2 * radius, y - 2 * radius - lineHeight, radius);
  ctx.lineTo(offsetLeft + lineWidth, y - 2 * radius - lineHeight);
  ctx.arcTo(offsetLeft + lineWidth + radius, y - 2 * radius - lineHeight, offsetLeft + lineWidth + radius, y - radius - lineHeight, radius);
  ctx.lineTo(offsetLeft + radius + lineWidth, y - radius);
  ctx.arcTo(offsetLeft + radius + lineWidth, y, offsetLeft + 2 * radius + lineWidth, y, radius);
  ctx.closePath();
}

export function drawChromeArrow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, direction: 'left' | 'right') {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);

  if (direction === 'left') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + height / 2, y - height / 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x + height / 2, y + height / 2);
  } else if (direction === 'right') {
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width - height / 2, y - height / 2);
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width - height / 2, y + height / 2);
  }
}

export function drawChromeRefreshArrow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius, Math.PI / 4, 0, (Math.PI * 3) / 2);

  let lastX = x + radius;
  let lastY = y;

  ctx.moveTo(lastX, lastY);
  ctx.lineTo(lastX + 2, lastY - 5);
  ctx.lineTo(lastX - 5, lastY - 2);
  ctx.closePath();
}

export function drawSafariArrow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, direction: 'left' | 'right') {
  ctx.beginPath();    
  if (direction === 'left') {
    ctx.moveTo(x + width * 2 / 3, y + height / 4);
    ctx.lineTo(x + width / 3, y + height / 2);
    ctx.lineTo(x + width * 2/ 3, y + height * 3 / 4);
  } else if (direction === 'right') {
    ctx.moveTo(x + width / 3, y + height / 4);
    ctx.lineTo(x + width * 2 / 3, y + height / 2);
    ctx.lineTo(x + width / 3, y + height * 3 / 4);
  }
}
