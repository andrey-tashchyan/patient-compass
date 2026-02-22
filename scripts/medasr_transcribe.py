#!/usr/bin/env python3
import argparse
import json
import math
import os
import sys
from pathlib import Path

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import audioread
import numpy as np
import torch
from scipy.signal import resample_poly
from transformers import AutoModelForCTC, AutoProcessor

MODEL_ID = os.environ.get("MEDASR_MODEL_ID", "google/medasr")


def select_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def env_truthy(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def resolve_local_snapshot_path() -> str | None:
    explicit = os.environ.get("MEDASR_MODEL_PATH")
    if explicit and Path(explicit).exists():
        return explicit

    snapshot_root = Path.home() / ".cache" / "huggingface" / "hub" / "models--google--medasr" / "snapshots"
    if not snapshot_root.exists():
        return None

    snapshots = [path for path in snapshot_root.iterdir() if path.is_dir()]
    if not snapshots:
        return None

    latest = max(snapshots, key=lambda path: path.stat().st_mtime)
    return str(latest)


def resolve_model_source() -> tuple[str, bool]:
    # Default behavior is local-first to avoid repeated downloads.
    local_only = env_truthy("MEDASR_LOCAL_ONLY", default=True)

    local_snapshot = resolve_local_snapshot_path()
    if local_snapshot:
        return local_snapshot, True

    return MODEL_ID, local_only


def load_audio_mono_16k(input_path: str, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    chunks: list[np.ndarray] = []
    sample_rate = target_sr

    with audioread.audio_open(input_path) as source:
        sample_rate = source.samplerate
        channels = source.channels
        for frame in source:
            pcm = np.frombuffer(frame, dtype=np.int16).astype(np.float32) / 32768.0
            if channels > 1:
                pcm = pcm.reshape(-1, channels).mean(axis=1)
            chunks.append(pcm)

    if chunks:
        audio = np.concatenate(chunks)
    else:
        audio = np.zeros((0,), dtype=np.float32)

    if sample_rate != target_sr and audio.size > 0:
        divisor = math.gcd(sample_rate, target_sr)
        up = target_sr // divisor
        down = sample_rate // divisor
        audio = resample_poly(audio, up, down).astype(np.float32)
        sample_rate = target_sr

    return audio, sample_rate


def transcribe(input_path: str) -> str:
    device = select_device()

    model_source, local_only = resolve_model_source()

    processor = AutoProcessor.from_pretrained(model_source, local_files_only=local_only)
    model = AutoModelForCTC.from_pretrained(model_source, local_files_only=local_only).to(device)

    speech, sample_rate = load_audio_mono_16k(input_path, target_sr=16000)
    inputs = processor(
        speech,
        sampling_rate=sample_rate,
        return_tensors="pt",
        padding=True,
    ).to(device)

    with torch.no_grad():
        tokens = model.generate(**inputs)

    return processor.batch_decode(tokens)[0].strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Transcribe an audio file with MedASR")
    parser.add_argument("--input", required=True, help="Path to input audio file")
    args = parser.parse_args()

    try:
        transcript = transcribe(args.input)
        print(json.dumps({"transcript": transcript}))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
