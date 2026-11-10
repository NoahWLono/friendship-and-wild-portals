# Friendship & the Wild

The requested result is a public remake of the automatic portal flight in
emollick/ai-portals, themed around My Little Pony, Breath of the Wild and
Tears of the Kingdom. The catalog contains exactly 450 destinations.

Implementation decisions: 30 recognizable regions, with 15 deterministic
variations in each. Each variation has its own layout seed, atmosphere and
features. The three themes receive 150 worlds each. The 450 procedural variations
share 30 region designs.

The full-screen Three.js scene is the main interface. A quiet, cream and
forest-green atlas provides search, realm filters and favorites. Flight is
automatic; a live render of the next scene appears inside each portal.
Controls cover pause, pace, sound, motion, quality, fullscreen and pictures.
Favorites and settings stay in local browser storage. There is no login,
analytics, backend, account creation or external model API.

## Implementation sequence

- Create and verify the 450-world catalog and filters.
- Build regional scenery with distinct landmarks and seeded layouts.
- Build flight, portal transitions and opt-in synthesized audio.
- Build responsive landing, atlas, favorites and accessible controls.
- Check all world builds, representative browser rendering, transitions,
  persistence, mobile layout and failure handling.
- Publish a new public GitHub repository and public static Site.
- Verify repository contents and anonymous access to the deployed app.

## Verification focus

An exact count alone does not prove a useful catalog: compare distinct
configuration signatures and inspect every region's rendered scene. Test
portal crossings, hidden-tab timing and resource disposal. Test empty search,
blocked storage, reduced motion, keyboard navigation, small screens and
missing WebGL. Public access requires an anonymous HTTP request that returns
the app and its modules without an authentication redirect.

## Soundtrack

An optional visible YouTube player follows the current realm. It uses
WarpOut's Lullaby for a Princess animation and Nintendo's official concert
arrangements of the BOTW and TOTK main themes. The player loads only after
a visitor selects it; no audio is converted or hosted by this project.
