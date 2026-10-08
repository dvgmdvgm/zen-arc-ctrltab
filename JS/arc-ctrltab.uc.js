// ==UserScript==
// @name           Arc Ctrl+Tab
// @description    Turns on Zen's built-in Ctrl+Tab switcher (tab previews, most recently used first).
// @include        main
// ==/UserScript==

(() => {
  if (window.__zenArcCtrlTab) return;
  window.__zenArcCtrlTab = true;

  const OWN = 'zen-arc-ctrltab.enabled';
  // The switcher itself is Firefox's own (browser-ctrlTab.js); this pref is its only on/off switch.
  const NATIVE = 'browser.ctrlTab.sortByRecentlyUsed';

  const sync = () => Services.prefs.setBoolPref(NATIVE, Services.prefs.getBoolPref(OWN, true));
  const observer = { observe: sync };
  sync();
  Services.prefs.addObserver(OWN, observer);
  window.addEventListener('unload', () => Services.prefs.removeObserver(OWN, observer), { once: true });
})();
