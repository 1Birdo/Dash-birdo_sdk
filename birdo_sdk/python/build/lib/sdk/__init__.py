import os
import time
import json
import requests
import platform
import psutil
from typing import Optional, Dict, Any
from threading import Thread, Event
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('birdo_sdk')

class BirdoClient:
    """
    Birdo Monitoring Service Python SDK
    
    Provides an easy way to monitor system metrics and send them to the Birdo dashboard.
    
    Example usage:
        client = BirdoClient(api_key="your_api_key", server_name="MyServer")
        client.start()  # Starts background monitoring
        # ...
        client.stop()   # Stops monitoring when done
    """
    
    def __init__(
        self,
        api_key: str,
        server_name: str,
        endpoint: str = "https://dashboard.birdo.uk",
        interval: int = 5,
        max_retries: int = 3,
        timeout: int = 10
    ):
        """
        Initialize the Birdo monitoring client.
        
        Args:
            api_key: Your Birdo API key (get from your profile page)
            server_name: Unique name for this server/machine
            endpoint: Birdo API endpoint (defaults to production)
            interval: Monitoring interval in seconds (default: 5)
            max_retries: Max retries for failed requests (default: 3)
            timeout: Request timeout in seconds (default: 10)
        """
        if not api_key:
            raise ValueError("API key is required")
        if not server_name:
            raise ValueError("Server name is required")
            
        self.api_key = api_key
        self.server_name = server_name
        self.endpoint = endpoint.rstrip('/')
        self.interval = interval
        self.max_retries = max_retries
        self.timeout = timeout
        
        self._thread = None
        self._stop_event = Event()
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": f"BirdoPythonSDK/{self._get_version()}",
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        })
        
        # System info that doesn't change often
        self._system_info = self._get_system_info()
        
    def _get_version(self) -> str:
        """Get the current SDK version"""
        return "1.0.0"
        
    def _get_system_info(self) -> Dict[str, Any]:
        """Collect static system information"""
        try:
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            return {
                "platform": platform.system(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "processor": platform.processor(),
                "boot_time": boot_time.isoformat(),
                "python_version": platform.python_version(),
                "hostname": platform.node(),
                "cpu_cores": psutil.cpu_count(logical=False) or 0,
                "cpu_threads": psutil.cpu_count(logical=True) or 0,
            }
        except Exception as e:
            logger.warning(f"Failed to collect system info: {str(e)}")
            return {}
    
    def _get_metrics(self) -> Dict[str, Any]:
        """Collect dynamic system metrics"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=None)
            cpu_freq = psutil.cpu_freq().current if hasattr(psutil, "cpu_freq") else 0
            
            # Memory
            mem = psutil.virtual_memory()
            
            # Disk
            disk = psutil.disk_usage('/')
            
            # Network
            net_io = psutil.net_io_counters()
            
            # Load average (if available)
            load_avg = [x / psutil.cpu_count() * 100 for x in psutil.getloadavg()] if hasattr(psutil, "getloadavg") else [0, 0, 0]
            
            return {
                "cpu_percent": round(cpu_percent, 2),
                "cpu_freq": round(cpu_freq / 1000, 2) if cpu_freq else 0,  # Convert to GHz
                "memory_percent": round(mem.percent, 2),
                "memory_total": mem.total,
                "memory_used": mem.used,
                "disk_percent": round(disk.percent, 2),
                "disk_total": disk.total,
                "disk_used": disk.used,
                "network_in": net_io.bytes_recv,
                "network_out": net_io.bytes_sent,
                "load_avg_1": round(load_avg[0], 2) if len(load_avg) > 0 else 0,
                "load_avg_5": round(load_avg[1], 2) if len(load_avg) > 1 else 0,
                "load_avg_15": round(load_avg[2], 2) if len(load_avg) > 2 else 0,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        except Exception as e:
            logger.error(f"Failed to collect metrics: {str(e)}")
            return {}
    
    def _send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """Send metrics to Birdo API"""
        if not metrics:
            return False
            
        payload = {
            "server_name": self.server_name,
            "metrics": metrics,
            "system_info": self._system_info
        }
        
        url = f"{self.endpoint}/api/sdk/python"
        
        for attempt in range(self.max_retries):
            try:
                response = self._session.post(
                    url,
                    data=json.dumps(payload),
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    return True
                elif response.status_code == 401:
                    logger.error("Invalid API key - please check your credentials")
                    return False
                elif response.status_code == 403:
                    logger.error("Device limit reached - please upgrade your plan")
                    return False
                else:
                    logger.warning(f"API request failed (attempt {attempt + 1}): {response.status_code}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"API connection failed (attempt {attempt + 1}): {str(e)}")
            
            if attempt < self.max_retries - 1:
                time.sleep(min(5 * (attempt + 1), 30))  # Exponential backoff with max 30s
        
        logger.error(f"Failed to send metrics after {self.max_retries} attempts")
        return False
    
    def _monitor_loop(self):
        """Main monitoring loop that runs in background thread"""
        logger.info("Starting Birdo monitoring client")
        
        while not self._stop_event.is_set():
            start_time = time.time()
            
            try:
                metrics = self._get_metrics()
                if metrics:
                    success = self._send_metrics(metrics)
                    if success:
                        logger.debug("Successfully sent metrics")
                    else:
                        logger.warning("Failed to send metrics")
                else:
                    logger.warning("No metrics collected")
            except Exception as e:
                logger.error(f"Unexpected error in monitoring loop: {str(e)}")
            
            # Sleep for remaining interval time
            elapsed = time.time() - start_time
            sleep_time = max(0, self.interval - elapsed)
            
            if sleep_time > 0:
                self._stop_event.wait(sleep_time)
        
        logger.info("Stopped Birdo monitoring client")
    
    def start(self) -> None:
        """
        Start monitoring in a background thread.
        
        Metrics will be collected and sent at the configured interval.
        """
        if self._thread and self._thread.is_alive():
            logger.warning("Monitoring is already running")
            return
            
        self._stop_event.clear()
        self._thread = Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info(f"Started monitoring with {self.interval}s interval")
    
    def stop(self) -> None:
        """Stop the background monitoring thread"""
        if not self._thread or not self._thread.is_alive():
            logger.warning("Monitoring is not running")
            return
            
        self._stop_event.set()
        self._thread.join(timeout=self.timeout)
        
        if self._thread.is_alive():
            logger.warning("Monitoring thread did not stop gracefully")
        else:
            logger.info("Monitoring stopped successfully")
    
    def send_once(self) -> bool:
        """
        Collect and send metrics once (synchronously).
        
        Returns:
            bool: True if metrics were successfully sent
        """
        metrics = self._get_metrics()
        if metrics:
            return self._send_metrics(metrics)
        return False
    
    def __enter__(self):
        """Context manager entry - starts monitoring"""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - stops monitoring"""
        self.stop()