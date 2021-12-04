import { CanvasRenderingContext2D } from 'skia-canvas';
import { MacClasses } from '../../models/classes';
import { Rectangle } from '../../models/geometry';
import { DrawConfig, DrawJob } from '../../models/jobs';
import { BLUR_OFFSET, BLUR_SIZE, COLOR_DOCK, COLOR_DOCK_BORDER, FONT_COLOR } from '../../theme/mac';
import { Appearance } from '../../models/appearance';
import { drawRoundedRect } from '../../utils/draw';
import { getRandomElement, trueWithProbability } from '../../utils/random';
import loremIpsum from '../../assets/lorem-ipsum.json';
import buttonTexts from '../../assets/button-texts.json';
import Component from '../component';
import { Z_IDX_NOTIFICATION } from '../../models/zindex';

const TEXT_PADDING = 10;
const BORDER_RADIUS = 10;
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
    ctx.fillStyle = COLOR_DOCK[appearance];
    ctx.strokeStyle = COLOR_DOCK_BORDER[appearance];
    drawRoundedRect(ctx, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();
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
    ctx.restore();
  }

  public setAppearance(appearance?: Appearance) {
    this.appearance = appearance;
  }

  public setProbability(probability?: number) {
    this.probability = probability;
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.notification) throw new Error('Bad config');
    const ctx = config.ctx;

    // Draw surrounding structure
    this.drawFrame(ctx, config.notification.appearance, config.notification.boundingBox);

    // Draw buttons
    const hasTwoButtons = trueWithProbability(0.5);
    const buttonX = config.notification.boundingBox.x + NOTIFICATION_WIDTH - BUTTON_WIDTH;
    ctx.strokeStyle = COLOR_DOCK_BORDER[config.notification.appearance];
    ctx.beginPath();
    ctx.moveTo(buttonX, config.notification.boundingBox.y);
    ctx.lineTo(buttonX, config.notification.boundingBox.y + NOTIFICATION_HEIGHT);
    ctx.stroke();
    if (hasTwoButtons) {
      ctx.fillStyle = FONT_COLOR[config.notification.appearance];
      ctx.font = '12px serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let buttonText = getRandomElement(buttonTexts);
      ctx.fillText(buttonText, buttonX + BUTTON_WIDTH / 2, config.notification.boundingBox.y + NOTIFICATION_HEIGHT / 4, BUTTON_WIDTH - 2 * TEXT_PADDING);

      // Separation line
      ctx.beginPath();
      ctx.moveTo(buttonX, config.notification.boundingBox.y + NOTIFICATION_HEIGHT / 2);
      ctx.lineTo(buttonX + BUTTON_WIDTH, config.notification.boundingBox.y + NOTIFICATION_HEIGHT / 2);
      ctx.stroke();

      buttonText = getRandomElement(buttonTexts);
      ctx.fillText(buttonText, buttonX + BUTTON_WIDTH / 2, config.notification.boundingBox.y + (NOTIFICATION_HEIGHT * 3) / 4, BUTTON_WIDTH - 2 * TEXT_PADDING);
    } else {
      const buttonText = getRandomElement(buttonTexts);
      ctx.fillStyle = FONT_COLOR[config.notification.appearance];
      ctx.font = '12px serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(buttonText, buttonX + BUTTON_WIDTH / 2, config.notification.boundingBox.y + NOTIFICATION_HEIGHT / 2, BUTTON_WIDTH - 2 * TEXT_PADDING);
    }

    // Set text content
    ctx.fillStyle = FONT_COLOR[config.notification.appearance];
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    const notification = getRandomElement(loremIpsum).split(' ');
    const heading = notification.slice(0, 2).join(' '); // Get first two words
    let body = notification.slice(2).join(' ');
    body = body.length > 100 ? body.substr(0, 97) + '...' : body;

    ctx.font = 'bold 18px serif';
    ctx.fillText(heading, config.notification.boundingBox.x + TEXT_PADDING, config.notification.boundingBox.y + TEXT_PADDING, NOTIFICATION_WIDTH - BUTTON_WIDTH - 2 * TEXT_PADDING);
    const { actualBoundingBoxDescent: headingBottom } = ctx.measureText(heading);

    ctx.font = '300 12px serif';
    ctx.fillText(body, config.notification.boundingBox.x + TEXT_PADDING, config.notification.boundingBox.y + TEXT_PADDING + headingBottom, NOTIFICATION_WIDTH - BUTTON_WIDTH - 2 * TEXT_PADDING);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('No screen');

    // Only show notification with 15%
    if (!trueWithProbability(this.probability ?? 0.15)) {
      return super.getDrawJobs(config);
    }

    const menubarBottom = config.menuBar ? config.menuBar.boundingBox.y + config.menuBar.boundingBox.height : 0;
    const boundingBox: Rectangle = {
      x: config.screen.dimensions.width - Math.random() * (NOTIFICATION_WIDTH + NOTIFICATION_MARGIN), // Random amount of visibility
      y: menubarBottom + NOTIFICATION_MARGIN,
      width: NOTIFICATION_WIDTH,
      height: NOTIFICATION_HEIGHT,
    };

    config.notification = {
      appearance: this.appearance ?? config.screen.appearance,
      boundingBox,
    };

    config.annotations.push({
      zIndex: Z_IDX_NOTIFICATION,
      class: MacClasses.NOTIFICATION,
      ...boundingBox,
    });

    return [{ zIndex: Z_IDX_NOTIFICATION, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
