import { Canvas, Image } from 'skia-canvas';
import Component from './component';
import { getRandomElement } from '../utils/random';
import { Dimensions } from '../models/geometry';
import { DrawJob, DrawConfig } from '../models/jobs';
import { Appearance, getRandomAppearance } from '../models/appearance';
import { Z_IDX_SCREEN } from '../models/zindex';

declare module '../models/jobs' {
  export interface DrawConfig {
    screen?: {
      appearance: Appearance;
      dimensions: Dimensions;
      backgroundImage: Image;
    };
  }
}

export default abstract class Screen extends Component {
  protected readonly dimensions: Dimensions[] = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1080 },
    { width: 1680, height: 1050 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ];
  protected backgrounds: Image[];
  protected background?: Image;
  protected appearance?: Appearance;
  protected dimension?: Dimensions;

  constructor(dimension?: Dimensions) {
    super();

    this.backgrounds = [];

    this.dimension = dimension;
  }

  public setBackground(image?: Image) {
    this.background = image;
  }

  public setDimensions(dimension?: Dimensions) {
    this.dimension = dimension;
  }

  public setAppearance(appearance?: Appearance) {
    this.appearance = appearance;
  }

  protected draw(config: DrawConfig): void {
    if (!config.screen || !config.ctx) throw new Error('Bad config');

    const ctx = config.ctx;
    const screenWidth = config.screen.dimensions.width;
    const screenHeight = config.screen.dimensions.height;
    const background = config.screen.backgroundImage;

    // Compute how to crop image
    let scaleFactorX = screenWidth / background.width;
    let scaleFactorY = screenHeight / background.height;
    let scaleFactor = Math.max(1, scaleFactorX, scaleFactorY);

    if (scaleFactor == 1) {
      // No upscale required check for downscale
      scaleFactorX = screenWidth / background.width;
      scaleFactorY = screenHeight / background.height;
      scaleFactor = Math.max(scaleFactorX, scaleFactorY);
    }

    // Apply scaling and centering
    const sourceWidth = screenWidth / scaleFactor;
    const sourceHeight = screenHeight / scaleFactor;
    const sourceX = (background.width - sourceWidth) / 2;
    const sourceY = (background.height - sourceHeight) / 2;

    ctx.drawImage(background, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, screenWidth, screenHeight);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    // Set config values
    const dimensions = this.dimension ?? getRandomElement(this.dimensions);
    config.screen = {
      dimensions,
      backgroundImage: this.background ?? getRandomElement(this.backgrounds),
      appearance: this.appearance ?? getRandomAppearance(),
    };
    config.canvas = new Canvas(dimensions.width, dimensions.height);
    config.ctx = config.canvas.getContext('2d');
    config.ctx.save();

    // Add job and all child jobs
    return [
      {
        zIndex: Z_IDX_SCREEN,
        drawFunction: this.draw.bind(this),
      },
      ...super.getDrawJobs(config),
    ];
  }
}
