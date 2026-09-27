#!/usr/bin/env python3
"""Append synthetic M1C fixtures only to the existing isolated IMAP server."""
import email.message
import email.policy
import email.utils
import imaplib
import json
import sys
import time
import setup

LONG_FOLDER = 'M1C-' + 'Long-folder-label-' * 7

def main():
    setup.preflight()
    networks = json.loads(setup.run(['docker', 'inspect', '--format', '{{json .NetworkSettings.Networks}}', 'sixd-mail-test-mail'], quiet=True))
    client = imaplib.IMAP4(networks['sixd-mail-test_isolated']['IPAddress'], 3143)
    client.login('studio', setup.password())
    cold = '--cold' in sys.argv
    folder = 'M1C-Cold-' + str(time.time_ns()) if cold else 'M1C-Conversations'
    client.create(folder); client.select(folder)
    if not client.search(None, 'ALL')[1][0]:
        rows = [('A', 0, True, False, False), ('A', 1, False, False, False), ('A', 2, True, False, False),
                ('B', 0, True, True, False), ('B', 1, True, False, True), ('C', 0, False, True, True)]
        if cold: rows = [('Cold', 0, False, False, False)]
        for i, (thread, position, seen, important, favorite) in enumerate(rows):
            message = email.message.EmailMessage(policy=email.policy.SMTP)
            message['From'] = email.utils.formataddr((f'Synthetic {thread} sender {position}', 'sender@example.invalid'))
            message['To'] = 'studio@example.invalid'
            message['Subject'] = ('Re: ' if position else '') + 'M1C Thread ' + thread
            message['Message-ID'] = f'<{folder}-{thread}-{position}@example.invalid>'
            if position:
                message['In-Reply-To'] = f'<{folder}-{thread}-{position-1}@example.invalid>'
                message['References'] = ' '.join(f'<{folder}-{thread}-{p}@example.invalid>' for p in range(position))
            timestamp = 1789041600 + i * 60
            message['Date'] = email.utils.formatdate(timestamp, usegmt=True)
            message.set_content('Synthetic read-only acceptance fixture.')
            flags = (['\\Seen'] if seen else []) + (['$label1'] if important else []) + (['\\Flagged'] if favorite else [])
            result, _ = client.append(folder, '(' + ' '.join(flags) + ')', imaplib.Time2Internaldate(timestamp), message.as_bytes())
            assert result == 'OK'
    if not cold: client.create(LONG_FOLDER)
    client.logout()
    if cold:
        account = next(a for a in setup.api('account/list') if a['email'] == 'studio@example.invalid')
        setup.occ('mail:account:sync', '--force', str(account['id']), quiet=True)
        box = next(b for b in setup.api('ocs/mailboxes?accountId=' + str(account['id'])) if b['name'] == folder)
        (setup.HERE / '.cache').mkdir(exist_ok=True)
        (setup.HERE / '.cache/cold-folder.json').write_text(json.dumps({'id': box['databaseId'], 'name': folder}))
    print('Created synthetic cold folder' if cold else 'M1C conversations and long folder label ready')

if __name__ == '__main__': main()
