from birdo_sdk import BirdoClient

# You will either need to build the Python Import your self or just Import it like normal Via PYPI or something

client = BirdoClient(
    api_key="test_key",
    server_name="TestServer",
    endpoint="http://localhost:8000"  # For testing against a local server
)

# Test one-time send
if client.send_once():
    print("Successfully sent metrics!")
else:
    print("Failed to send metrics")
