declare module 'ros-client' {
  type RouterOSClientOptions = {
    host: string;
    username?: string;
    password?: string;
    port?: number;
    tls?: boolean;
    timeout?: number;
    debug?: boolean;
  };

  class RouterOSClient {
    constructor(options: RouterOSClientOptions);
    connect(): Promise<RouterOSClient>;
    send(words: string[]): Promise<Array<Record<string, string>>>;
    close(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export = RouterOSClient;
}
