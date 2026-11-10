# Verification

The release was checked locally on November 9, 2026.

`npm test` passed 21 tests. The tests build all 450 worlds, check finite
geometry and camera paths, verify distinct structural configurations, test
all region landmarks and scenery features, and confirm resource disposal.
They also check every starting world's complete itinerary and asynchronous
audio/player cancellation and failure handling.

`npm run build` produced a static `dist/` with the 450-world JSON catalog.

`npm run test:browser` passed six grouped browser checks in Chromium:

- WebGL startup, two active scenes and the system reduced-motion preference.
- Atlas search, realm filters, favorites, empty results and world links.
- Graphics changes and pause preservation through dialogs.
- A live portal crossing into the next world and a PNG download.
- A 390-pixel mobile layout and persistence after reload.
- Atlas access when both WebGL and browser storage are unavailable.

The browser reported no JavaScript errors. After the tested crossing, the
engine held two worlds, 30 geometries and one render-target texture. This is
a sampled lifecycle check; the scene-disposal tests exercise every region.

All 30 regions were also rendered at 640 by 400 pixels using software WebGL.
The [contact sheet](regions.jpg) shows the actual scenes. None was blank or
severely obstructed, and that rendering run recorded no console errors.
Those images show the opening viewpoint; some landmarks become more visible
later in flight. Some captures preceded next-world preloading, so the separate
crossing check supplies the portal-transition evidence.

YouTube's oEmbed endpoint returned the expected title and creator for both
selected videos. Player switching and error handling use mocked API tests.
Uninterrupted third-party playback, regional availability, ads and autoplay
permission are outside these checks.

To run browser checks on a machine with a Playwright browser installed:

```sh
npx playwright install chromium
npm run test:browser
npm run test:regions
```

`PORTALS_BASE_URL` selects the browser-test target. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` for the interaction checks or `CHROMIUM_PATH`
for the region renderer when using an existing Chromium executable.
