const DB_NAME = 'pflanzen-db';
const DB_VERSION = 1;
const STORE = 'plants';
let db;
let currentPhoto = null;
let activeFilter = 'all';
let plantsCache = [];

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('plantGrid'),
  empty: $('emptyState'),
  count: $('plantCount'),
  search: $('searchInput'),
  dialog: $('plantDialog'),
  form: $('plantForm'),
  dataDialog: $('dataDialog'),
  photoPreview: $('photoPreview'),
  tipText: $('generatedTipText'),
  deleteBtn: $('deletePlantBtn'),
  toast: $('toast')
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txStore(mode = 'readonly') {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function getAllPlants() {
  return new Promise((resolve, reject) => {
    const req = txStore().getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getPlant(id) {
  return new Promise((resolve, reject) => {
    const req = txStore().get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putPlant(plant) {
  return new Promise((resolve, reject) => {
    const req = txStore('readwrite').put(plant);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deletePlant(id) {
  return new Promise((resolve, reject) => {
    const req = txStore('readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function statusClass(status) {
  return status === 'Achtung' ? 'alert' : status === 'Beobachten' ? 'warn' : '';
}

function gardenerTip(plant) {
  const tips = [];

  if (plant.status === 'Achtung') {
    tips.push('Kontrolliere zuerst die Feuchtigkeit im Wurzelballen, Blattunterseiten auf Schädlinge und ob Wasser im Übertopf steht.');
  } else if (plant.status === 'Beobachten') {
    tips.push('Beobachte die Pflanze einige Tage unter möglichst gleichen Bedingungen und ändere nicht mehrere Pflegefaktoren gleichzeitig.');
  }

  if (plant.area === 'Terrasse' && plant.light === 'Sonne') {
    tips.push('Bei sonnigem Kübelstandort im Sommer morgens gießen und an heißen, windigen Tagen die Feuchte zusätzlich am Abend prüfen.');
  } else if (plant.area === 'Terrasse' && plant.light === 'Schatten') {
    tips.push('Im Schatten verdunstet Wasser langsamer; vor dem Gießen immer die Substratfeuchte prüfen.');
  } else if (plant.area === 'Terrasse' && plant.light === 'Halbschatten') {
    tips.push('Im Halbschatten vor dem Gießen einige Zentimeter tief prüfen, ob das Substrat noch feucht ist.');
  } else if (plant.area === 'Wohnung' && plant.light === 'Sonne') {
    tips.push('Hinter Fensterglas kann starke Mittagssonne Blätter verbrennen. Hitzestau und helle Blattflecken im Blick behalten.');
  } else if (plant.area === 'Wohnung' && plant.light === 'Hell, indirekt') {
    tips.push('Ein heller Platz ohne harte Mittagssonne ist für viele Zimmerpflanzen ideal; gelegentliches Drehen sorgt für gleichmäßigen Wuchs.');
  }

  if (!tips.length) {
    tips.push('Gieße lieber nach tatsächlicher Substratfeuchte als nach Kalender und kontrolliere regelmäßig Blätter, Triebe und Topfunterseite.');
  }
  return tips.join(' ');
}

async function refresh() {
  plantsCache = await getAllPlants();
  plantsCache.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const query = els.search.value.trim().toLowerCase();
  const filtered = plantsCache.filter((plant) => {
    const haystack = [
      plant.name, plant.botanical, plant.area, plant.spot, plant.light,
      plant.status, plant.notes, plant.gardener, plant.watering,
      plant.fertilizing, plant.winter, plant.pot
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'Achtung'
        ? ['Achtung', 'Beobachten'].includes(plant.status)
        : plant.area === activeFilter);

    return matchesQuery && matchesFilter;
  });

  els.count.textContent = `${plantsCache.length} ${plantsCache.length === 1 ? 'Pflanze' : 'Pflanzen'} gespeichert`;
  els.empty.classList.toggle('hidden', plantsCache.length > 0 || query || activeFilter !== 'all');
  els.grid.innerHTML = filtered.map(cardHtml).join('');

  if (!filtered.length && plantsCache.length) {
    els.grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-plant">🔎</div><h2>Nichts gefunden</h2><p>Ändere Suche oder Filter.</p></div>';
  }

  document.querySelectorAll('.plant-card').forEach((card) => {
    card.addEventListener('click', () => openEdit(card.dataset.id));
  });
}

function cardHtml(plant) {
  const photo = plant.photoDataUrl
    ? `<img src="${plant.photoDataUrl}" alt="${escapeHtml(plant.name)}">`
    : '🪴';

  return `<article class="plant-card" data-id="${escapeHtml(plant.id)}" tabindex="0" role="button" aria-label="${escapeHtml(plant.name)} bearbeiten">
    <div class="card-photo">${photo}</div>
    <div class="card-body">
      <div class="card-title-row">
        <div>
          <h3>${escapeHtml(plant.name)}</h3>
          <div class="botanical">${escapeHtml(plant.botanical || ' ')}</div>
        </div>
        <span class="badge ${statusClass(plant.status)}">${escapeHtml(plant.status || 'Gut')}</span>
      </div>
      <div class="meta">
        <span class="badge">${escapeHtml(plant.area || 'Terrasse')}</span>
        <span class="badge">☀︎ ${escapeHtml(plant.light || 'Sonne')}</span>
        ${plant.spot ? `<span class="badge">⌖ ${escapeHtml(plant.spot)}</span>` : ''}
      </div>
      ${plant.notes ? `<p class="card-note">${escapeHtml(plant.notes)}</p>` : ''}
    </div>
  </article>`;
}

function resetForm() {
  els.form.reset();
  $('plantId').value = '';
  $('areaInput').value = 'Terrasse';
  $('lightInput').value = 'Sonne';
  $('statusInput').value = 'Gut';
  currentPhoto = null;
  renderPhoto();
  els.deleteBtn.classList.add('hidden');
  $('dialogTitle').textContent = 'Pflanze hinzufügen';
  updateTip();
}

function openAdd() {
  resetForm();
  els.dialog.showModal();
  requestAnimationFrame(() => $('nameInput').focus());
}

async function openEdit(id) {
  const plant = await getPlant(id);
  if (!plant) return;

  $('plantId').value = plant.id;
  $('nameInput').value = plant.name || '';
  $('botanicalInput').value = plant.botanical || '';
  $('areaInput').value = plant.area || 'Terrasse';
  $('spotInput').value = plant.spot || '';
  $('lightInput').value = plant.light || 'Sonne';
  $('statusInput').value = plant.status || 'Gut';
  $('potInput').value = plant.pot || '';
  $('wateringInput').value = plant.watering || '';
  $('fertilizingInput').value = plant.fertilizing || '';
  $('winterInput').value = plant.winter || '';
  $('notesInput').value = plant.notes || '';
  $('gardenerInput').value = plant.gardener || '';

  currentPhoto = plant.photoDataUrl || null;
  renderPhoto();
  els.deleteBtn.classList.remove('hidden');
  $('dialogTitle').textContent = 'Pflanze bearbeiten';
  updateTip();
  els.dialog.showModal();
}

function renderPhoto() {
  els.photoPreview.innerHTML = currentPhoto
    ? `<img src="${currentPhoto}" alt="Foto-Vorschau">`
    : '<span aria-hidden="true">📷</span>';
}

function updateTip() {
  els.tipText.textContent = gardenerTip({
    area: $('areaInput').value,
    light: $('lightInput').value,
    status: $('statusInput').value
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('not-image');
  const source = await fileToDataUrl(file);
  const img = await loadImage(source);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('nameInput').value.trim();
  if (!name) return;

  try {
    const now = new Date().toISOString();
    const oldId = $('plantId').value;
    const existing = oldId ? await getPlant(oldId) : null;

    const plant = {
      id: oldId || crypto.randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      name,
      botanical: $('botanicalInput').value.trim(),
      area: $('areaInput').value,
      spot: $('spotInput').value.trim(),
      light: $('lightInput').value,
      status: $('statusInput').value,
      pot: $('potInput').value.trim(),
      watering: $('wateringInput').value.trim(),
      fertilizing: $('fertilizingInput').value.trim(),
      winter: $('winterInput').value.trim(),
      notes: $('notesInput').value.trim(),
      gardener: $('gardenerInput').value.trim(),
      photoDataUrl: currentPhoto
    };

    await putPlant(plant);
    els.dialog.close();
    toast('Pflanze gespeichert');
    await refresh();
  } catch (error) {
    console.error(error);
    toast('Speichern fehlgeschlagen');
  }
});

$('photoInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    currentPhoto = await compressImage(file);
    renderPhoto();
    toast('Foto übernommen');
  } catch (error) {
    console.error(error);
    toast('Foto konnte nicht verarbeitet werden');
  } finally {
    event.target.value = '';
  }
});

$('removePhotoBtn').addEventListener('click', () => {
  currentPhoto = null;
  renderPhoto();
});

['areaInput', 'lightInput', 'statusInput'].forEach((id) => {
  $(id).addEventListener('change', updateTip);
});

$('deletePlantBtn').addEventListener('click', async () => {
  const id = $('plantId').value;
  if (!id) return;
  if (!confirm('Diese Pflanze wirklich löschen?')) return;
  try {
    await deletePlant(id);
    els.dialog.close();
    toast('Pflanze gelöscht');
    await refresh();
  } catch (error) {
    console.error(error);
    toast('Löschen fehlgeschlagen');
  }
});

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

$('addPlantBtn').addEventListener('click', openAdd);
$('emptyAddBtn').addEventListener('click', openAdd);
$('fabBtn').addEventListener('click', openAdd);
$('closeDialogBtn').addEventListener('click', () => els.dialog.close());
$('cancelBtn').addEventListener('click', () => els.dialog.close());
$('settingsBtn').addEventListener('click', () => els.dataDialog.showModal());
$('closeDataBtn').addEventListener('click', () => els.dataDialog.close());
els.search.addEventListener('input', refresh);

els.grid.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('plant-card')) {
    event.preventDefault();
    openEdit(event.target.dataset.id);
  }
});

document.querySelectorAll('.chip').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    refresh();
  });
});

$('exportBtn').addEventListener('click', async () => {
  try {
    const all = await getAllPlants();
    const payload = {
      app: 'Pflanzen Datenbank',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      plants: all
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pflanzen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup exportiert');
  } catch (error) {
    console.error(error);
    toast('Backup konnte nicht erstellt werden');
  }
});

$('importInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.plants)) throw new Error('invalid-backup');

    const validPlants = parsed.plants.filter((plant) => plant && typeof plant.id === 'string' && typeof plant.name === 'string' && plant.name.trim());
    if (!validPlants.length && parsed.plants.length) throw new Error('no-valid-plants');

    for (const plant of validPlants) {
      await putPlant(plant);
    }

    els.dataDialog.close();
    await refresh();
    toast(`${validPlants.length} ${validPlants.length === 1 ? 'Pflanze' : 'Pflanzen'} importiert`);
  } catch (error) {
    console.error(error);
    toast('Backup-Datei ist ungültig');
  } finally {
    event.target.value = '';
  }
});

(async function init() {
  try {
    db = await openDB();
    await refresh();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service Worker:', error));
    }
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<main style="padding:30px"><h1>Die lokale Datenbank konnte nicht geöffnet werden.</h1><p>Bitte öffne die App nicht im privaten Browsermodus und prüfe, ob lokale Speicherung erlaubt ist.</p></main>';
  }
})();
