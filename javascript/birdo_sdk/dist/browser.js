(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('os'), require('process'), require('fs'), require('util'), require('v8')) :
  typeof define === 'function' && define.amd ? define(['os', 'process', 'fs', 'util', 'v8'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Birdo = factory(global.os, global.process, global.fs, global.util, global.v8));
})(this, (function (os, process, fs, util, v8) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
  var process__default = /*#__PURE__*/_interopDefaultLegacy(process);
  var util__default = /*#__PURE__*/_interopDefaultLegacy(util);
  var v8__default = /*#__PURE__*/_interopDefaultLegacy(v8);

  class BrowserMonitor {
    constructor(sdk) {
      this.sdk = sdk;
      this._systemInfo = this._getSystemInfo();
    }
    _getSystemInfo() {
      return {
        platform: 'browser',
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0
      };
    }
    getSystemInfo() {
      return this._systemInfo;
    }
    async collectMetrics() {
      try {
        const memory = performance.memory ? {
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          usedJSHeapSize: performance.memory.usedJSHeapSize
        } : null;
        return {
          timestamp: new Date().toISOString(),
          memory,
          performance: {
            timing: this._getTimingMetrics(),
            navigation: this._getNavigationMetrics()
          },
          connection: this._getConnectionInfo()
        };
      } catch (error) {
        this.sdk.logger.error('Failed to collect browser metrics:', error);
        return null;
      }
    }
    _getTimingMetrics() {
      const timing = performance.timing;
      if (!timing) return null;
      return {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domLoading: timing.domLoading - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        domComplete: timing.domComplete - timing.navigationStart,
        loadEvent: timing.loadEventEnd - timing.loadEventStart
      };
    }
    _getNavigationMetrics() {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (!navigation) return null;
      return {
        type: navigation.type,
        redirectCount: navigation.redirectCount,
        size: navigation.transferSize,
        duration: navigation.duration
      };
    }
    _getConnectionInfo() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return null;
      return {
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        downlink: connection.downlink,
        saveData: connection.saveData
      };
    }
  }

  const exec = util__default["default"].promisify(require('child_process').exec);
  class NodeMonitor {
    constructor(sdk) {
      this.sdk = sdk;
      this._systemInfo = this._getSystemInfo();
      this._prevNetworkStats = null;
      this._prevDiskStats = null;
    }
    _getSystemInfo() {
      return {
        platform: os__default["default"].platform(),
        arch: os__default["default"].arch(),
        release: os__default["default"].release(),
        hostname: os__default["default"].hostname(),
        cpuModel: os__default["default"].cpus()[0]?.model,
        cpuCores: os__default["default"].cpus().length,
        totalMemory: os__default["default"].totalmem(),
        nodeVersion: process__default["default"].version,
        v8Version: process__default["default"].versions.v8
      };
    }
    getSystemInfo() {
      return this._systemInfo;
    }
    async collectMetrics() {
      try {
        const [cpu, memory, disk, network] = await Promise.all([this._getCpuMetrics(), this._getMemoryMetrics(), this._getDiskMetrics(), this._getNetworkMetrics()]);
        return {
          timestamp: new Date().toISOString(),
          cpu,
          memory,
          disk,
          network,
          process: this._getProcessMetrics(),
          load: this._getLoadMetrics()
        };
      } catch (error) {
        this.sdk.logger.error('Failed to collect Node.js metrics:', error);
        return null;
      }
    }
    async _getCpuMetrics() {
      const load = os__default["default"].loadavg();
      const cpus = os__default["default"].cpus();
      return {
        usage: process__default["default"].cpuUsage(),
        load1: load[0],
        load5: load[1],
        load15: load[2],
        speed: cpus[0]?.speed || 0,
        cores: cpus.length
      };
    }
    async _getMemoryMetrics() {
      return {
        system: {
          total: os__default["default"].totalmem(),
          free: os__default["default"].freemem(),
          used: os__default["default"].totalmem() - os__default["default"].freemem()
        },
        process: process__default["default"].memoryUsage(),
        heap: v8__default["default"].getHeapStatistics()
      };
    }
    async _getDiskMetrics() {
      try {
        const stats = await fs.promises.statfs('/');
        const currentStats = {
          read: (await exec('cat /proc/diskstats')).stdout,
          timestamp: Date.now()
        };
        let readRate = 0;
        if (this._prevDiskStats) {
          const timeDiff = (currentStats.timestamp - this._prevDiskStats.timestamp) / 1000;
          if (timeDiff > 0) {
            // Simple disk read rate calculation
            readRate = (currentStats.read.length - this._prevDiskStats.read.length) / timeDiff;
          }
        }
        this._prevDiskStats = currentStats;
        return {
          total: stats.blocks * stats.bsize,
          free: stats.bfree * stats.bsize,
          used: (stats.blocks - stats.bfree) * stats.bsize,
          readRate
        };
      } catch (error) {
        this.sdk.logger.warn('Could not collect detailed disk metrics:', error);
        return null;
      }
    }
    async _getNetworkMetrics() {
      const currentStats = os__default["default"].networkInterfaces();
      const currentTimestamp = Date.now();
      let bytesIn = 0;
      let bytesOut = 0;
      if (this._prevNetworkStats) {
        const timeDiff = (currentTimestamp - this._prevNetworkStats.timestamp) / 1000;
        Object.keys(currentStats).forEach(iface => {
          const currentIf = currentStats[iface];
          const prevIf = this._prevNetworkStats.stats[iface];
          if (prevIf) {
            currentIf.forEach((curr, i) => {
              if (prevIf[i] && curr.address === prevIf[i].address) {
                bytesIn += (curr.bytesReceived - prevIf[i].bytesReceived) / timeDiff;
                bytesOut += (curr.bytesSent - prevIf[i].bytesSent) / timeDiff;
              }
            });
          }
        });
      }
      this._prevNetworkStats = {
        stats: currentStats,
        timestamp: currentTimestamp
      };
      return {
        bytesIn,
        bytesOut,
        interfaces: Object.keys(currentStats)
      };
    }
    _getProcessMetrics() {
      return {
        uptime: process__default["default"].uptime(),
        pid: process__default["default"].pid,
        ppid: process__default["default"].ppid,
        cpuUsage: process__default["default"].cpuUsage(),
        memoryUsage: process__default["default"].memoryUsage()
      };
    }
    _getLoadMetrics() {
      return {
        avg: os__default["default"].loadavg(),
        uptime: os__default["default"].uptime()
      };
    }
  }

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
      this._intervalId = setInterval(() => this._collectAndSend(), this.interval);
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

  return Birdo;

}));
//# sourceMappingURL=browser.js.map
