import { MacClasses } from '../../../../models/classes';
import { Dimensions, Point } from '../../../../models/geometry';
import { Appearance } from '../../../../models/appearance';
import { ScreenshotApplication } from '../application';

export default class Finder extends ScreenshotApplication {
  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super('finder', MacClasses.FILEEXPLORER, dimension, position, appearance, probability);
  }
}
