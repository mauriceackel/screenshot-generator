import Component from '../component';
import { DrawConfig, DrawJob } from '../../models/jobs';
import fileNames from '../../assets/file-names.json';
import fileExtensions from '../../assets/file-extensions.json';
import { loadImage, Image } from 'skia-canvas';
import { RESOURCE_PATH } from '../../config';
import { Rectangle } from '../../models/geometry';
import { getRandomElement, randomIntBetween, randomMax, trueWithProbability } from '../../utils/random';
import { MacClasses } from '../../models/classes';
import { Z_IDX_FILE } from '../../models/zindex';
import fs from 'fs';
import { drawRoundedRect } from '../../utils/draw';

const MIN_FILE_COUNT = 5;
const MAX_FILE_COUNT = 30;
const FILE_ICON_HEIGHT = 60;
const TEXT_MARGIN = 20;
const FONT_COLOR = '#ffffff';
const FONT = 'bold 16px serif';
const TEXT_ALIGN = 'center';
const TEXT_BASELINE = 'top';
const TEXT_WRAP = true;

type FileConfig = {
  isFolder: boolean;
  icon: Image;
  fileName: string;
  iconBoundingBox: Rectangle;
  boundingBox: Rectangle;
  highlightState: number; // 0 = none, 1 = active selection, 2 = inactive selection
};

declare module '../../models/jobs' {
  export interface DrawConfig {
    desktopFiles?: {
      files: FileConfig[];
    };
  }
}

export default class DesktopFiles extends Component {
  private fileIcons: Record<string, Image[] | undefined>;
  private fileCount?: number;

  constructor(fileCount?: number) {
    super();

    this.fileCount = fileCount;
    this.fileIcons = {};
  }

  private getRandomFileName(isFolder: boolean): string {
    let fileName = getRandomElement(fileNames);

    if (!isFolder) {
      const fileExtension = getRandomElement(fileExtensions);
      fileName += fileExtension;
    }

    return fileName;
  }

  private loadFileIcons(basePath: string, name: string): Promise<any>[] {
    const path = `${basePath}/${name}`;
    const files = fs.readdirSync(path);

    this.fileIcons[name] = [];
    const promises: Promise<any>[] = [];
    for (const file of files) {
      promises.push(loadImage(`${path}/${file}`).then((image) => this.fileIcons[name]!.push(image)));
    }

    return promises;
  }

  public override async loadResources(): Promise<void> {
    const promises: Promise<any>[] = [];

    const fileIconsPath = `${RESOURCE_PATH}/mac/fileicons`;
    promises.push(...this.loadFileIcons(fileIconsPath, 'files'));
    promises.push(...this.loadFileIcons(fileIconsPath, 'folders'));

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  public setFileCount(count?: number) {
    this.fileCount = count;
  }

  protected draw(config: DrawConfig): void {
    if (!config.ctx || !config.desktopFiles) throw new Error('Bad config');
    const ctx = config.ctx;

    for (const fileConfig of config.desktopFiles.files) {
      ctx.drawImage(fileConfig.icon, fileConfig.iconBoundingBox.x, fileConfig.iconBoundingBox.y, fileConfig.iconBoundingBox.width, fileConfig.iconBoundingBox.height);

      ctx.font = FONT;
      ctx.textAlign = TEXT_ALIGN;
      ctx.textBaseline = TEXT_BASELINE;
      ctx.textWrap = TEXT_WRAP;

      // Highlight
      switch (fileConfig.highlightState) {
        case 0:
          {
            // No selection
            ctx.fillStyle = FONT_COLOR;

            ctx.fillText(
              fileConfig.fileName,
              fileConfig.boundingBox.x + fileConfig.boundingBox.width / 2,
              fileConfig.boundingBox.y + fileConfig.iconBoundingBox.height + 4,
              fileConfig.iconBoundingBox.width + TEXT_MARGIN * 2,
            );
          }
          break;
        case 1:
          {
            // Active selection
            ctx.save();
            ctx.strokeStyle = '#646464ff';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, fileConfig.iconBoundingBox.x - 2, fileConfig.iconBoundingBox.y - 2, fileConfig.iconBoundingBox.width + 4, fileConfig.iconBoundingBox.height + 4, 4);
            ctx.stroke();
            ctx.restore();

            const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(fileConfig.fileName, fileConfig.iconBoundingBox.width + TEXT_MARGIN * 2);
            const height = Math.abs(actualBoundingBoxAscent - actualBoundingBoxDescent);

            ctx.fillStyle = '#1e5ac8ff';
            drawRoundedRect(ctx, fileConfig.boundingBox.x + (fileConfig.boundingBox.width - width) / 2 - 2, fileConfig.boundingBox.y + fileConfig.iconBoundingBox.height + 4, width + 4, height + 2, 4);
            ctx.fill();

            ctx.fillStyle = FONT_COLOR;
            ctx.fillText(
              fileConfig.fileName,
              fileConfig.boundingBox.x + fileConfig.boundingBox.width / 2,
              fileConfig.boundingBox.y + fileConfig.iconBoundingBox.height + 4,
              fileConfig.iconBoundingBox.width + TEXT_MARGIN * 2,
            );
          }
          break;
        case 2:
          {
            // Inactive selection
            ctx.save();
            ctx.strokeStyle = '#646464ff';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, fileConfig.iconBoundingBox.x - 2, fileConfig.iconBoundingBox.y - 2, fileConfig.iconBoundingBox.width + 4, fileConfig.iconBoundingBox.height + 4, 4);
            ctx.stroke();
            ctx.restore();

            const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(fileConfig.fileName, fileConfig.iconBoundingBox.width + TEXT_MARGIN * 2);
            const height = Math.abs(actualBoundingBoxAscent - actualBoundingBoxDescent);

            ctx.fillStyle = '#d0d0d0ff';
            drawRoundedRect(ctx, fileConfig.boundingBox.x + (fileConfig.boundingBox.width - width) / 2 - 2, fileConfig.boundingBox.y + fileConfig.iconBoundingBox.height + 4, width + 4, height + 2, 4);
            ctx.fill();

            ctx.fillStyle = '#707070ff';
            ctx.fillText(
              fileConfig.fileName,
              fileConfig.boundingBox.x + fileConfig.boundingBox.width / 2,
              fileConfig.boundingBox.y + fileConfig.iconBoundingBox.height + 4,
              fileConfig.iconBoundingBox.width + TEXT_MARGIN * 2,
            );
          }
          break;
        default:
          throw new Error('Unknown highlighting type');
      }
    }
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    if (!config.ctx) throw new Error('No context');
    if (!config.screen) throw new Error('No screen');

    const fileCount = this.fileCount ?? randomIntBetween(MIN_FILE_COUNT, MAX_FILE_COUNT);
    const files: FileConfig[] = [];

    for (let i = 0; i < fileCount; i++) {
      const isFolder = trueWithProbability(0.5);
      const iconSet = isFolder ? this.fileIcons.folders : this.fileIcons.files;
      if (!iconSet) continue;

      const icon = getRandomElement(iconSet);
      if (!icon) continue;

      // Icon
      const iconX = randomMax(config.screen.dimensions.width);
      const iconY = randomMax(config.screen.dimensions.height);
      const scaledWidth = (FILE_ICON_HEIGHT / icon.height) * icon.width;
      const iconBoundingBox: Rectangle = { x: iconX, y: iconY, width: scaledWidth, height: FILE_ICON_HEIGHT };

      // Text
      const fileName = this.getRandomFileName(isFolder);
      // This is required for measurement here
      config.ctx.font = FONT;
      config.ctx.textAlign = TEXT_ALIGN;
      config.ctx.textBaseline = TEXT_BASELINE;
      config.ctx.textWrap = TEXT_WRAP;
      const { width: textWidth, actualBoundingBoxAscent, actualBoundingBoxDescent } = config.ctx.measureText(fileName, iconBoundingBox.width + TEXT_MARGIN * 2);
      const textHeight = actualBoundingBoxDescent - actualBoundingBoxAscent;

      // Highlighting
      const highlightState = randomIntBetween(0, 3);

      // Overall
      const fullWidth = Math.max(scaledWidth, textWidth);
      const totalX = iconX + (scaledWidth - fullWidth) / 2;
      const boundingBox: Rectangle = { x: totalX, y: iconY, width: fullWidth, height: iconBoundingBox.height + 4 + textHeight };

      files.push({
        isFolder,
        icon,
        fileName,
        iconBoundingBox,
        boundingBox,
        highlightState,
      });
    }

    config.desktopFiles = {
      files,
    };

    config.annotations.push(
      ...files.map((fileConfig) => ({
        zIndex: Z_IDX_FILE,
        class: MacClasses.FILE,
        ...fileConfig.boundingBox,
      })),
    );

    return [{ zIndex: Z_IDX_FILE, drawFunction: this.draw.bind(this) }, ...super.getDrawJobs(config)];
  }
}
