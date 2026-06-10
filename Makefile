.PHONY: help dev build prod clean

help:
	@echo "Sigma Lead Intelligence - Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make dev        Start development environment"
	@echo "  make build      Build all Docker images"
	@echo "  make prod       Start production environment"
	@echo "  make clean      Stop and remove all containers"
	@echo "  make logs       View logs"
	@echo "  make migrate    Run database migrations"
	@echo ""

dev:
	docker-compose up --build

build:
	docker-compose build

prod:
	docker-compose -f docker-compose.prod.yml up -d --build

clean:
	docker-compose down -v

logs:
	docker-compose logs -f

migrate:
	docker-compose exec backend alembic upgrade head

shell:
	docker-compose exec backend python

test:
	docker-compose exec backend python -m pytest
