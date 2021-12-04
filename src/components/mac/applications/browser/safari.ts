import { CanvasRenderingContext2D, Image, loadImage } from 'skia-canvas';
import { Rectangle } from '../../../../models/geometry';
import { DrawConfig, DrawJob } from '../../../../models/jobs';
import { BLUR_OFFSET, BLUR_SIZE, FONT_COLOR } from '../../../../theme/mac';
import { Appearance } from '../../../../models/appearance';
import { drawChromeRefreshArrow, drawRoundedRect, drawSafariArrow, drawShadow } from '../../../../utils/draw';
import Application from '../application';
import domains from '../../../../assets/domains.json';
import { getRandomElements, randomIntBetween, trueWithProbability } from '../../../../utils/random';
import { MacClasses } from '../../../../models/classes';
import { Z_IDX_APP } from '../../../../models/zindex';
import { RESOURCE_PATH } from '../../../../config';
const { drawBasicImage } = require('canvas-object-fit');

declare module '../../../../models/jobs' {
  export interface DrawConfig {
    safari?: {
      openTabs: { domain: string; image: Image; favicon: Image }[];
      activeTabIdx: number;
      tabWidth: number;
      windowControlsBoundingBox: Rectangle;
      tabbarBoundingBox: Rectangle;
      navbarBoundingBox: Rectangle;
      contentBoundingBox: Rectangle;
      favorites?: {
        elements: { domain: string; image: Image; favicon: Image }[];
        boundingBox: Rectangle;
      };
      autocomplete?: {
        elements: { domain: string; image: Image; favicon: Image }[];
        boundingBox: Rectangle;
        isGrid: boolean;
        gridCols: number;
      };
    };
  }
}

const HANDLE_HEIGHT = 40;
const TABBAR_HEIGHT = 30;
const FAVORITES_HEIGHT = 30;
const TABBAR_MARGIN_TOP = 5;
const AUTOCOMPLETE_ROW_HEIGHT = 30;
const MIN_CELL_SIZE = 80;
const HANDLE_COLOR: Record<Appearance, string> = {
  dark: '#383838ff',
  light: '#dcdcdcff',
};
const TABBAR_COLOR: Record<Appearance, string> = {
  dark: '#1a1a1aff',
  light: '#cececeff',
};
const TEXTFIELD_COLOR: Record<Appearance, string> = {
  dark: '#686868ff',
  light: '#ffffffff',
};
const SEPARATOR_COLOR: Record<Appearance, string> = {
  dark: '#b0b0b0ff',
  light: '#bebebeff',
};
const AUTOCOMPLETE_COLOR: Record<Appearance, string> = {
  dark: '#000000a0',
  light: '#ffffffd0',
};

export default class Safari extends Application {
  private domains: { domain: string; image: Image; favicon: Image }[];

  constructor() {
    super();

    this.domains = [];
  }

  private drawHandle(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'safari'>>) {
    const {
      ctx,
      application: { appearance, boundingBox, isActive },
      safari: { openTabs, activeTabIdx, navbarBoundingBox, windowControlsBoundingBox },
    } = config;

    // Draw handle background
    ctx.fillStyle = HANDLE_COLOR[appearance];
    ctx.fillRect(boundingBox.x, boundingBox.y, boundingBox.width, HANDLE_HEIGHT);

    // Draw window controls
    this.drawWindowControls(ctx, appearance, windowControlsBoundingBox.x, windowControlsBoundingBox.y + windowControlsBoundingBox.height / 2, isActive);

    let centerLine = navbarBoundingBox.y + navbarBoundingBox.height / 2;
    let centerPoint = boundingBox.x + boundingBox.width / 2;

    // Draw navbar content
    const textFieldWidth = navbarBoundingBox.width / 2;
    drawRoundedRect(ctx, centerPoint - textFieldWidth / 2, navbarBoundingBox.y + navbarBoundingBox.height / 4, textFieldWidth, navbarBoundingBox.height / 2, 5);
    ctx.fillStyle = TEXTFIELD_COLOR[appearance];
    ctx.fill();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = FONT_COLOR[appearance];
    ctx.font = '13px serif';
    ctx.textWrap = false;
    ctx.fillText(`https://${openTabs[activeTabIdx].domain}`, centerPoint + 10, centerLine, textFieldWidth - 20);

    // Draw controls
    drawChromeRefreshArrow(ctx, centerPoint + textFieldWidth / 2 - 10, centerLine, 5);
    ctx.strokeStyle = FONT_COLOR[appearance];
    ctx.stroke();

    ctx.fillStyle = TEXTFIELD_COLOR[appearance];
    drawRoundedRect(ctx, navbarBoundingBox.x, navbarBoundingBox.y + navbarBoundingBox.height / 4, 20, navbarBoundingBox.height / 2, 5);
    ctx.fill();
    drawRoundedRect(ctx, navbarBoundingBox.x + 25, navbarBoundingBox.y + navbarBoundingBox.height / 4, 20, navbarBoundingBox.height / 2, 5);
    ctx.fill();

    drawSafariArrow(ctx, navbarBoundingBox.x, navbarBoundingBox.y + navbarBoundingBox.height / 4, 20, navbarBoundingBox.height / 2, 'left');
    ctx.stroke();
    drawSafariArrow(ctx, navbarBoundingBox.x + 25, navbarBoundingBox.y + navbarBoundingBox.height / 4, 20, navbarBoundingBox.height / 2, 'right');
    ctx.stroke();
  }

  private drawTabbar(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'safari'>>) {
    const {
      ctx,
      application: { appearance },
      safari: { openTabs, activeTabIdx, tabbarBoundingBox, tabWidth },
    } = config;

    // Draw tab bar background
    ctx.fillStyle = TABBAR_COLOR[appearance];
    ctx.fillRect(tabbarBoundingBox.x, tabbarBoundingBox.y, tabbarBoundingBox.width, tabbarBoundingBox.height);

    let offsetLeft = tabbarBoundingBox.x;
    let centerLine = tabbarBoundingBox.y + tabbarBoundingBox.height / 2;

    // Draw tabs
    for (let i = 0; i < openTabs.length; i++) {
      if (i === activeTabIdx) {
        ctx.fillStyle = HANDLE_COLOR[appearance];
        ctx.fillRect(offsetLeft, tabbarBoundingBox.y, tabWidth, tabbarBoundingBox.height);
      } else {
        if (i + 1 != activeTabIdx && i + 1 != openTabs.length) {
          ctx.beginPath();
          ctx.moveTo(offsetLeft + tabWidth, tabbarBoundingBox.y);
          ctx.lineTo(offsetLeft + tabWidth, tabbarBoundingBox.y + TABBAR_HEIGHT);
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
      ctx.font = `12px serif`;
      ctx.fillText(openTabs[i].domain, offsetLeft, centerLine, tabWidth - faviconWidth - 30);
      offsetLeft += tabWidth - (faviconWidth + 20); // = right edge
    }
    ctx.restore();
  }

  private drawAutocomplete(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'safari'>>) {
    const {
      ctx,
      application: { appearance },
    } = config;
    const { elements: autocompletes, boundingBox: autocompleteBoundingBox, isGrid, gridCols } = config.safari.autocomplete!;

    // Draw shadow
    drawShadow(ctx, autocompleteBoundingBox.x + 5, autocompleteBoundingBox.y + 5, autocompleteBoundingBox.width - 10, autocompleteBoundingBox.height - 10, 20, false);

    // Draw main rectangle
    drawRoundedRect(ctx, autocompleteBoundingBox.x, autocompleteBoundingBox.y, autocompleteBoundingBox.width, autocompleteBoundingBox.height, 5);
    // Make blurry
    ctx.save();
    ctx.clip();
    ctx.filter = `blur(${BLUR_SIZE}px)`;
    ctx.drawImage(
      ctx.canvas,
      autocompleteBoundingBox.x,
      autocompleteBoundingBox.y,
      autocompleteBoundingBox.width,
      autocompleteBoundingBox.height,
      autocompleteBoundingBox.x - BLUR_OFFSET,
      autocompleteBoundingBox.y - BLUR_OFFSET,
      autocompleteBoundingBox.width + 2 * BLUR_OFFSET,
      autocompleteBoundingBox.height + 2 * BLUR_OFFSET,
    );
    // Set color
    ctx.fillStyle = AUTOCOMPLETE_COLOR[appearance];
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();

    let offsetTop = autocompleteBoundingBox.y;
    const faviconHeight = AUTOCOMPLETE_ROW_HEIGHT - 10;

    // Set content
    if (isGrid) {
      // Grid view
      const cellSize = autocompleteBoundingBox.width / gridCols;

      ctx.fillStyle = FONT_COLOR[appearance];
      ctx.font = 'bold 12pt serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';

      for (let i = 0; i < autocompletes.length; i++) {
        const autocomplete = autocompletes[i];
        const x = (i % gridCols) * cellSize;
        const y = Math.floor(i / gridCols) * cellSize;
        const imageSize = cellSize - 60;

        drawBasicImage(ctx, autocomplete.favicon, autocompleteBoundingBox.x + x + 30, autocompleteBoundingBox.y + y + 30, imageSize, imageSize, { objectFit: 'cover' });
        ctx.fillText(autocomplete.domain, autocompleteBoundingBox.x + x + cellSize / 2, autocompleteBoundingBox.y + y + 30 + imageSize, cellSize - 20);
      }
    } else {
      // Row view
      ctx.fillStyle = FONT_COLOR[appearance];
      ctx.font = '12pt serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      for (const autocomplete of autocompletes) {
        if (trueWithProbability(0.75)) {
          ctx.drawImage(autocomplete.favicon, autocompleteBoundingBox.x + 10, offsetTop + 5, faviconHeight, faviconHeight);
        }
        ctx.fillText(autocomplete.domain, autocompleteBoundingBox.x + 10 + faviconHeight + 10, offsetTop + AUTOCOMPLETE_ROW_HEIGHT / 2);

        offsetTop += AUTOCOMPLETE_ROW_HEIGHT;
      }
    }
  }

  private drawFavorites(config: Required<Pick<DrawConfig, 'ctx' | 'application' | 'safari'>>) {
    const {
      ctx,
      application: { appearance },
    } = config;
    const { boundingBox: favoritesBoundingBox, elements: favorites } = config.safari.favorites!;

    // Draw favorites background
    ctx.fillStyle = HANDLE_COLOR[appearance];
    ctx.fillRect(favoritesBoundingBox.x, favoritesBoundingBox.y, favoritesBoundingBox.width, favoritesBoundingBox.height);

    // Draw top border
    ctx.strokeStyle = SEPARATOR_COLOR[appearance];
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(favoritesBoundingBox.x, favoritesBoundingBox.y);
    ctx.lineTo(favoritesBoundingBox.x + favoritesBoundingBox.width, favoritesBoundingBox.y);
    ctx.stroke();

    let centerLine = favoritesBoundingBox.y + favoritesBoundingBox.height / 2;
    let centerPoint = favoritesBoundingBox.x + favoritesBoundingBox.width / 2;

    ctx.font = '12px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = FONT_COLOR[appearance];

    const combinedName = favorites.map((f) => f.domain.substring(0, f.domain.lastIndexOf('.'))).join('\t\t\t');
    ctx.fillText(combinedName, centerPoint, centerLine, favoritesBoundingBox.width);
  }

  private drawContent(ctx: CanvasRenderingContext2D, image: Image, boundingBox: Rectangle) {
    drawBasicImage(ctx, image, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, { objectFit: 'cover' });
  }

  protected override draw(config: DrawConfig) {
    if (!config.ctx || !config.application || !config.safari) throw new Error('Bad config');
    const ctx = config.ctx;

    this.drawRawFrame(ctx, config.application.appearance, config.application.boundingBox);

    this.drawHandle({ ctx: config.ctx, application: config.application, safari: config.safari });

    this.drawTabbar({ ctx: config.ctx, application: config.application, safari: config.safari });

    if (config.safari.favorites) {
      this.drawFavorites({ ctx: config.ctx, application: config.application, safari: config.safari });
    }

    this.drawContent(config.ctx, config.safari.openTabs[config.safari.activeTabIdx].image, config.safari.contentBoundingBox);

    if (config.safari.autocomplete) {
      this.drawAutocomplete({ ctx: config.ctx, application: config.application, safari: config.safari });
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
    const tabWidth = config.application.boundingBox.width / openTabs.length;

    const hasFavorites = trueWithProbability(0.5);
    const hasAutocomplete = trueWithProbability(0.5);

    const windowControlsBoundingBox = this.getWindowControlsBoundingBox(config.application.boundingBox.x + 20, config.application.boundingBox.y + HANDLE_HEIGHT / 2);

    const navbarBoundingBox: Rectangle = {
      x: windowControlsBoundingBox.x + windowControlsBoundingBox.width + 10,
      y: config.application.boundingBox.y,
      width: config.application.boundingBox.width - (windowControlsBoundingBox.x + windowControlsBoundingBox.width + 10 - config.application.boundingBox.x),
      height: HANDLE_HEIGHT,
    };

    const tabbarBoundingBox: Rectangle = {
      x: config.application.boundingBox.x,
      y: config.application.boundingBox.y + HANDLE_HEIGHT + (hasFavorites ? FAVORITES_HEIGHT : 0),
      width: config.application.boundingBox.width,
      height: TABBAR_HEIGHT,
    };

    const contentOffsetY = HANDLE_HEIGHT + TABBAR_HEIGHT + (hasFavorites ? FAVORITES_HEIGHT : 0);
    const contentBoundingBox = {
      ...config.application.boundingBox,
      y: config.application.boundingBox.y + contentOffsetY,
      height: config.application.boundingBox.height - contentOffsetY,
    };

    config.safari = {
      openTabs,
      activeTabIdx,
      tabWidth,
      tabbarBoundingBox,
      navbarBoundingBox,
      windowControlsBoundingBox,
      contentBoundingBox,
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

      config.safari.favorites = {
        elements: favorites,
        boundingBox: favoritesBoundingBox,
      };

      config.annotations.push({ zIndex: Z_IDX_APP, class: MacClasses.FAVORITEBAR, ...favoritesBoundingBox });
    }

    autocomplete: if (hasAutocomplete) {
      const autocompleteWidth = navbarBoundingBox.width / 2;
      const maxAutocompleteHeight = contentBoundingBox.height;
      const isGrid = trueWithProbability(0.5);

      let maxAutocompleteAmount;
      const gridCols = Math.min(Math.floor(autocompleteWidth / MIN_CELL_SIZE), 6);

      if (gridCols == 0) break autocomplete;

      const cellHeight = autocompleteWidth / gridCols;
      if (isGrid) {
        maxAutocompleteAmount = Math.ceil(maxAutocompleteHeight / cellHeight) * gridCols;
      } else {
        maxAutocompleteAmount = Math.floor(maxAutocompleteHeight / AUTOCOMPLETE_ROW_HEIGHT);
      }
      const autocompleteAmount = randomIntBetween(1, maxAutocompleteAmount);

      const autocomplete = getRandomElements(this.domains, autocompleteAmount);
      const autocompleteBoundingBox: Rectangle = {
        x: config.application.boundingBox.x + (config.application.boundingBox.width - autocompleteWidth) / 2,
        y: navbarBoundingBox.y + (3 / 4) * navbarBoundingBox.height,
        width: autocompleteWidth,
        height: isGrid ? Math.ceil(autocompleteAmount / 6) * cellHeight : autocompleteAmount * AUTOCOMPLETE_ROW_HEIGHT,
      };

      // Sanity check
      if (autocompleteBoundingBox.width < 0 || autocompleteBoundingBox.height < 0) break autocomplete;

      config.safari.autocomplete = {
        elements: autocomplete,
        boundingBox: autocompleteBoundingBox,
        isGrid,
        gridCols,
      };

      config.annotations.push({ zIndex: Z_IDX_APP, class: MacClasses.AUTOCOMPLETE, ...autocompleteBoundingBox });
    }

    if (tabbarBoundingBox.width > 0 && tabbarBoundingBox.height > 0) {
      config.annotations.push({ zIndex: Z_IDX_APP, class: MacClasses.TABBAR, ...tabbarBoundingBox });
    }
    
    config.annotations.push({ zIndex: Z_IDX_APP, class: MacClasses.NAVBAR, ...navbarBoundingBox });

    return jobs;
  }
}
