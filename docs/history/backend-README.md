# SmartStore Backend CommonJS — Modules 05 and 06

MODULE 06 is integrated into the active src/server.js entry. See the complete
event contract, commands and verified results in:
`D:\nam4\Develop_mobile\SmartStore\backend\MODULE_06.md`.
The Module 05 notes below record the original implementation; Socket.IO is now
active in the modular runtime (legacy index.js is still unused).

Root: `D:\nam4\Develop_mobile\SmartStore\backend`.
Entry: `D:\nam4\Develop_mobile\SmartStore\backend\src\server.js`.
`index.js` is preserved legacy code, not the active entry: do not run it, because
it includes old topics, Socket.IO and LED command routes outside MODULE 05.
Backups of previous files: `D:\nam4\Develop_mobile\SmartStore\backend\backups\module05-20261107-031446-730`.

## Environment decisions

- Node v22.20.0 present (Node 22 LTS line), npm 11.11.0; no Node upgrade performed.
- Windows MongoDB service already running and ping verified. Existing config:
  `C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg`, bindIp 127.0.0.1,
  port 27017, persistent dbPath `C:\Program Files\MongoDB\Server\8.0\data`.
  Reused as-is; no Docker MongoDB/extra volume needed and no existing data deleted.
- Database smartstore; collection sensorreadings; descending receivedAt/_id
  index, no TTL. Existing MongoDB service is not stopped by backend shutdown.
- Port 3000 belongs to another project's container. Actual .env uses 3001;
  .env.example keeps requested 3000. Never stop unrelated containers for this.
- Current verified broker LAN IPv4 is 192.168.26.214, not the requested .226.
  Actual .env uses .214; template retains the requested address, which must be
  checked before use. Same-machine backend can use mqtt://127.0.0.1:1883.
- Actual .env is already present, contains no password and is ignored by the
  root .gitignore. Do not overwrite it blindly with .env.example. Never commit
  private env files or credential-bearing URI. Logs hide connection URLs/errors.

## Structure

```text
backend/
  .env                         # private local settings, ignored
  .env.example
  package.json
  package-lock.json
  index.js                     # unchanged legacy, NOT used by scripts
  README.md
  backups/                     # previous manifest/lock/template/legacy copy
  logs/                        # *.log ignored
  test/backend.test.js
  src/
    config/environment.js
    config/database.js
    mqtt/mqttClient.js
    models/SensorReading.js
    services/sensorService.js
    controllers/sensorController.js
    routes/sensorRoutes.js
    app.js
    server.js
    sockets/                   # original empty scaffold, unused
```

Original .gitkeep files retained. Runtime libraries: express 4.22.3, mqtt
5.16.1, mongoose 8.24.8, dotenv 16.6.1, cors 2.8.6. Added development dependency
nodemon pinned 3.1.11; initial 3.1.14 install had moderate transitive audit
warnings, pinning 3.1.11 produced zero audit findings at verification time.
Socket.IO 4.8.4 was already in manifest/lock/node_modules before this module:
kept for compatibility, NOT imported, attached or installed as a new feature.
No new Socket.IO endpoints or LED control endpoints are active.

## Run on Windows PowerShell

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
npm install
npm test
npm run dev
# Or npm start (without nodemon)
```

Check .env before starting. Do not start another process if port 3001 is already
occupied by the verification process. Ctrl+C stops a foreground backend.
The agent started temporary verification processes with stdout/stderr files:
`D:\nam4\Develop_mobile\SmartStore\backend\logs\module05.stdout.log` and
`D:\nam4\Develop_mobile\SmartStore\backend\logs\module05.stderr.log`.
Verification processes are no longer intentionally left running. Start your own
foreground process with npm run dev. Before stopping any process, inspect its
command line; PIDs are reusable:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
```

Backend listens on 0.0.0.0 for future LAN development, CORS enabled, no auth in
this module. Do not expose API publicly or add broad firewall rules. MongoDB
remains loopback only. Health can start degraded before dependencies connect.

```powershell
docker ps --filter name=smartstore-mosquitto
docker logs --tail 30 smartstore-mosquitto
Get-Service MongoDB
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
ipconfig
```

TCP test alone does not verify MongoDB protocol; backend connection log plus
successful data queries verify actual database use.

## REST API

```powershell
$base = 'http://127.0.0.1:3001'
Invoke-RestMethod "$base/api/health" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/latest" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/history?page=1&limit=20" | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/sensors/stats" | ConvertTo-Json -Depth 8
```

- Health: 200 when MongoDB connected and MQTT connected/subscribed; otherwise
  503, with backend running and dependency states, counters and uptime.
- Latest: 200 with success/data; 404 NO_SENSOR_DATA if empty; 503 DB unavailable.
- History: success, total, page, limit, totalPages, data. Defaults 1/20,
  positive integers required, limit capped at 100; 400 for invalid pagination.
  Sort descending receivedAt then _id. Count/data are not an atomic snapshot
  while ESP32 is writing, so totals may advance between requests.
- Stats: total; count/average/min/max per measurement, null excluded; no-data
  numeric aggregates return null. Values are NOT proof of sensor accuracy.
- Errors: `{ "success": false, "error": { "code": "...", "message": "..." } }`.
  HTTP JSON syntax errors are 400, unhandled errors sanitized, no stack/URI leaks.

## Ingestion and validation

One MQTT client and message listener per server process. Reconnect 3 seconds,
subscribe QoS 0 to smartstore/sensors/data on each connection; MQTT.js automatic
resubscribe disabled so there is only the explicit subscribe path. Never start
two backend instances for the same ingestion pipeline: that would store twice.

Payload must be an object with all five fields: temperature/humidity finite
number or null, motion/ledGreen/ledRed real booleans. Strings, missing fields,
NaN/Infinity, arrays, oversized messages and malformed JSON rejected. Extra
keys ignored; receivedAt is backend reception time, not supplied by device.
No range-based calibration/filtering: 2.5 C or other suspicious finite readings
are stored unchanged. No test-generated sensor values are published or stored.

DB buffering disabled; writes explicitly fail when DB is not ready. Initial
connection retries after 5 seconds; established connections use driver reconnect.
Errors caught per message, failed writes counted and logged, never claimed saved.
No offline queue, replay, exactly-once guarantee or backlog storage: messages
during outages may be lost. No listener-based duplicate writes. QoS 0 cannot
prove delivery/uniqueness at the distributed-system level.

Logs summarize counters every 30 seconds; repeated reject/write warnings
throttled. DEBUG_SENSOR=true enables per-save payload logging for diagnostics.

## Verification recorded

- All JS syntax checks passed; npm test: 5/5 tests passed.
- npm audit after pinning nodemon: 0 vulnerabilities at check time.
- MongoDB actual ping returned ok:1 before deployment, no existing collections
  in smartstore at inspection. No MongoDB replacement was performed.
- Actual broker subscriber received ESP32 telemetry before server start.
- Server logs show HTTP listening 3001, MongoDB connected, MQTT subscribed.
- All four REST endpoints called successfully with actual persisted readings.
  At one check: health received=12/saved=12; latest temperature=1 C, humidity=26 %,
  history total=12/page=1/limit=2; stats total=12. Counts continue increasing.
- One intentionally malformed JSON string (not fake sensor data) was published
  to the ingestion topic; rejected counter became 1, saveFailed=0, health ready.
- Tests use in-memory fixtures only; never write fixtures to database/broker.
- Successful remote API/mobile access and sensor calibration are NOT tested.
- Broker stop/start recovery was tested twice on November 13, 2026; see below.
- MongoDB service stop/start recovery passed in the elevated Module 06 test on
  November 13, 2026. See MODULE_06.md for the captured results and repeat command.

### Resolved environment blocker: index disk space

Index definition is implemented, but actual creation FAILED with MongoDB:
`available disk space of 339062784 bytes is less than required minimum of 524288000`.
The existing MongoDB dbPath is on C:. No files/data/images/volumes were deleted.
At the final live API check, 63 real readings existed; they are preserved.
Index creation runs at startup and logs failure without pretending DB is disconnected.
Free sufficient space on the MongoDB data disk manually (review targets first),
then restart backend and verify `sensorreadings indexes ready`.
RESOLVED November 13, 2026: startup reported indexes ready and a direct database
inspection confirmed `receivedAt_-1__id_-1` with both keys descending.

### Recovery test results — November 13, 2026

- Local backend MQTT URL now uses mqtt://127.0.0.1:1883 to avoid LAN DHCP changes.
  Windows Wi-Fi was 192.168.26.226 at the last inspection; ESP32 must use the
  current LAN address, not loopback.
- Baseline confirmed real ESP32 writes before interrupting the broker.
- Stopped/started only smartstore-mosquitto, twice, without removing its data.
- Both outages: health HTTP 503, backend stayed running, MongoDB connected;
  latest/history/stats each returned HTTP 200.
- Both recoveries: same backend process reconnected/subscribed automatically,
  health returned ready, new ESP32 readings persisted and latest _id advanced.
- Final session counters: received=3, saved=3, rejected=0, saveFailed=0.
  This verifies recovery across two cycles, not a formal exactly-once guarantee.
- npm test passed 5/5 again. No fabricated valid sensor readings were published.
- At the original Module 05 check, MongoDB SERVICE outage/recovery was not tested
  due to missing Administrator privileges. It was subsequently tested and PASSED
  during Module 06 using UAC-approved elevation; see MODULE_06.md.
- MongoDB remained Running; broker was restored and healthy. Temporary backend
  PID 25404 was stopped after testing. Run npm start in your own terminal to
  continue; keep that terminal open. Do not start multiple ingestion instances.
- Detailed report:
  `D:\nam4\Develop_mobile\SmartStore\backend\logs\recovery-20261113-225159.txt`.

## Manual outage checklist (only when safe to interrupt)

1. Keep ESP32 active; note health counters and latest receivedAt.
2. Broker outage test:

```powershell
docker compose -f 'D:\nam4\Develop_mobile\SmartStore\mqtt\docker-compose.yml' stop
# Health should be 503 with backend running/MQTT disconnected; DB APIs still work.
docker compose -f 'D:\nam4\Develop_mobile\SmartStore\mqtt\docker-compose.yml' start
# Wait for resubscribe and new saved readings; repeat cycles to check listener count behavior.
```

3. MongoDB outage test requires Administrator and interrupts OTHER MongoDB users;
   do not run without reviewing them:

```powershell
Stop-Service MongoDB
# Health/API DB routes -> 503 after detection; write failures logged/counted.
Start-Service MongoDB
# Wait for connected event, HTTP ready and new persisted readings.
```

4. Invalid HTTP body test (does not save sensor data):

```powershell
Invoke-WebRequest 'http://127.0.0.1:3001/api/sensors/latest' -Method Post -ContentType 'application/json' -Body '{'
# Expected 400; PowerShell may throw on non-2xx. Recheck health afterward.
```

5. Invalid MQTT syntax (does not create a fake sensor reading):

```powershell
'{invalid-json' | docker exec -i smartstore-mosquitto mosquitto_pub -h localhost -p 1883 -t smartstore/sensors/data -s
```

Confirm rejected increments and server remains ready. Do not publish fabricated
valid sensor payloads into the primary collection for testing.

MODULE 05 only. Wait for user approval before MODULE 06.