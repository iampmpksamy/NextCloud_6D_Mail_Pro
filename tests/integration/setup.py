#!/usr/bin/env python3
"""Provision only the fixed, disposable sixd-mail-test Compose project."""
from pathlib import Path
import base64
import email.message
import email.policy
import email.utils
import hashlib
import imaplib
import json
import secrets
import shutil
import subprocess
import tarfile
import time
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CONTAINER = 'sixd-mail-test-nextcloud'
BASE = 'http://127.0.0.1:18764'
CREDENTIALS = Path.home() / '.local/state/sixd-mail-test/credentials.env'

def run(args, *, env=None, quiet=False):
    result = subprocess.run(args, capture_output=True, text=True, env=env)
    if result.returncode:
        # Never echo a command containing generated test credentials.
        detail = result.stderr[:300]
        if CREDENTIALS.exists(): detail = detail.replace(password(), '[test secret]')
        raise RuntimeError('Isolated setup command failed: ' + detail)
    if not quiet and result.stdout.strip(): print(result.stdout.strip())
    return result.stdout

def occ(*args, **kwargs):
    return run(['docker', 'exec', '-u', 'www-data', CONTAINER, 'php', 'occ', *args], **kwargs)

def password():
    return CREDENTIALS.read_text().strip().split('=', 1)[1]

def api(path, user='fixture-user'):
    token = base64.b64encode(f'{user}:{password()}'.encode()).decode()
    request = urllib.request.Request(BASE + '/ocs/v2.php/apps/mail/' + path,
        headers={'Authorization': 'Basic ' + token, 'OCS-APIRequest': 'true', 'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)['ocs']['data']

def install_app(source, app):
    # Copies only into this dedicated test container, never an AIO container.
    run(['docker', 'cp', str(source), CONTAINER + ':/var/www/html/custom_apps/'], quiet=True)
    run(['docker', 'exec', CONTAINER, 'chown', '-R', 'www-data:www-data', '/var/www/html/custom_apps/' + app], quiet=True)
    occ('app:enable', app)

def seed():
    for user in ['studio', 'personal']:
        networks = json.loads(run(['docker', 'inspect', '--format', '{{json .NetworkSettings.Networks}}', 'sixd-mail-test-mail'], quiet=True))
        host = networks['sixd-mail-test_isolated']['IPAddress']
        client = imaplib.IMAP4(host, 3143)
        client.login(user, password())
        for folder in ['Projects', 'Empty', 'Fixtures', 'LongSender']:
            client.create(folder)
        for folder, count in [('INBOX', 24 if user == 'studio' else 8), ('Projects', 8), ('Fixtures', 24), ('LongSender', 1)]:
            client.select(folder)
            # Re-runs preserve existing test messages instead of deleting or duplicating.
            if client.search(None, 'ALL')[1][0]: continue
            for i in range(count):
                message = email.message.EmailMessage(policy=email.policy.SMTP)
                name = ['Alex Sample', 'தமிழ் Zoë', '<script>alert("fixture")</script>'][i % 3]
                if folder == 'LongSender': name = 'Long synthetic sender தமிழ் Zoë ' * 8
                message['From'] = email.utils.formataddr((name, 'sender@example.invalid'))
                message['To'] = f'{user}@example.invalid'
                message['Subject'] = f'Fixture {i:02d} — ' + ('<img src=x onerror=alert(1)> ' if i == 6 else 'Read-only test ') + ('long subject ' * 18 if i == 5 else '')
                message['Date'] = email.utils.formatdate(1788955200 - (i // 2) * 60, usegmt=True)
                message['Message-ID'] = f'<{user}-{folder}-{i}@example.invalid>'
                message.set_content('Synthetic message body. No external links or images.')
                flags = []
                if not i & 1: flags.append('\\Seen')
                if i & 2: flags.append('$label1')
                if i & 4: flags.append('\\Flagged')
                result, _ = client.append(folder, '(' + ' '.join(flags) + ')', imaplib.Time2Internaldate(1788955200 - (i // 2) * 60), message.as_bytes())
                if result != 'OK': raise RuntimeError('Synthetic IMAP append failed')
        client.logout()
    print('Synthetic IMAP fixtures seeded (no internet delivery).')

def preflight():
    # Refuse to adopt a same-named container/volume belonging to another project.
    for kind, names in [('container', ['sixd-mail-test-nextcloud', 'sixd-mail-test-db', 'sixd-mail-test-mail']),
                        ('volume', ['sixd-mail-test_nextcloud', 'sixd-mail-test_database'])]:
        for name in names:
            template = '{{json .Config.Labels}}' if kind == 'container' else '{{json .Labels}}'
            result = subprocess.run(['docker', kind, 'inspect', '--format', template, name], capture_output=True, text=True)
            if result.returncode == 0:
                labels = json.loads(result.stdout) or {}
                if labels.get('com.docker.compose.project') != 'sixd-mail-test':
                    raise RuntimeError('Refusing to adopt unrelated resource: ' + name)


def main():
    preflight()
    cache = HERE / '.cache'; cache.mkdir(exist_ok=True)
    CREDENTIALS.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    CREDENTIALS.parent.chmod(0o700)
    legacy = HERE / '.env'
    if legacy.exists() and not CREDENTIALS.exists():
        shutil.move(str(legacy), CREDENTIALS)
    if not CREDENTIALS.exists():
        CREDENTIALS.write_text('TEST_PASSWORD=' + secrets.token_hex(18) + '\n')
    CREDENTIALS.chmod(0o600)
    if CREDENTIALS.stat().st_mode & 0o077:
        raise RuntimeError('Test credentials require a filesystem supporting private permissions')
    running = subprocess.run(['docker', 'inspect', '--format', '{{.State.Running}}', 'sixd-mail-test-nextcloud', 'sixd-mail-test-db', 'sixd-mail-test-mail'], capture_output=True, text=True)
    if running.returncode or running.stdout.split() != ['true', 'true', 'true']:
        run(['docker', 'compose', '--env-file', str(CREDENTIALS), '-f', str(HERE / 'compose.yaml'), 'up', '-d', '--build'], quiet=True)
    else: print('Reusing the running isolated environment.')
    for _ in range(120):
        try:
            with urllib.request.urlopen(BASE + '/status.php', timeout=2) as response:
                if json.load(response).get('installed'): break
        except (OSError, ValueError): pass
        time.sleep(1)
    else: raise RuntimeError('Isolated Nextcloud installation did not finish')
    state = json.loads(occ('status', '--output=json', quiet=True))
    if state['versionstring'] != '33.0.6': raise RuntimeError('Unexpected isolated Nextcloud version')
    occ('status')
    run(['docker', 'exec', CONTAINER, 'php', '-r', 'echo PHP_VERSION, PHP_EOL;'])
    # These settings apply exclusively to the disposable test instance.
    occ('config:system:set', 'allow_local_remote_servers', '--type=boolean', '--value=true')
    occ('config:system:set', 'appstoreenabled', '--type=boolean', '--value=false')
    archive = cache / 'mail-v5.11.5.tar.gz'
    if not archive.exists():
        urllib.request.urlretrieve('https://github.com/nextcloud-releases/mail/releases/download/v5.11.5/mail-v5.11.5.tar.gz', archive)
    expected = '58dacb416ac7dfa1b711c7a5c15d502ca2d5f9f0b45253a0597eb39d29eaf881'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
        raise RuntimeError('Mail archive checksum mismatch')
    if not (cache / 'mail').exists():
        with tarfile.open(archive) as tar: tar.extractall(cache, filter='data')
    install_app(cache / 'mail', 'mail')
    occ('config:app:set', 'mail', 'importance_classification_default', '--type=boolean', '--value=false')
    for user in ['fixture-user', 'fixture-outsider']:
        existing = json.loads(occ('user:list', '--output=json', quiet=True))
        if user not in existing:
            run(['docker', 'exec', '-e', 'OC_PASS=' + password(), '-u', 'www-data', CONTAINER,
                'php', 'occ', 'user:add', '--password-from-env', user], quiet=True)
    seed()
    run(['python3', str(HERE / 'acceptance-fixtures.py')])
    accounts = api('account/list')
    for user in ['studio', 'personal']:
        if any(a['email'] == user + '@example.invalid' for a in accounts): continue
        occ('mail:account:create-imap', 'fixture-user', user.title(), user + '@example.invalid',
            'mail', '3143', 'none', user, password(), 'mail', '3025', 'none', user, password(), quiet=True)
    for account in api('account/list'):
        occ('mail:account:sync', '--force', str(account['id']))
    run(['python3', str(ROOT / 'scripts/package.py')])
    with tarfile.open(ROOT / 'build/sixd_mail_pro-0.1.0-dev.1.tar.gz') as tar:
        tar.extractall(cache, filter='data')
    install_app(cache / 'sixd_mail_pro', 'sixd_mail_pro')
    occ('config:app:set', 'sixd_mail_pro', 'data_provider', '--value=ocs')
    run(['node', str(HERE / 'browser.cjs'), '--warm-mail'])
    print('Isolated instance ready at ' + BASE + '/index.php/apps/sixd_mail_pro/')

if __name__ == '__main__': main()
