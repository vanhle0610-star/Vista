import json
import os
import sys
import hmac
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import config
from rag_engine import rag_engine

logger = logging.getLogger("standalone_server")

class VistaAiRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        req_origin = self.headers.get("Origin", "")
        if req_origin and req_origin in config.ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", req_origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Token")

    def _check_auth(self) -> bool:
        if not config.INTERNAL_TOKEN:
            return True
        token = self.headers.get("X-Internal-Token", "")
        return hmac.compare_digest(token, config.INTERNAL_TOKEN)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, status_code: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/api/v1/") and not self._check_auth():
            self._send_json(401, {"error": "Unauthorized: Invalid or missing X-Internal-Token"})
            return

        if self.path == "/" or self.path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "service": "vista-python-llm",
                "engine": "python-standard-server",
                "model": config.LLM_MODEL,
                "loaded_destinations_count": len(rag_engine.destinations),
                "endpoints": ["/health", "/api/v1/chat", "/api/v1/recommend", "/api/v1/plan", "/api/v1/parse-intent", "/api/v1/replan"]
            })
        else:
            self._send_json(404, {"error": "Not Found", "path": self.path})

    def do_POST(self):
        if self.path.startswith("/api/v1/") and not self._check_auth():
            self._send_json(401, {"error": "Unauthorized: Invalid or missing X-Internal-Token"})
            return

        MAX_BODY_SIZE = 10 * 1024 * 1024
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except (ValueError, TypeError):
            content_length = 0

        if content_length > MAX_BODY_SIZE:
            self._send_json(413, {"error": "Payload Too Large: maximum body size is 10MB"})
            return

        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            body = json.loads(raw_body)
        except Exception:
            body = {}

        if self.path == "/api/v1/chat":
            question = body.get("question", "").strip()
            province = body.get("province", "").strip()
            if not question:
                self._send_json(400, {"error": "Question cannot be empty"})
                return

            grounded_places = rag_engine.search_destinations(province, question, limit=5)
            # In standard sync server, run generate_grounded_answer
            import asyncio
            try:
                answer = asyncio.run(rag_engine.generate_grounded_answer(question, province))
            except Exception:
                # If event loop exists or fails, sync fallback
                answer = rag_engine.generate_sync_grounded_answer(question, province)

            self._send_json(200, {
                "answer": answer,
                "grounded_destinations": grounded_places,
                "model": config.LLM_MODEL,
                "degraded": not bool(config.LLM_API_KEY and config.LLM_API_KEY.strip())
            })

        elif self.path == "/api/v1/recommend":
            province = body.get("province", "").strip()
            query = body.get("query", "").strip()
            try:
                raw_limit = int(body.get("limit", 10))
                limit = max(1, min(50, raw_limit))
            except (ValueError, TypeError):
                limit = 10
            places = rag_engine.search_destinations(province, query, limit=limit)
            self._send_json(200, {
                "province": province,
                "count": len(places),
                "results": places
            })

        elif self.path == "/api/v1/plan":
            import uuid
            from api.contract import (
                parse_plan_request,
                serialize_plan,
                ProvinceNotSupportedError,
                InvalidBudgetTierError,
                InvalidInputError,
                InsufficientDestinationsError,
                PlanVerificationError
            )
            from engine.planner import VistaMasterPlanner

            req_id = str(uuid.uuid4())
            try:
                hdr_inspect = self.headers.get("X-Admin-Inspect", "") if hasattr(self, "headers") and self.headers else ""
                is_admin = str(hdr_inspect).strip().lower() in ("true", "1", config.ADMIN_INSPECT_TOKEN.lower()) or bool(body.get("include_internal_diagnostics"))
                constraints = parse_plan_request(body)
                constraints.include_internal_diagnostics = is_admin
                plan_obj = VistaMasterPlanner.generate_plan(constraints)
                self._send_json(200, serialize_plan(plan_obj, request_id=req_id, include_internal_diagnostics=is_admin))
            except ProvinceNotSupportedError as pe:
                self._send_json(422, {"code": "PROVINCE_NOT_SUPPORTED", "message": str(pe), "request_id": req_id})
            except InvalidBudgetTierError as be:
                self._send_json(422, {"code": "INVALID_BUDGET_TIER", "message": str(be), "request_id": req_id})
            except InvalidInputError as ie:
                self._send_json(422, {"code": "INVALID_INPUT", "message": str(ie), "field": ie.field, "request_id": req_id})
            except InsufficientDestinationsError as ide:
                self._send_json(422, {"code": "INSUFFICIENT_DESTINATIONS", "message": str(ide), "request_id": req_id})
            except PlanVerificationError as ve:
                self._send_json(500, {"code": "PLAN_VERIFICATION_FAILED", "message": str(ve), "errors": ve.errors, "request_id": req_id})
            except Exception as e:
                logger.exception(f"Internal error processing plan request {req_id}: {e}")
                self._send_json(500, {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Internal server error occurred while processing plan",
                    "request_id": req_id
                })

        elif self.path == "/api/v1/parse-intent":
            from intent.intent_parser import IntentParserEngine
            prompt = body.get("prompt", "").strip()
            parsed = IntentParserEngine.parse_intent(prompt)
            self._send_json(200, parsed)

        elif self.path == "/api/v1/replan":
            from engine.replanner import VistaReplannerEngine
            plan_data = body.get("plan", {})
            instruction = body.get("instruction", "").strip()
            constraints_data = body.get("constraints")
            try:
                updated_plan = VistaReplannerEngine.replan_itinerary(
                    current_plan_data=plan_data,
                    instruction=instruction,
                    constraints_data=constraints_data
                )
                self._send_json(200, updated_plan)
            except Exception as e:
                logger.exception(f"Error in replanning: {e}")
                self._send_json(500, {
                    "code": "REPLAN_ERROR",
                    "message": f"Không thể điều chỉnh lịch trình: {str(e)}"
                })

        else:
            self._send_json(404, {"error": "Not Found", "path": self.path})

def run_standalone_server():
    config.validate_server_startup()
    server_address = (config.HOST, config.PORT)
    httpd = HTTPServer(server_address, VistaAiRequestHandler)
    print(f"🚀 VISTA Python LLM Server running on http://{config.HOST}:{config.PORT}")
    print(f"📍 Loaded {len(rag_engine.destinations)} destinations from dataset")
    print(f"🤖 LLM Model: {config.LLM_MODEL}")
    print("✨ Sẵn sàng tiếp nhận request từ Next.js và Spring Boot...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down VISTA Python LLM Server...")
        httpd.server_close()

if __name__ == "__main__":
    run_standalone_server()

