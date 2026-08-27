#!/usr/bin/env bash
# PortCast — start all three services for local demo
# Usage: ./start-all.sh   (from repo root)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[1/3] ML service (:8000)"
cd "$ROOT/ml"
if [ ! -x venv/bin/python ]; then
  echo "  creating venv..."
  python3 -m venv venv
  venv/bin/pip install -q -r requirements.txt
  venv/bin/python train.py
fi
setsid nohup venv/bin/python service.py > /tmp/portcast-ml.log 2>&1 < /dev/null &
echo $! > /tmp/portcast-ml.pid

echo "[2/3] API server (:5000)"
cd "$ROOT/server"
[ -d node_modules ] || npm install --no-audit --no-fund
setsid nohup node src/server.js > /tmp/portcast-server.log 2>&1 < /dev/null &
echo $! > /tmp/portcast-server.pid

echo "[3/3] Frontend (:5173)"
cd "$ROOT/client"
[ -d node_modules ] || npm install --no-audit --no-fund
setsid nohup npx vite --port 5173 --strictPort > /tmp/portcast-client.log 2>&1 < /dev/null &
echo $! > /tmp/portcast-client.pid

echo "waiting for services..."
for i in $(seq 1 30); do
  ok=1
  curl -sf -m 2 http://127.0.0.1:8000/api/ml/health > /dev/null 2>&1 || ok=0
  curl -sf -m 2 http://127.0.0.1:5000/api/health > /dev/null 2>&1 || ok=0
  curl -sf -m 2 http://localhost:5173 > /dev/null 2>&1 || ok=0
  [ $ok -eq 1 ] && break
  sleep 1
done

# final re-check (model load can outlive the wait loop)
curl -sf -m 3 http://127.0.0.1:8000/api/ml/health > /dev/null 2>&1 && ok=1
curl -sf -m 3 http://127.0.0.1:5000/api/health > /dev/null 2>&1 || ok=0
curl -sf -m 3 http://localhost:5173 > /dev/null 2>&1 || ok=0

if [ $ok -eq 1 ]; then
  echo "ALL UP:  http://localhost:5173"
  echo "logs:    /tmp/portcast-{ml,server,client}.log"
  echo "stop:    kill \$(cat /tmp/portcast-{ml,server,client}.pid)"
else
  echo "Some services failed — check /tmp/portcast-*.log"
  exit 1
fi
