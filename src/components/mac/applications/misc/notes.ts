import { Rectangle } from '../../../../models/geometry';
import { DrawConfig, DrawJob } from '../../../../models/jobs';
import { FONT_COLOR } from '../../../../theme/mac';
import { Appearance } from '../../../../models/appearance';
import Application from '../application';
import loremIpsum from '../../../../assets/lorem-ipsum.json';
import { getRandomElements, randomIntBetween } from '../../../../utils/random';
import { drawRoundedRect } from '../../../../utils/draw';

declare module '../../../../models/jobs' {
  export interface DrawConfig {
    notes?: {
      entries: { title: string; text: string }[];
      activeIdx: number;
      windowControlsBoundingBox: Rectangle;
      contentBoundingBox: Rectangle;
      sidebarBoundingBox: Rectangle;
    };
  }
}

const HANDLE_HEIGHT = 40;
const ENTRY_HEIGHT = 60;
const BUTTON_HEIGHT = HANDLE_HEIGHT - 15;
const BUTTON_WIDTH = 40;
const TEXT_PADDING = 10;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const HANDLE_COLOR: Record<Appearance, string> = {
  dark: '#383838ff',
  light: '#dcdcdcff',
};
const BORDER_COLOR: Record<Appearance, string> = {
  dark: '#000000ff',
  light: '#ffffffff',
};
const SIDENAV_COLOR: Record<Appearance, string> = {
  dark: '#1c1c1cff',
  light: '#fafafaff',
};
const CONTENT_COLOR: Record<Appearance, string> = {
  dark: '#242424ff',
  light: '#fafafaff',
};
const DIVIDER_COLOR: Record<Appearance, string> = {
  dark: '#323232ff',
  light: '#dfdfdfff',
};
const HIGHLIGHT_COLOR: Record<Appearance, string> = {
  dark: '#c88d2dff',
  light: '#fdde8cff',
};
const BUTTON_COLOR: Record<Appearance, string> = {
  dark: '#5e5e5eff',
  light: '#f5f5f5ff',
};

export default class Notes extends Application {
  constructor() {
    super();
  }

  private drawHandle(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'notes'>>) {
    const {
      ctx,
      application: { appearance, boundingBox, isActive },
      notes: { windowControlsBoundingBox },
    } = config;

    // Draw handle background
    ctx.fillStyle = HANDLE_COLOR[appearance];
    ctx.fillRect(boundingBox.x, boundingBox.y, boundingBox.width, HANDLE_HEIGHT);

    // Draw window controls
    this.drawWindowControls(ctx, appearance, windowControlsBoundingBox.x, windowControlsBoundingBox.y + windowControlsBoundingBox.height / 2, isActive);

    const centerLine = boundingBox.y + HANDLE_HEIGHT / 2;

    // Draw buttons
    ctx.fillStyle = BUTTON_COLOR[appearance];
    let offsetLeft = windowControlsBoundingBox.x + windowControlsBoundingBox.width;
    let i = 0;
    while (i < 10 && offsetLeft + BUTTON_WIDTH < boundingBox.x + boundingBox.width) {
      drawRoundedRect(ctx, offsetLeft, centerLine - BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT, 5);
      ctx.fill();

      const nextGap = randomIntBetween(4, 30);
      offsetLeft += BUTTON_WIDTH + nextGap;
      i++;
    }

    // Draw border
    ctx.strokeStyle = BORDER_COLOR[appearance];
    ctx.beginPath();
    ctx.moveTo(boundingBox.x, boundingBox.y + HANDLE_HEIGHT);
    ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + HANDLE_HEIGHT);
    ctx.stroke();
  }

  private drawSidenav(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'notes'>>) {
    const {
      ctx,
      application: { appearance },
      notes: { sidebarBoundingBox, entries, activeIdx },
    } = config;

    ctx.fillStyle = SIDENAV_COLOR[appearance];
    ctx.fillRect(sidebarBoundingBox.x, sidebarBoundingBox.y, sidebarBoundingBox.width, sidebarBoundingBox.height);

    let offsetTop = sidebarBoundingBox.y;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if ((i + 1) * ENTRY_HEIGHT > sidebarBoundingBox.height) {
        break;
      }

      if (i === activeIdx) {
        ctx.fillStyle = HIGHLIGHT_COLOR[appearance];
        ctx.fillRect(sidebarBoundingBox.x, offsetTop, sidebarBoundingBox.width, ENTRY_HEIGHT);
      }

      ctx.strokeStyle = DIVIDER_COLOR[appearance];
      ctx.beginPath();
      ctx.moveTo(sidebarBoundingBox.x + 2 * TEXT_PADDING, offsetTop);
      ctx.lineTo(sidebarBoundingBox.x + sidebarBoundingBox.width, offsetTop);
      ctx.stroke();

      // Set text content
      ctx.fillStyle = FONT_COLOR[appearance];
      ctx.textBaseline = 'top';
      ctx.textAlign = 'start';

      ctx.font = 'bold 16px serif';
      ctx.fillText(entry.title, sidebarBoundingBox.x + 2 * TEXT_PADDING, offsetTop + TEXT_PADDING, sidebarBoundingBox.width - 3 * TEXT_PADDING);
      const { actualBoundingBoxDescent: headingBottom } = ctx.measureText(entry.title);

      ctx.font = '300 12px serif';
      ctx.textWrap = false;
      ctx.fillText(entry.text, sidebarBoundingBox.x + 2 * TEXT_PADDING, offsetTop + TEXT_PADDING + headingBottom, sidebarBoundingBox.width - 3 * TEXT_PADDING);

      offsetTop += ENTRY_HEIGHT;
    }

    ctx.strokeStyle = DIVIDER_COLOR[appearance];
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(sidebarBoundingBox.x + sidebarBoundingBox.width, sidebarBoundingBox.y);
    ctx.lineTo(sidebarBoundingBox.x + sidebarBoundingBox.width, sidebarBoundingBox.y + sidebarBoundingBox.height);
    ctx.stroke();
    ctx.restore();
  }

  private drawContent(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'notes'>>) {
    const {
      ctx,
      application: { appearance },
      notes: { contentBoundingBox, entries, activeIdx },
    } = config;

    ctx.fillStyle = CONTENT_COLOR[appearance];
    ctx.fillRect(contentBoundingBox.x, contentBoundingBox.y, contentBoundingBox.width, contentBoundingBox.height);

    // Set text content
    const entry = entries[activeIdx];

    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    ctx.font = 'bold 24px serif';
    ctx.fillText(entry.title, contentBoundingBox.x + TEXT_PADDING, contentBoundingBox.y + TEXT_PADDING, contentBoundingBox.width - 2 * TEXT_PADDING);
    const { actualBoundingBoxDescent: headingBottom } = ctx.measureText(entry.title);

    ctx.font = '300 12px serif';
    ctx.textWrap = true;
    const text = entry.text + getRandomElements(loremIpsum, 20).join('\n');

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentBoundingBox.x, contentBoundingBox.y, contentBoundingBox.width, contentBoundingBox.height);
    ctx.clip();

    ctx.fillText(text, contentBoundingBox.x + TEXT_PADDING, contentBoundingBox.y + TEXT_PADDING + headingBottom, contentBoundingBox.width - 2 * TEXT_PADDING);
    ctx.restore();
  }

  protected override draw(config: DrawConfig) {
    if (!config.ctx || !config.application || !config.notes) throw new Error('Bad config');
    const ctx = config.ctx;

    this.drawRawFrame(ctx, config.application.appearance, config.application.boundingBox);

    this.drawHandle({ ctx: config.ctx, application: config.application, notes: config.notes });

    this.drawSidenav({ ctx: config.ctx, application: config.application, notes: config.notes });

    this.drawContent({ ctx: config.ctx, application: config.application, notes: config.notes });
  }

  public override async loadResources() {}

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    const jobs = super.getDrawJobs(config);

    if (!config.application) throw new Error('Missing application');

    const rawEntries = getRandomElements(loremIpsum, randomIntBetween(1, 10));
    const entries = rawEntries.map((entry) => {
      const words = entry.split(' ');
      const title = words.slice(0, 2).join(' '); // Get first two words
      const text = words.slice(2).join(' ');

      return { title, text };
    });

    const activeIdx = randomIntBetween(0, entries.length);

    const windowControlsBoundingBox = this.getWindowControlsBoundingBox(config.application.boundingBox.x + 20, config.application.boundingBox.y + HANDLE_HEIGHT / 2);

    const sidebarBoundingBox: Rectangle = {
      x: config.application.boundingBox.x,
      y: config.application.boundingBox.y + HANDLE_HEIGHT,
      width: Math.max(Math.min(config.application.boundingBox.width / 5, MAX_SIDEBAR_WIDTH), MIN_SIDEBAR_WIDTH),
      height: config.application.boundingBox.height - HANDLE_HEIGHT,
    };

    const contentBoundingBox = {
      x: config.application.boundingBox.x + sidebarBoundingBox.width,
      y: config.application.boundingBox.y + HANDLE_HEIGHT,
      width: config.application.boundingBox.width - sidebarBoundingBox.width,
      height: config.application.boundingBox.height - HANDLE_HEIGHT,
    };

    config.notes = {
      activeIdx,
      entries,
      windowControlsBoundingBox,
      sidebarBoundingBox,
      contentBoundingBox,
    };

    // No additional annotation here

    return jobs;
  }
}
