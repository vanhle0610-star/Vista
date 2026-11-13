import sys
import os
import json
import hmac
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from api.contract import parse_plan_request
from engine.planner import VistaMasterPlanner, UserConstraints
from data.loader import data_loader
from data.db_manager import init_database, query_destinations_by_province, check_realtime_status
from engine.replanner import VistaReplannerEngine
from intent.intent_parser import IntentParserEngine
from rag_engine import rag_engine

# Initialize database storage on launch
init_database()

planner_instance = VistaMasterPlanner()
replanner_instance = VistaReplannerEngine()
intent_parser_instance = IntentParserEngine()

class VistaAIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        req_origin = self.headers.get('Origin', '') if hasattr(self, 'headers') and self.headers else ''
        if req_origin and req_origin in config.ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', req_origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Token, X-Admin-Inspect')

    def _check_auth(self) -> bool:
        if not config.INTERNAL_TOKEN:
            return True
        token = self.headers.get('X-Internal-Token', '') if hasattr(self, 'headers') and self.headers else ''
        return hmac.compare_digest(str(token), str(config.INTERNAL_TOKEN))

    def _is_admin_inspect(self, req_data: dict) -> bool:
        hdr = self.headers.get('X-Admin-Inspect', '') if hasattr(self, 'headers') and self.headers else ''
        if str(hdr).strip().lower() in ('true', '1', config.ADMIN_INSPECT_TOKEN.lower()):
            return True
        return bool(req_data.get('include_internal_diagnostics') or req_data.get('includeInternalDiagnostics'))

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path

        if clean_path.startswith('/api/v1/') and clean_path != '/api/v1/health' and not self._check_auth():
            self._send_json(401, {'error': 'Unauthorized: Invalid or missing X-Internal-Token'})
            return

        if clean_path in ('/health', '/', '/api/v1/health'):
            self._send_json(200, {
                'status': 'healthy',
                'service': 'vista-ai-engine',
                'version': '2.1.0',
                'storage': 'sqlite_realtime_database',
                'realtime_grounding': True
            })
        elif clean_path == '/api/v1/destinations':
            try:
                qs = urllib.parse.parse_qs(parsed_url.query)
                is_all = qs.get('all', ['0'])[0] in ('1', 'true', 'yes') or qs.get('province', [''])[0].lower() == 'all'
                if is_all:
                    all_rows = [
                        {
                            'id': d.id,
                            'name': d.name,
                            'province': d.province,
                            'category': d.category,
                            'latitude': d.latitude,
                            'longitude': d.longitude,
                            'priceMin': d.price_min,
                            'priceMax': d.price_max,
                            'description': d.description or d.local_tip or '',
                            'photoUrl': d.photo_url or '',
                            'dataSource': getattr(d, 'data_source', 'VISTA_CURATED_CSV'),
                        }
                        for d in data_loader.destinations
                    ]
                    self._send_json(200, {
                        'province': 'all',
                        'count': len(all_rows),
                        'destinations': all_rows,
                        'is_realtime': True
                    })
                else:
                    prov = qs.get('province', ['Đà Nẵng'])[0]
                    rows = query_destinations_by_province(prov)
                    for r in rows:
                        r['realtime_status'] = check_realtime_status(r.get('opening_hours', '{}'))
                    self._send_json(200, {
                        'province': prov,
                        'count': len(rows),
                        'destinations': rows,
                        'is_realtime': True
                    })
            except Exception as e:
                self._send_json(500, {'error': f'Failed to query destinations from database: {str(e)}'})
        else:
            self._send_json(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path.startswith('/api/v1/') and not self._check_auth():
            self._send_json(401, {'error': 'Unauthorized: Invalid or missing X-Internal-Token'})
            return

        content_len = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_len) if content_len > 0 else b'{}'
        try:
            req_data = json.loads(body_bytes.decode('utf-8'))
        except Exception as e:
            self._send_json(400, {'error': f'Invalid JSON: {str(e)}'})
            return

        if self.path == '/api/v1/plan':
            try:
                if not req_data.get('destination') and not req_data.get('destination_province') and not req_data.get('destinationProvince') and not req_data.get('province'):
                    req_data['destination'] = 'Đà Nẵng'
                is_admin = self._is_admin_inspect(req_data)
                constraints = parse_plan_request(req_data)
                constraints.include_internal_diagnostics = is_admin
                constraints.enable_llm_narration = True
                dest = constraints.destination_province
                days = constraints.total_days
                people = constraints.people_count
                budget = constraints.budget_tier

                plan_res = planner_instance.generate_plan(constraints)

                # Format response for Next.js quick-plan adapter
                out_days = []
                for d in plan_res.days:
                    acts = []
                    for a in d.activities:
                        dest_obj = data_loader.get_by_id(a.destination_id)
                        lat = dest_obj.latitude if dest_obj else 0.0
                        lng = dest_obj.longitude if dest_obj else 0.0
                        photo = dest_obj.photo_url if dest_obj and dest_obj.photo_url else ''
                        oh_status = getattr(a, 'opening_hours_status', 'OPEN_VERIFIED')
                        if oh_status == 'UNVERIFIED_HOURS':
                            status_txt = f'Chưa xác minh giờ mở cửa ({a.start_time})'
                            is_open_sched = True
                        else:
                            status_txt = f'Dự kiến mở lúc bạn đến ({a.start_time}–{a.end_time})'
                            is_open_sched = True
                        acts.append({
                            'destination_id': a.destination_id,
                            'name': a.destination_name,
                            'destination_name': a.destination_name,
                            'category': a.category,
                            'time_slot': a.time_slot,
                            'start_time': a.start_time,
                            'end_time': a.end_time,
                            'duration_min': getattr(a, 'duration_min', 0),
                            'wait_time_min': getattr(a, 'wait_time_min', 0),
                            'item_type': getattr(a, 'item_type', 'SIGHTSEEING'),
                            'transport_mode': getattr(a, 'transport_mode', 'car'),
                            'travel_distance_km': getattr(a, 'travel_distance_km', 0.0),
                            'travel_estimate_type': getattr(a, 'travel_estimate_type', 'ESTIMATED_COORDINATES'),
                            'opening_hours_status': oh_status,
                            'is_locked': getattr(a, 'is_locked', False),
                            'is_must_visit': getattr(a, 'is_must_visit', False),
                            'cost_vnd': a.cost_vnd,
                            'cost_label': a.cost_label,
                            'travel_time_from_prev_min': a.travel_time_from_prev_min,
                            'buffer_min': a.buffer_min,
                            'latitude': lat,
                            'longitude': lng,
                            'image_url': photo,
                            'photo_url': photo,
                            'note': a.note,
                            'tip': a.tip,
                            'data_confidence': a.data_confidence,
                            'realtime_status': status_txt,
                            'is_open_realtime': is_open_sched,
                            'rain_backup_suggestion': getattr(a, 'rain_backup_suggestion', None),
                            'reasons': [{'description': r.description} for r in a.reasons] if a.reasons else [],
                        })
                    out_days.append({
                        'day_number': d.day_number,
                        'title': getattr(d, 'title', f'Ngày {d.day_number}'),
                        'date_label': getattr(d, 'date_label', f'Ngày {d.day_number}'),
                        'day_rationale': getattr(d, 'day_rationale', ''),
                        'subtotal_cost_vnd': getattr(d, 'subtotal_cost_vnd', 0),
                        'day_status': getattr(d, 'day_status', 'ACTIVE'),
                        'status_reason': getattr(d, 'status_reason', None),
                        'departure_info': getattr(d, 'departure_info', None),
                        'activities': acts,
                    })

                total_cost = getattr(plan_res, 'estimated_total_cost_vnd', 0)
                min_fluc = getattr(plan_res, 'min_fluctuation_vnd', 0)
                max_fluc = getattr(plan_res, 'max_fluctuation_vnd', 0)
                breakdown = getattr(plan_res, 'breakdown', {})
                if hasattr(breakdown, '__dict__'):
                    breakdown = breakdown.__dict__
                resp_payload = {
                    'destination': dest,
                    'destination_province': dest,
                    'total_days': getattr(plan_res, 'total_days', days),
                    'people_count': people,
                    'budget_tier': getattr(plan_res, 'budget_tier', budget),
                    'pace': getattr(plan_res, 'pace', constraints.pace),
                    'schedule_status': getattr(plan_res, 'schedule_status', 'FEASIBLE'),
                    'data_version': getattr(plan_res, 'data_version', None),
                    'conflicts': getattr(plan_res, 'conflicts', []),
                    'assumptions': getattr(plan_res, 'assumptions', []),
                    'estimated_total_cost_vnd': total_cost,
                    'min_fluctuation_vnd': min_fluc,
                    'max_fluctuation_vnd': max_fluc,
                    'breakdown': breakdown,
                    'days': out_days,
                    'warnings': getattr(plan_res, 'warnings', []),
                }
                if is_admin and getattr(plan_res, 'internal_diagnostics', None):
                    resp_payload['internal_diagnostics'] = plan_res.internal_diagnostics
                self._send_json(200, resp_payload)
            except Exception as e:
                self._send_json(500, {'error': f'Plan generation error: {str(e)}'})

        elif self.path == '/api/v1/replan':
            try:
                is_admin = self._is_admin_inspect(req_data)
                current_plan = req_data.get('plan') or req_data.get('current_plan') or {}
                instruction = req_data.get('instruction') or req_data.get('command') or ''
                constraints = req_data.get('constraints') or {}
                if is_admin:
                    constraints['include_internal_diagnostics'] = True
                result = replanner_instance.replan_itinerary(current_plan, instruction, constraints)
                if not is_admin and isinstance(result, dict):
                    result.pop('internal_diagnostics', None)
                self._send_json(200, result)
            except Exception as e:
                self._send_json(500, {'error': f'Replanning error: {str(e)}'})

        elif self.path == '/api/v1/parse-intent':
            try:
                prompt = req_data.get('prompt') or ''
                parsed = intent_parser_instance.parse_intent(prompt)
                if isinstance(parsed, dict) and 'destination' in parsed and 'destination_province' not in parsed:
                    parsed['destination_province'] = parsed['destination']
                self._send_json(200, parsed)
            except Exception as e:
                self._send_json(500, {'error': f'Intent parsing error: {str(e)}'})
        elif self.path == '/api/v1/chat':
            try:
                question = str(req_data.get('question') or req_data.get('message') or '').strip()
                province = str(req_data.get('province') or req_data.get('destination') or '').strip()
                if not question:
                    self._send_json(400, {'error': 'Question cannot be empty'})
                    return
                grounded_places = rag_engine.search_destinations(province, question, limit=5)
                answer = rag_engine.generate_sync_grounded_answer(question, province)
                self._send_json(200, {
                    'answer': answer,
                    'grounded_destinations': grounded_places,
                    'model': config.LLM_MODEL,
                    'degraded': not bool(config.LLM_API_KEY and str(config.LLM_API_KEY).strip())
                })
            except Exception as e:
                self._send_json(500, {'error': f'Chat error: {str(e)}'})
        else:
            self._send_json(404, {'error': 'Endpoint not found'})

def run(port=8000):
    server_address = ('127.0.0.1', port)
    httpd = ThreadingHTTPServer(server_address, VistaAIHandler)
    print(f'[Vista AI Engine] Server running on http://127.0.0.1:{port}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run()
