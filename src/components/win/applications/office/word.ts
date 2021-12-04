import { Dimensions, Point } from '../../../../models/geometry';
import { Appearance } from '../../../../models/appearance';
import { ScreenshotApplication } from '../application';

export default class Word extends ScreenshotApplication {
  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super('word', undefined, dimension, position, appearance, probability);
  }
}
