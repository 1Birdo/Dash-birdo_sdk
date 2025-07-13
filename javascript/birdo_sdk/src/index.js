import { BrowserMonitor } from './browser';
import { NodeMonitor } from './node';

class Birdo {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.serverName = options.serverName;
    this.endpoint = options.endpoint || 'https://dashboard.birdo.uk';
    this.interval = options.interval || 5000; // ms
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 10000; // ms
    this.logger = options.logger || console;
    this._monitor = null;
    this._intervalId = null;
    
    // Auto-detect environment
    if (typeof window !== 'undefined') {
      this._monitor = new BrowserMonitor(this);
    } else {
      this._monitor = new NodeMonitor(this);
    }
  }

  async start() {
    if (this._intervalId) {
      this.logger.warn('Monitoring is already running');
      return;
    }
    
    // Initial collection
    await this._collectAndSend();
    
    // Start periodic collection
    this._intervalId = setInterval(
      () => this._collectAndSend(),
      this.interval
    );
    
    this.logger.info(`Started monitoring with ${this.interval}ms interval`);
  }

  stop() {
    if (!this._intervalId) {
      this.logger.warn('Monitoring is not running');
      return;
    }
    
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.logger.info('Monitoring stopped');
  }

  async sendOnce() {
    return this._collectAndSend();
  }

  async _collectAndSend() {
    try {
      const metrics = await this._monitor.collectMetrics();
      if (metrics) {
        await this._sendMetrics(metrics);
      }
    } catch (error) {
      this.logger.error('Error in monitoring cycle:', error);
    }
  }

  async _sendMetrics(metrics) {
    const payload = {
      server_name: this.serverName,
      metrics,
      system_info: this._monitor.getSystemInfo()
    };

    const url = `${this.endpoint}/api/sdk/js`;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this._fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.logger.debug('Metrics sent successfully');
        return true;
      } catch (error) {
        if (attempt === this.maxRetries) {
          this.logger.error(`Failed to send metrics after ${this.maxRetries} attempts:`, error);
          return false;
        }
        
        const delay = Math.min(attempt * 2000, 30000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

export default Birdo;