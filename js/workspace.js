/* SPDX-License-Identifier: AGPL-3.0-or-later */
(function () {
    'use strict'
    function mount() {
        const root = document.getElementById('sixd-mail-pro')
        if (!root) return
        const translate = text => typeof t === 'function' ? t('sixd_mail_pro', text) : text
        const provider = new window.SixdMailData.SyntheticMailProvider()
        const find = name => root.querySelector(`[data-ui="${name}"]`)
        const element = (tag, className, text) => {
            const node = document.createElement(tag)
            if (className) node.className = className
            if (text !== undefined) node.textContent = text
            return node
        }
        const list = find('messages'), status = find('status'), previous = find('previous'), next = find('next')
        const filters = Array.from(root.querySelectorAll('[data-filter]'))
        let mailboxId = 'studio-inbox', filter = 'all', cursors = [null], nextCursor = null, request = 0
        let selectedId = null
        const folderButtons = new Map()
        const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

        function clearSelection() {
            selectedId = null
            find('selection-title').textContent = translate('Select a message to read')
            find('selection-sender').textContent = ''
            find('selection-note').textContent = translate('Choose a sample to preview its details. Message bodies stay private in Nextcloud Mail.')
        }
        function select(message) {
            selectedId = message.id
            for (const button of list.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.messageId === selectedId))
            find('selection-title').textContent = message.subject
            find('selection-sender').textContent = message.sender
            find('selection-note').textContent = translate('Synthetic message. No message body is loaded and its read state is unchanged. Open in Mail takes you to native Mail, not this sample.')
        }
        function messageRow(message) {
            const item = element('li')
            const button = element('button', `sixd-row${message.unread ? ' sixd-row--unread' : ''}`)
            button.type = 'button'
            button.dataset.messageId = message.id
            button.setAttribute('aria-pressed', String(message.id === selectedId))
            const top = element('span', 'sixd-row__top')
            top.append(element('span', 'sixd-row__sender', message.sender))
            const time = element('time', 'sixd-row__time', dateFormat.format(new Date(message.date)))
            time.dateTime = message.date
            time.title = `${message.date} (UTC)`
            top.append(time)
            const subject = element('span', 'sixd-row__subject', message.subject)
            const badges = element('span', 'sixd-row__badges')
            const read = element('span', message.unread ? 'sixd-unread-label' : 'sixd-read-label', translate(message.unread ? 'Unread' : 'Read'))
            if (message.unread) {
                const dot = element('span', 'sixd-unread-dot', '●')
                dot.setAttribute('aria-hidden', 'true')
                read.prepend(dot)
            }
            badges.append(read)
            if (message.important) badges.append(element('span', 'sixd-badge', `! ${translate('Important')}`))
            if (message.favorite) badges.append(element('span', 'sixd-badge', `★ ${translate('Favorite')}`))
            button.append(top, subject, element('span', 'sixd-row__preview', message.preview), badges)
            button.addEventListener('click', () => select(message))
            item.append(button)
            return item
        }
        async function load(candidateCursors = [null]) {
            const ticket = ++request
            list.replaceChildren()
            clearSelection()
            list.setAttribute('aria-busy', 'true')
            status.textContent = translate('Loading sample messages…')
            find('retry').hidden = true
            previous.disabled = next.disabled = true
            find('page').textContent = '—'
            try {
                const page = await provider.listMessages({ mailboxId, filter, cursor: candidateCursors.at(-1), limit: 6 })
                if (ticket !== request) return // Ignore slow results after account/filter changes.
                cursors = candidateCursors
                nextCursor = page.nextCursor
                list.replaceChildren(...page.items.map(messageRow))
                status.textContent = page.items.length ? `${page.items.length} ${translate('sample messages on this page')}` : translate('No messages match. Try another filter or folder.')
                find('page').textContent = `${translate('Page')} ${cursors.length}`
                previous.disabled = cursors.length === 1
                next.disabled = nextCursor === null
            } catch {
                if (ticket !== request) return
                status.textContent = translate('Could not load sample messages. This demo error can be retried.')
                find('retry').hidden = false
                find('retry').onclick = () => load(candidateCursors)
            } finally {
                if (ticket === request) list.setAttribute('aria-busy', 'false')
            }
        }
        async function start() {
            const accounts = await provider.listAccounts()
            for (const account of accounts) {
                const group = element('section', 'sixd-account')
                const heading = element('h3', '', account.name)
                const count = element('span', 'sixd-count', String(account.unread))
                count.setAttribute('aria-label', `${account.unread} ${translate('unread in account')}`)
                heading.append(count)
                group.append(heading, element('p', 'sixd-account__address', account.address))
                for (const folder of await provider.listMailboxes(account.id)) {
                    const button = element('button', 'sixd-folder', translate(folder.name))
                    button.type = 'button'
                    const badge = element('span', 'sixd-count', String(folder.unread))
                    badge.setAttribute('aria-label', `${folder.unread} ${translate('unread messages')}`)
                    button.append(badge)
                    button.setAttribute('aria-current', String(folder.id === mailboxId))
                    folderButtons.set(folder.id, button)
                    button.addEventListener('click', () => {
                        mailboxId = folder.id
                        find('folder-title').textContent = `${account.name} · ${translate(folder.name)}`
                        for (const [id, node] of folderButtons) node.setAttribute('aria-current', String(id === mailboxId))
                        load()
                    })
                    group.append(button)
                }
                find('accounts').append(group)
            }
            find('folder-title').textContent = `${accounts[0].name} · ${translate('Inbox')}`
            await load()
        }
        for (const button of filters) button.addEventListener('click', () => {
            filter = button.dataset.filter
            for (const node of filters) node.setAttribute('aria-pressed', String(node === button))
            load()
        })
        previous.addEventListener('click', () => load(cursors.slice(0, -1)))
        next.addEventListener('click', () => load([...cursors, nextCursor]))
        start().catch(() => { status.textContent = translate('Could not load the sample workspace. Reload to try again.') })
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true })
    else mount()
})()
