import { WinClasses } from '../../models/classes';
import { Dimensions, Rectangle } from '../../models/geometry';
import { DrawConfig, DrawJob } from '../../models/jobs';
import { Orientation, orientations } from '../../models/orientation';
import { BLUR_OFFSET, BLUR_SIZE } from '../../theme/win';
import { Appearance } from '../../models/appearance';
import { getRandomElement, randomBetween, randomIntBetween, trueWithProbability } from '../../utils/random';
import { Image, loadImage } from 'skia-canvas';
import Component from '../component';
import { shuffle } from '../../utils/shuffle';
import { Z_IDX_TASKBAR } from '../../models/zindex';
import { RESOURCE_PATH } from '../../config';
import fs from 'fs';
import { drawScaledH } from '../../utils/scale';
import languages from '../../assets/languages.json';

const TASKBAR_HEIGHT = 40;
const TASKBAR_WIDTH = 80;
const SEARCHBAR_WIDTH = 350;
const ICON_WIDTH = 24;
const CELL_WIDTH = 50;
const CELL_HEIGHT = 50;
const ACTIVITY_SIZE = 3;
const MIN_APP_COUNT = 5;
const MAX_APP_COUNT = 8;
const COLOR_TASKBAR = '#000000c0';
const COLOR_ACTIVITY = '#76b9ed';
const MENUICON_HEIGHT = TASKBAR_HEIGHT - 20;
const MENUICON_OFFSET_Y = 10;
const MENUICON_PADDING = 10;

type AppIconInfo = {
  image: Image;
  boundingBox: Rectangle;
  activityBoundingBox: Rectangle;
  isActive: boolean;
};

declare module '../../models/jobs' {
  export interface DrawConfig {
    taskBar?: {
      boundingBox: Rectangle;
      orientation: Orientation;
      showSearchbar: boolean;
      appIcons: AppIconInfo[];
      appearance: Appearance;
    };
  }
}

export default class TaskBar extends Component {
  private menuIcons: Record<string, Image[] | undefined>;
  private appIcons: Image[];
  private orientation?: Orientation;
  private appCount?: number;
  private appearance?: Appearance;

  constructor(orientation?: Orientation, appCount?: number, appearance?: Appearance) {
    super();

    this.appIcons = [];
    this.menuIcons = {};

    this.orientation = orientation;
    this.appCount = appCount;
    this.appearance = appearance;
  }

  private getTaskbarBoundingBox(orientation: Orientation, screenDimensions: Dimensions): Rectangle {
    let width: number, height: number, offsetLeft: number, offsetTop: number;
    switch (orientation) {
      case 'left':
        {
          // Define taskbar region
          width = TASKBAR_WIDTH;
          height = screenDimensions.height;

          offsetTop = 0;
          offsetLeft = 0;
        }
        break;
      case 'right':
        {
          width = TASKBAR_WIDTH;
          height = screenDimensions.height;

          offsetTop = 0;
          offsetLeft = screenDimensions.width - width;
        }
        break;
      case 'bottom':
        {
          // Define taskbar region
          height = TASKBAR_HEIGHT;
          width = screenDimensions.width;

          offsetLeft = 0;
          offsetTop = screenDimensions.height - height;
        }
        break;
      case 'top':
        {
          // Define taskbar region
          height = TASKBAR_HEIGHT;
          width = screenDimensions.width;

          offsetLeft = 0;
          offsetTop = 0;
        }
        break;
      default:
        throw new Error('Invalid orientation for taskbar');
    }

    return { x: offsetLeft, y: offsetTop, width, height };
  }

  private getIconPositions(orientation: Orientation, appCount: number, appIcons: Image[], showSearchBar: boolean, taskBarBoundingBox: Rectangle): AppIconInfo[] {
    const positions: AppIconInfo[] = [];
    switch (orientation) {
      case 'left':
        {
          const offsetTop = taskBarBoundingBox.y + CELL_HEIGHT + (showSearchBar ? CELL_HEIGHT : 0);

          for (let i = 0; i < appCount; i++) {
            const icon = appIcons[i];
            const scaledHeight = (ICON_WIDTH / icon.width) * icon.height;

            const cellOffsetTop = offsetTop + i * CELL_HEIGHT;

            const iconBoundingBox = {
              x: taskBarBoundingBox.x + (TASKBAR_WIDTH - ICON_WIDTH) / 2,
              y: cellOffsetTop + (CELL_HEIGHT - scaledHeight) / 2,
              width: ICON_WIDTH,
              height: scaledHeight,
            };
            const activityBoundingBox: Rectangle = { x: taskBarBoundingBox.x, y: cellOffsetTop, width: ACTIVITY_SIZE, height: CELL_HEIGHT };

            positions.push({
              image: icon,
              boundingBox: iconBoundingBox,
              activityBoundingBox,
              isActive: trueWithProbability(0.1), // Randomly draw activity lines (10%)
            });
          }
        }
        break;
      case 'right':
        {
          const offsetTop = taskBarBoundingBox.y + CELL_HEIGHT + (showSearchBar ? CELL_HEIGHT : 0);

          for (let i = 0; i < appCount; i++) {
            const icon = appIcons[i];
            const scaledHeight = (ICON_WIDTH / icon.width) * icon.height;

            const cellOffsetTop = offsetTop + i * CELL_HEIGHT;

            const iconBoundingBox = {
              x: taskBarBoundingBox.x + (TASKBAR_WIDTH - ICON_WIDTH) / 2,
              y: cellOffsetTop + (CELL_HEIGHT - scaledHeight) / 2,
              width: ICON_WIDTH,
              height: scaledHeight,
            };
            const activityBoundingBox: Rectangle = { x: taskBarBoundingBox.x + TASKBAR_WIDTH - ACTIVITY_SIZE, y: cellOffsetTop, width: ACTIVITY_SIZE, height: CELL_HEIGHT };

            positions.push({
              image: icon,
              boundingBox: iconBoundingBox,
              activityBoundingBox,
              isActive: trueWithProbability(0.1), // Randomly draw activity lines (10%)
            });
          }
        }
        break;
      case 'bottom':
        {
          const offsetLeft = taskBarBoundingBox.x + CELL_WIDTH + (showSearchBar ? SEARCHBAR_WIDTH : 0);

          for (let i = 0; i < appCount; i++) {
            const icon = appIcons[i];
            const scaledHeight = (ICON_WIDTH / icon.width) * icon.height;

            const cellOffsetLeft = offsetLeft + i * CELL_WIDTH;

            const iconBoundingBox = {
              x: cellOffsetLeft + (CELL_WIDTH - ICON_WIDTH) / 2,
              y: taskBarBoundingBox.y + (TASKBAR_HEIGHT - scaledHeight) / 2,
              width: ICON_WIDTH,
              height: scaledHeight,
            };
            const activityBoundingBox: Rectangle = { x: cellOffsetLeft, y: taskBarBoundingBox.y + taskBarBoundingBox.height - ACTIVITY_SIZE, width: CELL_WIDTH, height: ACTIVITY_SIZE };

            positions.push({
              image: icon,
              boundingBox: iconBoundingBox,
              activityBoundingBox,
              isActive: trueWithProbability(0.1), // Randomly draw activity lines (10%)
            });
          }
        }
        break;
      case 'top':
        {
          const offsetLeft = taskBarBoundingBox.x + CELL_WIDTH + (showSearchBar ? SEARCHBAR_WIDTH : 0);

          for (let i = 0; i < appCount; i++) {
            const icon = appIcons[i];
            const scaledHeight = (ICON_WIDTH / icon.width) * icon.height;

            const cellOffsetLeft = offsetLeft + i * CELL_WIDTH;

            const iconBoundingBox = {
              x: cellOffsetLeft + (CELL_WIDTH - ICON_WIDTH) / 2,
              y: taskBarBoundingBox.y + (TASKBAR_HEIGHT - scaledHeight) / 2,
              width: ICON_WIDTH,
              height: scaledHeight,
            };
            const activityBoundingBox: Rectangle = { x: cellOffsetLeft, y: taskBarBoundingBox.y, width: CELL_WIDTH, height: ACTIVITY_SIZE };

            positions.push({
              image: icon,
              boundingBox: iconBoundingBox,
              activityBoundingBox,
              isActive: trueWithProbability(0.1), // Randomly draw activity lines (10%)
            });
          }
        }
        break;
    }

    return positions;
  }

  private getRandomAppIcons(appCount: number): Image[] {
    const result: Image[] = [];
    let remainingCount = appCount;

    while (remainingCount > 0) {
      shuffle(this.appIcons);
      // Try to get all the remaining elements if possible
      const extracted = this.appIcons.slice(0, remainingCount);
      result.push(...this.appIcons.slice(0, remainingCount));
      remainingCount -= extracted.length;
    }

    return result;
  }

  private drawLeftMenu(config: DrawConfig) {
    if (!config.ctx || !config.taskBar) throw new Error('Bad config');
    const {
      ctx,
      taskBar: { appearance, boundingBox, orientation, showSearchbar },
    } = config;

    switch (orientation) {
      case 'bottom':
      case 'top':
        {
          let offset = boundingBox.x;

          // Draw windows icon
          const windowsIcon: Image = this.menuIcons.windowsicon![0];
          ctx.filter = 'invert(100%)';
          const scaledHeight = (ICON_WIDTH / windowsIcon.width) * windowsIcon.height;
          ctx.drawImage(windowsIcon, offset + (CELL_WIDTH - ICON_WIDTH) / 2, boundingBox.y + (TASKBAR_HEIGHT - scaledHeight) / 2, ICON_WIDTH, scaledHeight);
          ctx.filter = 'none';
          offset += CELL_WIDTH;

          // Draw searchbar
          if (showSearchbar) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(offset, boundingBox.y, SEARCHBAR_WIDTH, TASKBAR_HEIGHT);
            const icon = this.menuIcons.search?.[0];
            if (icon) {
              drawScaledH(ctx, icon, MENUICON_HEIGHT, offset + 10, boundingBox.y + (boundingBox.height - MENUICON_HEIGHT) / 2);
            }
            offset += SEARCHBAR_WIDTH;
          }
        }
        break;
      case 'left':
      case 'right':
        {
          let offset = boundingBox.y;

          // Draw windows icon
          const windowsIcon: Image = this.menuIcons.windowsicon![0];
          ctx.filter = 'invert(100%)';
          const scaledHeight = (ICON_WIDTH / windowsIcon.width) * windowsIcon.height;
          ctx.drawImage(windowsIcon, boundingBox.x + (TASKBAR_WIDTH - ICON_WIDTH) / 2, offset + (CELL_HEIGHT - scaledHeight) / 2, ICON_WIDTH, scaledHeight);
          ctx.filter = 'none';
          offset += CELL_HEIGHT;

          // Draw searchbar
          if (showSearchbar && this.menuIcons.search?.[0]) {
            const icon = this.menuIcons.search?.[0];
            const scaledHeight = (ICON_WIDTH / icon.width) * icon.height;

            ctx.filter = 'invert(100%)';
            ctx.drawImage(icon, boundingBox.x + (TASKBAR_WIDTH - ICON_WIDTH) / 2, offset + (CELL_HEIGHT - scaledHeight) / 2, ICON_WIDTH, scaledHeight);
            ctx.filter = 'none';

            offset += CELL_HEIGHT;
          }
        }
        break;
    }
  }

  private drawAppIcons(config: DrawConfig) {
    if (!config.ctx || !config.taskBar) throw new Error('Bad config');
    const ctx = config.ctx;

    // Draw the app icons
    for (const appIcon of config.taskBar.appIcons) {
      ctx.drawImage(appIcon.image, appIcon.boundingBox.x, appIcon.boundingBox.y, appIcon.boundingBox.width, appIcon.boundingBox.height);

      if (appIcon.isActive) {
        ctx.fillStyle = COLOR_ACTIVITY;
        ctx.fillRect(appIcon.activityBoundingBox.x, appIcon.activityBoundingBox.y, appIcon.activityBoundingBox.width, appIcon.activityBoundingBox.height);
      }
    }
  }

  private drawRightMenu(config: DrawConfig) {
    if (!config.ctx || !config.taskBar) throw new Error('Bad config');
    const {
      ctx,
      taskBar: { boundingBox, orientation },
    } = config;

    if (orientation === 'bottom' || orientation === 'top') {
      // Setup for writing
      ctx.fillStyle = '#ffffffff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';

      let offset = ctx.canvas.width - 10;

      // Divider for "show desktop"
      ctx.fillStyle = '#ffffffff';
      ctx.beginPath();
      ctx.moveTo(offset, boundingBox.y);
      ctx.lineTo(offset, boundingBox.y + boundingBox.height);
      ctx.stroke();
      offset -= MENUICON_PADDING;

      // Feedback
      if (trueWithProbability(0.75) && this.menuIcons.feedback?.length) {
        const icon = getRandomElement(this.menuIcons.feedback);
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
        offset -= scaledWidth + MENUICON_PADDING;
      }

      // Time
      if (trueWithProbability(0.75)) {
        if (trueWithProbability(0.5) && this.menuIcons.clock?.length) {
          // Only icon
          const icon = getRandomElement(this.menuIcons.clock);
          const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
          offset -= scaledWidth + MENUICON_PADDING;
        } else {
          ctx.font = `${TASKBAR_HEIGHT / 3}px serif`;
          const dateFormat: Intl.DateTimeFormatOptions = {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
          };
          const timeFormat: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          };
          const locale = 'en';
          const thresholdLow = new Date(2000, 0, 1);
          const date = new Date(thresholdLow.getTime() + randomBetween(Date.now(), thresholdLow.getTime()));

          const dateString = date.toLocaleString(locale, dateFormat);
          const timeString = date.toLocaleString(locale, timeFormat);

          const { width: dateWidth } = ctx.measureText(dateString);
          const { width: timeWidth } = ctx.measureText(timeString);
          const totalWidth = Math.max(dateWidth, timeWidth);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(dateString, offset - totalWidth / 2, boundingBox.y + TASKBAR_HEIGHT / 2);
          ctx.textBaseline = 'top';
          ctx.fillText(timeString, offset - totalWidth / 2, boundingBox.y + TASKBAR_HEIGHT / 2);

          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';

          offset -= totalWidth + MENUICON_PADDING;
        }
      }

      // Language
      if (trueWithProbability(0.75)) {
        const languageText = getRandomElement(languages);

        ctx.font = `thin ${TASKBAR_HEIGHT / 3}px serif`;
        const { width: textWidth } = ctx.measureText(languageText);
        ctx.fillText(languageText, offset, boundingBox.y + TASKBAR_HEIGHT / 2);
        offset -= textWidth + MENUICON_PADDING;
      }

      // Volume
      if (trueWithProbability(0.75) && this.menuIcons.volume?.length) {
        const icon = getRandomElement(this.menuIcons.volume);
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
        offset -= scaledWidth + MENUICON_PADDING;
      }

      // Network
      if (trueWithProbability(0.75) && this.menuIcons.network?.length) {
        const icon = getRandomElement(this.menuIcons.network);
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
        offset -= scaledWidth + MENUICON_PADDING;
      }

      // Battery
      if (trueWithProbability(0.75) && this.menuIcons.battery?.length) {
        const icon = getRandomElement(this.menuIcons.battery);
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
        offset -= scaledWidth + MENUICON_PADDING;
      }

      // Input Device
      if (trueWithProbability(0.75) && this.menuIcons.inputdevice?.length) {
        const icon = getRandomElement(this.menuIcons.inputdevice);
        const scaledWidth = drawScaledH(ctx, icon, MENUICON_HEIGHT, offset, boundingBox.y + MENUICON_OFFSET_Y, 'right');
        offset -= scaledWidth + MENUICON_PADDING;
      }

      // Arrow
      if (trueWithProbability(0.75)) {
        ctx.save();
        ctx.strokeStyle = '#ffffffff';
        ctx.lineWidth = 3;
        offset -= 6;

        const invert = orientation === 'top' ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(offset, boundingBox.y + TASKBAR_HEIGHT / 2 - invert * 2);
        ctx.lineTo(offset + invert * 6, boundingBox.y + TASKBAR_HEIGHT / 2 + invert * 2);
        ctx.moveTo(offset, boundingBox.y + TASKBAR_HEIGHT / 2 - invert * 2);
        ctx.lineTo(offset - invert * 6, boundingBox.y + TASKBAR_HEIGHT / 2 + invert * 2);
        ctx.stroke();

        ctx.restore();
      }
    } else {
      // Setup for writing
      ctx.fillStyle = '#ffffffff';
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'center';

      let offset = ctx.canvas.height - 10;

      // Divider for "show desktop"
      ctx.fillStyle = '#ffffffff';
      ctx.beginPath();
      ctx.moveTo(boundingBox.x, offset);
      ctx.lineTo(boundingBox.x + boundingBox.width, offset);
      ctx.stroke();
      offset -= MENUICON_PADDING;

      // Feedback
      if (trueWithProbability(0.75) && this.menuIcons.feedback?.length) {
        const icon = getRandomElement(this.menuIcons.feedback);
        drawScaledH(ctx, icon, MENUICON_HEIGHT, boundingBox.x + boundingBox.width / 2, offset - MENUICON_HEIGHT, 'center');
        offset -= MENUICON_HEIGHT + MENUICON_PADDING;
      }

      // Time
      if (trueWithProbability(0.75)) {
        if (trueWithProbability(0.5) && this.menuIcons.clock?.length) {
          // Only icon
          const icon = getRandomElement(this.menuIcons.clock);
          drawScaledH(ctx, icon, MENUICON_HEIGHT, boundingBox.x + boundingBox.width / 2, offset, 'center');
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        } else {
          ctx.font = `${TASKBAR_HEIGHT / 3}px serif`;
          const dateFormat: Intl.DateTimeFormatOptions = {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
          };
          const timeFormat: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          };
          const locale = 'en';
          const thresholdLow = new Date(2000, 0, 1);
          const date = new Date(thresholdLow.getTime() + randomBetween(Date.now(), thresholdLow.getTime()));

          const dateString = date.toLocaleString(locale, dateFormat);
          const timeString = date.toLocaleString(locale, timeFormat);

          const { actualBoundingBoxAscent: dateTop, actualBoundingBoxDescent: dateBottom } = ctx.measureText(dateString);
          const { actualBoundingBoxAscent: timeTop, actualBoundingBoxDescent: timeBottom } = ctx.measureText(timeString);
          const totalHeight = dateTop - dateBottom + timeTop - timeBottom;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(timeString, boundingBox.x + boundingBox.width / 2, offset - totalHeight / 2);
          ctx.textBaseline = 'bottom';
          ctx.fillText(dateString, boundingBox.x + boundingBox.width / 2, offset - totalHeight / 2);

          offset -= totalHeight + MENUICON_PADDING;
        }
      }

      // Language
      if (trueWithProbability(0.75)) {
        const languageText = getRandomElement(languages);

        ctx.font = `thin ${TASKBAR_HEIGHT / 3}px serif`;
        ctx.fillText(languageText, boundingBox.x + boundingBox.width / 2, offset);
        offset -= MENUICON_HEIGHT + MENUICON_PADDING;
      }

      let elemCount = 0;
      // Volume
      if (trueWithProbability(0.75) && this.menuIcons.volume?.length) {
        const icon = getRandomElement(this.menuIcons.volume);
        const offsetX = boundingBox.x + boundingBox.width * (elemCount % 2 === 0 ? 1 / 4 : 3 / 4);
        drawScaledH(ctx, icon, MENUICON_HEIGHT, offsetX, offset - MENUICON_HEIGHT, 'center');
        elemCount++;
        if (elemCount % 2 === 0) {
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        }
      }

      // Network
      if (trueWithProbability(0.75) && this.menuIcons.network?.length) {
        const icon = getRandomElement(this.menuIcons.network);
        const offsetX = boundingBox.x + boundingBox.width * (elemCount % 2 === 0 ? 1 / 4 : 3 / 4);
        drawScaledH(ctx, icon, MENUICON_HEIGHT, offsetX, offset - MENUICON_HEIGHT, 'center');
        elemCount++;
        if (elemCount % 2 === 0) {
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        }
      }

      // Battery
      if (trueWithProbability(0.75) && this.menuIcons.battery?.length) {
        const icon = getRandomElement(this.menuIcons.battery);
        const offsetX = boundingBox.x + boundingBox.width * (elemCount % 2 === 0 ? 1 / 4 : 3 / 4);
        drawScaledH(ctx, icon, MENUICON_HEIGHT, offsetX, offset - MENUICON_HEIGHT, 'center');
        elemCount++;
        if (elemCount % 2 === 0) {
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        }
      }

      // Input Device
      if (trueWithProbability(0.75) && this.menuIcons.inputdevice?.length) {
        const icon = getRandomElement(this.menuIcons.inputdevice);
        const offsetX = boundingBox.x + boundingBox.width * (elemCount % 2 === 0 ? 1 / 4 : 3 / 4);
        drawScaledH(ctx, icon, MENUICON_HEIGHT, offsetX, offset - MENUICON_HEIGHT, 'center');
        elemCount++;
        if (elemCount % 2 === 0) {
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        }
      }

      // Arrow
      if (trueWithProbability(0.75)) {
        // Ensure arrow is on its own row:
        if (elemCount % 2 === 1) {
          offset -= MENUICON_HEIGHT + MENUICON_PADDING;
        }

        ctx.save();
        ctx.strokeStyle = '#ffffffff';
        ctx.lineWidth = 3;
        offset -= 6;

        const invert = orientation === 'right' ? -1 : 1;
        const offsetX = orientation === 'right' ? (1 / 4) * boundingBox.width : (3 / 4) * boundingBox.width;

        ctx.beginPath();
        ctx.moveTo(boundingBox.x + offsetX + invert * 2, offset);
        ctx.lineTo(boundingBox.x + offsetX - invert * 2, offset - invert * 6);
        ctx.moveTo(boundingBox.x + offsetX + invert * 2, offset);
        ctx.lineTo(boundingBox.x + offsetX - invert * 2, offset + invert * 6);
        ctx.stroke();

        ctx.restore();
      }
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

  public override async loadResources() {
    const menuIconPath = `${RESOURCE_PATH}/win/menuicons`;
    const promises: Promise<any>[] = [];

    // Menu icons
    promises.push(...this.loadMenuIcons(menuIconPath, 'network'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'clock'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'cellar'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'battery'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'feedback'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'volume'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'updates'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'inputdevice'));
    promises.push(...this.loadMenuIcons(menuIconPath, 'search'));

    promises.push(loadImage(`${RESOURCE_PATH}/win/windows_black.png`).then((image) => (this.menuIcons.windowsicon = [image])));

    // App icons
    const appIconPath = `${RESOURCE_PATH}/win/appicons`;
    const files = fs.readdirSync(appIconPath);
    for (const file of files) {
      promises.push(loadImage(`${appIconPath}/${file}`).then((image) => this.appIcons.push(image)));
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  public setOrientation(orientation?: Orientation) {
    this.orientation = orientation;
  }

  public setAppCount(appCount?: number) {
    this.appCount = appCount;
  }

  public setAppearance(appearance?: Appearance) {
    this.appearance = appearance;
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.taskBar) throw new Error('Bad config');
    const {
      ctx,
      taskBar: { boundingBox },
    } = config;

    // Draw main area
    ctx.save();
    ctx.beginPath();
    ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    ctx.clip();

    // Make blurry
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
    ctx.fillStyle = COLOR_TASKBAR;
    ctx.fill();
    ctx.restore();

    // Draw elements
    this.drawLeftMenu(config);
    this.drawAppIcons(config);
    this.drawRightMenu(config);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.screen) throw new Error('No screen');

    // Get values
    const orientation = this.orientation ?? getRandomElement(orientations);
    const appCount = this.appCount ?? randomIntBetween(MIN_APP_COUNT, MAX_APP_COUNT);
    const showSearchbar = trueWithProbability(0.5);

    // Prepare dock
    const boundingBox = this.getTaskbarBoundingBox(orientation, config.screen.dimensions);

    // Prepare app icons
    const appIconImages = this.getRandomAppIcons(appCount);
    const appIcons = this.getIconPositions(orientation, appCount, appIconImages, showSearchbar, boundingBox);

    config.taskBar = {
      appearance: this.appearance ?? config.screen.appearance,
      boundingBox,
      orientation,
      appIcons,
      showSearchbar,
    };

    config.annotations.push({ zIndex: Z_IDX_TASKBAR, class: WinClasses.TASKBAR, ...boundingBox });

    return [{ zIndex: Z_IDX_TASKBAR, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
