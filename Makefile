# =============================================================================
# NexusNotes — Makefile
# =============================================================================
# Usage: make <target>
# Run 'make help' to see all available targets.
# =============================================================================

.PHONY: help setup dev build prod down logs clean test lint format \
        migrate migrate-create seed db-shell backend-shell frontend-shell \
        push-ecr deploy health check-env

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_FILE      := docker-compose.yml
COMPOSE_PROD_FILE := docker-compose.prod.yml
BACKEND_DIR       := backend
FRONTEND_DIR      := frontend

# Colors
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m

# =============================================================================
# HELP
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(BLUE)NexusNotes — Development Commands$(RESET)"
	@echo "=================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# SETUP
# =============================================================================

setup: ## Initial setup — copy .env.example and install dependencies
	@echo "$(BLUE)Setting up NexusNotes...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env from .env.example$(RESET)"; \
		echo "$(YELLOW)⚠  Edit .env with your actual values before running!$(RESET)"; \
	else \
		echo "$(YELLOW).env already exists, skipping copy$(RESET)"; \
	fi
	@echo "$(GREEN)Setup complete. Run 'make dev' to start the application.$(RESET)"

check-env: ## Verify required environment variables are set
	@echo "$(BLUE)Checking environment variables...$(RESET)"
	@test -f .env || (echo "$(RED)ERROR: .env not found. Run 'make setup' first.$(RESET)" && exit 1)
	@echo "$(GREEN)Environment check passed.$(RESET)"

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev: check-env ## Start the full development stack with hot reload
	@echo "$(BLUE)Starting NexusNotes development stack...$(RESET)"
	docker compose -f $(COMPOSE_FILE) up --build

dev-bg: check-env ## Start the development stack in the background
	@echo "$(BLUE)Starting NexusNotes in background...$(RESET)"
	docker compose -f $(COMPOSE_FILE) up --build -d
	@echo "$(GREEN)Stack started. Run 'make logs' to view logs.$(RESET)"
	@echo ""
	@echo "  Frontend:  http://localhost:5173"
	@echo "  Backend:   http://localhost:8000"
	@echo "  API Docs:  http://localhost:8000/docs"
	@echo "  MinIO UI:  http://localhost:9001"
	@echo ""

# =============================================================================
# BUILD
# =============================================================================

build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(RESET)"
	docker compose -f $(COMPOSE_FILE) build

build-prod: ## Build production Docker images
	@echo "$(BLUE)Building production Docker images...$(RESET)"
	docker compose -f $(COMPOSE_PROD_FILE) build

# =============================================================================
# PRODUCTION
# =============================================================================

prod: ## Start the production stack
	@echo "$(BLUE)Starting NexusNotes production stack...$(RESET)"
	docker compose -f $(COMPOSE_PROD_FILE) up -d
	@echo "$(GREEN)Production stack started.$(RESET)"

# =============================================================================
# STOP / CLEAN
# =============================================================================

down: ## Stop the development stack
	@echo "$(BLUE)Stopping development stack...$(RESET)"
	docker compose -f $(COMPOSE_FILE) down

down-prod: ## Stop the production stack
	docker compose -f $(COMPOSE_PROD_FILE) down

clean: ## Stop stack and remove all volumes (WARNING: deletes database data!)
	@echo "$(RED)WARNING: This will delete all data including the database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@echo "$(GREEN)Clean complete.$(RESET)"

# =============================================================================
# LOGS
# =============================================================================

logs: ## Stream logs from all containers
	docker compose -f $(COMPOSE_FILE) logs -f

logs-backend: ## Stream logs from the backend container
	docker compose -f $(COMPOSE_FILE) logs -f backend

logs-frontend: ## Stream logs from the frontend container
	docker compose -f $(COMPOSE_FILE) logs -f frontend

logs-nginx: ## Stream logs from the nginx container
	docker compose -f $(COMPOSE_FILE) logs -f nginx

logs-db: ## Stream logs from the database container
	docker compose -f $(COMPOSE_FILE) logs -f db

# =============================================================================
# TESTING
# =============================================================================

test: ## Run all tests (backend + frontend)
	@echo "$(BLUE)Running backend tests...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm backend pytest -v
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run test -- --run
	@echo "$(GREEN)All tests passed.$(RESET)"

test-backend: ## Run backend tests only
	docker compose -f $(COMPOSE_FILE) run --rm backend pytest -v --tb=short

test-frontend: ## Run frontend tests only
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run test -- --run

test-e2e: ## Run Playwright E2E tests
	@echo "$(BLUE)Running E2E tests...$(RESET)"
	npx playwright test

test-cov: ## Run backend tests with coverage report
	docker compose -f $(COMPOSE_FILE) run --rm backend pytest --cov=app --cov-report=html --cov-report=term

# =============================================================================
# LINTING & FORMATTING
# =============================================================================

lint: ## Lint both frontend and backend
	@echo "$(BLUE)Linting backend (Ruff)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm backend ruff check .
	@echo "$(BLUE)Linting frontend (ESLint)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run lint
	@echo "$(GREEN)Linting complete.$(RESET)"

lint-backend: ## Lint backend only
	docker compose -f $(COMPOSE_FILE) run --rm backend ruff check .

lint-frontend: ## Lint frontend only
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run lint

format: ## Format all code
	@echo "$(BLUE)Formatting backend (Black + Ruff)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm backend black .
	docker compose -f $(COMPOSE_FILE) run --rm backend ruff check --fix .
	@echo "$(BLUE)Formatting frontend (Prettier)...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run format
	@echo "$(GREEN)Formatting complete.$(RESET)"

typecheck: ## Run TypeScript type checking on frontend
	docker compose -f $(COMPOSE_FILE) run --rm frontend npm run typecheck

# =============================================================================
# DATABASE
# =============================================================================

migrate: ## Run Alembic database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm backend alembic upgrade head
	@echo "$(GREEN)Migrations complete.$(RESET)"

migrate-create: ## Create a new Alembic migration (usage: make migrate-create MSG="add users table")
	@test -n "$(MSG)" || (echo "$(RED)Usage: make migrate-create MSG=\"your migration message\"$(RESET)" && exit 1)
	docker compose -f $(COMPOSE_FILE) run --rm backend alembic revision --autogenerate -m "$(MSG)"

migrate-down: ## Rollback the last migration
	docker compose -f $(COMPOSE_FILE) run --rm backend alembic downgrade -1

migrate-history: ## Show migration history
	docker compose -f $(COMPOSE_FILE) run --rm backend alembic history

seed: ## Seed the database with development data
	@echo "$(BLUE)Seeding database...$(RESET)"
	docker compose -f $(COMPOSE_FILE) run --rm backend python scripts/seed.py
	@echo "$(GREEN)Database seeded.$(RESET)"

db-shell: ## Open a MySQL shell
	docker compose -f $(COMPOSE_FILE) exec db mysql -u nexusnotes -p nexusnotes

# =============================================================================
# SHELLS
# =============================================================================

backend-shell: ## Open a shell in the backend container
	docker compose -f $(COMPOSE_FILE) exec backend bash

frontend-shell: ## Open a shell in the frontend container
	docker compose -f $(COMPOSE_FILE) exec frontend sh

# =============================================================================
# HEALTH CHECK
# =============================================================================

health: ## Check the application health endpoints
	@echo "$(BLUE)Checking health endpoints...$(RESET)"
	@curl -sf http://localhost:8000/api/health | python3 -m json.tool && \
		echo "$(GREEN)Health: OK$(RESET)" || echo "$(RED)Health: FAILED$(RESET)"
	@curl -sf http://localhost:8000/api/ready | python3 -m json.tool && \
		echo "$(GREEN)Ready: OK$(RESET)" || echo "$(RED)Ready: FAILED$(RESET)"

# =============================================================================
# AWS / DEPLOYMENT
# =============================================================================

push-ecr: ## Build and push images to AWS ECR (requires AWS_ACCOUNT_ID and AWS_REGION env vars)
	@test -n "$(AWS_ACCOUNT_ID)" || (echo "$(RED)AWS_ACCOUNT_ID not set$(RESET)" && exit 1)
	@test -n "$(AWS_REGION)" || (echo "$(RED)AWS_REGION not set$(RESET)" && exit 1)
	@echo "$(BLUE)Authenticating with ECR...$(RESET)"
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	@echo "$(BLUE)Building and pushing images...$(RESET)"
	$(MAKE) build-prod
	docker tag nexusnotes-frontend:latest \
		$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/frontend:latest
	docker tag nexusnotes-backend:latest \
		$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/backend:latest
	docker tag nexusnotes-nginx:latest \
		$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/nginx:latest
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/frontend:latest
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/backend:latest
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/nexusnotes/nginx:latest
	@echo "$(GREEN)Images pushed to ECR.$(RESET)"
