import { CanvasRenderingContext2D, Image, loadImage } from 'skia-canvas';
import { Rectangle } from '../../../../models/geometry';
import { DrawConfig, DrawJob } from '../../../../models/jobs';
import { FONT_COLOR } from '../../../../theme/win';
import { Appearance } from '../../../../models/appearance';
import { drawChromeArrow, drawChromeRefreshArrow, drawChromeTab, drawRoundedRect, drawShadow } from '../../../../utils/draw';
import Application from '../application';
import domains from '../../../../assets/domains.json';
import { getRandomElements, randomIntBetween, trueWithProbability } from '../../../../utils/random';
import { WinClasses } from '../../../../models/classes';
import { Z_IDX_APP } from '../../../../models/zindex';
import { RESOURCE_PATH } from '../../../../config';
const { drawBasicImage } = require('canvas-object-fit');

declare module '../../../../models/jobs' {
  export interface DrawConfig {
    edge?: {
      openTabs: { domain: string; image: Image; favicon: Image }[];
      activeTabIdx: number;
      tabWidth: number;
      windowControlsBoundingBox: Rectangle;
      tabbarBoundingBox: Rectangle;
      navbarControlsBoundingBox: Rectangle;
      navbarBoundingBox: Rectangle;
      contentBoundingBox: Rectangle;
      favorites?: {
        elements: { domain: string; image: Image; favicon: Image }[];
        boundingBox: Rectangle;
      };
      autocomplete?: {
        elements: { domain: string; image: Image; favicon: Image }[];
        boundingBox: Rectangle;
      };
    };
  }
}

const CLOSE_BTN_WIDTH = 40;
const HANDLE_HEIGHT = 34;
const NAVBAR_HEIGHT = 40;
const NAVBAR_CONTROLS_WIDTH = 145;
const FAVORITES_HEIGHT = 30;
const TABBAR_MARGIN_TOP = 5;
const TABBAR_MARGIN_X = 150;
const MAX_TAB_WIDTH = 240;
const AUTOCOMPLETE_ROW_HEIGHT = 36;
const TAB_RADIUS = 3;
const HANDLE_COLOR: Record<Appearance, string> = {
  dark: '#1e1e1eff',
  light: '#d3d3d3ff',
};
const NAVBAR_COLOR: Record<Appearance, string> = {
  dark: '#303030ff',
  light: '#f8f8f8ff',
};
const SEPARATOR_COLOR: Record<Appearance, string> = {
  dark: '#b0b0b0ff',
  light: '#303030ff',
};
const TEXTFIELD_COLOR: Record<Appearance, string> = {
  dark: '#111111ff',
  light: '#ffffffff',
};

export default class Edge extends Application {
  private domains: { domain: string; image: Image; favicon: Image }[];

  constructor() {
    super();

    this.domains = [];
  }

  private getNavbarControlsBoundingBox(navbarBoundingBox: Rectangle): Rectangle {
    return {
      x: navbarBoundingBox.x,
      y: navbarBoundingBox.y,
      width: NAVBAR_CONTROLS_WIDTH,
      height: navbarBoundingBox.height,
    };
  }

  private drawHandle(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'edge'>>) {
    const {
      ctx,
      application: { appearance, boundingBox, isActive },
      edge: { openTabs, activeTabIdx, tabbarBoundingBox, tabWidth, navbarBoundingBox, windowControlsBoundingBox },
    } = config;

    // Draw handle background
    ctx.fillStyle = HANDLE_COLOR[appearance];
    ctx.fillRect(boundingBox.x, boundingBox.y, boundingBox.width, HANDLE_HEIGHT);

    // Draw window controls
    this.drawWindowControls(ctx, appearance, windowControlsBoundingBox.x + windowControlsBoundingBox.width, windowControlsBoundingBox.y);

    // Draw tabs
    let offsetLeft = tabbarBoundingBox.x;
    let centerLine = boundingBox.y + TABBAR_MARGIN_TOP + (HANDLE_HEIGHT - TABBAR_MARGIN_TOP) / 2;

    for (let i = 0; i < openTabs.length; i++) {
      if (i === activeTabIdx) {
        ctx.fillStyle = NAVBAR_COLOR[appearance];
        drawChromeTab(ctx, offsetLeft, boundingBox.y + HANDLE_HEIGHT, tabWidth, HANDLE_HEIGHT - TABBAR_MARGIN_TOP, TAB_RADIUS);
        ctx.fill();
      } else {
        if (i + 1 != activeTabIdx && i + 1 != openTabs.length) {
          ctx.beginPath();
          ctx.moveTo(offsetLeft + tabWidth, boundingBox.y + 2 * TABBAR_MARGIN_TOP);
          ctx.lineTo(offsetLeft + tabWidth, boundingBox.y + HANDLE_HEIGHT - TABBAR_MARGIN_TOP);
          ctx.strokeStyle = SEPARATOR_COLOR[appearance];
          ctx.stroke();
        }
      }

      // Tab icon
      offsetLeft += 10;
      const faviconWidth = tabbarBoundingBox.height - 2 * TABBAR_MARGIN_TOP;
      ctx.drawImage(openTabs[i].favicon, offsetLeft, tabbarBoundingBox.y + TABBAR_MARGIN_TOP, faviconWidth, faviconWidth);
      offsetLeft += faviconWidth + 10;

      // Tab text
      ctx.fillStyle = FONT_COLOR[appearance];
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.textWrap = false;
      ctx.font = `bold 16px serif`;
      ctx.fillText(openTabs[i].domain, offsetLeft, centerLine, tabWidth - faviconWidth - 30);
      offsetLeft += tabWidth - (faviconWidth + 20); // = right edge

      // X
      const bgColor = i === activeTabIdx ? NAVBAR_COLOR[appearance].slice(0, -2) : HANDLE_COLOR[appearance].slice(0, -2);
      const closeButtonLeft = offsetLeft - CLOSE_BTN_WIDTH;
      const gradient = ctx.createLinearGradient(closeButtonLeft, centerLine, offsetLeft, centerLine);
      gradient.addColorStop(0, `${bgColor}00`);
      gradient.addColorStop(0.3, `${bgColor}ff`);
      ctx.fillStyle = gradient;
      ctx.fillRect(closeButtonLeft, boundingBox.y + TABBAR_MARGIN_TOP, CLOSE_BTN_WIDTH - TAB_RADIUS, HANDLE_HEIGHT - TABBAR_MARGIN_TOP);
      ctx.beginPath();
      ctx.moveTo(closeButtonLeft + CLOSE_BTN_WIDTH / 2 - 4, centerLine - 4);
      ctx.lineTo(closeButtonLeft + CLOSE_BTN_WIDTH / 2 + 4, centerLine + 4);
      ctx.moveTo(closeButtonLeft + CLOSE_BTN_WIDTH / 2 + 4, centerLine - 4);
      ctx.lineTo(closeButtonLeft + CLOSE_BTN_WIDTH / 2 - 4, centerLine + 4);
      ctx.lineWidth = 2;
      ctx.strokeStyle = FONT_COLOR[appearance];
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawNavbar(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'edge'>>) {
    const {
      ctx,
      application: { appearance },
      edge: { openTabs, activeTabIdx, navbarBoundingBox, navbarControlsBoundingBox },
    } = config;

    // Draw nav bar background
    ctx.fillStyle = NAVBAR_COLOR[appearance];
    ctx.fillRect(navbarBoundingBox.x, navbarBoundingBox.y, navbarBoundingBox.width, navbarBoundingBox.height);

    let offsetLeft = navbarBoundingBox.x + 20;
    let centerLine = navbarBoundingBox.y + navbarBoundingBox.height / 2;

    // Draw navbar content
    ctx.lineWidth = 2;
    ctx.strokeStyle = FONT_COLOR[appearance];
    drawChromeArrow(ctx, offsetLeft, centerLine, 20, navbarBoundingBox.height / 2, 'left');
    ctx.stroke();
    offsetLeft += 20 + 25;
    drawChromeArrow(ctx, offsetLeft, centerLine, 20, navbarBoundingBox.height / 2, 'right');
    ctx.stroke();
    offsetLeft += 20 + 25;
    drawChromeRefreshArrow(ctx, offsetLeft + navbarBoundingBox.height / 4, centerLine, navbarBoundingBox.height / 4);
    ctx.stroke();
    offsetLeft = navbarControlsBoundingBox.x + navbarControlsBoundingBox.width;

    const textFieldWidth = Math.max(navbarBoundingBox.width - (offsetLeft - navbarBoundingBox.x) - 10, 0);
    drawRoundedRect(ctx, offsetLeft, navbarBoundingBox.y + 2, textFieldWidth, navbarBoundingBox.height - 4, 5);
    ctx.fillStyle = TEXTFIELD_COLOR[appearance];
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.font = '13px serif';
    ctx.textWrap = false;
    ctx.fillText(`https://${openTabs[activeTabIdx].domain}`, offsetLeft + 10, centerLine, textFieldWidth - 20);
  }

  private drawAutocomplete(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'edge'>>) {
    const {
      ctx,
      application: { appearance },
    } = config;
    const { elements: autocompletes, boundingBox: autocompleteBoundingBox } = config.edge.autocomplete!;

    // Draw shadow
    drawShadow(ctx, autocompleteBoundingBox.x + 5, autocompleteBoundingBox.y, autocompleteBoundingBox.width - 10, autocompleteBoundingBox.height - 5, 20, false);

    // Draw main rectangle
    drawRoundedRect(ctx, autocompleteBoundingBox.x, autocompleteBoundingBox.y, autocompleteBoundingBox.width, autocompleteBoundingBox.height, 0, 0, 5, 5);
    ctx.fillStyle = NAVBAR_COLOR[appearance];
    ctx.fill();

    let offsetTop = autocompleteBoundingBox.y;
    const faviconHeight = AUTOCOMPLETE_ROW_HEIGHT - 10;

    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.font = '12pt serif';
    ctx.textBaseline = 'middle';

    for (const autocomplete of autocompletes) {
      ctx.drawImage(autocomplete.favicon, autocompleteBoundingBox.x + 10, offsetTop + 5, faviconHeight, faviconHeight);
      ctx.fillText(autocomplete.domain, autocompleteBoundingBox.x + 10 + faviconHeight + 10, offsetTop + AUTOCOMPLETE_ROW_HEIGHT / 2);

      offsetTop += AUTOCOMPLETE_ROW_HEIGHT;
    }
  }

  private drawFavorites(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'edge'>>) {
    const {
      ctx,
      application: { appearance },
    } = config;
    const { boundingBox: favoritesBoundingBox, elements: favorites } = config.edge.favorites!;

    // Draw favorites background
    ctx.fillStyle = NAVBAR_COLOR[appearance];
    ctx.fillRect(favoritesBoundingBox.x, favoritesBoundingBox.y, favoritesBoundingBox.width, favoritesBoundingBox.height);

    let offsetLeft = favoritesBoundingBox.x + 20;
    let centerLine = favoritesBoundingBox.y + favoritesBoundingBox.height / 2;

    ctx.font = '12px serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = FONT_COLOR[appearance];

    for (const favorite of favorites) {
      const shortName = favorite.domain.substring(0, favorite.domain.lastIndexOf('.'));
      const faviconWidth = favoritesBoundingBox.height - 8;
      const { width: textWidth } = ctx.measureText(shortName);

      // Stop as soon as we are out of space
      if (offsetLeft + faviconWidth + 10 + textWidth >= favoritesBoundingBox.x + favoritesBoundingBox.width) {
        break;
      }

      ctx.drawImage(favorite.favicon, offsetLeft, favoritesBoundingBox.y + 4, faviconWidth, faviconWidth);
      offsetLeft += faviconWidth + 10;
      ctx.fillText(shortName, offsetLeft, centerLine);
      offsetLeft += textWidth + 10;
    }
  }

  private drawContent(ctx: CanvasRenderingContext2D, image: Image, boundingBox: Rectangle) {
    drawBasicImage(ctx, image, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, { objectFit: 'cover' });
  }

  protected override draw(config: DrawConfig) {
    if (!config.ctx || !config.application || !config.edge) throw new Error('Bad config');
    const ctx = config.ctx;

    this.drawRawFrame(ctx, config.application.appearance, config.application.boundingBox);

    this.drawHandle({ ctx: config.ctx, application: config.application, edge: config.edge });

    this.drawNavbar({ ctx: config.ctx, application: config.application, edge: config.edge });

    if (config.edge.favorites) {
      this.drawFavorites({ ctx: config.ctx, application: config.application, edge: config.edge });
    }

    this.drawContent(config.ctx, config.edge.openTabs[config.edge.activeTabIdx].image, config.edge.contentBoundingBox);

    if (config.edge.autocomplete) {
      this.drawAutocomplete({ ctx: config.ctx, application: config.application, edge: config.edge });
    }
  }

  public override async loadResources() {
    const websitePath = `${RESOURCE_PATH}/websites`;
    const faviconPath = `${RESOURCE_PATH}/favicons`;

    const promises: Promise<any>[] = [];
    for (const domain of domains) {
      promises.push(
        new Promise<void>(async (resolve, reject) => {
          try {
            const filename = domain.replace(/\./g, '_');

            const image = await loadImage(`${websitePath}/${filename}.jpg`);
            const favicon = await loadImage(`${faviconPath}/${filename}.png`);

            this.domains.push({
              domain,
              image,
              favicon,
            });

            resolve();
          } catch {
            reject();
          }
        }),
      );
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }

  public override getDrawJobs(config: DrawConfig): DrawJob[] {
    const jobs = super.getDrawJobs(config);

    if (!config.application) throw new Error('Missing application');

    const openTabs = getRandomElements(this.domains, randomIntBetween(1, 10));
    const activeTabIdx = randomIntBetween(0, openTabs.length);
    const availableTabbarWidth = config.application.boundingBox.width - TABBAR_MARGIN_X;
    const tabWidth = Math.min(availableTabbarWidth / openTabs.length, MAX_TAB_WIDTH);

    const windowControlsBoundingBox = this.getWindowControlsBoundingBox(config.application.boundingBox.x + config.application.boundingBox.width, config.application.boundingBox.y);

    const tabbarBoundingBox: Rectangle = {
      x: config.application.boundingBox.x + 50, // 40 for menu + 10 margin
      y: config.application.boundingBox.y,
      width: tabWidth * openTabs.length,
      height: HANDLE_HEIGHT,
    };

    const navbarBoundingBox: Rectangle = {
      x: config.application.boundingBox.x,
      y: config.application.boundingBox.y + HANDLE_HEIGHT,
      width: config.application.boundingBox.width,
      height: NAVBAR_HEIGHT,
    };

    const navbarControlsBoundingBox = this.getNavbarControlsBoundingBox(navbarBoundingBox);

    const hasFavorites = trueWithProbability(0.5);
    const hasAutocomplete = trueWithProbability(0.5);

    const contentOffsetY = HANDLE_HEIGHT + NAVBAR_HEIGHT + (hasFavorites ? FAVORITES_HEIGHT : 0);
    const contentBoundingBox = {
      ...config.application.boundingBox,
      y: config.application.boundingBox.y + contentOffsetY,
      height: config.application.boundingBox.height - contentOffsetY,
    };

    config.edge = {
      openTabs,
      activeTabIdx,
      tabWidth,
      tabbarBoundingBox,
      navbarBoundingBox,
      windowControlsBoundingBox,
      contentBoundingBox,
      navbarControlsBoundingBox,
    };

    favorites: if (hasFavorites) {
      const favoritesAmount = randomIntBetween(2, 20);
      const favorites = getRandomElements(this.domains, favoritesAmount);
      const favoritesBoundingBox: Rectangle = {
        x: config.application.boundingBox.x,
        y: navbarBoundingBox.y + navbarBoundingBox.height,
        width: config.application.boundingBox.width,
        height: FAVORITES_HEIGHT,
      };

      // Sanity check
      if (favoritesBoundingBox.width < 0 || favoritesBoundingBox.height < 0) break favorites;

      config.edge.favorites = {
        elements: favorites,
        boundingBox: favoritesBoundingBox,
      };

      config.annotations.push({ zIndex: Z_IDX_APP, class: WinClasses.FAVORITEBAR, ...favoritesBoundingBox });
    }

    autocomplete: if (hasAutocomplete) {
      const maxAutocompleteHeight = contentBoundingBox.height;
      const maxAutocomplete = Math.floor(maxAutocompleteHeight / AUTOCOMPLETE_ROW_HEIGHT);

      const autocompleteAmount = randomIntBetween(1, maxAutocomplete);
      const autocomplete = getRandomElements(this.domains, autocompleteAmount);
      const autocompleteBoundingBox: Rectangle = {
        x: config.application.boundingBox.x + navbarControlsBoundingBox.width,
        y: navbarBoundingBox.y + navbarBoundingBox.height,
        width: navbarBoundingBox.width - navbarControlsBoundingBox.width - 10,
        height: autocompleteAmount * AUTOCOMPLETE_ROW_HEIGHT,
      };

      // Sanity check
      if (autocompleteBoundingBox.width < 0 || autocompleteBoundingBox.height < 0) break autocomplete;

      config.edge.autocomplete = {
        elements: autocomplete,
        boundingBox: autocompleteBoundingBox,
      };

      config.annotations.push({ zIndex: Z_IDX_APP, class: WinClasses.AUTOCOMPLETE, ...autocompleteBoundingBox });
    }

    if (tabbarBoundingBox.width > 0 && tabbarBoundingBox.height > 0) {
      config.annotations.push({ zIndex: Z_IDX_APP, class: WinClasses.TABBAR, ...tabbarBoundingBox });
    }

    config.annotations.push({ zIndex: Z_IDX_APP, class: WinClasses.NAVBAR, ...navbarBoundingBox });

    return jobs;
  }
}
