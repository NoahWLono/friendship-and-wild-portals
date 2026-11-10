# Friendship & the Wild

An automatic 3D flight through **450 procedural worlds** inspired by
My Little Pony, The Legend of Zelda: Breath of the Wild, and
The Legend of Zelda: Tears of the Kingdom.

[Open the public experience](https://friendship-and-wild-portals.clock.chatgpt.site)

No ChatGPT login, account, API key, or installation is needed. Choose **Begin
the crossing** and the camera flies itself. The next world is rendered live
inside the portal before you pass through it.

## The worlds

The catalog has 30 regions with 15 deterministic variations each:

| Realm | Worlds | Some destinations |
| --- | ---: | --- |
| Equestria | 150 | Ponyville, Canterlot, Cloudsdale, Sweet Apple Acres, the Crystal Empire |
| Breath of the Wild | 150 | Great Plateau, Kakariko, Zora's Domain, Gerudo Town, Rito Village |
| Tears of the Kingdom | 150 | Great Sky Island, Water Temple, Wind Temple, Lightroot Depths, Dragonhead Island |

The 450 seeded variations share 30 region designs. Variations change the camera route, layout, landmarks,
scenery features, time of day and weather. Each has a stable link and a unique
ID. The flight visits every destination before the itinerary repeats.

Everything in the 3D scenes is built from code: terrain, architecture, ponies,
rainbows, sky islands, Zonai-inspired structures, lightroots, plants and
particles. Atlas cards use small schematic illustrations of their regions.

## Controls

| Key | Action |
| --- | --- |
| Space | Start, pause or resume |
| Right arrow | Fly quickly to the next portal |
| I | Open the searchable atlas |
| H | Save or remove the current favorite |
| S | Toggle synthesized ambient sound |
| O | Open settings |
| G | Toggle gentle motion |
| P | Download a PNG picture |
| F | Toggle fullscreen where supported |
| Escape | Close an open dialog |

The controls are also available as buttons. Settings include flight pace,
graphics quality, gentle motion and soundtrack selection. The system's
reduced-motion preference enables gentle motion by default. The landing view
is paused until you begin. Favorites and preferences use local browser storage;
they do not sync between devices.

## Music

Sound starts off. **Ambient** synthesizes soft chords, wind and bells locally.
**YouTube themes** opens a visible YouTube player and changes the track when
you enter another realm:

- Equestria: [Lullaby for a Princess Animation](https://www.youtube.com/watch?v=i7PQ9IO-7fU)
  by WarpOut, with music by Ponyphonic.
- Breath of the Wild: the main theme from Nintendo of America's
  [official orchestra concert](https://www.youtube.com/watch?v=xuXHrHRZzLk&t=807s),
  at 13:27–15:33.
- Tears of the Kingdom: the main theme reprise from the same
  [official concert](https://www.youtube.com/watch?v=xuXHrHRZzLk&t=63s),
  at 1:03–3:57.

The Zelda selections are concert arrangements. No YouTube audio is downloaded,
converted to MP3 or bundled in the repository. YouTube loads only after you
select that soundtrack. Playback may require pressing Play in the video and
may include ads, geographic restrictions or unavailable embeds. Source links
remain available if an embed fails. The 3D experience itself does not require
YouTube or a login.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm start
```

Open `http://localhost:4173`. To check the catalog and all scene configurations:

```sh
npm test
npm run build
npm run preview
```

The build produces `dist/`, a self-contained static site. Three.js r170 is
vendored, so the flight does not depend on a CDN. `dist/worlds.json` contains
the full 450-world catalog. The tests use the matching pinned npm Three.js
version. All dependency versions are pinned in `package-lock.json`.

WebGL and JavaScript are required for the flight. Low graphics reduces scene
density and rendering resolution. Browser graphics support and speed vary;
the atlas stays available if WebGL cannot start.

## Source layout

- `src/catalog.js`: region definitions, deterministic variants and search.
- `src/scenery.js`: geometry, landmarks, camera paths, animation and disposal.
- `src/engine.js`: flight, two-scene portal rendering, quality and screenshots.
- `src/audio.js`: opt-in Web Audio ambience.
- `src/music.js`: optional visible YouTube player.
- `src/main.js`, `src/style.css`, `index.html`: interface and local preferences.
- `tests/`: checks for every scene, region, route and catalog entry.
- `.openai/hosting.json`: public Sites deployment identity.

## Credits and license

Inspired by [Portals by Ethan Mollick and the AI agents credited there](https://github.com/emollick/ai-portals),
reviewed at commit `5d37bff0c01898dcd228f889d2a3f7299c535049`.
This project has a new catalog, renderer, scene builders and interface. It uses
the Three.js module vendored by the reference project.

The project is licensed [CC BY-NC-SA 4.0](LICENSE). Three.js retains its MIT
license; see [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

My Little Pony belongs to Hasbro. The Legend of Zelda, Breath of the Wild and
Tears of the Kingdom belong to Nintendo. This is an independent, noncommercial
fan project, with no affiliation or endorsement. No official game models,
textures, music files or logos are included. Embedded videos remain hosted by
their creators and retain their own rights.
