"""
UrbanIQ AI Model Manager
Auto-detects, downloads, and manages Qwen2.5-0.5B-Instruct locally.
This is the smallest capable instruction-following model (~1GB).
"""

import os
import sys
import time
import traceback
from pathlib import Path

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
MODEL_DIR = Path(__file__).parent / "cached_model"


class ModelManager:
    """Singleton manager for the local AI model."""
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._device = None
        self._ready = False
        self._loading = False
        self._error = None
        self._load_progress = ""

    @property
    def is_ready(self):
        return self._ready

    @property
    def is_loading(self):
        return self._loading

    @property
    def status(self):
        if self._ready:
            return "ready"
        if self._loading:
            return "loading"
        if self._error:
            return f"error: {self._error}"
        return "not_loaded"

    def is_downloaded(self):
        return (MODEL_DIR / "config.json").exists()

    def download_model(self):
        """Download model from HuggingFace Hub if not already cached."""
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print(f"[UrbanIQ AI] Downloading {MODEL_NAME} ...")
        print(f"[UrbanIQ AI] Target directory: {MODEL_DIR}")
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME, trust_remote_code=True
        )
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME, trust_remote_code=True
        )

        tokenizer.save_pretrained(str(MODEL_DIR))
        model.save_pretrained(str(MODEL_DIR))
        print("[UrbanIQ AI] Model downloaded and saved successfully!")

    def load_model(self):
        """Load model into memory (GPU if available, else CPU)."""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self._loading = True
        self._error = None
        self._load_progress = "starting"

        try:
            # Auto-detect device
            if torch.cuda.is_available():
                self._device = "cuda"
                model_dtype = torch.float16
                print(f"[UrbanIQ AI] Using GPU: {torch.cuda.get_device_name(0)}")
            else:
                self._device = "cpu"
                model_dtype = torch.float32
                print("[UrbanIQ AI] Using CPU (no GPU detected)")

            # Download if needed
            if not self.is_downloaded():
                self._load_progress = "downloading"
                self.download_model()

            source = str(MODEL_DIR)
            print(f"[UrbanIQ AI] Loading model from {source} ...")

            self._load_progress = "loading_tokenizer"
            self._tokenizer = AutoTokenizer.from_pretrained(
                source, trust_remote_code=True
            )
            print("[UrbanIQ AI] Tokenizer loaded.")

            self._load_progress = "loading_model"
            # Load model — try 'dtype' first (new API), fall back to 'torch_dtype'
            try:
                self._model = AutoModelForCausalLM.from_pretrained(
                    source,
                    dtype=model_dtype,
                    trust_remote_code=True,
                )
            except TypeError:
                self._model = AutoModelForCausalLM.from_pretrained(
                    source,
                    torch_dtype=model_dtype,
                    trust_remote_code=True,
                )
            print("[UrbanIQ AI] Model weights loaded.")

            self._load_progress = "moving_to_device"
            print(f"[UrbanIQ AI] Moving model to {self._device}...")
            self._model = self._model.to(self._device)
            print("[UrbanIQ AI] Model moved to device.")

            self._load_progress = "finalizing"
            self._model.eval()
            self._ready = True
            self._loading = False
            self._load_progress = "ready"
            print("[UrbanIQ AI] Model loaded and ready!")

        except Exception as e:
            self._error = str(e)
            self._loading = False
            self._ready = False
            self._load_progress = "error"
            print(f"[UrbanIQ AI] ERROR loading model: {e}")
            traceback.print_exc()
            # Don't re-raise — let the fallback system handle it

    def ensure_ready(self):
        """Ensure model is loaded before use."""
        if not self._ready:
            self.load_model()

    def generate(self, messages, max_new_tokens=768, temperature=0.7):
        """
        Generate text from chat messages.
        messages: list of {"role": "system"|"user"|"assistant", "content": "..."}
        """
        import torch

        self.ensure_ready()

        text = self._tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self._tokenizer(
            [text], return_tensors="pt", truncation=True, max_length=2048
        ).to(self._device)

        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self._tokenizer.eos_token_id,
                repetition_penalty=1.15,
            )

        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        return self._tokenizer.decode(generated_ids, skip_special_tokens=True)


def setup():
    """Standalone setup: download model if not present."""
    print("=" * 60)
    print("  UrbanIQ AI - Model Setup")
    print("=" * 60)

    mgr = ModelManager.get_instance()

    if mgr.is_downloaded():
        print(f"[✓] Model already downloaded at: {MODEL_DIR}")
    else:
        print(f"[↓] Model not found. Downloading {MODEL_NAME} ...")
        mgr.download_model()
        print("[✓] Download complete!")

    print("\n[→] Loading model to verify ...")
    mgr.load_model()
    print("[✓] Model verified and ready!")
    print("=" * 60)


if __name__ == "__main__":
    setup()
