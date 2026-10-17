.PHONY: setup db-up db-down backend-run mobile-run admin-run test lint
setup:
	cd mobile && npm ci
	cd admin && npm ci
db-up:
	docker compose --env-file .env up -d postgres
db-down:
	docker compose down
backend-run:
	cd backend && ./gradlew bootRun
mobile-run:
	cd mobile && npm start
admin-run:
	cd admin && npm run dev
test:
	cd backend && ./gradlew test
	cd mobile && npm run typecheck
	cd admin && npm run build
lint:
	cd backend && ./gradlew spotlessCheck
	cd mobile && npm run lint
	cd admin && npm run lint
