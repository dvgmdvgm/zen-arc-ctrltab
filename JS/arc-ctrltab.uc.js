// ==UserScript==
// @name           Arc Ctrl+Tab
// @description    Visual Ctrl+Tab switcher built on Zen's own panel: most recently used first, three layouts, hold or sticky mode.
// @include        main
// ==/UserScript==

(() => {
  if (window.__zenArcCtrlTab) return;
  window.__zenArcCtrlTab = true;

  const HTML = 'http://www.w3.org/1999/xhtml';
  const P = 'zen-arc-ctrltab.';
  const prefs = Services.prefs;
  const pref = (name, def) => {
    const key = P + name;
    switch (prefs.getPrefType(key)) {
      case prefs.PREF_BOOL: return prefs.getBoolPref(key);
      case prefs.PREF_INT: return prefs.getIntPref(key);
      case prefs.PREF_STRING: return prefs.getStringPref(key);
    }
    return def;
  };

  // Touching ctrlTab loads Firefox's browser-ctrlTab.js, which also defines tabPreviews and tabPreviewPanelHelper.
  const native = ctrlTab;
  const { tabPreviews, tabPreviewPanelHelper } = window;
  const panel = document.getElementById('ctrlTab-panel');
  const list = document.getElementById('ctrlTab-previews');
  const el = (tag, cls) => {
    const e = document.createElementNS(HTML, tag);
    if (cls) e.className = cls;
    return e;
  };
  const layout = () => panel.getAttribute('zac-layout');
  const scale = () => Math.min(3, Math.max(0.5, pref('size', 100) / 100));

  // Firefox's switcher has these as its only switches; the mod's settings drive them.
  const apply = () => {
    prefs.setBoolPref('browser.ctrlTab.sortByRecentlyUsed', pref('enabled', true));
    prefs.setBoolPref('zen.ctrlTab.show-pending-tabs', pref('show-unloaded', true));
    prefs.setIntPref('browser.ctrlTab.maxPreviews', pref('max-tabs', 10));

    panel.setAttribute('zac-layout', ['grid', 'list', 'split'][pref('layout', 0)] ?? 'grid');
    panel.toggleAttribute('zac-no-showall', !pref('show-all-button', true));
    native.previewsPerRow = layout() === 'grid' ? pref('tiles-per-row', 5) : 1;
    panel.style.setProperty('--zac-scale', scale());
    // Every preview box, loaded or not, gets the thumbnail shape, so tiles never change size.
    panel.style.setProperty('--zac-ratio', 1 / tabPreviews.aspectRatio);
    const accent = String(pref('accent', '')).trim();
    if (accent) panel.style.setProperty('--ctrltab-accent', accent);
    else panel.style.removeProperty('--ctrltab-accent');
  };

  // The split layout's big preview sits beside the list inside one wrapper.
  const body = el('div');
  body.id = 'zac-body';
  const pane = el('div');
  pane.id = 'zac-pane';
  panel.insertBefore(body, list);
  body.append(list, pane);

  // Only the grid layout wants thumbnails in its tiles; the split pane asks for its own.
  const getThumb = tabPreviews.get.bind(tabPreviews);
  tabPreviews.get = (tab) => (layout() === 'grid' ? getThumb(tab) : Promise.resolve(null));

  // Unloaded tabs get a flag so the CSS can mute them.
  const updatePreview = native.updatePreview;
  native.updatePreview = function (preview, tab) {
    updatePreview.call(this, preview, tab);
    preview.toggleAttribute('zac-unloaded', !!tab?.hasAttribute('pending'));
  };

  let shown = 0;
  const showInPane = async (tab) => {
    const mine = ++shown;
    const shot = el('div', 'zac-shot');
    const meta = el('div', 'zac-meta');
    const icon = el('img', 'zac-icon');
    if (tab.image) icon.src = tab.image;
    const title = el('div', 'zac-title');
    title.textContent = tab.label;
    const host = el('div', 'zac-host');
    try { host.textContent = tab.linkedBrowser.currentURI.host; } catch {}
    const text = el('div');
    text.append(title, host);
    meta.append(icon, text);
    pane.toggleAttribute('zac-unloaded', tab.hasAttribute('pending'));
    pane.replaceChildren(shot, meta);
    const img = await getThumb(tab).catch(() => null);
    if (img && mine === shown) shot.append(img);
  };
  list.addEventListener('focusin', (e) => {
    if (layout() === 'split' && e.target._tab) showInPane(e.target._tab);
  });

  // Sticky mode: releasing Ctrl no longer picks, the panel waits for Enter, a click or Esc.
  const handleEvent = native.handleEvent;
  native.handleEvent = function (event) {
    if (event.type === 'keyup' && event.keyCode === event.DOM_VK_CONTROL && pref('open-mode', 0) === 1 && this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      document.removeEventListener('keyup', this, { mozSystemGroup: true });
      return undefined;
    }
    return handleEvent.call(this, event);
  };

  // Arrow keys move the highlight; Enter and Esc are the panel's own.
  const move = (step, wrap) => {
    const items = native.previews.filter((p) => !p.hidden);
    const at = items.indexOf(document.activeElement);
    if (at < 0) return;
    const to = wrap ? (at + step + items.length) % items.length : Math.min(items.length - 1, Math.max(0, at + step));
    items[to].focus();
    if (items[to]._tab) gBrowser.warmupTab(items[to]._tab);
  };
  panel.addEventListener('keydown', (e) => {
    if (e.altKey || e.metaKey) return;
    const grid = layout() === 'grid';
    const cols = native.previewColumnCount;
    const moves = {
      ArrowRight: grid && [1, true],
      ArrowLeft: grid && [-1, true],
      ArrowDown: grid ? [cols, false] : [1, true],
      ArrowUp: grid ? [-cols, false] : [-1, true],
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    move(...moves[e.key]);
  });

  // A popup with focus (the translate offer, a permission prompt) takes Tab for itself and marks the event
  // handled, so Firefox's own Ctrl+Tab listener skips it. Catch the shortcut first, on the way down.
  window.addEventListener('keydown', (e) => {
    if (!prefs.getBoolPref('browser.ctrlTab.sortByRecentlyUsed', false)) return;
    const popup = e.target.closest?.('panel, menupopup, [popover]');
    if (!popup || popup === panel) return;
    if (ShortcutUtils.getSystemActionForEvent(e) === ShortcutUtils.CYCLE_TABS) native.onKeyDown(e);
  }, true);

  // Sized per layout, then centred once the real size is known.
  native._openPanel = function () {
    tabPreviewPanelHelper.opening(this);
    const w = screen.availWidth;
    const h = screen.availHeight;
    const rows = Math.ceil(this.tabPreviewCount / this.previewColumnCount);
    const s = scale();
    const width = {
      grid: Math.min(w * 0.96, this.canvasWidth * 1.25 * this.previewColumnCount * s),
      list: Math.min(w * 0.96, 640 * s),
      split: Math.min(w * 0.96, 1180 * s),
    }[layout()];
    const guess = layout() === 'grid' ? this.canvasHeight * 1.3 * rows * s + 90 : h * 0.6;
    panel.style.width = width + 'px';
    panel.style.setProperty('--zac-max-h', Math.floor(h * 0.78) + 'px');
    panel.openPopupAtScreen(screen.availLeft + (w - width) / 2, screen.availTop + (h - guess) / 2, false);
  };
  panel.addEventListener('popupshown', (e) => {
    if (e.target !== panel) return;
    const r = panel.getBoundingClientRect();
    panel.moveTo(screen.availLeft + (screen.availWidth - r.width) / 2, screen.availTop + (screen.availHeight - r.height) / 2);
  });

  const observer = { observe: apply };
  apply();
  prefs.addObserver(P, observer);
  window.addEventListener('unload', () => prefs.removeObserver(P, observer), { once: true });
})();
