import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from llm import BltClient, LLMClient, OpenAICompatibleClient, create_chat_client


class LlmBaseUrlTest(unittest.TestCase):
    def _mock_response(self):
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "ok",
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 1,
                "completion_tokens": 1,
                "total_tokens": 2,
            },
        }
        return resp

    @patch("llm.requests.post")
    def test_chat_appends_v1_when_base_is_root(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    @patch("llm.requests.post")
    def test_chat_keeps_versioned_base(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com/v1",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    @patch("llm.requests.post")
    def test_chat_uses_full_endpoint_directly(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com/v1/chat/completions",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    def test_create_chat_client_uses_openai_compatible_for_non_blt_base(self):
        client = create_chat_client(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com/v1",
        )
        self.assertIsInstance(client, OpenAICompatibleClient)

    def test_create_chat_client_preserves_blt_client_for_blt_base(self):
        client = create_chat_client(
            api_key="test-key",
            model="gemini-3-flash-preview",
            base_url="https://api.bltcy.ai/v1",
        )
        self.assertIsInstance(client, BltClient)

    def test_create_chat_client_defaults_to_openai_when_openai_key_exists(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=True):
            client = create_chat_client(
                api_key="test-key",
                model="gpt-4.1-mini",
                base_url="",
            )

        self.assertIsInstance(client, OpenAICompatibleClient)
        self.assertEqual(client.base_url, "https://api.openai.com/v1")


if __name__ == "__main__":
    unittest.main()
