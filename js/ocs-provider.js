/* SPDX-License-Identifier: AGPL-3.0-or-later */
(function (scope) {
    'use strict'
    class MailDataError extends Error {
        constructor(code) { super('Mail data is unavailable.'); this.code = code }
    }
    const fail = () => { throw new MailDataError('malformed') }
    const id = value => ['number', 'string'].includes(typeof value) && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? String(value) : fail()
    const string = value => typeof value === 'string' ? value : fail()
    const array = value => Array.isArray(value) ? value : fail()

    class OcsMailProvider {
        constructor({ endpoints, nativeMessageUrl, nativeFolderUrl = '', origin = scope.location.origin, requestToken = '', fetcher = scope.fetch.bind(scope), timeout = 10000 }) {
            this.origin = origin
            this.endpoints = endpoints
            this.nativeMessageUrl = nativeMessageUrl
            this.nativeFolderUrl = nativeFolderUrl
            this.requestToken = requestToken
            this.fetcher = fetcher
            this.timeout = timeout
            this.mailboxes = new Map()
            this.supportsImportantFilter = false // The server importance flag is not a complete tag-membership filter.
        }
        url(template, replacements = {}) {
            let path = string(template)
            for (const [key, value] of Object.entries(replacements)) path = path.replace(key, encodeURIComponent(id(value)))
            const url = new URL(path, this.origin)
            if (url.origin !== this.origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new MailDataError('origin')
            return url
        }
        async get(url) {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), this.timeout)
            try {
                const headers = { Accept: 'application/json', 'OCS-APIRequest': 'true' }
                if (this.requestToken) headers.requesttoken = this.requestToken
                const response = await this.fetcher(url.toString(), { method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store', headers, signal: controller.signal })
                if (!response.ok) throw new MailDataError([401, 403, 404].includes(response.status) ? String(response.status) : 'server')
                const body = await response.json()
                if (!body?.ocs?.meta || ![100, 200].includes(body.ocs.meta.statuscode) || !Object.hasOwn(body.ocs, 'data')) fail()
                return body.ocs.data
            } catch (error) {
                if (error instanceof MailDataError) throw error
                throw new MailDataError(controller.signal.aborted ? 'timeout' : 'network')
            } finally { clearTimeout(timer) }
        }
        async listAccounts() {
            return array(await this.get(this.url(this.endpoints.accounts))).map(account => ({
                id: id(account.id), name: string(account.email), address: account.email, unread: null,
            }))
        }
        async listMailboxes(accountId) {
            accountId = id(accountId)
            const url = this.url(this.endpoints.mailboxes); url.searchParams.set('accountId', accountId)
            return array(await this.get(url)).map(box => {
                if (id(box.accountId) !== accountId) fail()
                const mailbox = { id: id(box.databaseId), accountId, name: string(box.displayName ?? box.name),
                    unread: Number.isSafeInteger(box.unread) && box.unread >= 0 ? box.unread : null,
                    nativeMailUrl: this.nativeFolderUrl ? this.url(this.nativeFolderUrl, { '__mailbox__': box.databaseId }).toString() : null }
                this.mailboxes.set(mailbox.id, mailbox)
                return mailbox
            })
        }
        normalize(message, mailboxId) {
            if (id(message.mailboxId) !== mailboxId || typeof message.flags?.seen !== 'boolean' || typeof message.flags?.flagged !== 'boolean') fail()
            if (!Number.isSafeInteger(message.dateInt) || !Number.isFinite(new Date(message.dateInt * 1000).getTime())) fail()
            const tags = message.tags
            if (!tags || typeof tags !== 'object') fail()
            const important = Object.values(tags).some(tag => tag && tag.imapLabel === '$label1')
            const from = array(message.from).map(sender => string(sender.label || sender.email)).join(', ')
            const messageId = id(message.databaseId)
            return { id: messageId, mailboxId, accountId: this.mailboxes.get(mailboxId)?.accountId ?? null,
                sender: from, subject: string(message.subject), preview: message.previewText === null ? '' : string(message.previewText),
                date: new Date(message.dateInt * 1000).toISOString(), timestamp: message.dateInt,
                unread: !message.flags.seen, favorite: message.flags.flagged, important,
                nativeMailUrl: this.url(this.nativeMessageUrl, { '__mailbox__': mailboxId, '__message__': messageId }).toString() }
        }
        async listMessages({ mailboxId, filter = 'all', cursor = null, limit = 6 }) {
            mailboxId = id(mailboxId)
            if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new MailDataError('limit')
            const filters = { all: '', unread: 'is:unread', favorite: 'is:starred' }
            if (!Object.hasOwn(filters, filter)) throw new MailDataError('unsupported-filter')
            if (cursor !== null && (!Number.isSafeInteger(cursor.timestamp) || !Array.isArray(cursor.seen) || cursor.seen.length > 99)) fail()
            const seen = new Set((cursor?.seen ?? []).map(id))
            const count = limit + 1 + seen.size
            if (count > 100) throw new MailDataError('timestamp-tie-limit')
            const url = this.url(this.endpoints.messages, { '__mailbox__': mailboxId })
            url.searchParams.set('limit', String(count)); url.searchParams.set('view', 'singleton')
            if (filters[filter]) url.searchParams.set('filter', filters[filter])
            // Mail's cursor is an exclusive sent-at timestamp. Revisit the boundary second
            // and discard known IDs so equal timestamps are not silently skipped.
            if (cursor) url.searchParams.set('cursor', String(cursor.timestamp + 1))
            const raw = array(await this.get(url))
            if (raw.length > count) fail()
            const normalized = raw.map(message => this.normalize(message, mailboxId))
            const unique = new Map()
            for (const message of normalized) if (!seen.has(message.id)) unique.set(message.id, message)
            const candidates = [...unique.values()]
            if (candidates.some((m, i) => i && m.timestamp > candidates[i - 1].timestamp)) fail()
            const items = candidates.slice(0, limit)
            let nextCursor = null
            if (candidates.length > limit) {
                const timestamp = items.at(-1).timestamp
                const boundary = new Set(cursor?.timestamp === timestamp ? seen : [])
                for (const item of items) if (item.timestamp === timestamp) boundary.add(item.id)
                nextCursor = { timestamp, seen: [...boundary] }
            }
            return { items, nextCursor }
        }
    }
    const api = { OcsMailProvider, MailDataError }
    if (typeof module !== 'undefined' && module.exports) module.exports = api
    else scope.SixdMailOcs = api
})(globalThis)
