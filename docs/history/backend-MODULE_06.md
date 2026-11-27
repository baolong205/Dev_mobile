# MODULE 06 — Socket.IO realtime

Workspace: `D:\nam4\Develop_mobile\SmartStore\backend`.
Only backend realtime is added. No Expo/dashboard/LED commands/JWT/firmware changes.

## Architecture and event contract

CommonJS is preserved. `src/server.js` creates one Node HTTP server from the
Express app and attaches one Socket.IO server. Both share PORT on 0.0.0.0.
Only the existing MQTT client/listener handles ingestion. A callback passes
validated readings to Socket.IO before awaiting database persistence. JSON is
parsed once; the service retains its existing validation as a persistence boundary.
The model, REST controllers/routes, stored collection and index are unchanged.

- `connect` / `disconnect`: Socket.IO lifecycle events. Server logs socket id
  and disconnect reason. No custom fake connect event is emitted.
- `sensor:update`: one broadcast per valid incoming MQTT message; contains
  temperature, humidity, motion, ledGreen, ledRed, receivedAt. Numeric nulls are
  retained. No DHT11 correction or fabricated sensor values. Backend reception
  time is reused for persistence; socket time serializes to ISO UTC.
- `sensor:latest`: sent to a newly connected client when a reading exists.
  Uses latest valid MQTT reading in process memory; otherwise queries MongoDB.
  A pending DB lookup cannot send an old snapshot after a new MQTT update.
  On this race the client receives sensor:update instead of a stale latest.
  No reading means no sensor:latest; DB failure is logged, not fabricated data.
- `system:status`: sent on connection and MQTT/Mongoose state changes:
  `{backend:{status},status,mqtt:{connected,subscribed,topic},mongodb:{connected,readyState}}`.
  ready requires DB connected plus MQTT connected and subscribed. Driver detection
  of a network failure is not instantaneous. There are no raw URLs/credentials.

Realtime receipt does NOT mean durable storage. Save failures are logged/counted
separately; there is no offline replay, cross-process cache or exactly-once claim.
Do not run multiple primary ingestion instances: each would save the same feed.
Socket.IO callback failures are caught independently so storage still runs.
Shutdown removes DB status listeners and closes Socket.IO, MQTT and MongoDB.

## Packages and files

- socket.io 4.8.4 already existed; reused without adding another server.
- Added socket.io-client 4.8.4 to devDependencies, solely for testing scripts.
- New: `src/sockets/socketServer.js`, `scripts/testSocketClient.js`,
  `scripts/verifyModule06.js`, `scripts/verifyMongoRecovery.js`,
  `scripts/runMongoRecovery.ps1`, `test/socket.test.js`, `MODULE_06.md`.
- Modified: `src/server.js`, `src/app.js`, `src/mqtt/mqttClient.js`,
  `src/config/environment.js`, `.env.example`, `package.json`, `package-lock.json`,
  `README.md`.
- Unchanged: legacy index.js, service/model/controller/route logic, ESP32, mobile,
  broker/Compose configuration and original MongoDB data.
- Backup (before edits):
  `D:\nam4\Develop_mobile\SmartStore\backend\backups\module06-20261113-225614`.
  This workspace has no Git repository; filesystem backups were used instead.

All complete runnable code is present in those workspace files; no placeholders.

## Environment and run commands

Actual private `.env` currently uses PORT=3001 and
MQTT_URL=mqtt://127.0.0.1:1883, with existing MONGO_URI. No .env secrets were copied
into documentation or backups. The sample retains PORT=3000; never replace the
working .env blindly or stop another application's port owner.

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
npm install
npm test
npm run dev
# Or npm start, but do NOT start both at once.
```

Keep the backend terminal open. In a SECOND terminal:

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
npm run test:socket
# URL defaults to localhost:${PORT from .env}, or 3000 if no PORT is set.
# Optional explicit target:
node scripts/testSocketClient.js http://127.0.0.1:3001
```

Repeat the client command in a third terminal to test concurrent clients.
Client logs connect, disconnect, latest, update, status, connect_error and reconnect
attempts. Ctrl+C closes it. It never publishes sensor data.

Optional `.env` setting:

```dotenv
CORS_ORIGIN=
```

Blank means development reflects requesting origins. For production set an
explicit comma-separated allowlist of HTTP(S) origins, with no trailing slash:

```dotenv
NODE_ENV=production
CORS_ORIGIN=https://dashboard.example.com,https://admin.example.com
```

Production rejects blank or wildcard CORS_ORIGIN at startup. WebSocket handshakes
with an Origin are also checked via allowRequest, because browser CORS alone is
not a WebSocket access control. Native/Node clients without Origin are allowed.
CORS is NOT authentication; do not publicly expose this unauthenticated module.
No broad firewall rule was added.

Use `ipconfig` to check LAN IP. Local test clients can use loopback; future phone
clients and ESP32 use the Windows LAN address, not the phone's own localhost.
Allow only the intended private LAN if firewall configuration is later needed.

## REST checks (unchanged responses)

```powershell
$base='http://127.0.0.1:3001'
Invoke-RestMethod "$base/api/health" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/latest" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/history?page=1&limit=20" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/stats" | ConvertTo-Json -Depth 8
```

## Observed results — November 13, 2026

- npm test: 10/10 passed; JS syntax checks passed; npm audit: 0 vulnerabilities
  at verification time. Unit fixtures never reach the real broker/database.
- Actual native MongoDB service was running; broker container was healthy.
- Ran the actual npm run dev command with nodemon and the standalone
  scripts/testSocketClient.js in a second process: connect, system:status,
  sensor:latest and real sensor:update logs all observed. Those test processes
  were stopped afterward; start your own foreground terminal for continued use.
- Two concurrent clients received matching real telemetry every approximately
  two seconds. Observed window matched MQTT received delta to update count 1:1.
- MongoDB lookup matched all five fields and exact receivedAt to the socket event:
  `_id=6af7342bc0869a5c3c65f78d`.
- New third client received latest from MQTT memory; initial clients also received
  the DB fallback before first live message. All four REST endpoints returned 200.
- Actual broker stopped/started: Socket.IO status became degraded/disconnected,
  no updates were emitted during the measured outage; after restart MQTT
  subscribed again and clients received new ESP32 readings without server restart.
- Separate temporary backend on an ephemeral port used an unavailable local DB
  address and the real MQTT feed. It emitted two real readings with DB disconnected,
  saved=0/saveFailed>0 and all three data APIs returned 503. It never wrote to
  the primary DB. This is NOT a native MongoDB service stop/start test.
- Real MongoDB service stop/start PASSED in a UAC-approved elevated test on
  November 13, 2026. During outage, three further real ESP32 updates arrived,
  status was degraded, saved counter did not advance and data APIs returned 503.
  After service restart, the same backend PID 24272 recovered automatically;
  all four APIs returned 200 and a new persisted reading was verified directly:
  `_id=6af735ba367cfc1f62befa76`. Test exit code was 0.
- Tests restore broker and close only their own backend/client processes.

Actual captured event:

```text
sensor:update {"temperature":1.2,"humidity":24.7,"motion":false,"ledGreen":false,"ledRed":true,"receivedAt":"2026-11-13T16:00:43.589Z"}
PASS MongoDB matches realtime fields and receivedAt; _id=6af7342bc0869a5c3c65f78d
PASS broker outage status, no fake updates, reconnect and fresh updates
PASS real MQTT realtime continues with unavailable DB; saved=0, saveFailed>0, REST=503
```

Full live log:
`D:\nam4\Develop_mobile\SmartStore\backend\logs\module06-live-20261113-230028.log`.

## Repeat automated live checks

Requires real ESP32 actively publishing, dependencies running and PORT unused.
The script starts/stops only its own backends. Without the flag it does not stop
the broker; the flag explicitly interrupts only smartstore-mosquitto briefly.

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
node scripts/verifyModule06.js
# Only when safe to interrupt broker users:
node scripts/verifyModule06.js --broker-recovery
```

## Repeat elevated MongoDB service test (already passed)

Captured result:
`D:\nam4\Develop_mobile\SmartStore\backend\logs\module06-mongodb-recovery.log`.
Exit marker:
`D:\nam4\Develop_mobile\SmartStore\backend\logs\module06-mongodb-recovery.exit.txt`.

To repeat the automated test, leave the backend PORT unused and ESP32 publishing.
From Administrator PowerShell run:

```powershell
& 'D:\nam4\Develop_mobile\SmartStore\backend\scripts\runMongoRecovery.ps1'
```

It starts its own backend/client, checks actual outage and recovery, restores
MongoDB in cleanup, and closes only its own backend/client. It requires elevated
rights and briefly interrupts all applications using the MongoDB service.
The manual alternative below does not start a backend for you.

Only when safe to interrupt all shared DB users: keep backend and test client
running in their normal terminals; use Administrator PowerShell:

```powershell
try {
    Stop-Service MongoDB -ErrorAction Stop
    Start-Sleep -Seconds 15
    # Observe system:status mongodb.connected=false and sensor:update continuing.
    # Health and data APIs should return 503 after disconnect detection.
} finally {
    Start-Service MongoDB
}
```

After restart wait for actual MongoDB connection recovery, health ready, successful
new saves and DB latest advancing. No offline replay is expected. Record logs
when repeating this test.

## Issues found and fixes

- Legacy Socket.IO existed only in unused index.js; left untouched. Active module
  is attached once to src/server.js's HTTP server; duplicate attachment is rejected.
- MQTT.js connect export cannot be replaced by Node mock.method in the initial
  test. Added optional injected connect factory; production still uses mqtt.connect.
- Scoped npm test to test/*.test.js: backups include old test files and must not
  be recursively discovered; interactive testSocketClient must not run as a test.
- Bind failure previously started DB work before port availability. DB startup
  now occurs only after HTTP bind, so duplicate npm start does not race index setup.
- EADDRINUSE means another instance owns the port: keep only one primary backend;
  Ctrl+C its own terminal before restarting. Never kill an unknown port owner.

MODULE 06 only. MODULE 07 is not started.