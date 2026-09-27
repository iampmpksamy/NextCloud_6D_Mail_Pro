// Executes only against the dedicated loopback test instance as fixture-user.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { OcsMailProvider } = require('../../js/ocs-provider.js')
const origin = 'http://127.0.0.1:18764'
const password = fs.readFileSync(require('node:path').join(require('node:os').homedir(), '.local/state/sixd-mail-test/credentials.env'), 'utf8').trim().split('=')[1]
const endpoints = { accounts: '/ocs/v2.php/apps/mail/account/list', mailboxes: '/ocs/v2.php/apps/mail/ocs/mailboxes', messages: '/ocs/v2.php/apps/mail/ocs/mailboxes/__mailbox__/messages' }
const options = { endpoints, nativeMessageUrl: '/index.php/apps/mail/box/__mailbox__/thread/__message__', nativeFolderUrl: '/index.php/apps/mail/box/__mailbox__', origin }
const fetchAs = user => (url, config) => {
    assert.equal(new URL(url).origin, origin)
    assert.equal(config.method, 'GET')
    return fetch(url, { ...config, headers: { ...config.headers, Authorization: 'Basic ' + Buffer.from(user + ':' + password).toString('base64') } })
}
;(async () => {
    const provider = new OcsMailProvider({ ...options, fetcher: fetchAs('fixture-user') })
    const accounts = await provider.listAccounts(); assert.equal(accounts.length, 2)
    for (const account of accounts) {
        const boxes = await provider.listMailboxes(account.id)
        assert.ok(boxes.length >= 3)
        const box = boxes.find(b => b.name === 'Fixtures'); assert.ok(box)
        assert.equal(box.unread, 12)
        for (const filter of ['all', 'unread', 'favorite']) {
            let cursor = null, pages = 0; const rows = []
            do {
                const page = await provider.listMessages({ mailboxId: box.id, filter, cursor, limit: 5 })
                rows.push(...page.items); cursor = page.nextCursor
                assert.ok(++pages <= 10, 'pagination must terminate')
            } while (cursor)
            assert.equal(rows.length, filter === 'all' ? 24 : 12)
            assert.equal(new Set(rows.map(r => r.id)).size, rows.length)
            if (filter !== 'all') assert.ok(rows.every(r => r[filter]))
            else {
                assert.equal(new Set(rows.map(r => `${r.unread}/${r.important}/${r.favorite}`)).size, 8)
                for (const row of rows) {
                    const i = Number(row.subject.match(/Fixture (\d+)/)[1])
                    assert.equal(row.unread, Boolean(i & 1)); assert.equal(row.important, Boolean(i & 2)); assert.equal(row.favorite, Boolean(i & 4))
                    assert.equal(row.timestamp, 1788955200 - Math.floor(i / 2) * 60)
                }
                assert.ok(rows.some(r => r.subject.includes('<img')))
            }
        }
        const long = boxes.find(b => b.name === 'LongSender')
        assert.ok((await provider.listMessages({ mailboxId: long.id })).items[0].sender.length > 100)
        const empty = boxes.find(b => b.name === 'Empty')
        assert.deepEqual(await provider.listMessages({ mailboxId: empty.id }), { items: [], nextCursor: null })
    }
    const boxes = await provider.listMailboxes(accounts[0].id)
    const conversations = boxes.find(b => b.name === 'M1C-Conversations')
    assert.ok(boxes.some(b => b.name.startsWith('M1C-Long-folder') && b.name.length > 100))
    const singleton = await provider.get(new URL(origin + `/ocs/v2.php/apps/mail/ocs/mailboxes/${conversations.id}/messages?limit=20&view=singleton`))
    const threaded = await provider.get(new URL(origin + `/ocs/v2.php/apps/mail/ocs/mailboxes/${conversations.id}/messages?limit=20&view=threaded`))
    assert.equal(singleton.length, 6); assert.equal(threaded.length, 3)
    for (const row of threaded) {
        const members = singleton.filter(m => m.threadRootId === row.threadRootId)
        for (const key of ['databaseId','threadRootId','dateInt','subject','from','flags','tags']) assert.deepEqual(row[key], members[0][key], 'Newest message field: ' + key)
        assert.ok(!Object.hasOwn(row, 'threadCount') && !Object.hasOwn(row, 'threadSize'))
        assert.ok(provider.normalize(row, conversations.id).nativeMailUrl.endsWith('/thread/' + row.databaseId))
    }
    const a = threaded.find(m => m.subject.endsWith('Thread A'))
    assert.equal(a.flags.seen, true)
    assert.ok(singleton.some(m => m.threadRootId === a.threadRootId && !m.flags.seen))
    const b = threaded.find(m => m.subject.endsWith('Thread B'))
    assert.equal(b.flags.flagged, true); assert.deepEqual(b.tags, [])
    assert.ok(singleton.some(m => m.threadRootId === b.threadRootId && Object.values(m.tags).some(t => t.imapLabel === '$label1')))
    assert.deepEqual(threaded.map(m => m.dateInt), [1789041900, 1789041840, 1789041720])
    console.log('M1C threads: 6 singleton messages → 3 newest-message representatives; no aggregate flags/tags/count. Singleton UI retained.')
    await assert.rejects(provider.listMailboxes(999999))
    await assert.rejects(provider.listMessages({ mailboxId: 999999 }))
    let deniedUserRequests = 0
    const outsider = new OcsMailProvider({ ...options, fetcher: (...args) => { deniedUserRequests++; return fetchAs('fixture-outsider')(...args) } })
    assert.deepEqual(await outsider.listAccounts(), [])
    await assert.rejects(outsider.listMailboxes(accounts[0].id), e => e.code === '404')
    await assert.rejects(outsider.listMessages({ mailboxId: 1 }), e => e.code === 'server') // Mail 5.11.5 returns HTTP 500/OCS 996 for this ownership denial.
    assert.equal(deniedUserRequests, 3, 'Denied requests must not retry as another user')
    await assert.rejects(new OcsMailProvider({ ...options, fetcher: fetch }).listAccounts(), e => e.code === '401')
    console.log('Runtime OCS passed: 2 accounts, folders/counts, all 8 states, All/Unread/Favorite server filters, tied-timestamp pagination, empty, invalid IDs, unauthorized and cross-user denial')
})().catch(error => { console.error(error.stack, error.code ?? ''); process.exitCode = 1 })
