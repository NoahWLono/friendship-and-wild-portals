/**
 * The atlas: 30 authored region profiles × 15 structural/atmospheric chapters.
 * A stable seed fixes each world's scenery. These are procedural variations,
 * not 450 independently hand-modelled levels.
 */

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const REALMS = freeze([
  { id: 'equestria', name: 'Equestria', subtitle: 'My Little Pony · friendship in every horizon' },
  { id: 'wild', name: 'Hyrule: The Wild', subtitle: 'Breath of the Wild · the long way home' },
  { id: 'kingdom', name: 'Sky & Depths', subtitle: 'Tears of the Kingdom · above and below' },
]);

const palette = (sky, ground, foliage, stone, accent, water, fog = sky) =>
  ({ sky, fog, ground, foliage, stone, accent, water });

export const REGIONS = freeze([
  {
    id: 'ponyville', name: 'Ponyville', realm: 'equestria', biome: 'town', landmark: 'timber-houses',
    description: 'Thatched cottages and candy-colored rooftops gather around the lanes of Ponyville, where every turn feels like an invitation from a friend.',
    palette: palette('#acd9ed', '#85ba70', '#6caa72', '#f4d6ae', '#ed88ba', '#71c8d9'),
  },
  {
    id: 'canterlot', name: 'Canterlot', realm: 'equestria', biome: 'castle', landmark: 'spires',
    description: 'Ivory towers and lavender turrets climb the mountainside of Canterlot, their gilded balconies overlooking a kingdom of rolling green hills.',
    palette: palette('#a8c4ed', '#83a782', '#749d92', '#ede2df', '#e6bd64', '#87bde1'),
  },
  {
    id: 'cloudsdale', name: 'Cloudsdale', realm: 'equestria', biome: 'cloud', landmark: 'rainbow-falls',
    description: 'Cloud columns carry the airy avenues of Cloudsdale, and rainbow waterfalls spill from the pegasi city into the blue distance below.',
    palette: palette('#8fceef', '#d8e9f1', '#b9d7ea', '#fff2ee', '#ec95cc', '#97dbe9'),
  },
  {
    id: 'sweet-apple-acres', name: 'Sweet Apple Acres', realm: 'equestria', biome: 'orchard', landmark: 'red-barn',
    description: 'Apple trees line the gentle slopes around the red barn at Sweet Apple Acres, with fences and farm paths winding toward the far hills.',
    palette: palette('#c0dfed', '#a2bd70', '#609150', '#d6a574', '#d05a62', '#8bbfbd'),
  },
  {
    id: 'everfree', name: 'Everfree Forest', realm: 'equestria', biome: 'forest', landmark: 'ancient-tree',
    description: 'Twisted roots, enormous trees and strange forest lights crowd the paths of the Everfree, where the wilderness follows rules of its own.',
    palette: palette('#647e9b', '#466751', '#365d61', '#8a9296', '#a1e3ba', '#5da3a3'),
  },
  {
    id: 'crystal-empire', name: 'The Crystal Empire', realm: 'equestria', biome: 'crystal', landmark: 'crystal-spire',
    description: 'Faceted towers rise around the Crystal Empire, reflecting rose, mint and violet light from a shining palace at the heart of the city.',
    palette: palette('#c4d7ef', '#b2cce0', '#9fbad3', '#c1aae7', '#f2a5d0', '#85d9e2'),
  },
  {
    id: 'fluttershy-meadow', name: 'Fluttershy’s Meadow', realm: 'equestria', biome: 'meadow', landmark: 'cottage',
    description: 'A little cottage nestles beside the meadow, surrounded by soft grass, small woodland creatures and the flower beds Fluttershy tends.',
    palette: palette('#c3e2ed', '#a6c576', '#83ae68', '#ead2aa', '#f2b8c8', '#8acdcc'),
  },
  {
    id: 'rainbow-falls', name: 'Rainbow Falls', realm: 'equestria', biome: 'cloud', landmark: 'rainbow-arches',
    description: 'Bright rainbow arches stretch between pale cloud terraces at Rainbow Falls, where colorful cascades frame the open air beyond the trade fair.',
    palette: palette('#96cee6', '#c9deed', '#9cc6c7', '#f1e5db', '#ec9cb8', '#83d6db'),
  },
  {
    id: 'manehattan', name: 'Manehattan', realm: 'equestria', biome: 'town', landmark: 'towers',
    description: 'Tall pastel buildings and long avenues give Manehattan its busy silhouette, with little pockets of greenery tucked between the city towers.',
    palette: palette('#b0c5dc', '#8faaa2', '#789b85', '#d8bdc5', '#e3a768', '#7eacbf'),
  },
  {
    id: 'seaquestria', name: 'Seaquestria Shore', realm: 'equestria', biome: 'coast', landmark: 'shell-palace',
    description: 'Pearlescent shell towers and coral gardens mark the shore of Seaquestria, where turquoise water meets the warm colors of a hidden seapony realm.',
    palette: palette('#a8dce7', '#e8caa3', '#89b5a0', '#e5b3cf', '#bc98e3', '#50bbcc'),
  },
  {
    id: 'great-plateau', name: 'The Great Plateau', realm: 'wild', biome: 'ruins', landmark: 'temple',
    description: 'Weathered temple stones stand above the open grass of the Great Plateau, looking out over the broad horizons of Hyrule after a hundred quiet years.',
    palette: palette('#add2dc', '#93aa60', '#6e8f4c', '#b6b399', '#77d1cf', '#71aeb4'),
  },
  {
    id: 'kakariko', name: 'Kakariko Village', realm: 'wild', biome: 'town', landmark: 'sheikah-gate',
    description: 'Curving roofs, lantern paths and steep green slopes surround Kakariko Village, a sheltered corner of Hyrule watched over by the Sheikah.',
    palette: palette('#b1cedb', '#7fa66b', '#5c8968', '#c6a687', '#de9278', '#72aeb3'),
  },
  {
    id: 'hateno', name: 'Hateno Village', realm: 'wild', biome: 'town', landmark: 'windmill',
    description: 'Windmills turn above Hateno’s farm terraces, while timber houses and winding footpaths lead toward a hilltop view of the eastern countryside.',
    palette: palette('#abcbd9', '#94ac63', '#688d55', '#d8bd98', '#6cbbcf', '#73afb9'),
  },
  {
    id: 'zora-domain', name: 'Zora’s Domain', realm: 'wild', biome: 'lake', landmark: 'water-palace',
    description: 'Silver-blue arches rise over the waters of Zora’s Domain, where the palace catches the light above pools, bridges and the surrounding cliffs.',
    palette: palette('#a5cbdc', '#6a9c91', '#507c78', '#b1d3df', '#7ce4ef', '#4bafca'),
  },
  {
    id: 'gerudo-town', name: 'Gerudo Town', realm: 'wild', biome: 'desert', landmark: 'sandstone-gate',
    description: 'Sandstone walls and shaded courtyards rise from the Gerudo Desert, their warm stone broken by bright cloth, palms and the blue of an oasis.',
    palette: palette('#e6c6a3', '#d5ac70', '#8d9e64', '#c89a71', '#59bfbd', '#5cbbc4'),
  },
  {
    id: 'death-mountain', name: 'Death Mountain', realm: 'wild', biome: 'volcano', landmark: 'basalt-rings',
    description: 'Basalt ridges and glowing lava channels surround Death Mountain, with dark rock formations standing against the heat haze of the Goron homeland.',
    palette: palette('#b98876', '#67514a', '#8a6f50', '#6d5b54', '#ff9b47', '#e56e38'),
  },
  {
    id: 'rito-village', name: 'Rito Village', realm: 'wild', biome: 'mountain', landmark: 'roost',
    description: 'Wooden roosts and bridges spiral around the tall rock at Rito Village, opening onto cold lakes and the distant snow of the Hebra mountains.',
    palette: palette('#aec7d9', '#8b9d7d', '#668979', '#a9a69b', '#dcae7c', '#76aab6'),
  },
  {
    id: 'lost-woods', name: 'The Lost Woods', realm: 'wild', biome: 'forest', landmark: 'ancient-tree',
    description: 'A forest of solemn trunks and drifting mist encloses the Lost Woods, where small lights hint at paths that never seem to lead quite where expected.',
    palette: palette('#8caaa8', '#627b58', '#4a6b50', '#a1aa90', '#c1e39d', '#779c91'),
  },
  {
    id: 'lurelin', name: 'Lurelin Coast', realm: 'wild', biome: 'coast', landmark: 'palm-huts',
    description: 'Palm roofs and fishing huts overlook the sea at Lurelin, where long sandy beaches curve between green headlands and clear coastal water.',
    palette: palette('#a4d7e5', '#e1c58c', '#619c70', '#bca480', '#e49d6b', '#54b9c3'),
  },
  {
    id: 'hebra', name: 'Hebra Highlands', realm: 'wild', biome: 'snow', landmark: 'stone-arch',
    description: 'Snow-covered ridges and old stone arches cross the Hebra Highlands, with hardy evergreens standing against the vast white slopes and blue shadows.',
    palette: palette('#bccddd', '#dce3e8', '#7c9d99', '#a3b6c2', '#92d6e5', '#85b0c7'),
  },
  {
    id: 'great-sky-island', name: 'The Great Sky Island', realm: 'kingdom', biome: 'sky', landmark: 'zonai-rings',
    description: 'Golden trees and weathered Zonai rings crown the Great Sky Island, where pale stone terraces float above a sea of cloud and an impossibly distant Hyrule.',
    palette: palette('#b7d9da', '#b6ae78', '#d6b552', '#d4d0b5', '#65d4b4', '#8bc6cc'),
  },
  {
    id: 'thunderhead-isles', name: 'Thunderhead Isles', realm: 'kingdom', biome: 'sky', landmark: 'storm-towers',
    description: 'Storm-worn towers emerge from the cloud banks of Thunderhead Isles, linked by broken paths and floating stones suspended high over Faron.',
    palette: palette('#849baf', '#7b8f76', '#6f9782', '#a6afa7', '#8ae0c6', '#80b4bf'),
  },
  {
    id: 'water-temple', name: 'The Water Temple', realm: 'kingdom', biome: 'sky', landmark: 'water-wheels',
    description: 'Waterwheels and pale pools float among the platforms of the Water Temple, each terrace spilling a shining thread of water into the clouds below.',
    palette: palette('#aedce7', '#a9c6b9', '#82aaa0', '#d5ded4', '#71e0d4', '#6ac7db'),
  },
  {
    id: 'wind-temple', name: 'The Wind Temple', realm: 'kingdom', biome: 'snow', landmark: 'sky-ship',
    description: 'The great sky ship of the Wind Temple waits among frozen decks and icy clouds, its high masts facing the endless wind above the Hebra region.',
    palette: palette('#a7bdcf', '#d6e1e4', '#86a5a7', '#b0c0c6', '#83dbe7', '#79aec2'),
  },
  {
    id: 'fire-temple', name: 'The Fire Temple', realm: 'kingdom', biome: 'volcano', landmark: 'rail-fortress',
    description: 'Rails and dark towers climb through the Fire Temple, an ancient Goron complex lit by lava and the ember glow beneath the mountain.',
    palette: palette('#745a55', '#534440', '#776549', '#806b58', '#f5a24c', '#e77636'),
  },
  {
    id: 'lightroot-depths', name: 'Lightroot Depths', realm: 'kingdom', biome: 'depths', landmark: 'lightroot',
    description: 'Luminous roots spread through the dark caverns of the Depths, illuminating strange fungi, ancient stonework and the shadowed ground far below Hyrule.',
    palette: palette('#172b35', '#29423d', '#3c675d', '#65736c', '#a3e3a4', '#3b7370'),
  },
  {
    id: 'korok-forest', name: 'Korok Forest', realm: 'kingdom', biome: 'forest', landmark: 'ancient-tree',
    description: 'The great old tree shelters the winding paths of Korok Forest, with tiny woodland homes and soft green light under a canopy older than the kingdom.',
    palette: palette('#9bbab2', '#75935d', '#557b51', '#aca98a', '#c6e59c', '#7bac98'),
  },
  {
    id: 'tarrey-town', name: 'Tarrey Town', realm: 'kingdom', biome: 'town', landmark: 'stacked-houses',
    description: 'Colorful stacked houses fill the bluff at Tarrey Town, where neat paths and a little gathering place look out over Lake Akkala and the construction yard.',
    palette: palette('#b1d0dc', '#a5b776', '#7b9c63', '#d6c6a8', '#c695ce', '#75afbd'),
  },
  {
    id: 'lanayru-sky', name: 'Lanayru Sky Archipelago', realm: 'kingdom', biome: 'sky', landmark: 'stone-arch',
    description: 'Broken stone arches and sunlit island fragments drift across the Lanayru sky, with old mechanisms half-hidden among the gold-leafed trees.',
    palette: palette('#b4d8df', '#b1b680', '#c5b457', '#d2d0b9', '#6ddbc0', '#86c4ce'),
  },
  {
    id: 'dragonhead-island', name: 'Dragonhead Island', realm: 'kingdom', biome: 'sky', landmark: 'dragon-ring',
    description: 'A dragon-shaped ring and moss-covered Zonai ruins overlook the cloud sea at Dragonhead Island, where a lost path waits beyond the storm.',
    palette: palette('#9bbcb9', '#829d78', '#668b69', '#b5c1a8', '#8ae2bf', '#75b5b2'),
  },
]);

const chapter = (id, name, timeOfDay, weather, route, density, elevation, spread, landmarkScale, features, description) => ({
  id, name, timeOfDay, weather, features, description,
  layout: { route, density, elevation, spread, landmarkScale },
});

const CHAPTERS = freeze([
  chapter('first-light', 'First Light', 'dawn', 'clear', 'meander', .85, 0, 1, 1,
    ['flowers', 'birds'], 'Follow a loose trail of flowers as the first light reaches the rooftops and ridgelines, with birds crossing the open route.'),
  chapter('lantern-route', 'The Lantern Route', 'night', 'clear', 'straight', 1.15, 2, .9, 1.1,
    ['lanterns', 'arches'], 'Pass beneath a procession of lit arches, following lanterns along a close-set path through the quiet of the night.'),
  chapter('rainwashed', 'After the Rain', 'day', 'rain', 'river', .75, -1, 1.2, .9,
    ['ponds', 'mushrooms'], 'Thread between rain-filled pools and clusters of mushrooms while a light shower softens the distant outlines.'),
  chapter('festival', 'The Floating Festival', 'day', 'petals', 'wide', 1.35, 0, .9, 1.2,
    ['banners', 'balloons'], 'Take the broad festival route past fluttering banners and rising balloons as petals drift across the gathering places.'),
  chapter('cloudward', 'The Cloudward Path', 'dawn', 'mist', 'rise', .65, 10, 1.5, .9,
    ['islands', 'bridges'], 'Climb between widely scattered floating islands, with slender bridges appearing out of the cool morning mist.'),
  chapter('old-stones', 'Among the Old Stones', 'sunset', 'mist', 'orbit', .7, 3, 1.1, 1.35,
    ['ruins', 'arches'], 'Curve around oversized old stonework and freestanding arches as the last warm light settles into a low veil of mist.'),
  chapter('starfall', 'A Sky Full of Wishes', 'night', 'stars', 'meander', .9, 1, 1.25, 1,
    ['crystals', 'stars'], 'Drift past scattered crystal outcrops beneath a sky of slow-moving lights, with clear space between each luminous landmark.'),
  chapter('wild-garden', 'The Wild Garden', 'day', 'petals', 'river', 1.6, 0, .85, 1,
    ['giant-flowers', 'groves'], 'Wind through dense groves and enormous flowers, taking a sheltered route where falling petals catch the daylight.'),
  chapter('frozen-echo', 'A Frozen Echo', 'dawn', 'snow', 'straight', .65, 4, 1.2, 1.25,
    ['ice', 'spires'], 'Cross a wintry alternate world of ice formations and pale spires, with sparse scenery emerging through the morning snow.'),
  chapter('sunken-path', 'The Sunken Path', 'day', 'mist', 'dip', .75, -4, 1.2, .9,
    ['ponds', 'bridges'], 'Descend toward low pools, passing beneath the silhouettes of bridges before the path opens onto the distant portal.'),
  chapter('copper-sunset', 'Copper Sunset', 'sunset', 'clear', 'wide', 1.1, 2, 1.3, 1.1,
    ['autumn', 'windmills'], 'Follow a wide route between autumn groves and turning windmills as copper light spreads over the evening landscape.'),
  chapter('stormwatch', 'The Stormwatch', 'night', 'storm', 'rise', .8, 6, 1.15, 1.4,
    ['towers', 'lightning'], 'Rise beside tall watchtowers beneath a storm-dark sky, with brief pulses of distant light picking out the horizon.'),
  chapter('firefly-hollow', 'Firefly Hollow', 'night', 'fireflies', 'dip', 1.25, -2, .8, .85,
    ['mushrooms', 'fireflies'], 'Dip into a close, sheltered hollow of mushrooms and wandering fireflies, where small lights lead the way through the dark.'),
  chapter('ribbon-road', 'The Ribbon Road', 'sunset', 'clear', 'meander', 1.15, 3, .95, 1.05,
    ['ribbons', 'rainbows'], 'Weave beside long colored ribbons and rainbow arches suspended over an elevated path in the warm evening light.'),
  chapter('golden-crown', 'The Golden Crown', 'dawn', 'clear', 'orbit', 1.05, 8, 1.1, 1.6,
    ['crystals', 'floating-stones'], 'Circle a monumental crown of stone and crystal, with smaller fragments floating high above the newly sunlit world.'),
]);

function hash(value) {
  let seed = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function blend(a, b, weight) {
  const first = parseInt(a.slice(1), 16);
  const second = parseInt(b.slice(1), 16);
  return `#${[16, 8, 0].map(shift => Math.round(
    ((first >> shift) & 255) * (1 - weight) + ((second >> shift) & 255) * weight,
  ).toString(16).padStart(2, '0')).join('')}`;
}

function chapterPalette(region, chapter) {
  const colors = { ...region.palette };
  const tint = { dawn: '#efc9b5', day: '#d6f0e7', sunset: '#e2a48b', night: '#172f49' }[chapter.timeOfDay];
  const weight = chapter.timeOfDay === 'night' ? .7 : chapter.timeOfDay === 'day' ? .04 : .24;
  colors.sky = blend(colors.sky, tint, weight);
  colors.fog = blend(colors.fog, tint, weight * .92);
  if (chapter.weather === 'snow') {
    colors.ground = blend(colors.ground, '#e6edf1', .75);
    colors.foliage = blend(colors.foliage, '#c9dce0', .5);
    colors.stone = blend(colors.stone, '#dce5ed', .3);
  }
  if (chapter.features.includes('autumn')) {
    colors.foliage = blend(colors.foliage, '#cb874b', .75);
    colors.ground = blend(colors.ground, '#ba9a63', .35);
  }
  if (chapter.weather === 'storm') {
    colors.sky = blend(colors.sky, '#34434e', .55);
    colors.fog = blend(colors.fog, '#5c727b', .4);
  }
  return colors;
}

export const WORLDS = freeze(REGIONS.flatMap((region, regionIndex) => CHAPTERS.map((chapter, variant) => {
  const id = `${region.id}-${chapter.id}`;
  return {
    id,
    index: regionIndex * CHAPTERS.length + variant,
    title: `${region.name} · ${chapter.name}`,
    realm: region.realm,
    region: region.name,
    regionId: region.id,
    biome: region.biome,
    landmark: region.landmark,
    description: `${region.description} ${chapter.description}`,
    variant,
    seed: hash(id),
    duration: 42 + ((regionIndex + variant) % 12),
    palette: chapterPalette(region, chapter),
    weather: chapter.weather,
    timeOfDay: chapter.timeOfDay,
    features: [...chapter.features],
    layout: { ...chapter.layout },
  };
})));

const byId = new Map(WORLDS.map(world => [world.id, world]));
const realmText = new Map(REALMS.map(realm => [realm.id, `${realm.name} ${realm.subtitle}`]));
const searchText = new Map(WORLDS.map(world => [world.id,
  `${world.title} ${world.region} ${world.description} ${world.biome} ${world.weather} ${world.timeOfDay} ${world.features.join(' ')} ${realmText.get(world.realm)}`.toLocaleLowerCase('en'),
]));

export const getWorld = id => byId.get(id);

/** An empty favorites collection selects no worlds; null means no favorites filter. */
export function filterWorlds({ query = '', realm = 'all', favorites = null } = {}) {
  const words = String(query).trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  const saved = favorites === null ? null : favorites instanceof Set ? favorites : new Set(favorites);
  return WORLDS.filter(world =>
    (realm === 'all' || realm === world.realm) &&
    (!saved || saved.has(world.id)) &&
    words.every(word => searchText.get(world.id).includes(word)),
  );
}
