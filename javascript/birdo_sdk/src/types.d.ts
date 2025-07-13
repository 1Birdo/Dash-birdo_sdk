declare module 'birdo-sdk' {
  interface BirdoOptions {
    apiKey: string;
    serverName: string;
    endpoint?: string;
    interval?: number;
    maxRetries?: number;
    timeout?: number;
    logger?: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
      debug: (message: string) => void;
    };
  }

  class Birdo {
    constructor(options: BirdoOptions);
    start(): Promise<void>;
    stop(): void;
    sendOnce(): Promise<boolean>;
  }

  export default Birdo;
}