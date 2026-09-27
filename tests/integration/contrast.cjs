// Executed inside the test browser. Solid sRGB surfaces only; reject unsupported
// composition instead of claiming a contrast pass for gradients or opacity.
module.exports = function measureContrast() {
    const root = document.getElementById('sixd-mail-pro')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const rgba = color => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data)
    }
    const over = (front, back) => front.slice(0, 3).map((c, i) => c * front[3] / 255 + back[i] * (1 - front[3] / 255)).concat(255)
    const background = element => {
        const layers = []
        let opaque = false
        for (let e = element; e; e = e.parentElement) {
            const s = getComputedStyle(e)
            if ((!opaque && s.backgroundImage !== 'none') || Number(s.opacity) !== 1 || s.filter !== 'none' || s.mixBlendMode !== 'normal') {
                throw Error('Unsupported contrast composition: ' + e.tagName + '.' + e.className)
            }
            if (!opaque) {
                const color = rgba(s.backgroundColor)
                layers.push(color)
                opaque = color[3] === 255
            }
        }
        if (layers.at(-1)[3] !== 255) throw Error('No opaque background for contrast measurement')
        return layers.reverse().reduce((back, front) => over(front, back), [255, 255, 255, 255])
    }
    const luminance = rgb => rgb.slice(0, 3).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0)
    const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && !e.closest('[hidden], [aria-hidden="true"], :disabled')
    const text = [], focus = []
    for (const e of root.querySelectorAll('*')) {
        if (!visible(e) || !Array.from(e.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue
        const s = getComputedStyle(e), bg = background(e)
        const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.667 && Number(s.fontWeight) >= 700)
        text.push({ element: e.tagName + '.' + e.className, ratio: ratio(over(rgba(s.color), bg), bg), minimum: large ? 3 : 4.5 })
    }
    const original = document.activeElement
    for (const e of root.querySelectorAll('button:not(:disabled), a[href]')) {
        if (!visible(e)) continue
        e.focus()
        const s = getComputedStyle(e), bg = background(e)
        // Current component uses an inset outline; its adjacent surface is its
        // own painted background. Fail if that geometry changes.
        if (!e.matches(':focus-visible') || parseFloat(s.outlineWidth) < 2 || parseFloat(s.outlineOffset) > -2) throw Error('Missing or unsupported focus outline: ' + e.className)
        text.push({ element: e.tagName + '.' + e.className + ':focus-visible', ratio: ratio(over(rgba(s.color), bg), bg), minimum: 4.5 })
        focus.push({ element: e.tagName + '.' + e.className + '[data-filter=' + (e.dataset.filter || '') + ']', color: s.outlineColor, textColor: s.color, background: bg, ratio: ratio(over(rgba(s.outlineColor), bg), bg), minimum: 3 })
    }
    original?.focus()
    return { text, focus }
}
