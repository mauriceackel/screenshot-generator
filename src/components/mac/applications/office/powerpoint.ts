import { Dimensions, Point } from '../../../../models/geometry';
import { Appearance } from '../../../../models/appearance';
import { ScreenshotApplication } from '../application';

export default class Powerpoint extends ScreenshotApplication {
  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super('powerpoint', undefined, dimension, position, appearance, probability);
  }
}
