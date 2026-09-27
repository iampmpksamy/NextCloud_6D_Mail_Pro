#!/usr/bin/env python3
"""Reversible configuration cases on the existing dedicated test instance only."""
import base64
import subprocess
import setup

setup.preflight()
# Preserve exact isolated Apache configuration, changing only its pretty-URL flag.
read_command = ['docker', 'exec', setup.CONTAINER, 'cat', '/var/www/html/.htaccess']
original = subprocess.check_output(read_command)
flag = b'SetEnv front_controller_active true'
assert original.count(flag) == 1, 'Unexpected isolated Apache routing configuration'

def write_config(value):
    setup.run(['docker', 'exec', setup.CONTAINER, 'php', '-r',
        "file_put_contents('/var/www/html/.htaccess', base64_decode($argv[1]));",
        base64.b64encode(value).decode()], quiet=True)

try:
    write_config(original.replace(flag, b'SetEnv front_controller_active false'))
    setup.run(['node', str(setup.HERE / 'browser.cjs'), '--routes-only'])
    setup.run(['node', str(setup.HERE / 'browser.cjs'), '--routes-only', '--localhost'])
finally:
    write_config(original)
    assert subprocess.check_output(read_command) == original
try:
    setup.occ('app:disable', 'mail', quiet=True)
    setup.run(['node', str(setup.HERE / 'browser.cjs'), '--unavailable'])
finally:
    setup.occ('app:enable', 'mail', quiet=True)
print('Isolated index.php and disabled-Mail cases passed; exact Apache configuration and Mail restored.')
