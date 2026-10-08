# Arc Ctrl+Tab

An Arc-style tab switcher for [Zen Browser](https://zen-browser.app). Ctrl+Tab opens a panel of your tabs, most recently used first, with the tab you are on highlighted in your theme's accent color.

Zen already ships this switcher, it is just off by default. This mod turns it on, restyles it and adds the settings below.

## Settings

All of them live in the mod's settings (Zen settings → Sine Mods → Arc Ctrl+Tab).

| Setting | Options |
| --- | --- |
| How the panel works | **Hold**: hold Ctrl, press Tab to move, release Ctrl to switch. **Press once**: Ctrl+Tab opens the panel and it stays open; move with Tab, Shift+Tab or the arrow keys, **Enter** or a click switches, **Esc** or a click outside closes it without switching. |
| Key repeat speed | 4 to 12 tabs per second, or unlimited. Limits how fast the highlight moves while you hold Tab, so you can see where it is and let go in time. |
| Panel layout | **Previews**: a grid of thumbnails. **List**: tabs top to bottom, no thumbnails. **List and preview**: tab list on the left, one large preview of the highlighted tab on the right. |
| Panel size | 70% to 250%. Scales the panel, previews, icons and text together. (Sine has no slider control, so it is a list of steps.) |
| Previews per row | 3–7 for the grid layout. Fewer means bigger previews. |
| Most tabs shown | 6 to 36. |
| Include unloaded tabs | Unloaded tabs are listed too, with their icon and preview (when Zen kept one) drained of color. |
| "List all tabs" button | Show or hide the button under the panel. |
| Highlight color | Any CSS color. Empty uses your theme's accent. |

The first checkbox turns the whole switcher off; Ctrl+Tab then cycles tabs in tab-bar order again.

The mod writes your choices to Zen's own switches: `browser.ctrlTab.sortByRecentlyUsed`, `browser.ctrlTab.maxPreviews` and `zen.ctrlTab.show-pending-tabs`.

## Install

In Zen's settings open **Sine Mods**, paste `https://github.com/dvgmdvgm/zen-arc-ctrltab` into the install-from-link field and install. Restart Zen once.

## Other Ctrl+Tab mods

Turn off "Better CtrlTab Panel" and any other mod that restyles `#ctrlTab-panel`. They style the same panel with `!important` rules, so they fight this mod and win in places (washed-out highlight, shrunken tiles, clipped icons).

## Limits

Tabs that were never loaded this session have a preview only if Zen stored a thumbnail for their page; otherwise the tile is an empty box with the tab's icon and title.

## Development

`node --test test/arc-ctrltab.test.js` runs the script against stubs of the browser window.

## License

MIT
