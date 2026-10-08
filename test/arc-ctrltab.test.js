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
    previewsPerRow: 7, isOpen: true, previewColumnCount: 2,
    previews: [], updatePreview() {},
    handleEvent(e) { calls.push(e.type); },
  };
  const win = { tabPreviews: { get: () => Promise.resolve('thumb') }, tabPreviewPanelHelper: {}, addEventListener() {} };
  env = { document: doc };
  new Function('window', 'document', 'Services', 'ctrlTab', 'screen', 'gBrowser', code)(win, doc, Services, native, {}, { warmupTab() {} });
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
