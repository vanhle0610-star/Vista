import unittest
import os
from api.contract import parse_plan_request, InvalidBudgetTierError
from engine.planner import VistaMasterPlanner
import config

class TestBudgetAndAuth(unittest.TestCase):
    def test_luxury_total_cost_ge_standard_with_same_trip(self):
        req_std = {
            "destination": "Đà Nẵng",
            "days": 3,
            "people": 2,
            "budget_tier": "standard"
        }
        req_lux = {
            "destination": "Đà Nẵng",
            "days": 3,
            "people": 2,
            "budget_tier": "luxury"
        }
        req_prem = {
            "destination": "Đà Nẵng",
            "days": 3,
            "people": 2,
            "budget_tier": "premium"  # alias of luxury
        }

        plan_std = VistaMasterPlanner.generate_plan(parse_plan_request(req_std))
        plan_lux = VistaMasterPlanner.generate_plan(parse_plan_request(req_lux))
        plan_prem = VistaMasterPlanner.generate_plan(parse_plan_request(req_prem))

        self.assertGreaterEqual(
            plan_lux.estimated_total_cost_vnd,
            plan_std.estimated_total_cost_vnd,
            "Luxury tier cost must be >= Standard tier cost"
        )
        self.assertEqual(plan_lux.budget_tier, "luxury")
        self.assertEqual(plan_prem.budget_tier, "luxury")
        self.assertEqual(plan_prem.estimated_total_cost_vnd, plan_lux.estimated_total_cost_vnd)

    def test_invalid_tier_raises_exception(self):
        with self.assertRaises(InvalidBudgetTierError):
            parse_plan_request({"destination": "Đà Nẵng", "budget_tier": "abc"})
        with self.assertRaises(InvalidBudgetTierError):
            parse_plan_request({"destination": "Đà Nẵng", "budgetTier": "cheap"})
        with self.assertRaises(InvalidBudgetTierError):
            parse_plan_request({"destination": "Đà Nẵng", "budget_tier": "vip"})

    def test_startup_fails_without_token_and_not_dev(self):
        orig_token = os.environ.get("INTERNAL_TOKEN")
        orig_dev = os.environ.get("DEV")

        try:
            # Case 1: No token, not DEV -> Must fail startup with RuntimeError
            os.environ["INTERNAL_TOKEN"] = ""
            os.environ["DEV"] = "0"
            with self.assertRaises(RuntimeError) as ctx:
                config.validate_server_startup()
            self.assertIn("INTERNAL_TOKEN is not configured", str(ctx.exception))

            # Case 2: No token, DEV=1 -> Allowed with warning
            os.environ["INTERNAL_TOKEN"] = ""
            os.environ["DEV"] = "1"
            try:
                config.validate_server_startup()
            except RuntimeError:
                self.fail("Server startup should allow DEV=1 without token")

            # Case 3: Valid token, DEV=0 -> Allowed in production
            os.environ["INTERNAL_TOKEN"] = "secure-production-secret-123"
            os.environ["DEV"] = "0"
            try:
                config.validate_server_startup()
            except RuntimeError:
                self.fail("Server startup should succeed when INTERNAL_TOKEN is provided")
        finally:
            # Restore environment
            if orig_token is not None:
                os.environ["INTERNAL_TOKEN"] = orig_token
            else:
                os.environ.pop("INTERNAL_TOKEN", None)

            if orig_dev is not None:
                os.environ["DEV"] = orig_dev
            else:
                os.environ.pop("DEV", None)

    def test_standalone_server_auth_and_cors(self):
        from standalone_server import VistaAiRequestHandler
        from io import BytesIO

        class FakeSocket:
            def __init__(self):
                self.data = b""
            def makefile(self, *args, **kwargs):
                return BytesIO(b"")
            def sendall(self, data):
                self.data += data

        # Test auth check
        orig_token = config.INTERNAL_TOKEN
        try:
            config.INTERNAL_TOKEN = "secret123"
            
            # Handler with valid token
            h1 = VistaAiRequestHandler.__new__(VistaAiRequestHandler)
            h1.headers = {"X-Internal-Token": "secret123"}
            self.assertTrue(h1._check_auth())

            # Handler with invalid token
            h2 = VistaAiRequestHandler.__new__(VistaAiRequestHandler)
            h2.headers = {"X-Internal-Token": "wrong"}
            self.assertFalse(h2._check_auth())

            # Handler with missing token
            h3 = VistaAiRequestHandler.__new__(VistaAiRequestHandler)
            h3.headers = {}
            self.assertFalse(h3._check_auth())
        finally:
            config.INTERNAL_TOKEN = orig_token

if __name__ == "__main__":
    unittest.main()

