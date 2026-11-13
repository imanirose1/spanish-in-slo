(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const allEntries = [...PROJECT_DATA.signs, ...PROJECT_DATA.streets];
  const categories = { shop: 'Shop', restaurant: 'Restaurant', public: 'Public space', street: 'Street name' };
  const state = { layer: 'both', category: 'all', query: '', selected: null };
  const layers = new Map();
  const homeView = { center: [35.2811, -120.6606], zoom: 16 };
  let map;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const badge = (entry) => entry.sample ? '<span class="sample-badge">Sample entry · not field data</span>' : '<span class="sample-badge">Field entry</span>';
  function signVisual(entry) {
    // Only allow local or HTTPS image paths; never inject arbitrary attributes or URLs.
    const path = String(entry.photo || '');
    if (/^(assets\/|https:\/\/)/.test(path)) return `<a class="photo-link" href="${escape(path)}" target="_blank" rel="noopener" aria-label="Open full photograph: ${escape(entry.title)}"><img class="detail-image" src="${escape(path)}" alt="${escape(entry.photoAlt || entry.text)}" loading="lazy"></a>`;
    return `<div class="sample-sign ${entry.type === 'street' ? 'street' : ''}" lang="es"><span>${escape(entry.text)}</span><small>${entry.type === 'street' ? 'Route illustration' : 'Sign illustration · photo to be added'}</small></div>`;
  }
  function visibleEntries() {
    return allEntries.filter((entry) => (state.layer === 'both' || entry.type === state.layer)
      && (entry.type === 'street' || state.category === 'all' || entry.category === state.category)
      && normalize([entry.title, entry.text, entry.translation || '', entry.location, categories[entry.category]].join(' ')).includes(normalize(state.query)));
  }
  function popup(entry) {
    const box = document.createElement('div');
    box.innerHTML = `${badge(entry)}<h3>${escape(entry.title)}</h3>${signVisual(entry)}<p>${escape(entry.location)}</p>`;
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'View entry & analysis →';
    button.addEventListener('click', () => showDetail(entry, true));
    box.append(button);
    return box;
  }
  function initializeMap() {
    if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
    if (!window.L) { $('#map-status').hidden = false; $('#map-status').textContent = 'The map library could not load. You can still explore entries using the list.'; renderEntries(); return; }
    map = L.map('map', { scrollWheelZoom: false }).setView(homeView.center, homeView.zoom);
    let tileFailures = 0;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19
    }).addTo(map);
    tiles.on('tileerror', () => { tileFailures += 1; if (tileFailures >= 3) { $('#map-status').hidden = false; $('#map-status').textContent = 'Some map tiles could not load. Check your internet connection. The entry list is still available.'; } });
    tiles.on('tileload', () => { tileFailures = 0; $('#map-status').hidden = true; });
    L.control.scale({ imperial: false }).addTo(map);
    allEntries.forEach((entry) => {
      const layer = entry.type === 'sign'
        ? L.marker(entry.coordinates, { title: entry.title, alt: entry.title, icon: L.divIcon({ className: 'custom-marker', html: '<span class="pin-shape"></span>', iconSize: [28, 35], iconAnchor: [14, 32], popupAnchor: [0, -29] }) })
        : L.polyline(entry.coordinates, { color: '#777b50', weight: 8, opacity: 0.9, lineCap: 'round' });
      layer.bindPopup(popup(entry), { maxWidth: 300, minWidth: 220 });
      if (entry.type === 'street') layer.bindTooltip(`${entry.title} · ${entry.sample ? 'sample segment' : 'mapped named route'}`, { sticky: true });
      layer.on('click', () => { state.selected = entry.id; renderList(); showDetail(entry, false); });
      layers.set(entry.id, layer);
    });
    renderEntries();
    const mapped = [...layers.values()];
    if (mapped.length) map.fitBounds(L.featureGroup(mapped).getBounds(), { padding: [30, 30] });
  }
  function renderList() {
    const entries = visibleEntries();
    $('#result-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    $('#entry-list').replaceChildren();
    if (!entries.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No entries match. Try another search or clear the filters.'; $('#entry-list').append(empty); }
    entries.forEach((entry) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = `entry-card ${entry.type === 'street' ? 'street-card' : ''}`;
      card.dataset.entry = entry.id; card.setAttribute('aria-pressed', String(state.selected === entry.id));
      card.innerHTML = `<span class="entry-type">${escape(categories[entry.category])}</span><strong>${escape(entry.title)}</strong><small>${escape(entry.type === 'sign' ? entry.text : entry.sample ? 'Highlighted demonstration segment' : 'Mapped street route · field photograph')}</small><span class="card-meta"><span>${entry.sample ? 'Sample entry' : 'Collected Nov 12, 2026'}</span><span aria-hidden="true">↗</span></span>`;
      card.addEventListener('click', () => selectEntry(entry));
      $('#entry-list').append(card);
    });
    $('#category').disabled = state.layer === 'street';
  }
  function renderEntries() {
    const entries = visibleEntries();
    if (state.selected && !entries.some((entry) => entry.id === state.selected)) { state.selected = null; $('#entry-detail').hidden = true; map?.closePopup(); }
    renderList();
    if (map) allEntries.forEach((entry) => { const layer = layers.get(entry.id); if (entries.includes(entry)) { if (!map.hasLayer(layer)) layer.addTo(map); } else if (map.hasLayer(layer)) map.removeLayer(layer); });
  }
  function selectEntry(entry) {
    state.selected = entry.id;
    // Update the list state without replacing the focused card.
    document.querySelectorAll('[data-entry]').forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.entry === entry.id)));
    const layer = layers.get(entry.id);
    if (layer && map) {
      if (entry.type === 'street') map.fitBounds(layer.getBounds(), { padding: [55, 70], maxZoom: 17, animate: false });
      else map.setView(entry.coordinates, Math.max(map.getZoom(), 16), { animate: false });
      layer.openPopup();
    }
    showDetail(entry, false);
    if (window.matchMedia('(max-width: 620px)').matches) $('#map').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function showDetail(entry, shouldScroll) {
    const detail = $('#entry-detail');
    const sourceItems = (entry.sources || []).map((source) => {
      if (typeof source === 'string') return `<li>${escape(source)}</li>`;
      return /^https:\/\//.test(source.url || '') ? `<li><a href="${escape(source.url)}" target="_blank" rel="noopener">${escape(source.title)}</a></li>` : `<li>${escape(source.title)}</li>`;
    }).join('');
    detail.innerHTML = `<div>${signVisual(entry)}<p class="detail-caption">${entry.photo ? 'Field photograph · November 12, 2026. Click to open the full image.' : 'Illustration only. No field photograph has been collected for this sample.'}</p></div><div><button type="button" class="detail-close">Close details</button>${badge(entry)}<h2 id="detail-title" tabindex="-1">${escape(entry.title)}</h2><p>${escape(entry.location)}</p><span class="detail-label">${entry.type === 'sign' ? 'Text & translation' : 'Route status'}</span><p>${entry.type === 'sign' ? `<span lang="es">${escape(entry.text)}</span> — ${escape(entry.translation)}` : escape(entry.routeStatus || 'Approximate sample segment. Exact route and extent to be verified.')}</p>${entry.type === 'street' ? `<span class="detail-label">Photographed text & literal translation</span><p><span lang="es">${escape(entry.text)}</span> — ${escape(entry.translation || '')}</p>` : ''}${entry.locationStatus ? `<span class="detail-label">Location accuracy</span><p>${escape(entry.locationStatus)}</p>` : ''}<span class="detail-label">${entry.sample ? 'Example observation' : 'Observation'}</span><p>${escape(entry.observation)}</p><span class="detail-label">${entry.sample ? 'Questions for analysis' : 'Preliminary interpretation'}</span><p>${escape(entry.analysis)}</p>${entry.history ? `<span class="detail-label">Naming history</span><p>${escape(entry.history)}</p>` : ''}<span class="detail-label">Collection date</span><p>${escape(entry.date || 'Not collected yet')}</p><span class="detail-label">Sources</span>${sourceItems ? `<ul>${sourceItems}</ul>` : '<p>No research sources added yet.</p>'}<a class="text-link" href="#research">About our methods →</a></div>`;
    detail.hidden = false;
    detail.querySelector('.detail-close').addEventListener('click', () => { detail.hidden = true; const selected = document.querySelector(`[data-entry="${entry.id}"]`); selected?.focus({ preventScroll: true }); });
    if (shouldScroll) { detail.scrollIntoView({ block: 'start' }); $('#detail-title').focus({ preventScroll: true }); }
  }
  const researchAnchors = new Set(['research-question','research-methods','research-limits','research-sources','research-team']);
  function route({ focus = false } = {}) {
    const hash = location.hash.slice(1) || 'welcome';
    if (hash === 'main') { $('#main').focus(); return; }
    const sectionAnchor = researchAnchors.has(hash);
    const page = sectionAnchor ? 'research' : ['welcome','map','findings','research'].includes(hash) ? hash : 'welcome';
    document.querySelectorAll('.page').forEach((section) => { section.hidden = section.id !== `page-${page}`; });
    document.querySelectorAll('[data-page]').forEach((link) => { if (link.dataset.page === page) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
    document.title = `${{ welcome: 'Welcome', map: 'Explore the map', findings: 'Findings', research: 'Research' }[page]} · Spanish in SLO`;
    if (page === 'map') initializeMap();
    if (sectionAnchor) requestAnimationFrame(() => document.getElementById(hash).scrollIntoView({ block: 'start' }));
    else { window.scrollTo({ top: 0, behavior: 'instant' }); if (focus) $('#main').focus({ preventScroll: true }); }
  }
  document.querySelectorAll('[data-layer]').forEach((button) => button.addEventListener('click', () => {
    state.layer = button.dataset.layer;
    document.querySelectorAll('[data-layer]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderEntries();
  }));
  $('#search').addEventListener('input', (event) => { state.query = event.target.value.trim(); renderEntries(); });
  $('#category').addEventListener('change', (event) => { state.category = event.target.value; renderEntries(); });
  $('#clear-filters').addEventListener('click', () => {
    state.query = ''; state.category = 'all'; state.layer = 'both'; $('#search').value = ''; $('#category').value = 'all';
    document.querySelectorAll('[data-layer]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.layer === 'both')));
    renderEntries();
  });
  $('#reset-map').addEventListener('click', () => { if (map) { map.closePopup(); const mapped = [...layers.values()].filter(layer => map.hasLayer(layer)); if (mapped.length) map.fitBounds(L.featureGroup(mapped).getBounds(), {padding:[30,30], animate:false}); else map.setView(homeView.center, homeView.zoom, { animate: false }); } });
  window.addEventListener('hashchange', () => route({ focus: true }));
  route();
})();
