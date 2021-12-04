import { Dimensions } from '../../models/geometry';
import DesktopFiles from './desktop-files';
import TaskBar from './taskbar';
import { Notification } from './notification';
import { RandomApplication } from './applications/application';
import Screen from '../screen';
import { RESOURCE_PATH } from '../../config';
import { loadImage } from 'skia-canvas';
import fs from 'fs';

export default class WinScreen extends Screen {
  constructor(dimension?: Dimensions) {
    super(dimension);

    // Add children
    const files = new DesktopFiles();
    this.addComponent(files);
    const taskBar = new TaskBar();
    this.addComponent(taskBar);
    const notification = new Notification('dark');
    this.addComponent(notification);
    const application = new RandomApplication();
    this.addComponent(application);
  }

  public override async loadResources(): Promise<void> {
    const promises: Promise<any>[] = [];

    const backgroundsPath = `${RESOURCE_PATH}/win/backgrounds`;
    const backgroundFiles = fs.readdirSync(backgroundsPath);
    for (const file of backgroundFiles) {
      promises.push(loadImage(`${backgroundsPath}/${file}`).then((image) => this.backgrounds.push(image)));
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }
}

export class WinBackgroundScreen extends WinScreen {
  constructor(dimension?: Dimensions) {
    super(dimension);

    // No children
    this.clearComponents();
  }
}
