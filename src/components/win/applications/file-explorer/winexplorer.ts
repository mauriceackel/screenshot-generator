import { WinClasses } from '../../../../models/classes';
import { Dimensions, Point } from '../../../../models/geometry';
import { Appearance } from '../../../../models/appearance';
import { ScreenshotApplication } from '../application';

export default class WinExplorer extends ScreenshotApplication {
  constructor(dimension?: Dimensions, position?: Point, appearance?: Appearance, probability?: number) {
    super('explorer', WinClasses.FILEEXPLORER, dimension, position, appearance, probability);
  }
}
