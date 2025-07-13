# Python + Javascript (In Dev) 

# Birdo Python SDK

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

## Documentation

Full documentation available at [https://birdo.uk/docs/sdk/python](https://birdo.uk/docs/sdk/python)

## License

MIT License - See [LICENSE](LICENSE) file for details.
