// Runs the mod script against stubs of the browser window: `node --test test/`
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../JS/arc-ctrltab.uc.js'), 'utf8');

class El {
  constructor() { this.attrs = new Map(); this.children = []; this.listeners = {}; this.style = { vars: {}, setProperty(k, v) { this.vars[k] = v; }, removeProperty(k) { delete this.vars[k]; } }; }
  setAttribute(k, v) { this.attrs.set(k, v); }
  getAttribute(k) { return this.attrs.get(k) ?? null; }
  hasAttribute(k) { return this.attrs.has(k); }
  toggleAttribute(k, on) { on ? this.attrs.set(k, '') : this.attrs.delete(k); }
  insertBefore(n) { this.children.push(n); }
  append(...n) { this.children.push(...n); }
  replaceChildren(...n) { this.children = n; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  focus() { env.document.activeElement = this; }
  getBoundingClientRect() { return { width: 100, height: 100 }; }
}

let env;
function load(prefValues = {}) {
  const store = { ...prefValues };
  const types = (v) => (typeof v === 'boolean' ? 128 : typeof v === 'number' ? 64 : typeof v === 'string' ? 32 : 0);
  const Services = { prefs: {
    PREF_BOOL: 128, PREF_INT: 64, PREF_STRING: 32,
    getPrefType: (k) => types(store[k]),
    getBoolPref: (k) => store[k], getIntPref: (k) => store[k], getStringPref: (k) => store[k],
    setBoolPref: (k, v) => { store[k] = v; }, setIntPref: (k, v) => { store[k] = v; },
    addObserver() {}, removeObserver() {},
  } };
  const panel = new El(), list = new El();
  const doc = { activeElement: null, listeners: [], removed: [],
    getElementById: (id) => ({ 'ctrlTab-panel': panel, 'ctrlTab-previews': list })[id],
    createElementNS: () => new El(),
    removeEventListener(t) { this.removed.push(t); },
  };
  const calls = [];
  const native = {
    previewsPerRow: 7, onKeyDown(e) { calls.push('onKeyDown'); }, isOpen: true, previewColumnCount: 2,
    previews: [], updatePreview() {},
    handleEvent(e) { calls.push(e.type); },
  };
  const win = { tabPreviews: { aspectRatio: 0.625, get: () => Promise.resolve('thumb') }, tabPreviewPanelHelper: {}, listeners: {}, addEventListener(t, f) { (this.listeners[t] ||= []).push(f); } };
  const ShortcutUtils = { CYCLE_TABS: 'cycle', getSystemActionForEvent: (e) => e.action };
  env = { document: doc };
  new Function('window', 'document', 'Services', 'ctrlTab', 'screen', 'gBrowser', 'ShortcutUtils', code)(win, doc, Services, native, {}, { warmupTab() {} }, ShortcutUtils);
  return { store, panel, list, native, win, calls };
}

const ctrlUp = { type: 'keyup', keyCode: 17, DOM_VK_CONTROL: 17, preventDefault() {}, stopPropagation() {} };

test('mirrors settings into the native switches', () => {
  const { store, panel, native } = load({ 'zen-arc-ctrltab.layout': 1, 'zen-arc-ctrltab.max-tabs': 12 });
  assert.strictEqual(store['browser.ctrlTab.sortByRecentlyUsed'], true);
  assert.strictEqual(store['zen.ctrlTab.show-pending-tabs'], true);
  assert.strictEqual(store['browser.ctrlTab.maxPreviews'], 12);
  assert.strictEqual(panel.getAttribute('zac-layout'), 'list');
  assert.strictEqual(native.previewsPerRow, 1);
});

test('panel size setting becomes the CSS scale, clamped', () => {
  assert.strictEqual(load({ 'zen-arc-ctrltab.size': 150 }).panel.style.vars['--zac-scale'], 1.5);
  assert.strictEqual(load({ 'zen-arc-ctrltab.size': 9999 }).panel.style.vars['--zac-scale'], 3);
  assert.strictEqual(load().panel.style.vars['--zac-scale'], 1);
});

test('hold mode: releasing Ctrl reaches the native pick', () => {
  const { native, calls } = load();
  native.handleEvent(ctrlUp);
  assert.deepStrictEqual(calls, ['keyup']);
});

test('sticky mode: releasing Ctrl is swallowed and the keyup listener dropped', () => {
  const { native, calls } = load({ 'zen-arc-ctrltab.open-mode': 1 });
  native.handleEvent(ctrlUp);
  assert.deepStrictEqual(calls, []);
  assert.deepStrictEqual(env.document.removed, ['keyup']);
});

test('unloaded tabs are flagged', () => {
  const { native } = load();
  const preview = new El();
  native.updatePreview(preview, { hasAttribute: (a) => a === 'pending' });
  assert.ok(preview.hasAttribute('zac-unloaded'));
  native.updatePreview(preview, { hasAttribute: () => false });
  assert.ok(!preview.hasAttribute('zac-unloaded'));
});

test('arrow keys move the highlight in the grid, wrapping left and right', () => {
  const { native, panel } = load();
  const tiles = [new El(), new El(), new El(), new El()];
  native.previews = tiles;
  env.document.activeElement = tiles[3];
  const key = (k) => panel.listeners.keydown[0]({ key: k, preventDefault() {} });
  key('ArrowRight');
  assert.strictEqual(env.document.activeElement, tiles[0]);
  key('ArrowDown'); // 2 columns
  assert.strictEqual(env.document.activeElement, tiles[2]);
  key('ArrowUp');
  assert.strictEqual(env.document.activeElement, tiles[0]);
});

test('thumbnails are only fetched for tiles in the grid layout', async () => {
  const grid = load();
  assert.strictEqual(await grid.win.tabPreviews.get({}), 'thumb');
  const list = load({ 'zen-arc-ctrltab.layout': 2 });
  assert.strictEqual(await list.win.tabPreviews.get({}), null);
});

test('every preview box gets the thumbnail shape', () => {
  assert.strictEqual(load().panel.style.vars['--zac-ratio'], 1.6);
});

test('Ctrl+Tab typed inside another popup still reaches the switcher', () => {
  const { win, panel, calls, store } = load();
  const keydown = win.listeners.keydown[0];
  const inPopup = (popup) => ({ action: 'cycle', target: { closest: () => popup } });
  keydown(inPopup({}));
  assert.deepStrictEqual(calls, ['onKeyDown']);
  keydown(inPopup(panel)); // our own panel: Firefox handles it
  keydown(inPopup(null)); // not in a popup: Firefox handles it
  keydown({ action: 'other', target: { closest: () => ({}) } });
  assert.deepStrictEqual(calls, ['onKeyDown']);
  store['browser.ctrlTab.sortByRecentlyUsed'] = false;
  keydown(inPopup({}));
  assert.deepStrictEqual(calls, ['onKeyDown']);
});
