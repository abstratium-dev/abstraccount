#!/bin/bash
# Start Quarkus with e2e profile (H2 database) for e2e tests
# Also starts the example OAuth client on port 3333
set -x  # Enable debug output
echo "Starting Quarkus for e2e tests..."
echo "Working directory: $(pwd)"

cd ..

echo "Checking if jar exists: target/quarkus-app/quarkus-run.jar"
ls -lh target/quarkus-app/quarkus-run.jar || echo "JAR NOT FOUND!"

# Function to cleanup on exit
cleanup() {
  echo "Cleaning up..."
  if [ ! -z "$CLIENT_PID" ]; then
    echo "Stopping example client (PID: $CLIENT_PID)..."
    kill $CLIENT_PID 2>/dev/null || true
  fi
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Start Quarkus (this will run in foreground)
exec java -Dquarkus.profile=e2e -jar target/quarkus-app/quarkus-run.jar 2>&1
