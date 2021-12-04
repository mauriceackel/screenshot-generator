import { CanvasRenderingContext2D, Image, loadImage } from 'skia-canvas';
import { WinClasses } from '../../../models/classes';
import { Dimensions, Point, Rectangle } from '../../../models/geometry';
import { DrawConfig, DrawJob } from '../../../models/jobs';
import { CLOSE_COLOR, MAXIMIZE_COLOR, MINIMIZE_COLOR, COLOR_APP_BORDER, HANDLEBAR_COLOR } from '../../../theme/win';
import { Appearance } from '../../../models/appearance';
import { Z_IDX_APP } from '../../../models/zindex';
import { drawShadow } from '../../../utils/draw';
import { getRandomElement, randomBetween, randomIntBetween, trueWithProbability } from '../../../utils/random';
import Component from '../../component';
import fs from 'fs';
import { RESOURCE_PATH } from '../../../config';

const HANDLE_HEIGHT = 34;
const HANDLE_BUTTON_HEIGHT = HANDLE_HEIGHT;
const HANDLE_BUTTON_WIDTH = 46;
const SHADOW_WIDTH = 6;
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

  protected getWindowControlsBoundingBox(rightX: number, topY: number): Rectangle {
    return {
      x: rightX - 3 * HANDLE_BUTTON_WIDTH,
      y: topY,
      width: 3 * HANDLE_BUTTON_WIDTH,
      height: HANDLE_HEIGHT,
    };
  }

  protected drawWindowControls(ctx: CanvasRenderingContext2D, appearance: Appearance, x: number, y: number): number {
    // Draw window functions
    const activeElement = randomIntBetween(0, 10);

    ctx.strokeStyle = FONT_COLOR[appearance];

    let offsetX = x - HANDLE_BUTTON_WIDTH;
    ctx.beginPath();
    ctx.fillStyle = activeElement === 0 ? CLOSE_COLOR : 'transparent';
    ctx.rect(offsetX, y, HANDLE_BUTTON_WIDTH, HANDLE_BUTTON_HEIGHT);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(offsetX + HANDLE_BUTTON_WIDTH / 2 - 5, y + HANDLE_BUTTON_HEIGHT / 2 - 5);
    ctx.lineTo(offsetX + HANDLE_BUTTON_WIDTH / 2 + 5, y + HANDLE_BUTTON_HEIGHT / 2 + 5);
    ctx.moveTo(offsetX + HANDLE_BUTTON_WIDTH / 2 - 5, y + HANDLE_BUTTON_HEIGHT / 2 + 5);
    ctx.lineTo(offsetX + HANDLE_BUTTON_WIDTH / 2 + 5, y + HANDLE_BUTTON_HEIGHT / 2 - 5);
    ctx.stroke();

    offsetX -= HANDLE_BUTTON_WIDTH;

    ctx.beginPath();
    ctx.fillStyle = activeElement === 1 ? MINIMIZE_COLOR[appearance] : 'transparent';
    ctx.rect(offsetX, y, HANDLE_BUTTON_WIDTH, HANDLE_BUTTON_HEIGHT);
    ctx.fill();

    ctx.beginPath();
    ctx.rect(offsetX + (HANDLE_BUTTON_WIDTH - HANDLE_BUTTON_HEIGHT / 3) / 2, y + HANDLE_BUTTON_HEIGHT / 3, HANDLE_BUTTON_HEIGHT / 3, HANDLE_BUTTON_HEIGHT / 3);
    ctx.stroke();

    offsetX -= HANDLE_BUTTON_WIDTH;

    ctx.beginPath();
    ctx.fillStyle = activeElement === 2 ? MAXIMIZE_COLOR[appearance] : 'transparent';
    ctx.rect(offsetX, y, HANDLE_BUTTON_WIDTH, HANDLE_BUTTON_HEIGHT);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(offsetX + HANDLE_BUTTON_WIDTH / 3, y + HANDLE_BUTTON_HEIGHT / 2);
    ctx.lineTo(offsetX + (HANDLE_BUTTON_WIDTH * 2) / 3, y + HANDLE_BUTTON_HEIGHT / 2);
    ctx.stroke();

    offsetX -= HANDLE_BUTTON_WIDTH;

    return offsetX;
  }

  protected drawRawFrame(ctx: CanvasRenderingContext2D, appearance: Appearance, boundingBox: Rectangle) {
    // Draw shadow
    drawShadow(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, SHADOW_WIDTH);

    // Draw border
    ctx.strokeStyle = COLOR_APP_BORDER;
    ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    ctx.stroke();
  }

  protected drawGenericFrame(ctx: CanvasRenderingContext2D, appearance: Appearance, boundingBox: Rectangle, isActive: boolean): Rectangle {
    // Draw shadow
    drawShadow(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, SHADOW_WIDTH);

    // Draw border
    ctx.strokeStyle = COLOR_APP_BORDER;
    ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    ctx.stroke();

    // Draw top handle bar
    ctx.fillStyle = HANDLEBAR_COLOR;
    ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, HANDLE_HEIGHT);
    ctx.fill();

    this.drawWindowControls(ctx, appearance, boundingBox.x + boundingBox.width, boundingBox.y);

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
    if (!config.taskBar) throw new Error('No menubar');
    const { screen, taskBar } = config;

    const isFullScreen = trueWithProbability(this.probability ?? 0.5);
    let size: Dimensions, position: Point;
    if (isFullScreen) {
      const reservedWidth = taskBar.orientation === 'left' || taskBar.orientation === 'right' ? taskBar.boundingBox.width : 0;
      const reservedHeight = taskBar.orientation === 'bottom' || taskBar.orientation === 'top' ? taskBar.boundingBox.height : 0;
      size = { width: screen.dimensions.width - reservedWidth, height: screen.dimensions.height - reservedHeight };

      const offsetLeft = taskBar.orientation === 'left' ? taskBar.boundingBox.width : 0;
      const offsetTop = taskBar.orientation === 'top' ? taskBar.boundingBox.height : 0;
      position = { x: offsetLeft, y: offsetTop };
    } else {
      size = this.dimension ?? this.getRandomDimension(100, 100, screen.dimensions.width, screen.dimensions.height);
      position =
        this.position ??
        this.getRandomPosition(
          -MAX_OFFSCREEN_PERCENTAGE * size.width,
          -MAX_OFFSCREEN_PERCENTAGE * size.height,
          screen.dimensions.width - MAX_OFFSCREEN_PERCENTAGE * size.width,
          screen.dimensions.height - MAX_OFFSCREEN_PERCENTAGE * size.height,
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
      class: WinClasses.APPLICATION,
      ...boundingBox,
    });

    return [{ zIndex: Z_IDX_APP, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}

export class ScreenshotApplication extends Application {
  private folderName: string;
  private screenshots: Image[];
  private label?: WinClasses;

  constructor(folderName: string, label?: WinClasses, dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
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

import Word from './office/word';
import Excel from './office/excel';
import Powerpoint from './office/powerpoint';
import WinExplorer from './file-explorer/winexplorer';
import { FONT_COLOR } from '../../../theme/mac';

export class RandomApplication extends Application {
  private applications: Application[];

  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super(dimension, position, appearance, probability);

    this.applications = [new Word(), new Excel(), new Powerpoint(), new WinExplorer()];
  }

  public override async loadResources() {
    await Promise.all(this.applications.map((app) => app.loadResources()));
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    const app = getRandomElement(this.applications);
    return app.getDrawJobs(config);
  }
}
