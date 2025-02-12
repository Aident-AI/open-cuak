export interface IBaseServiceStatic {
  start(): Promise<void>;
  inject(): Promise<void>;
  get instance(): any;
}
