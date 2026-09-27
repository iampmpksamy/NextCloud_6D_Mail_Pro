/* SPDX-License-Identifier: AGPL-3.0-or-later */
(function () {
    'use strict'
    function mount() {
        const root = document.getElementById('sixd-mail-pro')
        if (!root) return
        const translate = text => typeof t === 'function' ? t('sixd_mail_pro', text) : text
        const ocs = root.dataset.provider === 'ocs'
        const provider = ocs ? new window.SixdMailOcs.OcsMailProvider({
            endpoints: { accounts: root.dataset.ocsAccounts, mailboxes: root.dataset.ocsMailboxes, messages: root.dataset.ocsMessages },
            nativeMessageUrl: root.dataset.nativeMessageUrl, nativeFolderUrl: root.dataset.nativeFolderUrl, requestToken: window.OC?.requestToken || '',
        }) : new window.SixdMailData.SyntheticMailProvider()
        const find = name => root.querySelector(`[data-ui="${name}"]`)
        const element = (tag, className, text) => {
            const node = document.createElement(tag)
            if (className) node.className = className
            if (text !== undefined) node.textContent = text
            return node
        }
        const list = find('messages'), status = find('status'), previous = find('previous'), next = find('next')
        const filters = Array.from(root.querySelectorAll('[data-filter]'))
        let mailboxId = null, filter = 'all', cursors = [null], nextCursor = null, request = 0
        let selectedId = null
        const folderButtons = new Map()
        const narrow = window.matchMedia('(max-width: 640px)')
        const navigationToggle = find('nav-toggle')
        let navigationOpen = false
        function updateNavigation() {
            navigationToggle.hidden = !narrow.matches
            find('sidebar').hidden = narrow.matches && !navigationOpen
            navigationToggle.setAttribute('aria-expanded', String(!find('sidebar').hidden))
        }
        navigationToggle.addEventListener('click', () => {
            navigationOpen = !navigationOpen
            updateNavigation()
        })
        narrow.addEventListener('change', () => {
            const focusInNavigation = find('sidebar').contains(document.activeElement)
            const focusOnToggle = document.activeElement === navigationToggle
            navigationOpen = false
            updateNavigation()
            if (narrow.matches && focusInNavigation) navigationToggle.focus()
            else if (!narrow.matches && focusOnToggle) find('folder-title').focus()
        })
        updateNavigation()
        const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

        const handoff = root.querySelector('.sixd-reading .sixd-mail-link')
        const folderHandoff = find('folder-handoff')
        let folderUrl = null
        const defaultHandoff = handoff?.getAttribute('href')
        if (ocs) {
            find('mode-label').textContent = translate('MAIL WORKSPACE · READ ONLY')
            find('sidebar').setAttribute('aria-label', translate('Mail accounts and folders'))
            list.setAttribute('aria-label', translate('Messages'))
            root.querySelector('.sixd-filters').setAttribute('aria-label', translate('Filter messages'))
            find('count-note').textContent = translate('Folder counts come from Mail. Account totals and the Important filter are unavailable. Message bodies are not loaded.')
            find('list-caption').textContent = translate('Newest first · UTC · Server-filtered messages')
            if (find('handoff-note')) find('handoff-note').textContent = translate('Opening a message in native Mail may mark it read there.')
            const importantFilter = root.querySelector('[data-filter="important"]')
            importantFilter.disabled = !provider.supportsImportantFilter
            importantFilter.title = translate('Important uses Mail tags. A complete matching server filter is unavailable.')
        }
        if (root.dataset.provider === 'unavailable') {
            find('mode-label').textContent = translate('MAIL WORKSPACE · UNAVAILABLE')
            find('count-note').textContent = translate('Enable a supported Mail version to use the read-only workspace.')
            find('selection-note').textContent = translate('No mail summaries are loaded.')
            status.textContent = translate('Mail is unavailable or its version is unsupported. No mail data was requested.')
            list.setAttribute('aria-busy', 'false')
            for (const button of filters) button.disabled = true
            return
        }
        function clearSelection() {
            selectedId = null
            if (handoff) handoff.setAttribute('href', defaultHandoff)
            find('selection-title').textContent = translate('Select a message for its summary')
            find('selection-sender').textContent = ''
            find('selection-note').textContent = translate(ocs ? 'Select a message to see its summary. Message bodies are not loaded.' : 'Choose a sample to preview its details. Message bodies stay private in Nextcloud Mail.')
        }
        function select(message) {
            selectedId = message.id
            for (const button of list.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.messageId === selectedId))
            find('selection-title').textContent = message.subject
            find('selection-sender').textContent = message.sender
            if (ocs && handoff) handoff.setAttribute('href', message.nativeMailUrl)
            find('selection-note').textContent = translate(ocs ? 'Summary only. Selecting this row does not change its read state. Open in Mail to read the message.' : 'Synthetic message. No message body is loaded and its read state is unchanged. Open in Mail takes you to native Mail, not this sample.')
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
            status.textContent = translate(ocs ? 'Loading messages…' : 'Loading sample messages…')
            find('retry').hidden = true
            folderHandoff.hidden = true
            previous.disabled = next.disabled = true
            find('page').textContent = '—'
            try {
                const page = await provider.listMessages({ mailboxId, filter, cursor: candidateCursors.at(-1), limit: 6 })
                if (ticket !== request) return // Ignore slow results after account/filter changes.
                cursors = candidateCursors
                nextCursor = page.nextCursor
                list.replaceChildren(...page.items.map(messageRow))
                status.textContent = page.items.length ? `${page.items.length} ${translate(ocs ? 'messages on this page' : 'sample messages on this page')}` : translate('No messages match. Try another filter or folder.')
                find('page').textContent = `${translate('Page')} ${cursors.length}`
                previous.disabled = cursors.length === 1
                next.disabled = nextCursor === null
            } catch (error) {
                if (ticket !== request) return
                status.textContent = translate(ocs
                    ? (error.code === '401' ? 'Your session expired. Sign in again.' : error.code === 'timestamp-tie-limit'
                        ? 'Too many messages share a timestamp to paginate safely. Continue in native Mail.'
                        : ['server', 'network', 'timeout', 'malformed'].includes(error.code)
                            ? 'Could not load this folder. Mail may need to initialize or refresh it. Open the folder in Nextcloud Mail, then retry here.'
                            : 'Could not load messages. Check your session and access to this folder, then retry.')
                    : 'Could not load sample messages. This demo error can be retried.')
                if (ocs && folderUrl && ['server', 'network', 'timeout', 'malformed'].includes(error.code)) {
                    folderHandoff.href = folderUrl
                    folderHandoff.hidden = false
                }
                find('retry').hidden = false
                find('retry').onclick = () => load(candidateCursors)
            } finally {
                if (ticket === request) list.setAttribute('aria-busy', 'false')
            }
        }
        async function start() {
            find('accounts').replaceChildren()
            folderButtons.clear()
            mailboxId = null
            previous.disabled = next.disabled = true
            list.setAttribute('aria-busy', 'true')
            status.textContent = translate('Loading accounts and folders…')
            const accounts = await provider.listAccounts()
            if (!accounts.length) {
                status.textContent = translate('No mail accounts are configured for this user.')
                list.setAttribute('aria-busy', 'false')
                return
            }
            for (const account of accounts) {
                const group = element('section', 'sixd-account')
                const heading = element('h3', '', account.name)
                heading.id = `sixd-account-${account.id}`
                group.setAttribute('aria-labelledby', heading.id)
                const count = element('span', 'sixd-count', account.unread === null ? '—' : String(account.unread))
                count.setAttribute('aria-label', account.unread === null ? translate('Account unread total unavailable') : `${account.unread} ${translate('unread in account')}`)
                heading.append(count)
                group.append(heading, element('p', 'sixd-account__address', account.address))
                let mailboxes
                try { mailboxes = await provider.listMailboxes(account.id) } catch {
                    group.append(element('p', '', translate('Folders unavailable for this account. Reload to retry.')))
                    find('accounts').append(group)
                    continue
                }
                // Use the canonical IMAP Inbox identity, not a translated label or
                // arbitrary server ordering (which can put Junk/Trash first).
                const ordered = [...mailboxes].sort((a, b) => Number(b.isInbox === true) - Number(a.isInbox === true))
                for (const folder of ordered) {
                    if (mailboxId === null) {
                        mailboxId = folder.id
                        folderUrl = folder.nativeMailUrl ?? null
                        find('folder-title').textContent = `${account.name} · ${folder.name}`
                    }
                    const button = element('button', 'sixd-folder', translate(folder.name))
                    button.type = 'button'
                    const badge = element('span', 'sixd-count', folder.unread === null ? '—' : String(folder.unread))
                    badge.setAttribute('aria-label', folder.unread === null ? translate('Unread count unavailable') : `${folder.unread} ${translate('unread messages')}`)
                    button.append(badge)
                    button.setAttribute('aria-current', String(folder.id === mailboxId))
                    folderButtons.set(folder.id, button)
                    button.addEventListener('click', () => {
                        mailboxId = folder.id
                        folderUrl = folder.nativeMailUrl ?? null
                        find('folder-title').textContent = `${account.name} · ${translate(folder.name)}`
                        for (const [id, node] of folderButtons) node.setAttribute('aria-current', String(id === mailboxId))
                        if (narrow.matches) {
                            navigationOpen = false
                            updateNavigation()
                            find('folder-title').focus()
                        }
                        load()
                    })
                    group.append(button)
                }
                find('accounts').append(group)
            }
            if (mailboxId !== null) await load()
            else {
                status.textContent = translate('No accessible mailboxes are available.')
                list.setAttribute('aria-busy', 'false')
            }
        }
        for (const button of filters) button.addEventListener('click', () => {
            if (mailboxId === null) return
            filter = button.dataset.filter
            for (const node of filters) node.setAttribute('aria-pressed', String(node === button))
            load()
        })
        previous.addEventListener('click', () => load(cursors.slice(0, -1)))
        next.addEventListener('click', () => load([...cursors, nextCursor]))
        const initialize = () => start().catch(() => {
            list.setAttribute('aria-busy', 'false')
            status.textContent = translate('Could not load accounts. Check your session and Mail availability, then retry.')
            find('retry').hidden = false
            find('retry').onclick = () => { find('retry').hidden = true; initialize() }
        })
        clearSelection()
        initialize()
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true })
    else mount()
})()
