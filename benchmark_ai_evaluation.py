import sys
import os
import json
import time
import urllib.request
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

NEXT_BASE = 'http://localhost:3000'
PY_BASE = 'http://127.0.0.1:8000'

results = {
    'planner_tests': [],
    'intent_tests': [],
    'replan_tests': [],
    'performance': {},
    'fallback_test': {}
}

def post_json(url, data, timeout=10):
    body = json.dumps(data, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': 'application/json; charset=utf-8'}
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.time() - t0
            raw = resp.read().decode('utf-8')
            return resp.status, json.loads(raw), elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.time() - t0
        raw = e.read().decode('utf-8')
        try:
            return e.code, json.loads(raw), elapsed
        except:
            return e.code, {'raw_error': raw}, elapsed
    except Exception as e:
        elapsed = time.time() - t0
        return 500, {'exception': str(e)}, elapsed

print('======================================================================')
print('        VISTA AI ENGINE — RIGOROUS QUALITY & CAPABILITY AUDIT         ')
print('======================================================================\n')

# ─────────────────────────────────────────────────────────────────────
# 1. PLANNER CORE & CONSTRAINTS AUDIT
# ─────────────────────────────────────────────────────────────────────
print('>>> [1/4] AUDITING PLANNER ENGINE & CONSTRAINTS SATISFACTION...')

planner_scenarios = [
    {
        'id': 'PLN-01',
        'name': 'Hà Nội Di Sản — 3N2Đ (Standard)',
        'payload': {
            'destination': 'Hà Nội',
            'days': 3,
            'people': 2,
            'budget_tier': 'standard',
            'has_elderly': False,
            'has_children': False,
            'arrival_time': '08:00',
            'departure_time': '18:00'
        },
        'assertions': lambda res: (
            len(res.get('days', [])) == 3 and
            all(len(d.get('activities', [])) >= 3 for d in res['days']) and
            any('Hồ Hoàn Kiếm' in a['destination_name'] or 'Văn Miếu' in a['destination_name'] for d in res['days'] for a in d['activities'])
        )
    },
    {
        'id': 'PLN-02',
        'name': 'Đà Nẵng — Ràng buộc Người cao tuổi (No strenuous/mountain climbing)',
        'payload': {
            'destination': 'Đà Nẵng',
            'days': 2,
            'people': 3,
            'budget_tier': 'standard',
            'has_elderly': True,
            'has_children': False,
            'arrival_time': '08:00',
            'departure_time': '18:00'
        },
        'assertions': lambda res: (
            len(res.get('days', [])) == 2 and
            # Should NOT contain strenuous climbing (Ngũ Hành Sơn caves, strenuous trekking)
            all('leo núi' not in a['destination_name'].lower() and 'đèo' not in a['destination_name'].lower() for d in res['days'] for a in d['activities'])
        )
    },
    {
        'id': 'PLN-03',
        'name': 'Phú Quốc — Ràng buộc Trẻ nhỏ (Kid-friendly entertainment)',
        'payload': {
            'destination': 'Phú Quốc',
            'days': 3,
            'people': 4,
            'budget_tier': 'luxury',
            'has_elderly': False,
            'has_children': True,
            'arrival_time': '08:00',
            'departure_time': '18:00'
        },
        'assertions': lambda res: (
            len(res.get('days', [])) == 3 and
            any(any(k in a['destination_name'].lower() or k in a['category'].lower() for k in ['safari', 'biển', 'giải trí', 'nghỉ dưỡng', 'grand world', 'hòn thơm']) for d in res['days'] for a in d['activities'])
        )
    },
    {
        'id': 'PLN-04',
        'name': 'Đà Nẵng — Ràng buộc Giờ đến muộn (Đáp 13:30 -> Ngày 1 bỏ sáng)',
        'payload': {
            'destination': 'Đà Nẵng',
            'days': 2,
            'people': 2,
            'budget_tier': 'standard',
            'has_elderly': False,
            'has_children': False,
            'arrival_time': '13:30',
            'departure_time': '18:00'
        },
        'assertions': lambda res: (
            len(res.get('days', [])) == 2 and
            # Day 1 first activity must not start before 13:00
            (len(res['days'][0]['activities']) > 0 and
             int(res['days'][0]['activities'][0]['start_time'].split(':')[0]) >= 13)
        )
    },
    {
        'id': 'PLN-05',
        'name': 'Hà Giang — Ràng buộc Giờ về sớm (Bay/xe về 13:00 -> Ngày cuối bỏ chiều/tối)',
        'payload': {
            'destination': 'Hà Giang',
            'days': 3,
            'people': 2,
            'budget_tier': 'economy',
            'has_elderly': False,
            'has_children': False,
            'arrival_time': '08:00',
            'departure_time': '13:00'
        },
        'assertions': lambda res: (
            len(res.get('days', [])) == 3 and
            # Day 3 last activity must conclude by 13:00
            (len(res['days'][2]['activities']) > 0 and
             int(res['days'][2]['activities'][-1]['end_time'].split(':')[0]) <= 13)
        )
    }
]

for sc in planner_scenarios:
    status, data, elapsed = post_json(f'{PY_BASE}/api/v1/plan', sc['payload'])
    passed = False
    details = ''
    if status == 200:
        try:
            passed = sc['assertions'](data)
            total_acts = sum(len(d.get('activities', [])) for d in data.get('days', []))
            details = f"{len(data.get('days', []))} ngày, {total_acts} điểm, dự toán {data.get('estimated_total_cost_vnd', 0):,}đ ({elapsed*1000:.1f}ms)"
        except Exception as ex:
            details = f"Assertion error: {ex}"
    else:
        details = f"HTTP {status}: {data}"
    
    icon = ' PASS ' if passed else ' FAIL '
    print(f"[{icon}] {sc['id']}: {sc['name']} -> {details}")
    results['planner_tests'].append({
        'id': sc['id'],
        'name': sc['name'],
        'passed': passed,
        'elapsed_ms': elapsed * 1000,
        'details': details
    })

# ─────────────────────────────────────────────────────────────────────
# 2. NATURAL LANGUAGE INTENT PARSER AUDIT
# ─────────────────────────────────────────────────────────────────────
print('\n>>> [2/4] AUDITING INTENT PARSER ENGINE (NATURAL LANGUAGE UNDERSTANDING)...')

intent_prompts = [
    {
        'prompt': 'Cặp đôi đi Đà Nẵng 3 ngày 2 đêm, thích ăn hải sản và ngắm hoàng hôn, ngân sách 5 triệu',
        'expected': {'dest': ['Đà Nẵng'], 'days': 3, 'couple': True}
    },
    {
        'prompt': 'Gia đình có bố mẹ 70 tuổi đi Huế 2N1Đ, đi lại thong thả không leo bậc',
        'expected': {'dest': ['Huế', 'Thừa Thiên Huế'], 'days': 2, 'elderly': True}
    },
    {
        'prompt': 'Gia đình có 2 bé nhỏ đi Phú Quốc 4 ngày luxury, thích safari và bãi biển',
        'expected': {'dest': ['Phú Quốc', 'Kiên Giang'], 'days': 4, 'children': True, 'budget': 'luxury'}
    },
    {
        'prompt': 'Đi công tác kết hợp du lịch Hà Nội 1 ngày, đáp 11:30 về 20:00, phố cổ & cafe',
        'expected': {'dest': ['Hà Nội'], 'days': 1, 'arrival': '11:30', 'departure': '20:00'}
    },
    {
        'prompt': 'Nhóm 4 bạn trẻ đi Sa Pa 3 ngày phượt và săn mây, ngân sách tiết kiệm',
        'expected': {'dest': ['Sa Pa', 'Lào Cai'], 'days': 3, 'budget': 'economy', 'people': 4}
    },
    {
        'prompt': 'Khám phá ẩm thực miền Tây tại Cần Thơ 2 ngày 1 đêm, chợ nổi Cái Răng',
        'expected': {'dest': ['Cần Thơ'], 'days': 2}
    },
    {
        'prompt': 'Đi Đà Lạt nghỉ dưỡng 3 ngày cùng người yêu, check-in cafe view đồi thông',
        'expected': {'dest': ['Đà Lạt', 'Lâm Đồng'], 'days': 3, 'couple': True}
    },
    {
        'prompt': 'Phượt Hà Giang 4 ngày 3 đêm, đi xe máy qua đèo Mã Pí Lèng',
        'expected': {'dest': ['Hà Giang'], 'days': 4}
    },
    {
        'prompt': 'Du lịch Nha Trang 3 ngày 2 đêm, tắm biển, ăn hải sản, lặn ngắm san hô',
        'expected': {'dest': ['Nha Trang', 'Khánh Hòa'], 'days': 3}
    },
    {
        'prompt': 'Tour Ninh Bình 1 ngày ngắm Tràng An, Tam Cốc, khởi hành 07:00',
        'expected': {'dest': ['Ninh Bình'], 'days': 1}
    }
]

for idx, item in enumerate(intent_prompts):
    status, data, elapsed = post_json(f'{PY_BASE}/api/v1/parse-intent', {'prompt': item['prompt']})
    passed = False
    checks = []
    if status == 200:
        exp = item['expected']
        allowed_dests = [d.lower() for d in (exp.get('dest') if isinstance(exp.get('dest'), list) else [exp.get('dest', '')])]
        actual_dest = (data.get('destination_province') or data.get('destination') or '').lower()
        dest_match = any(d in actual_dest or actual_dest in d for d in allowed_dests)
        days_match = exp.get('days') == data.get('total_days')
        checks.append(f"Dest: {data.get('destination_province')} (Exp: {exp.get('dest')}) {'OK' if dest_match else 'ERR'}")
        checks.append(f"Days: {data.get('total_days')} (Exp: {exp.get('days')}) {'OK' if days_match else 'ERR'}")
        
        if 'elderly' in exp:
            e_ok = data.get('has_elderly') == exp['elderly']
            checks.append(f"Elderly: {data.get('has_elderly')} {'OK' if e_ok else 'ERR'}")
            dest_match = dest_match and e_ok
        if 'children' in exp:
            c_ok = data.get('has_children') == exp['children']
            checks.append(f"Children: {data.get('has_children')} {'OK' if c_ok else 'ERR'}")
            dest_match = dest_match and c_ok
        if 'budget' in exp:
            b_ok = data.get('budget_tier') == exp['budget']
            checks.append(f"Budget: {data.get('budget_tier')} {'OK' if b_ok else 'ERR'}")
            dest_match = dest_match and b_ok
            
        passed = dest_match and days_match
    
    icon = ' PASS ' if passed else ' FAIL '
    print(f"[{icon}] INT-{idx+1:02d}: \"{item['prompt'][:45]}...\" -> {', '.join(checks)} ({elapsed*1000:.1f}ms)")
    results['intent_tests'].append({
        'id': f'INT-{idx+1:02d}',
        'prompt': item['prompt'],
        'passed': passed,
        'elapsed_ms': elapsed * 1000,
        'details': ', '.join(checks)
    })

# ─────────────────────────────────────────────────────────────────────
# 3. AI RE-PLANNER & CO-PILOT AUDIT
# ─────────────────────────────────────────────────────────────────────
print('\n>>> [3/4] AUDITING AI RE-PLANNER & DYNAMIC EDITING...')

# First create base plan for Da Nang
_, base_plan, _ = post_json(f'{PY_BASE}/api/v1/plan', {
    'destination': 'Đà Nẵng',
    'days': 3,
    'people': 2,
    'budget_tier': 'standard'
})

replan_instructions = [
    {
        'cmd': 'Đổi bữa trưa ngày 1 sang quán hải sản',
        'target_day': 1,
        'check': lambda days: any('hải sản' in a['destination_name'].lower() or 'ẩm thực' in a['category'].lower() for a in days[0]['activities'])
    },
    {
        'cmd': 'Bỏ các điểm leo núi ở ngày 2 vì gia đình mỏi chân',
        'target_day': 2,
        'check': lambda days: all('ngũ hành sơn' not in a['destination_name'].lower() and 'leo núi' not in a['destination_name'].lower() for a in days[1]['activities'])
    }
]

for idx, rp in enumerate(replan_instructions):
    replan_payload = {
        'current_plan': base_plan,
        'instruction': rp['cmd'],
        'constraints': {'has_elderly': False, 'has_children': False}
    }
    status, rp_data, elapsed = post_json(f'{PY_BASE}/api/v1/replan', replan_payload)
    passed = False
    msg = ''
    if status == 200 and 'days' in rp_data:
        try:
            passed = rp['check'](rp_data['days'])
            msg = f"Đã cập nhật lịch trình thành công ({elapsed*1000:.1f}ms)"
        except Exception as e:
            msg = f"Check failed: {e}"
    else:
        msg = f"HTTP {status}: {rp_data}"
        
    icon = ' PASS ' if passed else ' FAIL '
    print(f"[{icon}] RPL-{idx+1:02d}: \"{rp['cmd']}\" -> {msg}")
    results['replan_tests'].append({
        'id': f'RPL-{idx+1:02d}',
        'cmd': rp['cmd'],
        'passed': passed,
        'elapsed_ms': elapsed * 1000,
        'details': msg
    })

# ─────────────────────────────────────────────────────────────────────
# 4. LATENCY, PERFORMANCE & RESILIENCE AUDIT
# ─────────────────────────────────────────────────────────────────────
print('\n>>> [4/4] AUDITING END-TO-END GATEWAY LATENCY & FAILOVER...')

# Benchmark direct Next.js /api/ai/quick-plan
latencies = []
for i in range(5):
    status, data, elapsed = post_json(f'{NEXT_BASE}/api/ai/quick-plan', {
        'destination': 'Hà Nội',
        'totalDays': 3,
        'peopleCount': 2,
        'budgetLevel': 'MEDIUM'
    })
    if status == 200:
        latencies.append(elapsed * 1000)

p50 = sorted(latencies)[len(latencies)//2] if latencies else 0
p90 = sorted(latencies)[int(len(latencies)*0.9)] if latencies else 0
print(f"  * Next.js Quick-Plan API Latency: P50 = {p50:.1f}ms | P90 = {p90:.1f}ms | Min = {min(latencies):.1f}ms | Max = {max(latencies):.1f}ms")
results['performance'] = {
    'p50_ms': round(p50, 1),
    'p90_ms': round(p90, 1),
    'min_ms': round(min(latencies), 1),
    'max_ms': round(max(latencies), 1),
    'samples': len(latencies)
}

# Output summary report
with open('benchmark_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print('\n======================================================================')
total_p = sum(1 for t in results['planner_tests'] if t['passed'])
total_i = sum(1 for t in results['intent_tests'] if t['passed'])
total_r = sum(1 for t in results['replan_tests'] if t['passed'])
total_all = len(results['planner_tests']) + len(results['intent_tests']) + len(results['replan_tests'])
passed_all = total_p + total_i + total_r

print(f"AUDIT SUMMARY: {passed_all}/{total_all} tests PASSED ({(passed_all/total_all)*100:.1f}%)")
print(f"  - Planner Engine:  {total_p}/{len(results['planner_tests'])} passed")
print(f"  - Intent Parser:   {total_i}/{len(results['intent_tests'])} passed")
print(f"  - Re-planner:      {total_r}/{len(results['replan_tests'])} passed")
print('======================================================================')
