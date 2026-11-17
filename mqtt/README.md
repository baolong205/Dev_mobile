# MODULE 03 - Mosquitto MQTT Broker

Working directory: `D:\nam4\Develop_mobile\SmartStore\mqtt`.
Only the broker is started here. Do not run the root Compose: it also contains
MongoDB and another broker using the same port. Existing root configuration,
ESP32, backend and mobile are not changed.

## Start / stop / logs (PowerShell)

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mqtt'
docker --version
docker compose version
docker info
docker compose config
docker compose up -d
docker compose ps
docker logs --tail 100 smartstore-mosquitto
docker logs -f smartstore-mosquitto
# Ctrl+C leaves logs, does not stop the container.
docker compose stop
docker compose start
```

Do not run prune, down -v, factory reset or delete containers/images/volumes
to resolve errors without first reviewing the affected resources.

Configuration uses eclipse-mosquitto:2, TCP 1883, relative bind mounts for
config/data/log and restart unless-stopped. Healthcheck publishes QoS 1 to
smartstore/health; it checks broker acknowledgement, not end-to-end delivery.
Config is mounted read-only. Data is writable for persistence. Logs go to
stdout (docker logs), so log/ may stay empty. Persistence is MQTT state, not
an automatic history database for every published sensor reading.

## Publish / subscribe

Terminal 1 (keep open):

```powershell
docker exec -it smartstore-mosquitto mosquitto_sub -h localhost -p 1883 -t smartstore/test -v
```

Terminal 2:

```powershell
docker exec smartstore-mosquitto mosquitto_pub -h localhost -p 1883 -t smartstore/test -m "Hello SmartStore"
```

Expected in Terminal 1:

```text
smartstore/test Hello SmartStore
```

For JSON, pipe to stdin to avoid differences in Windows PowerShell native
argument quote handling; -s reads the entire payload from stdin:

```powershell
'{"temperature":30,"humidity":75,"motion":true}' | docker exec -i smartstore-mosquitto mosquitto_pub -h localhost -p 1883 -t smartstore/test -s
```

Expected payload: `{"temperature":30,"humidity":75,"motion":true}`.
A trailing newline from the pipeline is valid JSON whitespace. Start the
subscriber before publishing: these test messages are not retained.

## LAN and Firewall

```powershell
ipconfig
Get-NetConnectionProfile
Test-NetConnection -ComputerName localhost -Port 1883
```

Choose IPv4 of the active Wi-Fi/Ethernet adapter, not Docker/WSL/VPN/loopback.
localhost inside docker exec means that container; localhost on Windows means
Windows itself. ESP32 and an iPhone MQTT client must use Windows LAN IPv4.
MQTT TCP is not HTTP: Safari is not a broker connectivity test. Future Expo
app architecture uses backend APIs; this module does not implement a mobile client.

The mapping 1883:1883 publishes on all host interfaces, NOT LAN-only by itself.
Use only a trusted isolated LAN. Do not enable router port forwarding, DMZ or
tunnels for 1883; review existing router/NAT and IPv6 exposure. A successful
local test cannot prove Internet isolation or remote-device connectivity.
Anonymous access has no password or TLS: never use this setup for production.

If remote clients fail, verify same reachable LAN (no guest/client isolation),
correct IPv4, Docker port mapping and Windows Defender Firewall > Advanced
settings. Do not disable Firewall. For a trusted network only, user may set
that network to Private in Windows Settings, then run elevated PowerShell:

```powershell
New-NetFirewallRule -DisplayName 'SmartStore MQTT LAN TCP 1883' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1883 -Profile Private -RemoteAddress LocalSubnet
```

Do not change a public/untrusted network to Private merely to allow MQTT.
A Private-only rule does not apply while the adapter is Public. No Firewall
or network profile changes are performed automatically by this module.

## Troubleshooting

| Error | Checks / safe next action |
| --- | --- |
| Docker Desktop unable to start | Open Desktop; check WSL2/virtualization and `wsl --status`, `wsl --list --verbose`; use Troubleshoot diagnostics. Avoid purge/factory reset. WSL shutdown interrupts other WSL workloads: do not do it blindly. |
| Cannot connect to Docker daemon | Wait for Engine; run `docker info`, `docker context ls`; verify intended Linux Desktop context before changing it. |
| Port 1883 already allocated | `Get-NetTCPConnection -LocalPort 1883 -State Listen`; `docker ps --format '{{.Names}} {{.Ports}}'`. Ask before stopping any owner; do not kill automatically. |
| Container name already in use | Inspect `docker inspect smartstore-mosquitto`; do not replace an unknown container. |
| Container exited / restarting | `docker logs --tail 100 smartstore-mosquitto`; `docker inspect smartstore-mosquitto`; check config syntax and mounted paths. |
| Connection refused | Check Engine, container status, port mapping, host/IP and listener; then review routing/firewall for remote devices. |
| Permission denied on mount/data | Check Windows path permissions and Docker Desktop file sharing if applicable; data/log must be writable and config readable. Inspect logs and mounts; do not chmod 777 or run privileged as a blanket fix. |
| No subscriber message | Start sub first, use identical topic/case and broker, verify payload and sub connection; non-retained messages sent before subscribing are not replayed. |

## Checklist

- [ ] Engine ready; existing resources reviewed and left intact.
- [ ] TCP 1883 free before starting; Compose config valid.
- [ ] Container running and healthy; logs confirm listener.
- [ ] Subscriber receives Hello SmartStore.
- [ ] Subscriber receives valid JSON with all three fields.
- [ ] Windows TCP 1883 test passes.
- [ ] LAN IPv4 identified by user; remote-device test still required.
- [ ] Firewall scoped to trusted LAN, no Internet forwarding/exposure.
- [ ] Persistence directory writable; runtime save/reload not assumed tested.

Stop at MODULE 03. ESP32 connection belongs to MODULE 04 after user approval.

## Recorded verification on this machine

- Docker Engine 28.1.1; Compose v2.36.0-desktop.1.
- Port 1883 was free and container name unused before creation.
- Compose validation passed; broker started, logs report Mosquitto 2.1.2
  listening on IPv4 port 1883; container running / healthy.
- A finite subscriber received exactly:

```text
smartstore/test Hello SmartStore
smartstore/test {"temperature":30,"humidity":75,"motion":true}
```

- Windows localhost TCP test passed; data/log mount write checks passed.
- Existing containers were not stopped/deleted. No ESP32, backend, mobile,
  root Compose or old broker configuration was edited.
- Observed Wi-Fi IPv4: 192.168.26.226, profile Public. Recheck with ipconfig
  before future tests because DHCP can change this address.
- No Firewall rules or network profiles were changed. Remote LAN access,
  Internet isolation and persistence reload across restart are NOT verified.
- Broker is left running with restart unless-stopped; use stop when not needed.