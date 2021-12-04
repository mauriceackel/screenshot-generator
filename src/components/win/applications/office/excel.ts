import { Dimensions, Point } from '../../../../models/geometry';
import { Appearance } from '../../../../models/appearance';
import { ScreenshotApplication } from '../application';

export default class Excel extends ScreenshotApplication {
  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super('excel', undefined, dimension, position, appearance, probability);
  }
}
