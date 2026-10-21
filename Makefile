.PHONY: setup db-up db-down backend-run mobile-run web-run admin-run test lint
setup:
	cd mobile && npm ci
	cd web && npm ci
db-up:
	docker compose --env-file .env up -d postgres
db-down:
	docker compose down
backend-run:
	cd backend && ./gradlew bootRun
mobile-run:
	cd mobile && npm start
web-run:
	cd web && npm run dev
admin-run: web-run
test:
	cd backend && ./gradlew test
	cd mobile && npm run typecheck
	cd web && npm run build
lint:
	cd backend && ./gradlew spotlessCheck
	cd mobile && npm run lint
	cd web && npm run lint
