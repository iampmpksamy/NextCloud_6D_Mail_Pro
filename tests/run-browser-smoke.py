#!/usr/bin/env python3
"""Exercise only the local PHP fixture using an existing Chrome installation."""
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request

root = Path(__file__).resolve().parents[1]
chrome = shutil.which('google-chrome') or shutil.which('chromium')
if not chrome:
    raise SystemExit('Chrome/Chromium is required for browser smoke tests')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='sixd-browser-') as tmp:
    with open(Path(tmp) / 'php.log', 'w') as log:
        server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(root)], stdout=log, stderr=log)
        try:
            base = f'http://127.0.0.1:{port}/tests/browser-fixture.php'
            for _ in range(50):
                if server.poll() is not None:
                    raise RuntimeError('Local fixture server failed to start')
                try:
                    urllib.request.urlopen(base, timeout=1).close()
                    break
                except OSError:
                    time.sleep(.05)
            else:
                raise RuntimeError('Local fixture server did not become ready')
            for width, theme in [(1440, 'light'), (1440, 'dark'), (390, 'light'), (390, 'dark')]:
                url = base + '?test=1' + ('&dark=1' if theme == 'dark' else '')
                result = subprocess.run([chrome, '--headless', '--no-sandbox', '--disable-gpu', '--no-first-run',
                    f'--user-data-dir={tmp}/chrome-{width}-{theme}', f'--window-size={width},1000',
                    '--virtual-time-budget=12000', '--dump-dom', url], capture_output=True, text=True, timeout=30)
                if result.returncode or 'data-test-result="PASS"' not in result.stdout:
                    import re
                    body = re.search(r'<body[^>]*>', result.stdout)
                    raise RuntimeError(f'{width}px {theme}: {body.group(0) if body else result.stderr[-1000:]}')
                print(f'Browser: {width}px {theme} — states, filters, pages, escaping, retry, stale responses, URL, CSS, overflow passed')
        finally:
            server.terminate()
            server.wait(timeout=5)
