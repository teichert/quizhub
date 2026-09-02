# Thin wrappers around the project's tooling, so the common loops are one word.
# Targets call node_modules/.bin directly instead of going through npm/npx,
# which under WSL can resolve to the Windows install and fail on UNC paths.
.DEFAULT_GOAL := help
.PHONY: help install dev build test typecheck validate clean

BIN := ./node_modules/.bin

help: ## show this help
	@grep -hE '^[a-z][a-z-]*:.*## ' $(MAKEFILE_LIST) \
		| awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

install: ## install dependencies (npm ci)
	npm ci

dev: ## rollup --watch, which also serves public/ with livereload
	@echo 'quiz:   http://localhost:5600/quizhub/'
	@echo 'editor: http://localhost:5600/quizhub/edit/'
	@# the trap is what stops the server rollup spawns: its own cleanup
	@# calls kill(0), which is the no-op signal, so it leaks the port
	@trap 'kill 0' EXIT INT TERM; \
	$(BIN)/dotenv -e .env -- $(BIN)/rollup -wc & \
	wait

build: ## production build into public/build
	$(BIN)/rollup -c

test: ## run the unit tests
	$(BIN)/vitest run

typecheck: ## typecheck the .ts sources
	$(BIN)/tsc -p tsconfig.json --noEmit

validate: ## typecheck the svelte components
	$(BIN)/svelte-check

clean: ## remove the build output
	rm -rf public/build
