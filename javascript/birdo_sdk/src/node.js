import os from 'os';
import process from 'process';
import { promises as fs } from 'fs';
import util from 'util';
import v8 from 'v8';

const exec = util.promisify(require('child_process').exec);

export class NodeMonitor {
  constructor(sdk) {
    this.sdk = sdk;
    this._systemInfo = this._getSystemInfo();
    this._prevNetworkStats = null;
    this._prevDiskStats = null;
  }

  _getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model,
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      nodeVersion: process.version,
      v8Version: process.versions.v8
    };
  }

  getSystemInfo() {
    return this._systemInfo;
  }

  async collectMetrics() {
    try {
      const [cpu, memory, disk, network] = await Promise.all([
        this._getCpuMetrics(),
        this._getMemoryMetrics(),
        this._getDiskMetrics(),
        this._getNetworkMetrics()
      ]);

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
    const load = os.loadavg();
    const cpus = os.cpus();
    
    return {
      usage: process.cpuUsage(),
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
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      process: process.memoryUsage(),
      heap: v8.getHeapStatistics()
    };
  }

  async _getDiskMetrics() {
    try {
      const stats = await fs.statfs('/');
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
    const currentStats = os.networkInterfaces();
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
      uptime: process.uptime(),
      pid: process.pid,
      ppid: process.ppid,
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage()
    };
  }

  _getLoadMetrics() {
    return {
      avg: os.loadavg(),
      uptime: os.uptime()
    };
  }
}