import { Appearance } from "../models/appearance";

// Application
export const COLOR_APP_BORDER = '#ffffff';
export const HANDLEBAR_COLOR = '#ffffff';

export const COLOR_NOTIFICATION = '#202020';

export const CLOSE_COLOR = '#da3030';

export const MAXIMIZE_COLOR: Record<Appearance, string> = {
  dark: '#ffffff16',
  light: '#00000016',
};

export const MINIMIZE_COLOR: Record<Appearance, string> = {
  dark: '#ffffff16',
  light: '#00000016',
};

export const FONT_COLOR: Record<Appearance, string> = {
  dark: '#ffffff',
  light: '#000000',
};

export const BLUR_SIZE = 20;
export const BLUR_OFFSET = 2 * BLUR_SIZE;
