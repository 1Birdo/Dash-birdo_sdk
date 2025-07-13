# Python + Javascript (In Dev) 

### Dashboard.birdo.uk SDK's

https://dashboard.birdo.uk

## Python / Python3 (In Dev) 

Official Python SDK for the Birdo Monitoring Service.
## Installation

```bash
pip install birdo-sdk
```

## Usage

This will all be used to collect and send metric / statitics to your personal Dashboard to monitor all your servers visually 

Avg CPU Usage
Avg Memory Usage
Avg Disk Usage
Network In + Out

```python
from birdo_sdk import BirdoClient

# Initialize client
client = BirdoClient(
    api_key="your_api_key",
    server_name="MyServer"
)

# Start monitoring
client.start()

# ... your application runs ...

# Stop when done
client.stop()
```

## Javascript (In Dev) 

Usage Examples
Browser Usage

```html
<script src="https://cdn.jsdelivr.net/npm/birdo-sdk@latest/dist/browser.min.js"></script>
<script>
  const monitor = new Birdo({
    apiKey: 'your_api_key_here',
    serverName: 'MyWebApp'
  });
  
  monitor.start();
</script>
```

Node.js Usage

```javascript
const Birdo = require('birdo-sdk');

const monitor = new Birdo({
  apiKey: 'your_api_key_here',
  serverName: 'MyServer',
  interval: 10000 // 10 seconds
});

monitor.start();

// Graceful shutdown
process.on('SIGINT', () => {
  monitor.stop();
  process.exit();
});
```
ES Modules

```javascript
import Birdo from 'birdo-sdk';

const monitor = new Birdo({
  apiKey: 'your_api_key_here',
  serverName: 'MyService'
});

// Start monitoring
monitor.start();

// Or send once
monitor.sendOnce().then(success => {
  console.log('Metrics sent:', success);
});
```

## License

MIT License - See [LICENSE](LICENSE) file for details.

