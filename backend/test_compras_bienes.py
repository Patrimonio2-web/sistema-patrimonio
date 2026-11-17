import time
import unittest
from decimal import Decimal

import app as backend


class ComprasBienesTests(unittest.TestCase):
    @staticmethod
    def _client(username, role):
        client = backend.app.test_client()
        with client.session_transaction() as current:
            current["username"] = username
            current["role"] = role
            current["password_change_required"] = False
            current["user_checked_at"] = time.time()
            current["last_activity"] = time.time()
            current["csrf_token"] = "test-csrf-token"
        return client

    def test_payload_keeps_repeated_locations_as_separate_rows(self):
        payload = {
            "anio": 2026,
            "mes": 4,
            "observaciones": "Control mensual",
            "items": [
                {
                    "posible_ubicacion": "Tesorería",
                    "cantidad": 1,
                    "descripcion_factura": "CPU I5",
                    "fecha_compra": "2026-02-27",
                    "fecha_listado": "2026-03-02",
                    "estado_relevamiento": "Identificado",
                    "proveedor": "Proveedor A",
                },
                {
                    "posible_ubicacion": "Tesorería",
                    "cantidad": 2,
                    "descripcion_factura": "Monitor 24",
                    "fecha_compra": "2026-02-27",
                    "fecha_listado": "2026-03-02",
                    "estado_relevamiento": "Encontrado",
                },
            ],
        }
        _, _, _, items = backend._compras_payload(payload)
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["posible_ubicacion"], items[1]["posible_ubicacion"])
        self.assertEqual(items[0]["fecha_listado"], "2026-03-02")
        self.assertEqual(items[0]["proveedor"], "Proveedor A")
        self.assertIsNone(items[1]["proveedor"])
        self.assertIsNone(items[1]["valor_compra"])

    def test_purchase_value_is_optional_and_uses_two_decimal_places(self):
        item = {
            "posible_ubicacion": "Tesoreria", "cantidad": 1,
            "descripcion_factura": "Monitor", "fecha_compra": "2026-02-27",
            "fecha_listado": "2026-03-02", "estado_relevamiento": "Encontrado",
            "valor_compra": "1234.50",
        }
        payload = {"anio": 2026, "mes": 4, "items": [item]}
        self.assertEqual(backend._compras_payload(payload)[3][0]["valor_compra"], Decimal("1234.50"))
        for invalid in ("-1", "1.234", "NaN", "1000000000000"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                backend._compras_payload({**payload, "items": [{**item, "valor_compra": invalid}]})

    def test_report_requires_at_least_one_complete_item(self):
        with self.assertRaisesRegex(ValueError, "al menos un bien"):
            backend._compras_payload({"anio": 2026, "mes": 4, "items": []})

    def test_dante_can_read_and_chat_but_cannot_create_or_edit(self):
        with backend.app.test_request_context("/api/compras-bienes/reportes", method="GET"):
            backend.session["username"] = "Dante"
            self.assertTrue(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/reportes/1/mensajes", method="POST"):
            backend.session["username"] = "Dante"
            self.assertTrue(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/reportes", method="POST"):
            backend.session["username"] = "Dante"
            self.assertFalse(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/proveedores", method="GET"):
            backend.session["username"] = "Dante"
            self.assertTrue(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/proveedores", method="POST"):
            backend.session["username"] = "Dante"
            self.assertFalse(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/proveedores/1", method="PUT"):
            backend.session["username"] = "Dante"
            self.assertFalse(backend._restricted_role_request_allowed("viewer"))
        with backend.app.test_request_context("/api/compras-bienes/reportes/1", method="PUT"):
            backend.session["username"] = "Dante"
            self.assertFalse(backend._restricted_role_request_allowed("viewer"))

    def test_other_viewer_cannot_open_purchase_reports(self):
        response = self._client("VICEGOBERNACION", "viewer").get("/api/compras-bienes/reportes")
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
