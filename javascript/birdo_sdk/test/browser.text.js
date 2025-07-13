import assert from 'assert';
import sinon from 'sinon';
import { BrowserMonitor } from '../src/browser';

describe('BrowserMonitor', () => {
  let monitor;
  const mockSdk = {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {}
    }
  };

  beforeEach(() => {
    // Mock browser environment
    global.window = {
      navigator: {
        userAgent: 'test-agent',
        hardwareConcurrency: 4,
        deviceMemory: 8,
        connection: {
          effectiveType: '4g',
          rtt: 100
        }
      },
      screen: {
        width: 1920,
        height: 1080
      },
      performance: {
        memory: {
          jsHeapSizeLimit: 1000000,
          totalJSHeapSize: 500000,
          usedJSHeapSize: 300000
        },
        timing: {
          navigationStart: 0,
          domainLookupStart: 10,
          domainLookupEnd: 20,
          connectStart: 20,
          connectEnd: 30,
          requestStart: 30,
          responseStart: 40,
          responseEnd: 50,
          domLoading: 60,
          domInteractive: 70,
          domComplete: 80,
          loadEventStart: 90,
          loadEventEnd: 100
        },
        getEntriesByType: () => [{
          type: 'navigate',
          redirectCount: 0,
          transferSize: 1000,
          duration: 100
        }]
      }
    };

    monitor = new BrowserMonitor(mockSdk);
  });

  afterEach(() => {
    delete global.window;
  });

  describe('getSystemInfo()', () => {
    it('should return browser information', () => {
      const info = monitor.getSystemInfo();
      assert.strictEqual(info.platform, 'browser');
      assert.strictEqual(info.userAgent, 'test-agent');
    });
  });

  describe('collectMetrics()', () => {
    it('should collect performance metrics', async () => {
      const metrics = await monitor.collectMetrics();
      assert.ok(metrics.performance);
      assert.strictEqual(metrics.performance.timing.dns, 10);
    });

    it('should collect connection info', async () => {
      const metrics = await monitor.collectMetrics();
      assert.ok(metrics.connection);
      assert.strictEqual(metrics.connection.effectiveType, '4g');
    });
  });
});