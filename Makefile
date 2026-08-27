SERVER_DIR  := server
CLIENT_DIR  := client
SERVER_LOG  := /tmp/careeros-server.log
CLIENT_LOG  := /tmp/careeros-client.log
SERVER_PID  := /tmp/careeros-server.pid
CLIENT_PID  := /tmp/careeros-client.pid
SERVER_PORT := 3001
CLIENT_PORT := 5173

.PHONY: help dev dev-bg start stop restart status logs install build

help:
	@echo "CareerOS targets:"
	@echo "  make dev        — run both server + client in foreground (Ctrl-C to stop)"
	@echo "  make dev-bg     — run dev mode (nodemon + vite) in background"
	@echo "  make start      — start both in background via nohup (plain node)"
	@echo "  make stop       — stop background processes"
	@echo "  make restart    — stop then start"
	@echo "  make status     — show running PIDs and ports"
	@echo "  make logs       — tail both logs"
	@echo "  make server-log — tail server log only"
	@echo "  make client-log — tail client log only"
	@echo "  make install    — install all npm dependencies"
	@echo "  make build      — production build of the client"

# ── Foreground dev ────────────────────────────────────────────────────────────

dev:
	npm run dev

# ── Background dev (nodemon + vite) ──────────────────────────────────────────

dev-bg: _kill-stale
	@echo "Starting server (nodemon)…"
	@cd $(SERVER_DIR) && nohup npx nodemon index.js \
		> $(SERVER_LOG) 2>&1 & echo $$! > $(SERVER_PID)
	@sleep 1
	@echo "Starting client (vite dev)…"
	@cd $(CLIENT_DIR) && nohup npx vite --port $(CLIENT_PORT) \
		> $(CLIENT_LOG) 2>&1 & echo $$! > $(CLIENT_PID)
	@sleep 1
	@$(MAKE) -s status

# ── Background (nohup, plain node) ───────────────────────────────────────────

start: _kill-stale
	@echo "Starting server…"
	@cd $(SERVER_DIR) && nohup node index.js \
		> $(SERVER_LOG) 2>&1 & echo $$! > $(SERVER_PID)
	@sleep 1
	@echo "Starting client…"
	@cd $(CLIENT_DIR) && nohup npx vite --port $(CLIENT_PORT) \
		> $(CLIENT_LOG) 2>&1 & echo $$! > $(CLIENT_PID)
	@sleep 1
	@$(MAKE) -s status

stop:
	@if [ -f $(SERVER_PID) ]; then \
		kill $$(cat $(SERVER_PID)) 2>/dev/null && echo "Server stopped" || echo "Server already gone"; \
		rm -f $(SERVER_PID); \
	else echo "No server PID file"; fi
	@if [ -f $(CLIENT_PID) ]; then \
		kill $$(cat $(CLIENT_PID)) 2>/dev/null && echo "Client stopped" || echo "Client already gone"; \
		rm -f $(CLIENT_PID); \
	else echo "No client PID file"; fi
	@lsof -ti :$(SERVER_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(CLIENT_PORT) | xargs kill -9 2>/dev/null || true

restart: stop
	@sleep 1
	@$(MAKE) start

# ── Status & logs ─────────────────────────────────────────────────────────────

status:
	@echo "--- Server (port $(SERVER_PORT)) ---"
	@if [ -f $(SERVER_PID) ] && kill -0 $$(cat $(SERVER_PID)) 2>/dev/null; then \
		echo "  running  PID=$$(cat $(SERVER_PID))"; \
	else echo "  stopped"; fi
	@echo "--- Client (port $(CLIENT_PORT)) ---"
	@if [ -f $(CLIENT_PID) ] && kill -0 $$(cat $(CLIENT_PID)) 2>/dev/null; then \
		echo "  running  PID=$$(cat $(CLIENT_PID))"; \
	else echo "  stopped"; fi

logs:
	@tail -f $(SERVER_LOG) $(CLIENT_LOG)

server-log:
	@tail -f $(SERVER_LOG)

client-log:
	@tail -f $(CLIENT_LOG)

# ── Install & build ───────────────────────────────────────────────────────────

install:
	npm install
	cd $(SERVER_DIR) && npm install
	cd $(CLIENT_DIR) && npm install

build:
	cd $(CLIENT_DIR) && npx vite build

# ── Internal ──────────────────────────────────────────────────────────────────

_kill-stale:
	@lsof -ti :$(SERVER_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(CLIENT_PORT) | xargs kill -9 2>/dev/null || true
	@rm -f $(SERVER_PID) $(CLIENT_PID)
