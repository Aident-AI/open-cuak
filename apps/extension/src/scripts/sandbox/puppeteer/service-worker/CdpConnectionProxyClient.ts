import { Connection, ConnectionTransport } from '@patched/puppeteer-core';
import { CONNECTION_DUMMY_URL } from '~shared/puppeteer/constants';

export class CdpConnectionProxyClient {
  public static async init(transport: ConnectionTransport) {
    this.#instance = new CdpConnectionProxyClient(transport);
    return this.#instance;
  }

  public static get connection() {
    if (!this.#instance) return null;
    return this.#instance.#connection;
  }

  static #instance: CdpConnectionProxyClient;

  private constructor(transport: ConnectionTransport) {
    this.#connection = new Connection(CONNECTION_DUMMY_URL, transport);
  }

  #connection: Connection;
}
