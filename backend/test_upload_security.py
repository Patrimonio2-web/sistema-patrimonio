import io
import os
import time
import unittest
from unittest.mock import patch

from PIL import Image

import app as backend


class UploadSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()
        with self.client.session_transaction() as session:
            session["username"] = "usuario-prueba"
            session["role"] = "admin"
            session["csrf_token"] = "test-csrf-token"
            session["last_activity"] = time.time()

    def upload(self, content):
        return self.client.post(
            "/api/uploads",
            data={"foto": (io.BytesIO(content), "foto.jpg")},
            content_type="multipart/form-data",
            headers={"X-CSRF-Token": "test-csrf-token"},
        )

    @patch.object(backend, "_refresh_main_session_from_db", return_value=True)
    def test_rejects_non_image_with_image_extension(self, _refresh):
        with patch.object(backend, "upload_to_cloudinary") as cloudinary_upload:
            response = self.upload(b"no es una imagen")

        self.assertEqual(response.status_code, 400)
        cloudinary_upload.assert_not_called()

    @patch.object(backend, "_refresh_main_session_from_db", return_value=True)
    def test_valid_image_upload_cleans_temporary_file(self, _refresh):
        image_bytes = io.BytesIO()
        Image.new("RGB", (2, 2), "white").save(image_bytes, format="JPEG")
        uploaded_path = None

        def fake_upload(path):
            nonlocal uploaded_path
            uploaded_path = path
            self.assertTrue(os.path.exists(path))
            return "https://example.com/foto.jpg"

        with patch.object(backend, "upload_to_cloudinary", side_effect=fake_upload):
            response = self.upload(image_bytes.getvalue())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["url"], "https://example.com/foto.jpg")
        self.assertIsNotNone(uploaded_path)
        self.assertFalse(os.path.exists(uploaded_path))

    @patch.object(backend, "_refresh_main_session_from_db", return_value=True)
    def test_upload_failure_cleans_temporary_file_without_exposing_details(self, _refresh):
        image_bytes = io.BytesIO()
        Image.new("RGB", (2, 2), "white").save(image_bytes, format="JPEG")
        uploaded_path = None

        def failing_upload(path):
            nonlocal uploaded_path
            uploaded_path = path
            raise RuntimeError("credential-test-secret")

        with patch.object(backend, "upload_to_cloudinary", side_effect=failing_upload):
            response = self.upload(image_bytes.getvalue())

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("credential-test-secret", response.get_data(as_text=True))
        self.assertIsNotNone(uploaded_path)
        self.assertFalse(os.path.exists(uploaded_path))


if __name__ == "__main__":
    unittest.main()
