import hmac
import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import config
from rag_engine import rag_engine

logger = logging.getLogger("ai_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    config.validate_server_startup()
    yield

app = FastAPI(
    title="VISTA Python LLM Microservice",
    description="Microservice Python cung cấp khả năng xử lý LLM và trả lời câu hỏi dựa trên dữ liệu địa điểm du lịch Việt Nam.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS using ALLOWED_ORIGINS (no wildcard when allow_credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def verify_internal_token(request: Request, call_next):
    if request.url.path.startswith("/api/v1/"):
        token = request.headers.get("X-Internal-Token", "")
        expected = config.INTERNAL_TOKEN
        if not expected and config.DEV:
            pass
        elif not expected or not hmac.compare_digest(token, expected):
            return JSONResponse(status_code=401, content={"error": "Unauthorized: Invalid or missing X-Internal-Token"})
    return await call_next(request)

class ChatRequest(BaseModel):
    question: str = Field(..., description="Câu hỏi hoặc yêu cầu từ du khách")
    province: Optional[str] = Field("", description="Tỉnh/thành phố du lịch")

class ChatResponse(BaseModel):
    answer: str
    grounded_destinations: List[Dict[str, Any]]
    model: str
    degraded: Optional[bool] = False

class RecommendRequest(BaseModel):
    province: str
    query: Optional[str] = ""
    limit: Optional[int] = Field(default=10, ge=1, le=50)

class PlanRequest(BaseModel):
    destination: str
    days: int = 3
    people: int = 2
    interests: Optional[List[str]] = []
    budget_tier: Optional[str] = "standard"

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "vista-python-llm",
        "model": config.LLM_MODEL,
        "loaded_destinations_count": len(rag_engine.destinations)
    }

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_with_data(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    grounded_places = rag_engine.search_destinations(req.province, req.question, limit=5)
    answer = await rag_engine.generate_grounded_answer(req.question, req.province)

    return ChatResponse(
        answer=answer,
        grounded_destinations=grounded_places,
        model=config.LLM_MODEL,
        degraded=not bool(config.LLM_API_KEY and config.LLM_API_KEY.strip())
    )

@app.post("/api/v1/recommend")
def recommend_places(req: RecommendRequest):
    clamped_limit = max(1, min(50, req.limit or 10))
    places = rag_engine.search_destinations(req.province, req.query or "", limit=clamped_limit)
    return {
        "province": req.province,
        "count": len(places),
        "results": places
    }

@app.post("/api/v1/plan")
async def plan_trip(request: Request):
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

    try:
        body = await request.json()
    except Exception:
        body = {}

    req_id = str(uuid.uuid4())
    try:
        hdr_inspect = request.headers.get("X-Admin-Inspect", "")
        is_admin = str(hdr_inspect).strip().lower() in ("true", "1", config.ADMIN_INSPECT_TOKEN.lower()) or bool(body.get("include_internal_diagnostics"))
        constraints = parse_plan_request(body)
        constraints.include_internal_diagnostics = is_admin
        plan_obj = VistaMasterPlanner.generate_plan(constraints)
        return JSONResponse(status_code=200, content=serialize_plan(plan_obj, request_id=req_id, include_internal_diagnostics=is_admin))
    except ProvinceNotSupportedError as pe:
        return JSONResponse(
            status_code=422,
            content={"code": "PROVINCE_NOT_SUPPORTED", "message": str(pe), "request_id": req_id}
        )
    except InvalidBudgetTierError as be:
        return JSONResponse(
            status_code=422,
            content={"code": "INVALID_BUDGET_TIER", "message": str(be), "request_id": req_id}
        )
    except InvalidInputError as ie:
        return JSONResponse(
            status_code=422,
            content={"code": "INVALID_INPUT", "message": str(ie), "field": ie.field, "request_id": req_id}
        )
    except InsufficientDestinationsError as ide:
        return JSONResponse(
            status_code=422,
            content={"code": "INSUFFICIENT_DESTINATIONS", "message": str(ide), "request_id": req_id}
        )
    except PlanVerificationError as ve:
        return JSONResponse(
            status_code=500,
            content={"code": "PLAN_VERIFICATION_FAILED", "message": str(ve), "errors": ve.errors, "request_id": req_id}
        )
    except Exception as e:
        logger.exception(f"Unhandled server error in plan_trip (request_id={req_id}): {e}")
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Đã xảy ra lỗi nội bộ máy chủ, vui lòng thử lại sau.",
                "request_id": req_id
            }
        )

class ParseIntentRequest(BaseModel):
    prompt: str = Field(..., description="Câu yêu cầu tự do của du khách bằng tiếng Việt")

@app.post("/api/v1/parse-intent")
async def parse_user_intent(req: ParseIntentRequest):
    from intent.intent_parser import IntentParserEngine
    parsed = IntentParserEngine.parse_intent(req.prompt)
    return JSONResponse(status_code=200, content=parsed)

class ReplanRequest(BaseModel):
    plan: Dict[str, Any] = Field(..., description="Dữ liệu lịch trình hiện tại")
    instruction: str = Field(..., description="Lệnh điều chỉnh (ví dụ: trời mưa đổi điểm trong nhà, ngủ nướng, đổi điểm ăn)")
    constraints: Optional[Dict[str, Any]] = None

@app.post("/api/v1/replan")
async def replan_trip(req: ReplanRequest):
    from engine.replanner import VistaReplannerEngine
    updated_plan = VistaReplannerEngine.replan_itinerary(
        current_plan_data=req.plan,
        instruction=req.instruction,
        constraints_data=req.constraints
    )
    return JSONResponse(status_code=200, content=updated_plan)


