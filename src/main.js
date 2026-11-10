import { WORLDS, REALMS, filterWorlds, getWorld } from './catalog.js';
import { createJourney } from './engine.js';
import { createYoutubeSoundtrack } from './music.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast('Browser storage is unavailable. Changes last for this visit.'); } };
const saved = read('fw-favorites', []);
const favorites = new Set(Array.isArray(saved) ? saved.filter(id => getWorld(id)) : []);
const preferences = read('fw-settings', {});
const prefersGentle = matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentWorld = WORLDS[0], journey, playing = false, filterRealm = 'all', savedOnly = false, visibleCount = 36;
let state = { paused: false, sound: false, pace: 1, quality:'auto', gentle:prefersGentle };
let musicMode = 'off', restorePaused = false, toastTimer, musicRequest = 0;
const soundtrack = createYoutubeSoundtrack({ onError:message => toast(message) });
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 4300); }
function persistPreferences() { write('fw-settings', { pace:state.pace, quality:state.quality, gentle:state.gentle }); }
function setWorld(world) {
  currentWorld = world;
  $('world-title').textContent = world.title;
  $('world-description').textContent = world.description;
  $('world-realm').textContent = REALMS.find(realm => realm.id === world.realm).name;
  $('world-number').textContent = `${String(world.index + 1).padStart(3, '0')} / 450`;
  $('world-atmosphere').textContent = `${world.timeOfDay.replaceAll('-', ' ')} · ${world.weather.replaceAll('-', ' ')}`;
  updateFavorite();
  $('loading').hidden = true;
  if (playing) history.replaceState(null, '', `#world=${encodeURIComponent(world.id)}`);
  if (musicMode === 'youtube') soundtrack.setRealm(world.realm);
}
function updateFavorite() { const active = favorites.has(currentWorld.id); $('favorite').textContent = active ? '♥' : '♡'; $('favorite').setAttribute('aria-pressed', active); $('favorite').setAttribute('aria-label', active ? 'Remove favorite' : 'Save favorite'); }
function setState(next) {
  state = next;
  $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-label', state.paused ? 'Resume flight' : 'Pause flight');
  $('pause').title = state.paused ? 'Resume (Space)' : 'Pause (Space)';
  $('sound').setAttribute('aria-pressed', state.sound || musicMode === 'youtube');
  $('sound').setAttribute('aria-label', state.sound || musicMode === 'youtube' ? 'Mute sound' : 'Enable ambient sound');
  soundtrack.setPaused(state.paused);
  $('pace').value = state.pace; $('pace-value').value = `${state.pace}×`; $('quality').value = state.quality; $('gentle').checked = state.gentle;
}
function showError(error) { $('loading').hidden = true; $('error').hidden = false; $('error-message').textContent = `${error.message || 'WebGL could not start.'} Try a browser with WebGL enabled, or lower graphics quality. The atlas remains available.`; }
function boot() {
  try {
    journey = createJourney($('world'), { onWorld:setWorld, onProgress:value => $('progress-bar').style.width = `${value * 100}%`, onState:setState, onError:showError, onAudioError:error => toast(error.message || 'Audio could not start. Try enabling it again.') });
    if (preferences && typeof preferences === 'object') {
      journey.setPace(Number(preferences.pace) || 1);
      journey.setQuality(['auto','low','high'].includes(preferences.quality) ? preferences.quality : 'auto');
      journey.setGentle(typeof preferences.gentle === 'boolean' ? preferences.gentle : prefersGentle);
    }
    const requested = worldFromHash();
    journey.start(requested?.id || WORLDS[0].id);
    if (requested) begin();
    else journey.setPaused(true);
  } catch (error) { showError(error); }
}
function begin(id) {
  if (!journey) return;
  if (id && id !== currentWorld.id) journey.start(id);
  playing = true; document.body.classList.add('playing');
  $('landing').hidden = true; $('landing-footer').hidden = true;
  for (const id of ['flight-info', 'flight-toolbar', 'flight-progress']) $(id).hidden = false;
  if (!document.querySelector('dialog[open]')) journey.setPaused(false);
  history.replaceState(null, '', `#world=${encodeURIComponent(currentWorld.id)}`);
}
function worldFromHash() { const params = new URLSearchParams(location.hash.slice(1)); return getWorld(params.get('world')); }
function openDialog(id) {
  if (document.querySelector('dialog[open]')) return;
  restorePaused = state.paused;
  journey?.setPaused(true);
  $(id).showModal();
  if (id === 'atlas') { renderAtlas(); $('search').focus(); }
}
function closeDialog(dialog) { dialog.close(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close-dialog').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) closeDialog(dialog); } });
  dialog.addEventListener('close', () => journey?.setPaused(restorePaused));
}
function toggleFavorite(id = currentWorld.id) {
  const active = favorites.has(id);
  active ? favorites.delete(id) : favorites.add(id);
  write('fw-favorites', [...favorites]); updateFavorite();
  if ($('atlas').open) renderAtlas();
  toast(active ? 'World removed from your favorites.' : 'World saved. Find it in the atlas.');
}
function art(world) {
  const p = world.palette; const rand = n => ((world.seed >>> (n % 16)) % 100) / 100;
  const isSky=['sky','cloud'].includes(world.biome), isDepths=world.biome==='depths';
  let shapes='';
  for (let i=0;i<7;i++) { const x=i*55-10, y=80+rand(i)*38; shapes+=`<path d="M${x-65} 190 L${x+35} ${y} L${x+140} 190Z" fill="${p.stone}" opacity=".35"/>`; }
  shapes+=`<path d="M0 165 Q70 105 160 150 T400 140 V220H0Z" fill="${p.ground}"/>`;
  if (isSky) shapes+=`<path d="M55 144h100l-48 55zM220 151h110l-55 46z" fill="${p.stone}"/><ellipse cx="105" cy="142" rx="53" ry="9" fill="${p.ground}"/><ellipse cx="275" cy="149" rx="58" ry="8" fill="${p.ground}"/>`;
  for (let i=0;i<8;i++){const x=20+i*47,y=125+rand(i+3)*40,h=20+rand(i+9)*35;if(['town','castle','ruins','crystal'].includes(world.biome)){shapes+=`<path d="M${x} ${y}v-${h}h22v${h}z" fill="${p.stone}"/><path d="M${x-5} ${y-h}l16-18 16 18z" fill="${p.accent}"/>`;}else{shapes+=`<path d="M${x} ${y}v-25" stroke="${p.stone}" stroke-width="4"/><ellipse cx="${x}" cy="${y-28}" rx="${10+rand(i)*10}" ry="${h*.65}" fill="${p.foliage}"/>`;}}
  shapes+=`<ellipse cx="213" cy="122" rx="23" ry="35" fill="${p.sky}" stroke="${p.accent}" stroke-width="3"/><path d="m197 150 16-25 16 25" fill="none" stroke="${p.stone}" opacity=".8"/>`;
  return `<svg viewBox="0 0 400 216" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="216" fill="${p.sky}"/><circle cx="${300+rand(3)*40}" cy="43" r="22" fill="${isDepths?p.accent:'#ffedc8'}" opacity=".7"/>${shapes}<path d="M0 195Q100 170 200 195T400 188V216H0Z" fill="${p.foliage}" opacity=".5"/></svg>`;
}
function renderAtlas() {
  const results = filterWorlds({ query:$('search').value, realm:filterRealm, favorites:savedOnly?favorites:null });
  $('results-count').textContent = `${results.length} ${results.length===1?'world':'worlds'} to discover`;
  $('empty').hidden = results.length > 0;
  $('world-grid').innerHTML = results.slice(0, visibleCount).map(world => `<article class="world-card"><button class="world-enter" data-enter="${world.id}" aria-label="Enter ${escape(world.title)}"><div class="world-art">${art(world)}</div><div class="card-copy"><p class="card-eyebrow">${escape(world.region)}</p><h3>${escape(world.title.split(' · ').pop())}</h3><p class="card-detail">${escape(world.timeOfDay.replaceAll('-',' '))} · ${escape(world.weather.replaceAll('-',' '))}</p><span class="card-arrow" aria-hidden="true">↗</span></div></button><button class="card-save" data-save="${world.id}" aria-pressed="${favorites.has(world.id)}" aria-label="${favorites.has(world.id)?'Unsave':'Save'} ${escape(world.title)}">${favorites.has(world.id)?'♥':'♡'}</button></article>`).join('');
  $('load-more').hidden = visibleCount >= results.length;
}
$('world-grid').addEventListener('click', event => {
  const enter=event.target.closest('[data-enter]'), save=event.target.closest('[data-save]');
  if (save) toggleFavorite(save.dataset.save);
  else if (enter) { restorePaused=false; closeDialog($('atlas')); begin(enter.dataset.enter); }
});
$('load-more').addEventListener('click', () => { visibleCount+=36; renderAtlas(); });
$('search').addEventListener('input', () => { visibleCount=36; renderAtlas(); });
for (const button of document.querySelectorAll('[data-realm]')) button.addEventListener('click', () => { filterRealm=button.dataset.realm; visibleCount=36; document.querySelectorAll('[data-realm]').forEach(b => { const active=b===button; b.classList.toggle('active',active); b.setAttribute('aria-pressed',active); }); renderAtlas(); });
$('favorites-filter').addEventListener('click', () => { savedOnly=!savedOnly; $('favorites-filter').setAttribute('aria-pressed', savedOnly); visibleCount=36; renderAtlas(); });
for (const id of ['atlas-open','browse','error-atlas']) $(id).addEventListener('click', () => openDialog('atlas'));
$('settings-open').addEventListener('click', () => openDialog('settings'));
$('begin').addEventListener('click', () => begin());
$('home-link').addEventListener('click', event => { event.preventDefault(); playing=false; document.body.classList.remove('playing'); $('landing').hidden=false; $('landing-footer').hidden=false; for(const id of ['flight-info','flight-toolbar','flight-progress']) $(id).hidden=true; journey?.setPaused(true); history.replaceState(null,'',location.pathname+location.search); });
$('pause').addEventListener('click', () => journey?.setPaused(!state.paused));
$('next').addEventListener('click', () => journey?.next());
$('favorite').addEventListener('click', () => toggleFavorite());
async function setMusic(mode) {
  const request = ++musicRequest;
  musicMode=mode; $('music-mode').value=mode;
  if (mode !== 'youtube') soundtrack.disable();
  const enabled = await journey?.setSound(mode === 'ambient');
  if (request !== musicRequest) return;
  if (mode === 'ambient' && !enabled) { musicMode='off'; $('music-mode').value='off'; }
  if (mode === 'youtube') {
    const ready = await soundtrack.enable(currentWorld.realm);
    if (request !== musicRequest) return;
    if (ready) soundtrack.setPaused(state.paused);
    else {
      const message = $('music-status').textContent;
      soundtrack.disable();
      $('music-player').hidden = false;
      $('music-status').textContent = message;
      musicMode='off'; $('music-mode').value='off';
    }
  }
  setState({...state});
}
$('sound').addEventListener('click', () => setMusic(musicMode==='off'?'ambient':'off'));
$('music-mode').addEventListener('change', event => setMusic(event.target.value));
$('music-close').addEventListener('click', () => setMusic('off'));
$('pace').addEventListener('input', event => { journey?.setPace(Number(event.target.value)); persistPreferences(); });
$('quality').addEventListener('change', event => { journey?.setQuality(event.target.value); persistPreferences(); });
$('gentle').addEventListener('change', event => { journey?.setGentle(event.target.checked); persistPreferences(); });
$('retry').addEventListener('click', () => location.reload());
$('share').addEventListener('click', async () => { const url=new URL(location.href); url.hash=`world=${currentWorld.id}`; try { await navigator.clipboard.writeText(url.href); toast('World link copied. Send someone a portal.'); } catch { toast('Copy the world link from your address bar.'); } });
$('picture').addEventListener('click', () => { const data=journey?.screenshot(); if(!data){toast('This browser could not save the picture.');return;} const link=document.createElement('a');link.download=`${currentWorld.id}.png`;link.href=data;link.click();toast('A little piece of this world, saved.'); });
$('fullscreen').addEventListener('click', async () => { try { if(document.fullscreenElement) await document.exitFullscreen(); else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('Fullscreen is unavailable in this browser.'); } catch {toast('Fullscreen is unavailable in this browser.');} });
document.addEventListener('fullscreenchange', () => $('fullscreen').setAttribute('aria-label', document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
window.addEventListener('hashchange', () => { const world=worldFromHash(); if(world) begin(world.id); });
document.addEventListener('keydown', event => {
  if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(event.target.tagName)||event.target.isContentEditable) return;
  if(document.querySelector('dialog[open]')) return;
  const key=event.key.toLowerCase();
  if(key==='i') openDialog('atlas'); else if(key==='o') openDialog('settings'); else if(key===' '){event.preventDefault();playing?journey?.setPaused(!state.paused):begin();} else if(key==='arrowright'){event.preventDefault();if(!playing)begin();journey?.next();} else if(key==='h') toggleFavorite();else if(key==='s')$('sound').click();else if(key==='p')$('picture').click();else if(key==='f')$('fullscreen').click();else if(key==='g'){journey?.setGentle(!state.gentle);persistPreferences();toast(state.gentle?'Gentle motion on.':'Gentle motion off.');}
});
// Exposes diagnostics only when explicitly requested by local/browser verification.
if(new URLSearchParams(location.search).has('debug')) window.portalDebug={get journey(){return journey;},get currentWorld(){return currentWorld;},worlds:WORLDS};
boot();
