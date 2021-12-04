import { CanvasRenderingContext2D, Image, loadImage } from 'skia-canvas';
import { MacClasses } from '../../../models/classes';
import { Dimensions, Point, Rectangle } from '../../../models/geometry';
import { DrawConfig, DrawJob } from '../../../models/jobs';
import {
  CLOSE_COLOR,
  COLOR_APP_BORDER,
  HANDLEBAR_COLOR_INACTIVE,
  HANDLEBAR_START_COLOR,
  HANDLEBAR_STOP_COLOR,
  INACTIVE_COLOR,
  MAXIMIZE_COLOR,
  MENUBAR_HEIGHT,
  MINIMIZE_COLOR,
} from '../../../theme/mac';
import { Z_IDX_APP } from '../../../models/zindex';
import { drawRoundedRect, drawShadow } from '../../../utils/draw';
import { getRandomElement, randomBetween, trueWithProbability } from '../../../utils/random';
import Component from '../../component';
import fs from 'fs';
import { RESOURCE_PATH } from '../../../config';
import { Appearance } from '../../../models/appearance';

const BORDER_RADIUS = 4;
const HANDLE_HEIGHT = 30;
const WINDOW_BUTTON_RADIUS = 7;
const SHADOW_WIDTH = 40;
const MAX_OFFSCREEN_PERCENTAGE = 0.25;

declare module '../../../models/jobs' {
  export interface DrawConfig {
    application?: {
      isActive: boolean;
      appearance: Appearance;
      boundingBox: Rectangle;
    };
  }
}

export default class Application extends Component {
  private dimension?: Dimensions;
  private position?: Point;
  private appearance?: Appearance;
  private probability?: number;

  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super();

    this.dimension = dimension;
    this.position = position;
    this.appearance = appearance;
    this.probability = probability;
  }

  private getRandomDimension(minWidth: number, minHeight: number, maxWidth: number, maxHeight: number): Dimensions {
    return { width: randomBetween(minWidth, maxWidth), height: randomBetween(minHeight, maxHeight) };
  }

  private getRandomPosition(minX: number, minY: number, maxX: number, maxY: number): Point {
    return { x: randomBetween(minX, maxX), y: randomBetween(minY, maxY) };
  }

  protected getWindowControlsBoundingBox(x: number, centerY: number): Rectangle {
    return {
      x: x,
      y: centerY - WINDOW_BUTTON_RADIUS / 2,
      width: 9 * WINDOW_BUTTON_RADIUS,
      height: WINDOW_BUTTON_RADIUS,
    };
  }

  protected drawWindowControls(ctx: CanvasRenderingContext2D, appearance: Appearance, x: number, y: number, isActive: boolean): number {
    // Draw window functions
    let offsetLeft = x;
    ctx.beginPath();
    ctx.fillStyle = isActive ? CLOSE_COLOR : INACTIVE_COLOR[appearance];
    ctx.ellipse(offsetLeft, y, WINDOW_BUTTON_RADIUS, WINDOW_BUTTON_RADIUS, 0, 0, 2 * Math.PI);
    offsetLeft += 3 * WINDOW_BUTTON_RADIUS;
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = isActive ? MINIMIZE_COLOR : INACTIVE_COLOR[appearance];
    ctx.ellipse(offsetLeft, y, WINDOW_BUTTON_RADIUS, WINDOW_BUTTON_RADIUS, 0, 0, 2 * Math.PI);
    offsetLeft += 3 * WINDOW_BUTTON_RADIUS;
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = isActive ? MAXIMIZE_COLOR : INACTIVE_COLOR[appearance];
    ctx.ellipse(offsetLeft, y, WINDOW_BUTTON_RADIUS, WINDOW_BUTTON_RADIUS, 0, 0, 2 * Math.PI);
    offsetLeft += 3 * WINDOW_BUTTON_RADIUS;
    ctx.fill();

    return offsetLeft;
  }

  protected drawRawFrame(ctx: CanvasRenderingContext2D, appearance: Appearance, boundingBox: Rectangle) {
    // Draw shadow
    drawShadow(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, SHADOW_WIDTH);

    // Draw border
    ctx.strokeStyle = COLOR_APP_BORDER[appearance];
    drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, BORDER_RADIUS);
    ctx.stroke();
  }

  protected drawGenericFrame(ctx: CanvasRenderingContext2D, appearance: Appearance, boundingBox: Rectangle, isActive: boolean): Rectangle {
    // Draw shadow
    drawShadow(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, SHADOW_WIDTH);

    // Draw border
    ctx.strokeStyle = COLOR_APP_BORDER[appearance];
    drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, BORDER_RADIUS);
    ctx.stroke();

    // Draw top handle bar
    const gradient = ctx.createLinearGradient(boundingBox.x, boundingBox.y, boundingBox.x, boundingBox.y + HANDLE_HEIGHT);
    gradient.addColorStop(0, HANDLEBAR_START_COLOR[appearance]);
    gradient.addColorStop(1, HANDLEBAR_STOP_COLOR[appearance]);
    ctx.fillStyle = isActive ? gradient : HANDLEBAR_COLOR_INACTIVE[appearance];
    drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, HANDLE_HEIGHT, BORDER_RADIUS, BORDER_RADIUS, 0, 0);
    ctx.fill();

    this.drawWindowControls(ctx, appearance, boundingBox.x + 20, boundingBox.height + HANDLE_HEIGHT / 2, isActive);

    return { x: boundingBox.x, y: boundingBox.y + HANDLE_HEIGHT, width: boundingBox.width, height: boundingBox.height - HANDLE_HEIGHT };
  }

  public setProbability(probability?: number) {
    this.probability = probability;
  }

  // Will only ever be executed if we directly instantiate an application or the subclass did not implement a draw function
  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.application) throw new Error('Bad config');
    const ctx = config.ctx;

    // Draw frame
    const contentBoundingBox = this.drawGenericFrame(ctx, config.application.appearance, config.application.boundingBox, config.application.isActive);

    //Draw content
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(contentBoundingBox.x, contentBoundingBox.y, contentBoundingBox.width, contentBoundingBox.height);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('No screen');
    if (!config.menuBar) throw new Error('No menubar');
    if (!config.dock) throw new Error('No dock');

    const isFullScreen = trueWithProbability(this.probability ?? 0.5);
    let size: Dimensions, position: Point;
    if (isFullScreen) {
      const reservedWidth = config.dock.orientation != 'bottom' ? config.dock.boundingBox.width : 0;
      const reservedHeight = MENUBAR_HEIGHT + (config.dock.orientation === 'bottom' ? config.dock.boundingBox.height : 0);
      size = { width: config.screen.dimensions.width - reservedWidth, height: config.screen.dimensions.height - reservedHeight };
      position = { x: config.dock.orientation === 'left' ? config.dock.boundingBox.width : 0, y: MENUBAR_HEIGHT };
    } else {
      size = this.dimension ?? this.getRandomDimension(100, 100, config.screen.dimensions.width, config.screen.dimensions.height);
      position =
        this.position ??
        this.getRandomPosition(
          -MAX_OFFSCREEN_PERCENTAGE * size.width,
          MENUBAR_HEIGHT,
          config.screen.dimensions.width - MAX_OFFSCREEN_PERCENTAGE * size.width,
          config.screen.dimensions.height - MAX_OFFSCREEN_PERCENTAGE * size.height,
        );
    }

    const boundingBox: Rectangle = { ...size, ...position };

    config.application = {
      isActive: trueWithProbability(0.5),
      appearance: this.appearance ?? config.screen.appearance,
      boundingBox,
    };

    config.annotations.push({
      zIndex: Z_IDX_APP,
      class: MacClasses.APPLICATION,
      ...boundingBox,
    });

    return [{ zIndex: Z_IDX_APP, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}

export class ScreenshotApplication extends Application {
  private folderName: string;
  private screenshots: Image[];
  private label?: MacClasses;

  constructor(folderName: string, label?: MacClasses, dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super(dimension, position, appearance, probability);

    this.folderName = folderName;
    this.label = label;
    this.screenshots = [];
  }

  public override async loadResources(): Promise<void> {
    const promises: Promise<any>[] = [];

    const backgroundsPath = `${RESOURCE_PATH}/applications/${this.folderName}`;
    const backgroundFiles = fs.readdirSync(backgroundsPath);
    for (const file of backgroundFiles) {
      promises.push(loadImage(`${backgroundsPath}/${file}`).then((image) => this.screenshots.push(image)));
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.application) throw new Error('Bad config');
    const {
      ctx,
      application: { appearance, boundingBox },
    } = config;

    // Draw frame
    this.drawRawFrame(ctx, appearance, boundingBox);

    // Draw content
    const targetAspectRatio = boundingBox.width / boundingBox.height;
    let bestDelta = Number.MAX_VALUE;
    let bestScreenshots: Image[] = [];
    let bestScreenshot: Image;
    for (const screenshot of this.screenshots) {
      const imageAspectRatio = screenshot.width / screenshot.height;
      const delta = Math.abs(targetAspectRatio - imageAspectRatio);

      if (delta < 0.75) {
        bestScreenshots.push(screenshot);
      }

      if (delta < bestDelta) {
        bestDelta = delta;
        bestScreenshot = screenshot;
      }
    }

    const screenshot = bestScreenshots.length === 0 ? bestScreenshot! : getRandomElement(bestScreenshots);
    ctx.drawImage(screenshot, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    const jobs = super.getDrawJobs(config);
    if (!config.application) throw new Error('No application');

    if (this.label) {
      config.annotations.push({ zIndex: Z_IDX_APP, class: this.label, ...config.application.boundingBox });
    }

    return jobs;
  }
}

import Safari from './browser/safari';
import Chrome from './browser/chrome';
import Notes from './misc/notes';
import Word from './office/word';
import Excel from './office/excel';
import Powerpoint from './office/powerpoint';
import Finder from './file-explorer/finder';

export class RandomApplication extends Application {
  private applications: Application[];

  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super(dimension, position, appearance, probability);

    this.applications = [new Safari(), new Chrome(), new Notes(), new Word(), new Excel(), new Powerpoint(), new Finder()];
  }

  public override async loadResources() {
    await Promise.all(this.applications.map((app) => app.loadResources()));
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    const app = getRandomElement(this.applications);
    return app.getDrawJobs(config);
  }
}
