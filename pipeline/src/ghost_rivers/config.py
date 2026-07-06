"""Shared config + path resolution for the Ghost Rivers pipeline.

Everything resolves relative to the pipeline/ directory so the scripts run the
same way regardless of the caller's working directory.
"""
from __future__ import annotations
import os
import yaml

# .../pipeline/src/ghost_rivers/config.py  ->  up three dirs  ->  .../pipeline
PIPELINE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_config() -> dict:
    with open(os.path.join(PIPELINE_DIR, "config.yaml"), "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


CONFIG = load_config()


def resolve(rel_path: str) -> str:
    """Resolve a config-relative path to an absolute path under pipeline/."""
    return os.path.normpath(os.path.join(PIPELINE_DIR, rel_path))


def ensure_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path
