/* Runs only in the local synthetic fixture, never in the shipped app. */
(async function () {
    const root = document.getElementById('sixd-mail-pro')
    const ui = name => root.querySelector(`[data-ui="${name}"]`)
    const assert = (condition, message) => { if (!condition) throw new Error(message) }
    const wait = async predicate => {
        for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 40)) }
        throw new Error('Timed out waiting for UI')
    }
    const ready = () => ui('messages').getAttribute('aria-busy') === 'false'
    const rows = () => [...root.querySelectorAll('.sixd-row')]
    const folder = text => [...root.querySelectorAll('.sixd-folder')].find(b => b.textContent.startsWith(text))
    try {
        await wait(ready)
        assert(rows().length === 6, 'initial page')
        assert(root.querySelectorAll('.sixd-account').length === 2, 'accounts')
        assert(!rows()[0].classList.contains('sixd-row--unread'), 'read styling')
        assert(rows()[1].classList.contains('sixd-row--unread'), 'unread styling')
        assert(rows()[1].querySelector('.sixd-unread-dot'), 'unread dot')
        assert(rows()[2].textContent.includes('Important'), 'important label')
        assert(rows()[4].textContent.includes('Favorite'), 'favorite label')
        rows()[1].focus(); assert(document.activeElement === rows()[1], 'keyboard focus')
        rows()[1].click(); assert(rows()[1].classList.contains('sixd-row--unread'), 'selection must not mark read')
        assert(rows()[1].getAttribute('aria-pressed') === 'true', 'selection semantics')
        ui('next').click(); await wait(ready)
        assert(ui('page').textContent === 'Page 2', 'next page')
        assert(rows()[0].textContent.includes('Important') && rows()[0].textContent.includes('Favorite') && !rows()[0].classList.contains('sixd-row--unread'), 'combined read states')
        assert(rows()[1].textContent.includes('Important') && rows()[1].textContent.includes('Favorite') && rows()[1].classList.contains('sixd-row--unread'), 'all three states')
        assert(rows()[0].textContent.includes('<script>'), 'hostile sender text preserved')
        assert(rows()[0].textContent.includes('<img'), 'hostile subject text preserved')
        assert(!ui('messages').querySelector('script,img'), 'hostile text must not become markup')
        ui('next').click(); await wait(ready)
        assert(rows().length === 4 && ui('next').disabled, 'last page')
        ui('previous').click(); await wait(ready)
        assert(ui('page').textContent === 'Page 2', 'previous page')
        for (const filter of ['unread', 'important', 'favorite']) {
            root.querySelector(`[data-filter="${filter}"]`).click(); await wait(ready)
            assert(ui('page').textContent === 'Page 1', 'filter resets pagination')
            assert(rows().every(row => row.textContent.includes(filter[0].toUpperCase() + filter.slice(1))), `${filter} filter`)
        }
        root.querySelector('[data-filter="all"]').click(); await wait(ready)
        folder('Empty folder').click(); await wait(ready)
        assert(rows().length === 0 && ui('status').textContent.includes('No messages'), 'empty state')
        folder('Retry demo').click(); await wait(ready)
        assert(!ui('retry').hidden && ui('status').textContent.includes('Could not'), 'error state')
        ui('retry').click(); await wait(ready)
        assert(rows().length === 1 && ui('retry').hidden, 'retry recovery')
        folder('Loading demo').click()
        assert(ui('status').textContent.includes('Loading') && ui('next').disabled, 'loading state')
        folder('Inbox').click(); await wait(ready)
        await new Promise(resolve => setTimeout(resolve, 1900))
        assert(rows().length === 6, 'stale slow result must be ignored')
        const link = root.querySelector('.sixd-mail-link')
        assert(new URL(link.href).origin === location.origin, 'same-origin Mail handoff')
        assert(!/globalconnect\./.test(link.getAttribute('href')), 'no production hostname')
        assert(document.documentElement.scrollWidth <= innerWidth, 'responsive horizontal overflow')
        const sheet = [...document.styleSheets].find(s => s.href && s.href.endsWith('/css/workspace.css'))
        function checkRules(rules) {
            for (const rule of rules) {
                if (rule.selectorText) assert(rule.selectorText.split(',').every(s => s.trim().startsWith('#sixd-mail-pro')), 'unscoped CSS')
                if (rule.cssRules) checkRules(rule.cssRules)
            }
        }
        checkRules(sheet.cssRules)
        document.body.dataset.testResult = 'PASS'
        document.body.dataset.testSummary = 'states filters pages escaping selection loading empty retry stale-response URL CSS responsive'
    } catch (error) {
        document.body.dataset.testResult = 'FAIL'
        document.body.dataset.testSummary = error.message
    }
})()
