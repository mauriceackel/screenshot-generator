import fs from 'fs';
import { Image, loadImage } from 'skia-canvas';
import { RESOURCE_PATH } from '../../config';
import Component from '../component';
import appNames from '../../assets/app-names.json';
import userNames from '../../assets/user-names.json';
import { BLUR_OFFSET, BLUR_SIZE, COLOR_MENUBAR, COLOR_MENUBAR_BORDER, FONT_COLOR, MENUBAR_HEIGHT } from '../../theme/mac';
import { Appearance } from '../../models/appearance';
import { MacClasses } from '../../models/classes';
import { getRandomElement, randomBetween, randomIntBetween, randomMax, trueWithProbability } from '../../utils/random';
import { drawScaledH } from '../../utils/scale';
import { DrawConfig, DrawJob } from '../../models/jobs';
import { Rectangle } from '../../models/geometry';
import { Z_IDX_MENUBAR } from '../../models/zindex';

const MENUICON_OFFSET_Y = 4;
const MENUICON_HEIGHT = MENUBAR_HEIGHT - 8;
const MENUICON_PADDING = 10;
const MENU_PADDING = 20;

declare module '../../models/jobs' {
  export interface DrawConfig {
    menuBar?: {
      appearance: Appearance;
      boundingBox: Rectangle;
    };
  }
}

export default class MenuBar extends Component {
  private menuNames: string[] = ['File', 'Edit', 'Selection', 'View', 'Help'];
  private menuIcons: Record<string, Image[] | undefined>;
  private appearance?: Appearance;

  constructor(appearance?: Appearance) {
    super();
    this.menuIcons = {};

    this.appearance = appearance;
  }

  private drawLeftMenu(config: DrawConfig): void {
    if (!config.ctx || !config.menuBar) throw new Error('Bad config');
    const {
      ctx,
      menuBar: { appearance },
    } = config;

    let offset = MENU_PADDING;

    // Apple logo
    if (this.menuIcons.appleicon) {
      const icon = this.menuIcons.appleicon[0];
      ctx.filter = `invert(${appearance === 'light' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y);
      ctx.filter = 'none';
      offset += scaledWidth + MENU_PADDING;
    }

    // Setup font
    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // App name
    ctx.font = `bold ${MENUBAR_HEIGHT / 1.5}px serif`;
    const appName = getRandomElement(appNames);
    const { width: appTextWidth } = ctx.measureText(appName);
    ctx.fillText(appName, offset, MENUBAR_HEIGHT / 2);
    offset += appTextWidth + MENU_PADDING;

    // App menu
    ctx.font = `${MENUBAR_HEIGHT / 1.5}px serif`;
    for (const menuName of this.menuNames) {
      const { width: menuTextWidth } = ctx.measureText(menuName);
      ctx.fillText(menuName, offset, MENUBAR_HEIGHT / 2);
      offset += menuTextWidth + MENU_PADDING;
    }
  }

  private drawRightMenu(config: DrawConfig): void {
    if (!config.ctx || !config.menuBar) throw new Error('Bad config');
    const ctx = config.ctx;
    const appearance = config.menuBar.appearance;

    let offset = ctx.canvas.width - MENU_PADDING;

    // Setup for writing
    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    // News
    if (trueWithProbability(0.75)) {
      // TODO
    }

    // Siri
    if (trueWithProbability(0.75) && this.menuIcons.siri?.length) {
      const icon = getRandomElement(this.menuIcons.siri);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }

    // Spotlight
    if (trueWithProbability(0.75)) {
      // TODO
    }

    // Username
    if (trueWithProbability(0.75)) {
      const isFullName = trueWithProbability(0.5);
      if (isFullName || !this.menuIcons.usericon) {
        ctx.font = `bold ${MENUBAR_HEIGHT / 1.5}px serif`;
        let userName = getRandomElement(userNames);
        if (trueWithProbability(0.5)) {
          userName = userName.charAt(0).toUpperCase() + userName.substr(1);
        }

        const { width: textWidth } = ctx.measureText(userName);
        ctx.fillText(userName, offset, MENUBAR_HEIGHT / 2);
        offset -= textWidth + MENUICON_PADDING;
      } else {
        const icon = getRandomElement(this.menuIcons.usericon);
        ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
        ctx.filter = 'none';
        offset -= scaledWidth + MENUICON_PADDING;
      }
    }

    // Time
    if (trueWithProbability(0.75)) {
      ctx.font = `${MENUBAR_HEIGHT / 1.5}px serif`;
      const timeFormat: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      const locale = 'en';
      const thresholdLow = new Date(2000, 0, 1);
      const date = new Date(thresholdLow.getTime() + randomBetween(Date.now(), thresholdLow.getTime()));
      const dateString = date.toLocaleString(locale, timeFormat);

      const { width: textWidth } = ctx.measureText(dateString);
      ctx.fillText(dateString, offset, MENUBAR_HEIGHT / 2);
      offset -= textWidth + MENUICON_PADDING;
    }

    // Battery
    if (trueWithProbability(0.75) && this.menuIcons.battery?.length) {
      const hasPercentage = trueWithProbability(0.5);

      const icon = getRandomElement(this.menuIcons.battery);
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      offset -= scaledWidth;

      if (hasPercentage) {
        const percentageText = `${randomIntBetween(0, 100)}%`;
        ctx.font = `thin ${MENUBAR_HEIGHT / 1.5}px serif`;
        const { width: textWidth } = ctx.measureText(percentageText);
        ctx.fillText(percentageText, offset, MENUBAR_HEIGHT / 2);
        offset -= textWidth;
      }

      offset -= MENUICON_PADDING;
    }

    // Volume
    if (trueWithProbability(0.75) && this.menuIcons.volume?.length) {
      const icon = getRandomElement(this.menuIcons.volume);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }

    // Bluetooth
    if (trueWithProbability(0.75) && this.menuIcons.bluetooth?.length) {
      const icon = getRandomElement(this.menuIcons.bluetooth);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }

    // Timemachine
    if (trueWithProbability(0.75) && this.menuIcons.timemachine?.length) {
      const icon = getRandomElement(this.menuIcons.timemachine);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }

    // Airplay
    if (trueWithProbability(0.75) && this.menuIcons.airplay?.length) {
      const icon = getRandomElement(this.menuIcons.airplay);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }

    // Wifi
    if (trueWithProbability(0.75) && this.menuIcons.airport?.length) {
      const icon = getRandomElement(this.menuIcons.airport);
      ctx.filter = `invert(${appearance === 'dark' ? 100 : 0}%)`;
      const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, MENUICON_OFFSET_Y, 'right');
      ctx.filter = 'none';
      offset -= scaledWidth + MENUICON_PADDING;
    }
  }

  private loadMenuIcons(basePath: string, name: string): Promise<any>[] {
    const path = `${basePath}/${name}`;
    const files = fs.readdirSync(path);

    this.menuIcons[name] = [];
    const promises: Promise<any>[] = [];
    for (const file of files) {
      promises.push(loadImage(`${path}/${file}`).then((image) => this.menuIcons[name]!.push(image)));
    }

    return promises;
  }

  public override async loadResources(): Promise<void> {
    const basePath = `${RESOURCE_PATH}/mac/menuicons`;
    const promises: Promise<any>[] = [];

    promises.push(...this.loadMenuIcons(basePath, 'airport'));
    promises.push(...this.loadMenuIcons(basePath, 'airplay'));
    promises.push(...this.loadMenuIcons(basePath, 'bluetooth'));
    promises.push(...this.loadMenuIcons(basePath, 'battery'));
    promises.push(...this.loadMenuIcons(basePath, 'timemachine'));
    promises.push(...this.loadMenuIcons(basePath, 'volume'));

    promises.push(loadImage(`${RESOURCE_PATH}/mac/apple_white.png`).then((image) => (this.menuIcons.appleicon = [image])));
    promises.push(loadImage(`${basePath}/User.png`).then((image) => (this.menuIcons.usericon = [image])));
    promises.push(loadImage(`${basePath}/Siri.png`).then((image) => (this.menuIcons.siri = [image])));

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.menuBar) throw new Error('Bad config');
    const ctx = config.ctx;

    // Draw main area
    ctx.save();
    ctx.beginPath();
    ctx.rect(config.menuBar.boundingBox.x, config.menuBar.boundingBox.y, config.menuBar.boundingBox.width, config.menuBar.boundingBox.height);
    ctx.clip();

    // Make blurry
    ctx.filter = `blur(${BLUR_SIZE}px)`;
    ctx.drawImage(
      ctx.canvas,
      config.menuBar.boundingBox.x,
      config.menuBar.boundingBox.y,
      config.menuBar.boundingBox.width,
      config.menuBar.boundingBox.height,
      config.menuBar.boundingBox.x - BLUR_OFFSET,
      config.menuBar.boundingBox.y - BLUR_OFFSET,
      config.menuBar.boundingBox.width + 2 * BLUR_OFFSET,
      config.menuBar.boundingBox.height + 2 * BLUR_OFFSET,
    );
    ctx.filter = 'none';

    // Set color
    ctx.fillStyle = COLOR_MENUBAR[config.menuBar.appearance];
    ctx.fill();
    ctx.restore();

    // Draw border
    ctx.strokeStyle = COLOR_MENUBAR_BORDER[config.menuBar.appearance];
    ctx.beginPath();
    ctx.moveTo(config.menuBar.boundingBox.x, config.menuBar.boundingBox.y + config.menuBar.boundingBox.height);
    ctx.lineTo(config.menuBar.boundingBox.x + config.menuBar.boundingBox.width, config.menuBar.boundingBox.y + config.menuBar.boundingBox.height);
    ctx.stroke();

    // Draw elements
    this.drawLeftMenu(config);
    this.drawRightMenu(config);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('No screen');

    const boundingBox: Rectangle = { x: 0, y: 0, width: config.screen.dimensions.width, height: MENUBAR_HEIGHT };

    config.menuBar = {
      appearance: this.appearance ?? config.screen.appearance,
      boundingBox,
    };

    config.annotations.push({
      zIndex: Z_IDX_MENUBAR,
      class: MacClasses.MENUBAR,
      ...boundingBox,
    });

    return [{ zIndex: Z_IDX_MENUBAR, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
