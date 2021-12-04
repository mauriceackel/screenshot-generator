import { getRandomElement } from '../utils/random';

export const appearances: Appearance[] = ['dark', 'light'];
export type Appearance = 'dark' | 'light';
export function getRandomAppearance(): Appearance {
  return getRandomElement(appearances);
}
