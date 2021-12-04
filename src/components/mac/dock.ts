import fs from 'fs';
import { CanvasRenderingContext2D, Image, loadImage } from 'skia-canvas';
import { RESOURCE_PATH } from '../../config';
import { MacClasses } from '../../models/classes';
import { Dimensions, Point, Rectangle } from '../../models/geometry';
import { DrawConfig, DrawJob } from '../../models/jobs';
import { Orientation } from '../../models/orientation';
import { COLOR_DOCK, COLOR_DOCK_BORDER, COLOR_ACTIVITY, BLUR_OFFSET, BLUR_SIZE } from '../../theme/mac';
import { Appearance } from '../../models/appearance';
import { Z_IDX_DOCK } from '../../models/zindex';
import { drawRoundedRect } from '../../utils/draw';
import { getRandomElement, getRandomElements, randomBetween, randomIntBetween, trueWithProbability } from '../../utils/random';
import Component from '../component';

const MIN_MARGIN_X = 150;
const MIN_MARGIN_Y = 60;
const MIN_APP_COUNT = 5;
const MAX_APP_COUNT = 20;
const MIN_SIZE = 0.25;
const MAX_SIZE = 1;
const ICON_MARGIN = 10;
const BORDER_RADIUS = 6;

export const dockOrientations: Orientation[] = ['left', 'right', 'bottom'];

declare module '../../models/jobs' {
  export interface DrawConfig {
    dock?: {
      appearance: Appearance;
      boundingBox: Rectangle;
      orientation: Orientation;
      appCount: number;
      appIcons: {
        image: Image;
        boundingBox: Rectangle;
        activityLocation: Point;
        isActive: boolean;
      }[];
    };
  }
}

export default class Dock extends Component {
  private appIcons: Image[];
  private orientation?: Orientation;
  private appearance?: Appearance;
  private size?: number;
  private appCount?: number;

  constructor(orientation?: Orientation, appearance?: Appearance, size?: number, appCount?: number) {
    super();

    this.appIcons = [];

    this.orientation = orientation;
    this.appearance = appearance;
    this.size = size;
    this.appCount = appCount;
  }

  private getDockBoundingBox(orientation: Orientation, size: number, appCount: number, screenDimensions: Dimensions): Rectangle {
    // The dock's a max height (if on bottom) or max width (when on on the side)
    const maxShortSide = (128 + 5 + 10) * size;

    let width: number, height: number, offsetLeft: number, offsetTop: number;
    switch (orientation) {
      case 'left':
        {
          // Define dock region
          width = maxShortSide;
          height = width * appCount;

          if (height > screenDimensions.height - MIN_MARGIN_Y) {
            // Height would be too large, we need to resize including the width
            height = screenDimensions.height - MIN_MARGIN_Y;
            width = Math.min(maxShortSide, height / appCount);
          }

          offsetTop = screenDimensions.height / 2.0 - height / 2.0;
          offsetLeft = 0;
        }
        break;
      case 'right':
        {
          // Define dock region
          width = maxShortSide;
          height = width * appCount;

          if (height > screenDimensions.height - MIN_MARGIN_Y) {
            // Height would be too large, we need to resize including the height
            height = screenDimensions.height - MIN_MARGIN_Y;
            width = Math.min(maxShortSide, height / appCount);
          }

          offsetTop = screenDimensions.height / 2.0 - height / 2.0;
          offsetLeft = screenDimensions.width - width;
        }
        break;
      case 'bottom':
        {
          // Define dock region
          height = maxShortSide;
          width = height * appCount;

          if (width > screenDimensions.width - MIN_MARGIN_X) {
            // Width would be too large, we need to resize including the height
            width = screenDimensions.width - MIN_MARGIN_X;
            height = Math.min(maxShortSide, width / appCount);
          }

          offsetLeft = screenDimensions.width / 2.0 - width / 2.0;
          offsetTop = screenDimensions.height - height;
        }
        break;
      default:
        throw new Error('Invalid orientation for dock');
    }

    return { x: offsetLeft, y: offsetTop, width, height };
  }

  private drawDock(ctx: CanvasRenderingContext2D, orientation: Orientation, appearance: Appearance, boundingBox: Rectangle) {
    ctx.save();

    switch (orientation) {
      case 'left':
        {
          drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, 0, BORDER_RADIUS, BORDER_RADIUS, 0);
        }
        break;
      case 'right':
        {
          drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, BORDER_RADIUS, 0, 0, BORDER_RADIUS);
        }
        break;
      case 'bottom':
        {
          drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, BORDER_RADIUS, BORDER_RADIUS, 0, 0);
        }
        break;
      default:
        throw new Error('Invalid orientation for dock');
    }

    // Draw border
    ctx.strokeStyle = COLOR_DOCK_BORDER[appearance];
    ctx.stroke();
    // Make blurry
    ctx.clip();
    ctx.filter = `blur(${BLUR_SIZE}px)`;
    ctx.drawImage(
      ctx.canvas,
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height,
      boundingBox.x - BLUR_OFFSET,
      boundingBox.y - BLUR_OFFSET,
      boundingBox.width + 2 * BLUR_OFFSET,
      boundingBox.height + 2 * BLUR_OFFSET,
    );
    ctx.filter = 'none';
    // Set color
    ctx.fillStyle = COLOR_DOCK[appearance];
    ctx.fill();

    ctx.restore();
  }

  private getIconPositions(orientation: Orientation, appCount: number, dockBoundingBox: Rectangle): { iconLocation: Point; activityLocation: Point; iconSize: number }[] {
    const longSide = orientation == 'bottom' ? dockBoundingBox.width : dockBoundingBox.height;
    const shortSide = orientation == 'bottom' ? dockBoundingBox.height : dockBoundingBox.width;
    const fullIconSize = longSide / appCount;
    const centeringOffset = (longSide % appCount) / 2;
    const iconSize = fullIconSize - 2 * ICON_MARGIN;

    const positions: { iconLocation: Point; activityLocation: Point; iconSize: number }[] = [];
    switch (orientation) {
      case 'left':
        {
          for (let i = 0; i < appCount; i++) {
            const offsetLeft = shortSide - iconSize - ICON_MARGIN / 2;
            const offsetTop = centeringOffset + i * fullIconSize + ICON_MARGIN;
            const activityLeft = ICON_MARGIN / 2 + 2;
            const activityTop = offsetTop + iconSize / 2;
            positions.push({
              iconLocation: { x: dockBoundingBox.x + offsetLeft, y: dockBoundingBox.y + offsetTop },
              iconSize,
              activityLocation: { x: dockBoundingBox.x + activityLeft, y: dockBoundingBox.y + activityTop },
            });
          }
        }
        break;
      case 'right':
        {
          for (let i = 0; i < appCount; i++) {
            const offsetLeft = ICON_MARGIN / 2;
            const offsetTop = centeringOffset + i * fullIconSize + ICON_MARGIN;
            const activityLeft = shortSide - ICON_MARGIN / 2 - 2;
            const activityTop = offsetTop + iconSize / 2;
            positions.push({
              iconLocation: { x: dockBoundingBox.x + offsetLeft, y: dockBoundingBox.y + offsetTop },
              iconSize,
              activityLocation: { x: dockBoundingBox.x + activityLeft, y: dockBoundingBox.y + activityTop },
            });
          }
        }
        break;
      case 'bottom':
        {
          for (let i = 0; i < appCount; i++) {
            const offsetLeft = centeringOffset + i * fullIconSize + ICON_MARGIN;
            const offsetTop = ICON_MARGIN / 2;
            const activityLeft = offsetLeft + iconSize / 2;
            const activityTop = shortSide - ICON_MARGIN / 2 - 2;
            positions.push({
              iconLocation: { x: dockBoundingBox.x + offsetLeft, y: dockBoundingBox.y + offsetTop },
              iconSize,
              activityLocation: { x: dockBoundingBox.x + activityLeft, y: dockBoundingBox.y + activityTop },
            });
          }
        }
        break;
    }

    return positions;
  }

  public override async loadResources(): Promise<void> {
    const path = `${RESOURCE_PATH}/mac/appicons`;
    const files = fs.readdirSync(path);

    const promises: Promise<any>[] = [];
    for (const file of files) {
      promises.push(loadImage(`${path}/${file}`).then((image) => this.appIcons.push(image)));
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  public setAppearance(appearance?: Appearance) {
    this.appearance = appearance;
  }

  public setOrientation(orientation?: Orientation) {
    this.orientation = orientation;
  }

  public setSize(size?: number) {
    if (size && (size < MIN_SIZE || size > MAX_SIZE)) return;
    this.size = size;
  }

  public setAppCount(appCount?: number) {
    if (appCount && (appCount < MIN_APP_COUNT || appCount > MAX_APP_COUNT)) return;
    this.appCount = appCount;
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.dock) throw new Error('Bad config');

    const ctx = config.ctx;

    // Place dock
    this.drawDock(ctx, config.dock.orientation, config.dock.appearance, config.dock.boundingBox);

    // Draw the app icons
    for (const appIcon of config.dock.appIcons) {
      ctx.drawImage(appIcon.image, appIcon.boundingBox.x, appIcon.boundingBox.y, appIcon.boundingBox.width, appIcon.boundingBox.height);

      if (appIcon.isActive) {
        ctx.fillStyle = COLOR_ACTIVITY[config.dock.appearance];
        ctx.beginPath();
        ctx.ellipse(appIcon.activityLocation.x, appIcon.activityLocation.y, 3, 3, 0, Math.PI * 2, 0);
        ctx.fill();
      }
    }
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('Screen undefined');

    // Get values
    const orientation: Orientation = this.orientation ?? getRandomElement(dockOrientations);
    const size = this.size ?? randomBetween(MIN_SIZE, MAX_SIZE);
    const appCount = this.appCount ?? randomIntBetween(MIN_APP_COUNT, MAX_APP_COUNT);

    // Prepare dock
    const dockBoundingBox = this.getDockBoundingBox(orientation, size, appCount, config.screen.dimensions);

    // Prepare app icons
    const iconInfo = this.getIconPositions(orientation, appCount, dockBoundingBox);
    const appIconImages = getRandomElements(this.appIcons, appCount);
    const appIcons = iconInfo.map((info, i) => {
      const { iconLocation, iconSize: targetSize, activityLocation } = info;
      const appIcon = appIconImages[i];

      // Configure
      const scaleFactor = Math.min(appIcon.width / targetSize, appIcon.height / targetSize);
      const scaledWidth = appIcon.width / scaleFactor;
      const scaledHeight = appIcon.height / scaleFactor;
      const iconX = iconLocation.x + (targetSize - scaledWidth) / 2;
      const iconY = iconLocation.y + (targetSize - scaledHeight) / 2;

      return {
        image: appIcon,
        boundingBox: { x: iconX, y: iconY, width: scaledWidth, height: scaledHeight },
        activityLocation,
        isActive: trueWithProbability(0.1), // Randomly draw activity dots (10%)
      };
    });

    config.dock = {
      appearance: this.appearance ?? config.screen.appearance,
      orientation: orientation,
      boundingBox: dockBoundingBox,
      appCount,
      appIcons,
    };

    config.annotations.push({ zIndex: Z_IDX_DOCK, class: MacClasses.DOCK, ...dockBoundingBox });

    // Add job and all child jobs
    return [{ zIndex: Z_IDX_DOCK, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
