// Lightweight CDP smoke against only the disposable loopback Nextcloud instance.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const origin = process.argv.includes('--localhost') ? 'http://localhost:18764' : 'http://127.0.0.1:18764'
const password = fs.readFileSync(require('node:path').join(require('node:os').homedir(), '.local/state/sixd-mail-test/credentials.env'), 'utf8').trim().split('=')[1]
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sixd-runtime-browser-'))
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile], { stdio: 'ignore' })
let ws
;(async () => {
    for (let i = 0; !fs.existsSync(profile + '/DevToolsActivePort'); i++) { assert.ok(i < 100, 'Chrome startup'); await pause(100) }
    const port = fs.readFileSync(profile + '/DevToolsActivePort', 'utf8').split('\n')[0]
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl)
    await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
    let id = 0; const pending = new Map(), requests = []
    ws.addEventListener('message', event => {
        const data = JSON.parse(event.data)
        if (data.id) { const p = pending.get(data.id); pending.delete(data.id); data.error ? p.reject(Error(data.error.message)) : p.resolve(data.result) }
        if (data.method === 'Runtime.exceptionThrown') console.error('Browser exception:', data.params.exceptionDetails.exception?.description?.split('\n')[0] || data.params.exceptionDetails.text)
        if (data.method === 'Network.requestWillBeSent' && data.params.request.url.includes('/ocs/v2.php/apps/mail/')) requests.push({ url: data.params.request.url, method: data.params.request.method })
    })
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
    const evaluate = async expression => {
        const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
        if (result.exceptionDetails) throw Error('Browser evaluation failed: ' + result.exceptionDetails.text)
        return result.result.value
    }
    const until = async (expression, label) => { for (let i = 0; i < 40; i++) { if (await evaluate(expression)) return; await pause(100) } throw Error('Timed out: ' + label) }
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
    const ready = () => until(`document.querySelector('[data-ui="messages"]')?.getAttribute('aria-busy') === 'false'`, 'messages settled')
    const folder = (account, name) => evaluate(`Array.from(document.querySelectorAll('.sixd-account')[${account}].querySelectorAll('.sixd-folder')).find(b => b.firstChild.textContent === ${JSON.stringify(name)}).click()`)
    await cdp('Page.enable'); await cdp('Network.enable'); await cdp('Runtime.enable'); await cdp('Log.enable')
    await cdp('Page.navigate', { url: origin + '/index.php/apps/sixd_mail_pro/' })
    await until(`document.querySelector('#user') && document.querySelector('#password')`, 'login redirect')
    await evaluate(`(() => { for (const [key,value] of Object.entries(${JSON.stringify({ user: process.argv.includes('--no-accounts') ? 'fixture-outsider' : 'fixture-user', password })})) { const e=document.getElementById(key); e.value=value; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); } document.querySelector('form').requestSubmit(); })()`)
    await until(`document.getElementById('sixd-mail-pro')`, 'authenticated app page')
    await ready()
    // Dismiss Nextcloud's own onboarding dialog using its visible controls.
    // It otherwise traps Tab before the app can receive keyboard input.
    const dismissOnboarding = async () => {
        let absent = 0
        for (let i = 0; i < 30 && absent < 3; i++) {
            const present = await evaluate(`(() => { const dialog=document.querySelector('[role="dialog"]'); if (!dialog) return false; const buttons=Array.from(dialog.querySelectorAll('button')); const button=buttons.find(b=>b.textContent.trim().startsWith('Skip')) || buttons.find(b=>b.getAttribute('aria-label')==='Close'); button?.click(); return true; })()`)
            absent = present ? 0 : absent + 1
            await pause(300)
        }
    }
    await dismissOnboarding()
    if (process.argv.includes('--unavailable')) {
        assert.equal(await evaluate(`document.getElementById('sixd-mail-pro').dataset.provider`), 'unavailable')
        assert.equal(requests.length, 0)
        assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 0)
    console.log('Runtime browser passed: disabled Mail fails closed without OCS requests.')
        return
    }
    if (process.argv.includes('--no-accounts')) {
        assert.ok(await evaluate(`document.querySelector('[data-ui="status"]').textContent.includes('No mail accounts')`))
        assert.equal(await evaluate(`document.querySelectorAll('.sixd-account').length`), 0)
    console.log('Runtime browser passed: ordinary user without Mail accounts.')
        return
    }
    if (process.argv.includes('--warm-mail')) {
        // Native Mail initializes caches for folders excluded by account:sync.
        // Navigate only its public folder page; never select a message or call private APIs.
        const boxes = await evaluate(`(async()=>{ const headers={'OCS-APIRequest':'true',Accept:'application/json'}; const accounts=await (await fetch('/ocs/v2.php/apps/mail/account/list',{headers})).json(); const boxes=[]; for(const a of accounts.ocs.data) { const r=await (await fetch('/ocs/v2.php/apps/mail/ocs/mailboxes?accountId='+a.id,{headers})).json(); boxes.push(...r.ocs.data.filter(b=>!b.name.startsWith('M1C-Cold-')).map(b=>b.databaseId)); } return boxes; })()`)
        const nativeFolderBase = await evaluate(`new URL(document.getElementById('sixd-mail-pro').dataset.nativeMessageUrl, location.origin).href.split('__mailbox__')[0]`)
        assert.equal(new URL(nativeFolderBase).origin, origin)
        for (const box of boxes) {
            console.log('Initialize synthetic folder cache', box)
            await cdp('Page.navigate', { url: nativeFolderBase + box })
            await until(`location.pathname.endsWith('/box/${box}') && document.readyState==='complete'`, 'native folder page')
            await until(`(async()=>{try { const r=await fetch('/ocs/v2.php/apps/mail/ocs/mailboxes/${box}/messages?limit=1&view=singleton',{headers:{'OCS-APIRequest':'true',Accept:'application/json'}}); return r.ok; } catch { return false; } })()`, 'native folder cache ' + box)
        }
        console.log('Native Mail folder caches initialized through normal folder navigation (no message selected).')
        return
    }
    assert.equal(await evaluate(`document.getElementById('sixd-mail-pro').dataset.provider`), 'ocs')
    if (process.argv.includes('--cold')) {
        const cold = JSON.parse(fs.readFileSync(__dirname + '/.cache/cold-folder.json', 'utf8'))
        await folder(0, cold.name); await ready()
        assert.ok(await evaluate(`document.querySelector('[data-ui="status"]').textContent.includes('initialize or refresh')`))
        const title = await evaluate(`document.querySelector('[data-ui="folder-title"]').textContent`)
        const link = await evaluate(`document.querySelector('[data-ui="folder-handoff"]').href`)
        assert.equal(new URL(link).origin, origin)
        assert.ok(link.endsWith('/box/' + cold.id))
        const calls = requests.length; await pause(800); assert.equal(requests.length, calls, 'No automatic retry loop')
        await click('[data-ui="folder-handoff"]')
        await pause(300)
        const targets = await cdp('Target.getTargets')
        const native = targets.targetInfos.find(t=>t.url===link)
        assert.ok(native, 'Native folder must open in a separate tab')
        await cdp('Target.activateTarget', {targetId:native.targetId})
        await until(`(async()=>{const r=await fetch('/ocs/v2.php/apps/mail/ocs/mailboxes/${cold.id}/messages?limit=1&view=singleton',{headers:{'OCS-APIRequest':'true',Accept:'application/json'}});return r.ok})()`, 'native cold-cache initialization')
        await cdp('Page.bringToFront')
        await click('[data-ui="retry"]'); await ready()
        assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 1)
        assert.equal(await evaluate(`document.querySelector('[data-ui="folder-title"]').textContent`), title)
        assert.equal(await evaluate(`document.querySelector('[data-ui="folder-handoff"]').hidden`), true)
        console.log('M1C cold folder: explained error, generated folder handoff, no auto-retry, native initialization and successful Retry preserving folder.')
        return
    }
    if (process.argv.includes('--routes-only')) {
        await folder(0, 'Fixtures'); await ready(); await click('.sixd-row')
        assert.equal(await evaluate(`new URL(document.querySelector('.sixd-mail-link').href).origin`), origin)
        assert.ok(await evaluate(`location.pathname.startsWith('/index.php/apps/sixd_mail_pro') && document.querySelector('.sixd-mail-link').getAttribute('href').includes('/index.php/apps/mail/')`))
        assert.ok(requests.every(r=>new URL(r.url).origin===origin))
        console.log('M1C index.php entry and current-origin generated routing passed on', origin)
        return
    }
    if (process.argv.includes('--contrast')) {
        await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
        await folder(0, 'Fixtures'); await ready(); await click('.sixd-row')
        // Establish keyboard modality before programmatically focusing controls.
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
        for (const state of ['messages', 'error']) {
            if (state === 'error') {
                await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.get=async()=>{throw new window.SixdMailOcs.MailDataError('server')}`)
                await folder(0, 'Fixtures'); await ready()
            }
            for (const theme of ['light', 'dark']) {
                await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
                await pause(150)
                const result = await evaluate('(' + require('./contrast.cjs').toString() + ')()')
                for (const kind of ['text', 'focus']) {
                    assert.ok(result[kind].length > 10, 'Nonempty contrast sample: ' + kind)
                    console.log('Contrast', state, theme, kind, result[kind].length, 'minimum', Math.min(...result[kind].map(r=>r.ratio)).toFixed(3))
                    assert.deepEqual(result[kind].filter(r=>r.ratio < r.minimum), [], state + ' ' + theme + ' ' + kind + ' contrast')
                }
            }
        }
        assert.ok(requests.every(r => r.method === 'GET' && new URL(r.url).origin === origin))
        console.log('Measured text and inset focus contrast passed for native light/dark message and recovery states; disabled/decorative content excluded. Not a full accessibility certification.')
        return
    }
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-account').length`), 2)
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('a')).some(a => a.href.includes('/apps/sixd_mail_pro'))`))
    await folder(0, 'Fixtures'); await ready()
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 6)
    const ids = await evaluate(`Array.from(document.querySelectorAll('.sixd-row')).map(b=>b.dataset.messageId)`)
    await click('.sixd-row')
    assert.ok(await evaluate(String.raw`document.querySelector('.sixd-mail-link').href.startsWith(location.origin) && /\/box\/\d+\/thread\/\d+/.test(document.querySelector('.sixd-mail-link').href)`))
    await click('[data-ui="next"]'); await ready()
    assert.ok((await evaluate(`Array.from(document.querySelectorAll('.sixd-row')).map(b=>b.dataset.messageId)`)).every(id => !ids.includes(id)))
    assert.equal(await evaluate(`document.querySelector('[data-ui="page"]').textContent`), 'Page 2')
    assert.ok(await evaluate(`document.querySelector('[data-ui="messages"]').textContent.includes('<img')`))
    assert.equal(await evaluate(`document.querySelectorAll('[data-ui="messages"] img, [data-ui="messages"] script').length`), 0)
    for (const filter of ['unread', 'favorite']) {
        await click(`[data-filter="${filter}"]`); await ready()
        const label = { unread: 'Unread', important: 'Important', favorite: 'Favorite' }[filter]
        assert.ok(await evaluate(`Array.from(document.querySelectorAll('.sixd-row')).every(b=>b.textContent.includes(${JSON.stringify(label)}))`))
        assert.equal(await evaluate(`document.querySelector('[data-ui="page"]').textContent`), 'Page 1')
    }
    assert.equal(await evaluate(`document.querySelector('[data-filter="important"]').disabled`), true)
    await click('[data-filter="all"]'); await ready()
    await folder(1, 'Fixtures'); await ready()
    assert.ok(await evaluate(`document.querySelector('[data-ui="folder-title"]').textContent.includes('personal@example.invalid')`))
    await folder(1, 'Empty'); await ready()
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 0)
    // Delay and reject one browser GET to exercise the actual adapter's loading/retry UI.
    await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.getOriginal=window.SixdMailOcs.OcsMailProvider.prototype.get; window.SixdMailOcs.OcsMailProvider.prototype.get=async function(url) { await new Promise(r=>setTimeout(r,500)); throw new window.SixdMailOcs.MailDataError('server'); }`)
    await folder(0, 'Fixtures')
    assert.equal(await evaluate(`document.querySelector('[data-ui="messages"]').getAttribute('aria-busy')`), 'true')
    await ready(); assert.equal(await evaluate(`document.querySelector('[data-ui="retry"]').hidden`), false)
    await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.get=window.SixdMailOcs.OcsMailProvider.prototype.getOriginal`)
    await click('[data-ui="retry"]'); await ready()
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 6)
    // Delay a completed response until after a new account/folder/filter selection.
    for (const change of ['account', 'mailbox', 'filter']) {
        await click('[data-filter="all"]'); await ready()
        await evaluate(`window.sixdListOriginal=window.SixdMailOcs.OcsMailProvider.prototype.listMessages; window.sixdFirst=true; window.sixdRelease=null; window.SixdMailOcs.OcsMailProvider.prototype.listMessages=async function(args) { const first=window.sixdFirst; window.sixdFirst=false; const page=await window.sixdListOriginal.call(this,args); if(first) await new Promise(resolve=>window.sixdRelease=resolve); return page; }`)
        await folder(0, 'Fixtures')
        await until(`typeof window.sixdRelease === 'function'`, 'held OCS response')
        if (change === 'account') await folder(1, 'Fixtures')
        else if (change === 'mailbox') await folder(0, 'Empty')
        else await click('[data-filter="unread"]')
        await ready()
        const snapshot = await evaluate(`document.querySelector('[data-ui="folder-title"]').textContent+'|'+document.querySelector('[data-ui="messages"]').textContent+'|'+document.querySelector('[data-filter][aria-pressed="true"]').dataset.filter`)
        await evaluate(`window.sixdRelease(); window.SixdMailOcs.OcsMailProvider.prototype.listMessages=window.sixdListOriginal`)
        await pause(150)
        assert.equal(await evaluate(`document.querySelector('[data-ui="folder-title"]').textContent+'|'+document.querySelector('[data-ui="messages"]').textContent+'|'+document.querySelector('[data-filter][aria-pressed="true"]').dataset.filter`), snapshot, change + ' stale response')
    }
    await click('[data-filter="all"]'); await folder(0, 'Fixtures'); await ready()
    await dismissOnboarding()
    const key = async (key, code, number) => {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: number, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined })
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number })
    }
    const keyboardFlow = async () => {
        const count = await evaluate(`window.sixdTabStops=Array.from(document.querySelectorAll('#sixd-mail-pro button:not(:disabled), #sixd-mail-pro a[href]')).filter(e=>e.getClientRects().length && !e.closest('[hidden]')); window.sixdTabStops[0].focus(); window.sixdTabStops.length`)
        for (let i = 1; i < count; i++) {
            await key('Tab', 'Tab', 9)
            assert.equal(await evaluate(`document.activeElement===window.sixdTabStops[${i}]`), true, 'Logical Tab order at ' + i)
            assert.ok(await evaluate(`document.activeElement.matches(':focus-visible') && parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2`))
        }
        await key('Tab', 'Tab', 9)
        assert.ok(await evaluate(`!document.activeElement.closest('#sixd-mail-pro')`), 'Focus can leave the app')
        await cdp('Page.bringToFront')
    }
    await keyboardFlow()
    await evaluate(`Array.from(document.querySelectorAll('.sixd-account')[0].querySelectorAll('.sixd-folder')).find(b=>b.firstChild.textContent==='Empty').focus()`)
    await key('Enter', 'Enter', 13); await ready()
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 0)
    await folder(0, 'Fixtures'); await ready()
    await evaluate(`document.querySelector('[data-filter="favorite"]').focus()`)
    await key(' ', 'Space', 32); await ready()
    assert.equal(await evaluate(`document.querySelector('[data-filter="favorite"]').getAttribute('aria-pressed')`), 'true')
    await click('[data-filter="all"]'); await ready()
    const ax = await cdp('Accessibility.getFullAXTree')
    assert.ok(ax.nodes.some(n=>n.role?.value==='navigation' && n.name?.value==='Mail accounts and folders'))
    assert.ok(ax.nodes.some(n=>n.role?.value==='group' && n.name?.value==='Filter messages'))
    for (const label of ['Unread', 'Important', 'Favorite']) assert.ok(ax.nodes.some(n=>n.role?.value==='button' && n.name?.value.includes(label)))
    assert.equal(await evaluate(`document.querySelector('[data-ui="messages"]').getAttribute('aria-describedby')`), 'sixd-load-status')
    assert.equal(await evaluate(`document.querySelector('[data-ui="status"]').getAttribute('role')`), 'status')
    assert.equal(await evaluate(`document.querySelector('[data-ui="page"]').getAttribute('aria-live')`), 'polite')
    // Retry and folder handoff participate in the same keyboard sequence on error.
    await evaluate(`window.sixdGetOriginal=window.SixdMailOcs.OcsMailProvider.prototype.get; window.SixdMailOcs.OcsMailProvider.prototype.get=async()=>{throw new window.SixdMailOcs.MailDataError('server')}`)
    await folder(0, 'Fixtures'); await ready()
    assert.equal(await evaluate(`document.querySelector('[data-ui="folder-handoff"]').hidden`), false)
    await keyboardFlow()
    await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.get=window.sixdGetOriginal; document.querySelector('[data-ui="retry"]').focus()`)
    await key('Enter', 'Enter', 13); await ready()
    assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 6)
    for (const code of ['401', '403', '404', 'malformed', 'timeout']) {
        await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.get=async()=>{throw new window.SixdMailOcs.MailDataError(${JSON.stringify(code)})}`)
        await folder(0, 'Fixtures'); await ready()
        const message = await evaluate(`document.querySelector('[data-ui="status"]').textContent`)
        assert.ok(code === '401' ? message.includes('session expired') : message.includes('Could not load'))
        assert.equal(await evaluate(`document.querySelectorAll('.sixd-row').length`), 0)
        assert.equal(await evaluate(`document.querySelector('[data-ui="folder-handoff"]').hidden`), ['401','403','404'].includes(code))
    }
    await evaluate(`window.SixdMailOcs.OcsMailProvider.prototype.get=window.sixdGetOriginal`)
    await click('[data-ui="retry"]'); await ready()
    // Stress account/folder labels using synthetic text; production data is never used.
    await evaluate(`document.querySelector('.sixd-account h3').firstChild.textContent='very-long-synthetic-account-label-for-layout@example.invalid'`)

    await dismissOnboarding()
    assert.equal(await evaluate(`document.querySelector('[role="dialog"]') === null`), true, 'Onboarding must release the keyboard before focus checks')
    for (const width of [390, 640, 768, 1024, 1440, 1920]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
        const colors = []
        for (const theme of ['light', 'dark']) {
            await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
            await pause(150)
            colors.push(await evaluate(`getComputedStyle(document.getElementById('sixd-mail-pro')).backgroundColor`))
            assert.ok(await evaluate(`document.getElementById('sixd-mail-pro').scrollWidth <= document.getElementById('sixd-mail-pro').clientWidth + 1`), `${width} ${theme} overflow`)
            await evaluate(`document.querySelector('.sixd-row').focus()`)
            await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
            await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
            assert.ok(await evaluate(`document.activeElement.classList.contains('sixd-row')`))
            assert.ok(await evaluate(`document.activeElement.matches(':focus-visible') && parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2`))
        }
        console.log('Runtime theme backgrounds at', width, colors.join(' / '))
        assert.notEqual(colors[0], colors[1], 'Native light/dark backgrounds must differ')
        await folder(0, 'LongSender'); await ready()
        assert.ok(await evaluate(`document.querySelector('.sixd-row__sender').textContent.length > 100`))
        assert.ok(await evaluate(`document.getElementById('sixd-mail-pro').scrollWidth <= document.getElementById('sixd-mail-pro').clientWidth+1`), 'Long sender overflow at ' + width)
        await folder(0, 'Fixtures'); await ready()
        await click('.sixd-row')
    }
    // 200% desktop zoom approximation: halve CSS viewport, double device scale.
    await cdp('Emulation.setDeviceMetricsOverride', { width: 720, height: 500, deviceScaleFactor: 2, mobile: false })
    assert.ok(await evaluate(`document.getElementById('sixd-mail-pro').scrollWidth <= document.getElementById('sixd-mail-pro').clientWidth+1`))
    await cdp('Emulation.setEmulatedMedia', { features: [{name:'forced-colors',value:'active'},{name:'prefers-reduced-motion',value:'reduce'}] })
    assert.ok(await evaluate(`matchMedia('(forced-colors: active)').matches && matchMedia('(prefers-reduced-motion: reduce)').matches`))
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('.sixd-row')).every(e=>/Read|Unread/.test(e.textContent))`))
    assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.sixd-row--unread')).borderInlineStartWidth)>=3`))
    await keyboardFlow()
    await cdp('Emulation.setEmulatedMedia', { features: [] })
    await click('.sixd-row')
    assert.equal(await evaluate(`new URL(document.querySelector('.sixd-mail-link').href).origin`), origin)
    assert.ok(requests.length > 10)
    assert.ok(requests.every(r => r.method === 'GET' && new URL(r.url).origin === origin))
    console.log('M1C passed: stale account/folder/filter responses, full Tab order, Enter/Space, retry/handoff focus, accessibility tree, failure UI, forced colors/reduced motion and 200% zoom approximation.')
    console.log('Runtime browser passed: authenticated navigation, 2 accounts, rows, filters, pages, switches, empty/loading/error/retry, escaping, same-origin handoff, focus and 390/640/768/1024/1440/1920px theme emulation; only GET Mail OCS requests')
})().catch(error => { console.error(error.stack); process.exitCode = 1 }).finally(() => { ws?.close(); chrome.kill(); })
