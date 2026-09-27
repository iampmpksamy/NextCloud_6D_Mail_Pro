/* SPDX-License-Identifier: AGPL-3.0-or-later */
(function (scope) {
    'use strict'

    // Provider contract: listAccounts(), listMailboxes(accountId),
    // listMessages({ mailboxId, filter, cursor, limit }) -> Promise<{ items, nextCursor }>.
    // Counts describe the provider's mailbox, never the current result page.
    // A future OCS provider must normalize flags and $label1 tags into these fields.
    const states = message => ({
        unread: message.flags.seen === false,
        important: message.tags.some(tag => tag.imapLabel === '$label1'),
        favorite: message.flags.flagged === true,
    })

    class SyntheticMailProvider {
        constructor({ delay = 250, slowDelay = 1800 } = {}) {
            this.delay = delay
            this.slowDelay = slowDelay
            this.failedOnce = false
            this.accounts = [
                { id: 'studio', name: 'Design studio', address: 'studio@example.invalid' },
                { id: 'personal', name: 'Personal', address: 'personal@example.invalid' },
            ]
            this.mailboxes = [
                { id: 'studio-inbox', accountId: 'studio', name: 'Inbox' },
                { id: 'studio-projects', accountId: 'studio', name: 'Projects' },
                { id: 'personal-inbox', accountId: 'personal', name: 'Inbox' },
                { id: 'empty', accountId: 'personal', name: 'Empty folder' },
                { id: 'slow', accountId: 'personal', name: 'Loading demo' },
                { id: 'error', accountId: 'personal', name: 'Retry demo' },
            ]
            const subjects = [
                'A calmer start to the week', 'Your workspace notes', 'Review the color studies',
                'A small idea worth keeping', 'தமிழ் — நாளைய திட்டம் ✨',
                'A very long subject about the next design review, the research notes, and every little detail that deserves enough room to remain readable',
                '<img src=x onerror="alert(1)"> This is plain text', 'The next chapter is ready',
            ]
            this.messages = Array.from({ length: 16 }, (_, i) => ({
                id: `sample-${i}`, mailboxId: 'studio-inbox',
                sender: i === 5 ? 'The exceptionally long name of a collaborative design and research team'
                    : i === 6 ? '<script>alert("sample")</script>' : i === 4 ? 'மீனா · Zoë' : ['Alex River', 'Sam Finch', 'Robin Lane'][i % 3],
                subject: subjects[i % 8], preview: 'Synthetic preview · A little space to see what matters.',
                date: new Date(Date.UTC(2026, 8, 9, 12, 0) - i * 3600000).toISOString(),
                flags: { seen: !(i & 1), flagged: Boolean(i & 4) },
                tags: i & 2 ? [{ imapLabel: '$label1' }] : [],
            }))
            for (const [mailboxId, indexes] of [['studio-projects', [0, 2]], ['personal-inbox', [1, 4, 7]], ['slow', [3]], ['error', [5]]]) {
                for (const i of indexes) this.messages.push({ ...this.messages[i], id: `${mailboxId}-${i}`, mailboxId })
            }
        }

        async listAccounts() {
            return this.accounts.map(account => ({ ...account,
                unread: this.messages.filter(message => this.mailboxes.some(box => box.id === message.mailboxId && box.accountId === account.id) && states(message).unread).length,
            }))
        }

        async listMailboxes(accountId) {
            return this.mailboxes.filter(box => box.accountId === accountId).map(box => ({ ...box,
                isInbox: box.name === 'Inbox',
                unread: this.messages.filter(message => message.mailboxId === box.id && states(message).unread).length,
            }))
        }

        async listMessages({ mailboxId, filter = 'all', cursor = null, limit = 6 }) {
            if (!this.mailboxes.some(box => box.id === mailboxId)) throw new Error('Unknown synthetic mailbox')
            if (!['all', 'unread', 'important', 'favorite'].includes(filter)) throw new Error('Invalid filter')
            if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid page size')
            const offset = cursor === null ? 0 : Number(cursor)
            if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid cursor')
            await new Promise(resolve => setTimeout(resolve, mailboxId === 'slow' ? this.slowDelay : this.delay))
            if (mailboxId === 'error' && !this.failedOnce) {
                this.failedOnce = true
                throw new Error('Synthetic retry scenario')
            }
            // Client-side fixture filtering only. This is not server filter-completeness evidence.
            const matches = this.messages.filter(message => message.mailboxId === mailboxId
                && (filter === 'all' || states(message)[filter]))
            const items = matches.slice(offset, offset + limit).map(message => ({ ...message, ...states(message) }))
            return { items, nextCursor: offset + limit < matches.length ? String(offset + limit) : null }
        }
    }

    const api = { SyntheticMailProvider, states }
    if (typeof module !== 'undefined' && module.exports) module.exports = api
    else scope.SixdMailData = api
})(globalThis)
