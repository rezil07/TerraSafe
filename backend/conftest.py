"""
Pytest configuration for TerraSafe backend.
Ensures backend root is on sys.path regardless of execution working directory.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

