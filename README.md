# Arc Ctrl+Tab

An Arc-style tab switcher for [Zen Browser](https://zen-browser.app). Hold **Ctrl** and press **Tab**: a row of tab previews opens, most recently used first. Keep pressing Tab (or Shift+Tab) to move the highlight, release Ctrl to jump to that tab. A quick Ctrl+Tab still flips straight back to the previous tab.

Zen already ships this switcher, it is just off by default. This mod turns it on and restyles it:

- tiles with a rounded thumbnail, the site icon and the title underneath
- the current tile is highlighted with your theme's accent color
- panel, text and border colors come from the live theme, so light and dark themes both work

## Install

In Zen's settings open **Sine Mods**, paste `https://github.com/dvgmdvgm/zen-arc-ctrltab` into the install-from-link field and install. Restart Zen once.

## Settings

One checkbox in the mod settings: **Ctrl+Tab shows a visual tab switcher**. Unticking it puts Ctrl+Tab back to cycling tabs in tab-bar order.

The mod sets `browser.ctrlTab.sortByRecentlyUsed` to match that checkbox. The number of tiles is Zen's own `browser.ctrlTab.maxPreviews` (default 7, up to 49).

## Other Ctrl+Tab mods

If you use another mod that restyles `#ctrlTab-panel` (for example "Better CtrlTab Panel"), turn one of them off: both change the same panel and the one loaded last wins.

## Limits

Tabs that were never loaded this session (unloaded or restored lazily) have no thumbnail until you visit them; they show an empty tile with their icon and title.

## License

MIT
