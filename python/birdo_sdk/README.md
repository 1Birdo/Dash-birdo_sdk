# Birdo Python SDK

Official Python SDK for the Birdo Monitoring Service.

## Installation

```bash
pip install birdo-sdk
```

## Usage

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
