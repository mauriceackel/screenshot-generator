import { Dimensions } from '../../models/geometry';
import DesktopFiles from './desktop-files';
import Dock from './dock';
import MenuBar from './menubar';
import { Notification } from './notification';
import { RandomApplication } from './applications/application';
import Screen from '../screen';
import { RESOURCE_PATH } from '../../config';
import fs from 'fs';
import { loadImage } from 'skia-canvas';

export default class MacScreen extends Screen {
  constructor(dimension?: Dimensions) {
    super(dimension);

    // Add children
    const files = new DesktopFiles();
    this.addComponent(files);
    const dock = new Dock();
    this.addComponent(dock);
    const menuBar = new MenuBar();
    this.addComponent(menuBar);
    const notification = new Notification();
    this.addComponent(notification);
    const application = new RandomApplication();
    this.addComponent(application);
  }

  public override async loadResources(): Promise<void> {
    const promises: Promise<any>[] = [];

    const backgroundsPath = `${RESOURCE_PATH}/mac/backgrounds`;
    const backgroundFiles = fs.readdirSync(backgroundsPath);
    for (const file of backgroundFiles) {
      promises.push(loadImage(`${backgroundsPath}/${file}`).then((image) => this.backgrounds.push(image)));
    }

    promises.push(super.loadResources());

    await Promise.allSettled(promises);
  }
}

export class MacBackgroundScreen extends MacScreen {
  constructor(dimension?: Dimensions) {
    super(dimension);

    // No children
    this.clearComponents();
  }
}