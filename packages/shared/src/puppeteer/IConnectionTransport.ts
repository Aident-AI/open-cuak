import { ConnectionTransport } from 'puppeteer-core';

export interface IConnectionTransport extends ConnectionTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
