const assert = require('node:assert/strict')
const { OcsMailProvider } = require('../js/ocs-provider.js')
const origin = 'http://localhost:18764'
const endpoints = { accounts: '/ocs/v2.php/apps/mail/account/list', mailboxes: '/ocs/v2.php/apps/mail/ocs/mailboxes', messages: '/ocs/v2.php/apps/mail/ocs/mailboxes/__mailbox__/messages' }
const nativeMessageUrl = '/index.php/apps/mail/box/__mailbox__/thread/__message__'
const wire = Array.from({ length: 16 }, (_, i) => ({ databaseId: i + 1, mailboxId: 1, dateInt: 1788955200 - Math.floor(i / 2), subject: `<img onerror=x> ${i}`, previewText: '', from: [{ label: '<script>fixture</script>', email: 'sample@example.invalid' }], flags: { seen: !(i & 1), flagged: Boolean(i & 4) }, tags: i & 2 ? { $label1: { imapLabel: '$label1' } } : [] }))
const options = { endpoints, nativeMessageUrl, nativeFolderUrl: '/index.php/apps/mail/box/__mailbox__', origin, requestToken: 'fixture-request-token' }
const success = data => ({ ok: true, json: async () => ({ ocs: { meta: { statuscode: 200 }, data } }) })
;(async () => {
    const provider = new OcsMailProvider({ ...options, fetcher: async (path, request) => {
        assert.equal(request.method, 'GET'); assert.equal(request.credentials, 'same-origin')
        assert.equal(request.redirect, 'error'); assert.equal(request.headers['OCS-APIRequest'], 'true'); assert.equal(request.headers.requesttoken, 'fixture-request-token')
        const url = new URL(path)
        if (url.pathname.endsWith('/account/list')) return success([{ id: 1, email: 'studio@example.invalid' }])
        if (url.pathname.endsWith('/mailboxes')) return success([{ databaseId: 1, accountId: 1, name: 'Inbox', unread: 8 }])
        const data = wire.filter(m => !url.searchParams.has('cursor') || m.dateInt < Number(url.searchParams.get('cursor')))
        return success(data.slice(0, Number(url.searchParams.get('limit'))))
    } })
    assert.equal((await provider.listAccounts())[0].unread, null)
    const mailbox = (await provider.listMailboxes(1))[0]
    assert.equal(mailbox.unread, 8)
    assert.equal(mailbox.nativeMailUrl, origin + '/index.php/apps/mail/box/1')
    let cursor = null; const result = []
    do {
        const page = await provider.listMessages({ mailboxId: 1, cursor, limit: 3 })
        result.push(...page.items); cursor = page.nextCursor
    } while (cursor)
    assert.equal(result.length, 16); assert.equal(new Set(result.map(m => m.id)).size, 16)
    assert.equal(new Set(result.map(m => `${m.unread}/${m.important}/${m.favorite}`)).size, 8)
    assert.ok(result[0].subject.includes('<img')); assert.ok(result[0].sender.includes('<script>'))
    assert.equal(result[0].nativeMailUrl, origin + '/index.php/apps/mail/box/1/thread/1')
    assert.equal(Object.hasOwn(result[0], 'flags'), false)
    assert.equal(provider.normalize({ ...wire[0], flags: { ...wire[0].flags, important: true } }, '1').important, false)
    assert.equal(provider.normalize({ ...wire[2], flags: { ...wire[2].flags, important: false } }, '1').important, true)
    await assert.rejects(provider.listMessages({ mailboxId: 1, filter: 'important' }), e => e.code === 'unsupported-filter')
    for (const status of [401, 403, 404, 500]) {
        const p = new OcsMailProvider({ ...options, fetcher: async () => ({ ok: false, status }) })
        await assert.rejects(p.listAccounts(), error => error.message === 'Mail data is unavailable.')
    }
    for (const body of [{}, { ocs: { meta: { statuscode: 200 }, data: {} } }, { ocs: { meta: { statuscode: 403 }, data: [] } }]) {
        const p = new OcsMailProvider({ ...options, fetcher: async () => ({ ok: true, json: async () => body }) })
        await assert.rejects(p.listAccounts())
    }
    await assert.rejects(new OcsMailProvider({ ...options, fetcher: async () => { throw Error('secret backend context') } }).listAccounts(), e => !e.message.includes('secret'))
    await assert.rejects(new OcsMailProvider({ ...options, timeout: 1, fetcher: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))) }).listAccounts(), e => e.code === 'timeout')
    const empty = new OcsMailProvider({ ...options, fetcher: async () => success([]) })
    assert.deepEqual(await empty.listAccounts(), [])
    assert.deepEqual(await empty.listMessages({ mailboxId: 1 }), { items: [], nextCursor: null })
    await assert.rejects(new OcsMailProvider({ ...options, endpoints: { ...endpoints, accounts: 'https://external.invalid/' } }).listAccounts(), e => e.code === 'origin')
    await assert.rejects(provider.listMessages({ mailboxId: '../bad' }))
    await assert.rejects(provider.listMessages({ mailboxId: true }))
    await assert.rejects(provider.listMessages({ mailboxId: 1, limit: 101 }))
    const tied = Array.from({ length: 110 }, (_, i) => ({ ...wire[i % 16], databaseId: i + 1, dateInt: wire[0].dateInt }))
    const crowded = new OcsMailProvider({ ...options, fetcher: async url => success(tied.slice(0, Number(new URL(url).searchParams.get('limit')))) })
    let boundary = null; const delivered = new Set()
    await assert.rejects(async () => {
        for (let i = 0; i < 30; i++) {
            const page = await crowded.listMessages({ mailboxId: 1, cursor: boundary })
            for (const row of page.items) { assert.ok(!delivered.has(row.id)); delivered.add(row.id) }
            assert.ok(page.nextCursor, 'oversized group must not silently truncate')
            boundary = page.nextCursor
        }
    }, e => e.code === 'timestamp-tie-limit')
    assert.throws(() => provider.normalize({ ...wire[0], flags: {} }, '1'))
    assert.throws(() => provider.normalize({ ...wire[0], mailboxId: 2 }, '1'))
    console.log('OCS contracts: normalization, 8 states, tied cursors, empty, auth/errors, schema, timeout and same-origin passed')
})().catch(error => { console.error(error); process.exitCode = 1 })
