import time
import unittest
from unittest.mock import patch

import app as backend


class SessionSecurityTests(unittest.TestCase):
    def test_logout_invalidates_cookie_for_back_navigation(self):
        client = backend.app.test_client()
        with client.session_transaction() as session:
            session["username"] = "usuario-prueba"
            session["role"] = "admin"
            session["last_activity"] = time.time()

        with patch.object(backend, "_eliminar_presencia_usuario"):
            response = client.post("/api/logout")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(client.get("/api/me").status_code, 401)
        self.assertEqual(client.get("/api/anexos").status_code, 401)

    def test_idle_session_expires_on_next_request(self):
        client = backend.app.test_client()
        with client.session_transaction() as session:
            session["username"] = "usuario-prueba"
            session["role"] = "viewer"
            session["last_activity"] = (
                time.time() - backend.IDLE_SESSION_TIMEOUT_SECONDS - 1
            )

        with patch.object(backend, "_refresh_main_session_from_db", return_value=True):
            response = client.get("/api/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "session_expired")
        self.assertEqual(client.get("/api/me").status_code, 401)


if __name__ == "__main__":
    unittest.main()
