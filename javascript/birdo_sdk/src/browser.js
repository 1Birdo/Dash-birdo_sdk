export class BrowserMonitor {
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