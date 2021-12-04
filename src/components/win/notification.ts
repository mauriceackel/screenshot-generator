import { CanvasRenderingContext2D } from 'skia-canvas';
import { WinClasses } from '../../models/classes';
import { Rectangle } from '../../models/geometry';
import { DrawConfig, DrawJob } from '../../models/jobs';
import { COLOR_NOTIFICATION, FONT_COLOR } from '../../theme/win';
import { Appearance } from '../../models/appearance';
import { getRandomElement, trueWithProbability } from '../../utils/random';
import loremIpsum from '../../assets/lorem-ipsum.json';
import Component from '../component';
import { Z_IDX_NOTIFICATION } from '../../models/zindex';
import { drawChromeArrow } from '../../utils/draw';

const TEXT_PADDING = 10;
const NOTIFICATION_MARGIN = 20;
const NOTIFICATION_WIDTH = 400;
const NOTIFICATION_HEIGHT = 100;
const BUTTON_WIDTH = 100;

declare module '../../models/jobs' {
  export interface DrawConfig {
    notification?: {
      appearance: Appearance;
      boundingBox: Rectangle;
    };
  }
}

export class Notification extends Component {
  private appearance?: Appearance;
  private probability?: number;

  constructor(appearance?: Appearance, probability?: number) {
    super();

    this.appearance = appearance;
    this.probability = probability;
  }

  private drawFrame(ctx: CanvasRenderingContext2D, appearance: Appearance, boundingBox: Rectangle) {
    ctx.save();
    ctx.fillStyle = COLOR_NOTIFICATION;
    ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    ctx.fill();
  }

  public setAppearance(appearance?: Appearance) {
    this.appearance = appearance;
  }

  public setProbability(probability?: number) {
    this.probability = probability;
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.notification) throw new Error('Bad config');
    const {
      ctx,
      notification: { appearance, boundingBox },
    } = config;

    // Draw surrounding structure
    this.drawFrame(ctx, appearance, boundingBox);

    // Set text content
    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    const notification = getRandomElement(loremIpsum).split(' ');
    const heading = notification.slice(0, 2).join(' '); // Get first two words
    let body = notification.slice(2).join(' ');
    body = body.length > 100 ? body.substr(0, 97) + '...' : body;

    ctx.font = 'bold 18px serif';
    ctx.fillText(heading, boundingBox.x + TEXT_PADDING, boundingBox.y + TEXT_PADDING, NOTIFICATION_WIDTH - BUTTON_WIDTH - 2 * TEXT_PADDING);
    const { actualBoundingBoxDescent: headingBottom } = ctx.measureText(heading);

    ctx.font = '300 12px serif';
    ctx.fillText(body, boundingBox.x + TEXT_PADDING, boundingBox.y + 2 * TEXT_PADDING + headingBottom, NOTIFICATION_WIDTH - BUTTON_WIDTH - 2 * TEXT_PADDING);

    // Draw back button
    ctx.strokeStyle = FONT_COLOR[appearance];
    drawChromeArrow(ctx, boundingBox.x + boundingBox.width - 30, boundingBox.y + 20, 20, 20, 'right');
    ctx.stroke();
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('No screen');

    // Only show notification with 15%
    if (!trueWithProbability(this.probability ?? 0.15)) {
      return super.getDrawJobs(config);
    }

    const boundingBox: Rectangle = {
      x: config.screen.dimensions.width - Math.random() * (NOTIFICATION_WIDTH + NOTIFICATION_MARGIN), // Random amount of visibility
      y: config.screen.dimensions.height - NOTIFICATION_MARGIN - NOTIFICATION_HEIGHT,
      width: NOTIFICATION_WIDTH,
      height: NOTIFICATION_HEIGHT,
    };

    config.notification = {
      appearance: this.appearance ?? config.screen.appearance,
      boundingBox,
    };

    config.annotations.push({
      zIndex: Z_IDX_NOTIFICATION,
      class: WinClasses.NOTIFICATION,
      ...boundingBox,
    });

    return [{ zIndex: Z_IDX_NOTIFICATION, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
