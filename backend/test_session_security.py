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

    def test_automatic_requests_do_not_extend_idle_session(self):
        client = backend.app.test_client()
        old_activity = time.time() - 120
        with client.session_transaction() as session:
            session["username"] = "usuario-prueba"
            session["role"] = "admin"
            session["last_activity"] = old_activity

        with patch.object(backend, "_refresh_main_session_from_db", return_value=True):
            self.assertEqual(client.get("/api/me").status_code, 200)
            self.assertEqual(client.get("/api/csrf").status_code, 200)
        with client.session_transaction() as session:
            self.assertEqual(session["last_activity"], old_activity)

    def test_explicit_user_activity_extends_idle_session(self):
        client = backend.app.test_client()
        old_activity = time.time() - 120
        with client.session_transaction() as session:
            session["username"] = "usuario-prueba"
            session["role"] = "admin"
            session["last_activity"] = old_activity

        with patch.object(backend, "_refresh_main_session_from_db", return_value=True):
            self.assertEqual(client.get("/api/me?activity=1").status_code, 200)
        with client.session_transaction() as session:
            self.assertGreater(session["last_activity"], old_activity)


if __name__ == "__main__":
    unittest.main()
