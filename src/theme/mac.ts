import { Appearance } from "../models/appearance";

// Application
export const COLOR_APP_BORDER: Record<Appearance, string> = {
  dark: '#787878',
  light: '#d2d2d2',
};
export const CLOSE_COLOR: string = '#fa4d4d';
export const MINIMIZE_COLOR: string = '#fab83d';
export const MAXIMIZE_COLOR: string = '#2bc948';
export const INACTIVE_COLOR: Record<Appearance, string> = {
  dark: '#585858',
  light: '#d7d7d7',
};
export const HANDLEBAR_START_COLOR: Record<Appearance, string> = {
  dark: '#3a3a3a',
  light: '#e0e0e0',
};
export const HANDLEBAR_STOP_COLOR: Record<Appearance, string> = {
  dark: '#303030',
  light: '#c8c8c8',
};
export const HANDLEBAR_COLOR_INACTIVE: Record<Appearance, string> = {
  dark: '#282828',
  light: '#f5f5f5',
};

// Dock
export const COLOR_DOCK: Record<Appearance, string> = {
  dark: '#000000a0',
  light: '#ffffffd0',
};
export const COLOR_DOCK_BORDER: Record<Appearance, string> = {
  dark: '#646464',
  light: '#00000000',
};
export const COLOR_ACTIVITY: Record<Appearance, string> = {
  dark: '#ffffff50',
  light: '#000000',
};

// Menu bar
export const COLOR_MENUBAR = COLOR_DOCK;
export const COLOR_MENUBAR_BORDER: Record<Appearance, string> = {
  dark: '#0a0a0a80',
  light: '#00000000',
};
export const MENUBAR_HEIGHT = 24;

export const FONT_COLOR: Record<Appearance, string> = {
  dark: '#ffffff',
  light: '#000000',
};

export const BLUR_SIZE = 20;
export const BLUR_OFFSET = 2 * BLUR_SIZE;
