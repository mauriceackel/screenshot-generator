import { DrawConfig, DrawJob } from '../models/jobs';

export default abstract class Component {
  private children: Set<Component>;

  constructor() {
    this.children = new Set<Component>();
  }

  public addComponent(component: Component) {
    this.children.add(component);
  }

  public removeComponent(component: Component) {
    this.children.delete(component);
  }

  public clearComponents() {
    this.children.clear();
  }

  public async loadResources(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.children.forEach((child) => promises.push(child.loadResources()));

    await Promise.allSettled(promises);
  }

  public getDrawJobs(config: DrawConfig): DrawJob[] {
    const jobs: DrawJob[] = [];
    this.children.forEach((child) => jobs.push(...child.getDrawJobs(config)));

    return jobs;
  }
}
