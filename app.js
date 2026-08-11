const DB_NAME = 'pflanzen-db';
const DB_VERSION = 1;
const STORE = 'plants';
let db;
let currentPhoto = null;
let activeFilter = 'all';
let activeSection = 'owned';
let plantsCache = [];
let assistantPlantId = null;

const $ = (id) => document.getElementById(id);
const els = {
  grid: $('plantGrid'), empty: $('emptyState'), count: $('plantCount'), search: $('searchInput'),
  dialog: $('plantDialog'), form: $('plantForm'), dataDialog: $('dataDialog'), assistantDialog: $('assistantDialog'),
  photoPreview: $('photoPreview'), tipText: $('generatedTipText'), deleteBtn: $('deletePlantBtn'), toast: $('toast')
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function txStore(mode = 'readonly') { return db.transaction(STORE, mode).objectStore(STORE); }
function getAllPlants() { return new Promise((resolve, reject) => { const req = txStore().getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); }); }
function getPlant(id) { return new Promise((resolve, reject) => { const req = txStore().get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
function putPlant(plant) { return new Promise((resolve, reject) => { const req = txStore('readwrite').put(plant); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); }); }
function deletePlant(id) { return new Promise((resolve, reject) => { const req = txStore('readwrite').delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); }); }

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function statusClass(status) { return status === 'Achtung' ? 'alert' : status === 'Beobachten' ? 'warn' : ''; }
function lifespanLabel(value) { return value === 'einjaehrig' ? 'Einjährig' : value === 'mehrjaehrig' ? 'Mehrjährig' : 'Lebensdauer offen'; }
function winterLabel(value) { return ({winterhart:'Draußen winterhart',frostfrei:'Frostfrei',drinnen:'Drinnen überwintern','nicht-noetig':'Nicht nötig',unbekannt:'Überwinterung offen'})[value || 'unbekannt']; }
function priorityLabel(value) { return value === 'hoch' ? '⭐ Unbedingt' : value === 'niedrig' ? 'Vielleicht' : 'Merken'; }
function normalizedCollection(plant) { return plant.collection === 'wishlist' ? 'wishlist' : 'owned'; }

function gardenerTip(plant) {
  const tips = [];
  if (plant.status === 'Achtung') tips.push('Kontrolliere zuerst die Feuchtigkeit im Wurzelballen, Blattunterseiten auf Schädlinge und ob Wasser im Übertopf steht.');
  else if (plant.status === 'Beobachten') tips.push('Beobachte einige Tage unter gleichen Bedingungen und ändere nicht mehrere Pflegefaktoren gleichzeitig.');
  if (plant.area === 'Terrasse' && plant.light === 'Sonne') tips.push('Bei sonnigem Kübelstandort im Sommer morgens gießen und an heißen, windigen Tagen die Feuchte abends zusätzlich prüfen.');
  else if (plant.area === 'Terrasse' && plant.light === 'Schatten') tips.push('Im Schatten verdunstet Wasser langsamer; vor dem Gießen immer die Substratfeuchte prüfen.');
  else if (plant.area === 'Terrasse' && plant.light === 'Halbschatten') tips.push('Im Halbschatten einige Zentimeter tief prüfen, ob das Substrat noch feucht ist.');
  else if (plant.area === 'Wohnung' && plant.light === 'Sonne') tips.push('Hinter Fensterglas kann starke Mittagssonne Blätter verbrennen. Hitzestau und helle Blattflecken im Blick behalten.');
  else if (plant.area === 'Wohnung' && plant.light === 'Hell, indirekt') tips.push('Ein heller Platz ohne harte Mittagssonne ist für viele Zimmerpflanzen ideal; gelegentliches Drehen sorgt für gleichmäßigen Wuchs.');
  if (plant.lifespan === 'mehrjaehrig' && plant.winterType === 'unbekannt') tips.push('Bei einer mehrjährigen Pflanze lohnt es sich, die Überwinterung vor dem ersten Frost zu klären.');
  if (!tips.length) tips.push('Gieße lieber nach tatsächlicher Substratfeuchte als nach Kalender und kontrolliere regelmäßig Blätter, Triebe und Topfunterseite.');
  return tips.join(' ');
}

function setSection(section) {
  activeSection = section;
  activeFilter = 'all';
  els.search.value = '';
  $('winterFilter').value = 'all';
  $('lifespanFilter').value = 'all';
  document.querySelectorAll('.section-tab').forEach(b => b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  const wishlist = section === 'wishlist';
  $('pageTitle').textContent = wishlist ? 'Für später' : 'Meine Pflanzen';
  $('heroIcon').textContent = wishlist ? '♡' : '🌿';
  $('heroTitle').textContent = wishlist ? 'Pflanzen für später merken' : 'Alles Wichtige an einem Ort';
  $('heroText').textContent = wishlist ? 'Ideen fürs nächste Jahr sammeln, vergleichen und später mit einem Tipp in „Meine Pflanzen“ übernehmen.' : 'Fotos, Standort, Pflege und Beobachtungen zu deinen Pflanzen – lokal auf diesem Gerät gespeichert.';
  $('addPlantBtn').textContent = wishlist ? '＋ Pflanze vormerken' : '＋ Pflanze hinzufügen';
  $('ownedFilters').classList.toggle('hidden', wishlist);
  $('emptyIcon').textContent = wishlist ? '🌱' : '🪴';
  $('emptyTitle').textContent = wishlist ? 'Noch keine Wunschpflanzen' : 'Noch keine Pflanzen';
  $('emptyText').textContent = wishlist ? 'Merke dir Pflanzen, die du vielleicht im nächsten Jahr pflanzen möchtest.' : 'Lege deine erste Pflanze an. Ein Name reicht – alles Weitere kannst du später ergänzen.';
  $('emptyAddBtn').textContent = wishlist ? 'Erste Pflanze vormerken' : 'Erste Pflanze anlegen';
  refresh();
}

async function refresh() {
  plantsCache = await getAllPlants();
  plantsCache.sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const sectionPlants = plantsCache.filter(p => normalizedCollection(p) === activeSection);
  const query = els.search.value.trim().toLowerCase();
  const winterFilter = $('winterFilter').value;
  const lifespanFilter = $('lifespanFilter').value;
  const filtered = sectionPlants.filter(plant => {
    const haystack = [plant.name,plant.botanical,plant.area,plant.spot,plant.light,plant.status,plant.notes,plant.gardener,plant.watering,plant.fertilizing,plant.winter,plant.pot,plant.plannedSpot,plant.wishReason,plant.plannedYear,lifespanLabel(plant.lifespan),winterLabel(plant.winterType)].filter(Boolean).join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (activeSection === 'owned') {
      if (activeFilter !== 'all' && !(activeFilter === 'Achtung' ? ['Achtung','Beobachten'].includes(plant.status) : plant.area === activeFilter)) return false;
      if (winterFilter !== 'all' && (plant.winterType || 'unbekannt') !== winterFilter) return false;
      if (lifespanFilter !== 'all' && (plant.lifespan || 'unbekannt') !== lifespanFilter) return false;
    }
    return true;
  });
  const noun = activeSection === 'wishlist' ? (sectionPlants.length === 1 ? 'Wunschpflanze' : 'Wunschpflanzen') : (sectionPlants.length === 1 ? 'Pflanze' : 'Pflanzen');
  els.count.textContent = `${sectionPlants.length} ${noun} gespeichert`;
  const hasFilters = query || (activeSection === 'owned' && (activeFilter !== 'all' || winterFilter !== 'all' || lifespanFilter !== 'all'));
  els.empty.classList.toggle('hidden', sectionPlants.length > 0 || hasFilters);
  els.grid.innerHTML = filtered.map(cardHtml).join('');
  if (!filtered.length && sectionPlants.length) els.grid.innerHTML = '<div class="empty-state result-empty"><div class="empty-plant">🔎</div><h2>Nichts gefunden</h2><p>Ändere Suche oder Filter.</p></div>';
  document.querySelectorAll('.plant-card').forEach(card => card.addEventListener('click', e => { if (!e.target.closest('.card-action')) openEdit(card.dataset.id); }));
  document.querySelectorAll('.move-owned').forEach(btn => btn.addEventListener('click', async e => { e.stopPropagation(); await moveToOwned(btn.dataset.id); }));
}

function cardHtml(plant) {
  const photo = plant.photoDataUrl ? `<img src="${plant.photoDataUrl}" alt="${escapeHtml(plant.name)}">` : '🪴';
  const wishlist = normalizedCollection(plant) === 'wishlist';
  if (wishlist) return `<article class="plant-card" data-id="${escapeHtml(plant.id)}" tabindex="0" role="button" aria-label="${escapeHtml(plant.name)} bearbeiten"><div class="card-photo">${photo}</div><div class="card-body"><div class="card-title-row"><div><h3>${escapeHtml(plant.name)}</h3><div class="botanical">${escapeHtml(plant.botanical || ' ')}</div></div><span class="badge wish">${escapeHtml(priorityLabel(plant.wishPriority))}</span></div><div class="meta"><span class="badge">${escapeHtml(lifespanLabel(plant.lifespan))}</span>${plant.plannedYear ? `<span class="badge">📅 ${escapeHtml(plant.plannedYear)}</span>` : ''}${plant.plannedSpot ? `<span class="badge">⌖ ${escapeHtml(plant.plannedSpot)}</span>` : ''}</div>${plant.wishReason ? `<p class="card-note">${escapeHtml(plant.wishReason)}</p>` : ''}<button class="secondary wide card-action move-owned" type="button" data-id="${escapeHtml(plant.id)}">✓ Jetzt eingepflanzt</button></div></article>`;
  return `<article class="plant-card" data-id="${escapeHtml(plant.id)}" tabindex="0" role="button" aria-label="${escapeHtml(plant.name)} bearbeiten"><div class="card-photo">${photo}</div><div class="card-body"><div class="card-title-row"><div><h3>${escapeHtml(plant.name)}</h3><div class="botanical">${escapeHtml(plant.botanical || ' ')}</div></div><span class="badge ${statusClass(plant.status)}">${escapeHtml(plant.status || 'Gut')}</span></div><div class="meta"><span class="badge">${escapeHtml(plant.area || 'Terrasse')}</span><span class="badge">☀︎ ${escapeHtml(plant.light || 'Sonne')}</span><span class="badge">${escapeHtml(lifespanLabel(plant.lifespan))}</span><span class="badge">❄︎ ${escapeHtml(winterLabel(plant.winterType))}</span>${plant.spot ? `<span class="badge">⌖ ${escapeHtml(plant.spot)}</span>` : ''}</div>${plant.notes ? `<p class="card-note">${escapeHtml(plant.notes)}</p>` : ''}</div></article>`;
}

function toggleFormMode(collection) {
  const wishlist = collection === 'wishlist';
  $('collectionInput').value = collection;
  document.querySelectorAll('.owned-only').forEach(el => el.classList.toggle('hidden', wishlist));
  document.querySelectorAll('.wishlist-only').forEach(el => el.classList.toggle('hidden', !wishlist));
  $('generatedTipBox').classList.toggle('hidden', wishlist);
}
function resetForm() {
  els.form.reset(); $('plantId').value=''; currentPhoto=null; renderPhoto(); els.deleteBtn.classList.add('hidden');
  $('areaInput').value='Terrasse'; $('lightInput').value='Sonne'; $('statusInput').value='Gut'; $('lifespanInput').value='unbekannt'; $('winterTypeInput').value='unbekannt'; $('wishPriorityInput').value='normal';
  toggleFormMode(activeSection); $('dialogTitle').textContent = activeSection === 'wishlist' ? 'Pflanze vormerken' : 'Pflanze hinzufügen'; updateTip();
}
function openAdd() { resetForm(); els.dialog.showModal(); requestAnimationFrame(() => $('nameInput').focus()); }
async function openEdit(id) {
  const plant = await getPlant(id); if (!plant) return;
  const collection = normalizedCollection(plant); toggleFormMode(collection);
  $('plantId').value=plant.id; $('nameInput').value=plant.name||''; $('botanicalInput').value=plant.botanical||''; $('lifespanInput').value=plant.lifespan||'unbekannt'; $('notesInput').value=plant.notes||'';
  $('areaInput').value=plant.area||'Terrasse'; $('spotInput').value=plant.spot||''; $('lightInput').value=plant.light||'Sonne'; $('statusInput').value=plant.status||'Gut'; $('potInput').value=plant.pot||''; $('wateringInput').value=plant.watering||''; $('fertilizingInput').value=plant.fertilizing||''; $('winterInput').value=plant.winter||''; $('winterTypeInput').value=plant.winterType||'unbekannt'; $('gardenerInput').value=plant.gardener||'';
  $('plannedSpotInput').value=plant.plannedSpot||''; $('plannedYearInput').value=plant.plannedYear||''; $('wishPriorityInput').value=plant.wishPriority||'normal'; $('wishReasonInput').value=plant.wishReason||'';
  currentPhoto=plant.photoDataUrl||null; renderPhoto(); els.deleteBtn.classList.remove('hidden'); $('dialogTitle').textContent = collection === 'wishlist' ? 'Wunschpflanze bearbeiten' : 'Pflanze bearbeiten'; updateTip(); els.dialog.showModal();
}
function renderPhoto(){ els.photoPreview.innerHTML=currentPhoto?`<img src="${currentPhoto}" alt="Foto-Vorschau">`:'<span aria-hidden="true">📷</span>'; }
function updateTip(){ els.tipText.textContent=gardenerTip({area:$('areaInput').value,light:$('lightInput').value,status:$('statusInput').value,lifespan:$('lifespanInput').value,winterType:$('winterTypeInput').value}); }

function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
async function compressImage(file){if(!file.type.startsWith('image/'))throw new Error('not-image');const source=await fileToDataUrl(file);const img=await loadImage(source);const maxSide=1400;const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.82);}

els.form.addEventListener('submit', async event => {
  event.preventDefault(); const name=$('nameInput').value.trim(); if(!name)return;
  try { const now=new Date().toISOString(); const oldId=$('plantId').value; const existing=oldId?await getPlant(oldId):null; const collection=$('collectionInput').value;
    const plant={...(existing||{}),id:oldId||crypto.randomUUID(),createdAt:existing?.createdAt||now,updatedAt:now,collection,name,botanical:$('botanicalInput').value.trim(),lifespan:$('lifespanInput').value,notes:$('notesInput').value.trim(),photoDataUrl:currentPhoto};
    if(collection==='wishlist'){Object.assign(plant,{plannedSpot:$('plannedSpotInput').value.trim(),plannedYear:$('plannedYearInput').value.trim(),wishPriority:$('wishPriorityInput').value,wishReason:$('wishReasonInput').value.trim()});}
    else {Object.assign(plant,{area:$('areaInput').value,spot:$('spotInput').value.trim(),light:$('lightInput').value,status:$('statusInput').value,pot:$('potInput').value.trim(),watering:$('wateringInput').value.trim(),fertilizing:$('fertilizingInput').value.trim(),winter:$('winterInput').value.trim(),winterType:$('winterTypeInput').value,gardener:$('gardenerInput').value.trim()});}
    await putPlant(plant); els.dialog.close(); toast('Pflanze gespeichert'); await refresh();
  } catch(error){console.error(error);toast('Speichern fehlgeschlagen');}
});

async function moveToOwned(id){ const plant=await getPlant(id); if(!plant)return; plant.collection='owned'; plant.area=plant.area||'Terrasse'; plant.status=plant.status||'Gut'; plant.light=plant.light||'Sonne'; plant.winterType=plant.winterType||'unbekannt'; plant.updatedAt=new Date().toISOString(); await putPlant(plant); toast('Zu „Meine Pflanzen“ verschoben'); await refresh(); }

$('photoInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{currentPhoto=await compressImage(file);renderPhoto();toast('Foto übernommen');}catch(error){console.error(error);toast('Foto konnte nicht verarbeitet werden');}finally{e.target.value='';}});
$('removePhotoBtn').addEventListener('click',()=>{currentPhoto=null;renderPhoto();});
['areaInput','lightInput','statusInput','lifespanInput','winterTypeInput'].forEach(id=>$(id).addEventListener('change',updateTip));
$('deletePlantBtn').addEventListener('click',async()=>{const id=$('plantId').value;if(!id||!confirm('Diese Pflanze wirklich löschen?'))return;try{await deletePlant(id);els.dialog.close();toast('Pflanze gelöscht');await refresh();}catch(error){console.error(error);toast('Löschen fehlgeschlagen');}});

function toast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove('show'),2200);}
$('addPlantBtn').addEventListener('click',openAdd); $('emptyAddBtn').addEventListener('click',openAdd); $('fabBtn').addEventListener('click',openAdd); $('closeDialogBtn').addEventListener('click',()=>els.dialog.close()); $('cancelBtn').addEventListener('click',()=>els.dialog.close()); $('settingsBtn').addEventListener('click',()=>els.dataDialog.showModal()); $('closeDataBtn').addEventListener('click',()=>els.dataDialog.close()); els.search.addEventListener('input',refresh);
$('winterFilter').addEventListener('change',refresh); $('lifespanFilter').addEventListener('change',refresh);
document.querySelectorAll('.section-tab').forEach(b=>b.addEventListener('click',()=>setSection(b.dataset.section)));
document.querySelectorAll('.chip').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.chip').forEach(i=>i.classList.remove('active'));button.classList.add('active');activeFilter=button.dataset.filter;refresh();}));
els.grid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('plant-card')){e.preventDefault();openEdit(e.target.dataset.id);}});

function formSnapshot(){return {id:$('plantId').value||null,collection:$('collectionInput').value,name:$('nameInput').value.trim(),botanical:$('botanicalInput').value.trim(),lifespan:$('lifespanInput').value,area:$('areaInput').value,status:$('statusInput').value,spot:$('spotInput').value.trim(),light:$('lightInput').value,pot:$('potInput').value.trim(),watering:$('wateringInput').value.trim(),fertilizing:$('fertilizingInput').value.trim(),winterType:$('winterTypeInput').value,winter:$('winterInput').value.trim(),notes:$('notesInput').value.trim(),gardener:$('gardenerInput').value.trim(),plannedSpot:$('plannedSpotInput').value.trim(),plannedYear:$('plannedYearInput').value.trim(),wishReason:$('wishReasonInput').value.trim()};}
function buildPrompt(plant,question){
  const context=JSON.stringify(plant,null,2);
  return `Du bist mein erfahrener Gärtner und hilfst mir bei My Plant Paradise, meiner privaten Pflanzen-Datenbank. Antworte auf Deutsch, praktisch und knapp. Berücksichtige, dass die Pflanze in Deutschland gehalten wird.\n\nPFLANZEN-DATEN:\n${context}\n\nMEINE FRAGE:\n${question}\n\nWichtig: Gib zuerst deine normale verständliche Antwort. Wenn sich aus deiner Antwort verlässliche Ergänzungen oder Korrekturen für den Pflanzen-Steckbrief ergeben, hänge am Ende GENAU diesen Block an. Nutze nur Felder, die du wirklich sinnvoll ergänzen kannst, und erfinde nichts.\n---PFLANZEN_UPDATE_START---\n{\n  "botanical": "",\n  "lifespan": "unbekannt|einjaehrig|mehrjaehrig",\n  "watering": "",\n  "fertilizing": "",\n  "winterType": "unbekannt|winterhart|frostfrei|drinnen|nicht-noetig",\n  "winter": "",\n  "gardener": "",\n  "notesAppend": "",\n  "plannedSpot": "",\n  "wishReasonAppend": ""\n}\n---PFLANZEN_UPDATE_ENDE---\nLasse Felder, die nicht ergänzt werden sollen, als leeren String stehen. Verändere Name, Standort oder Zustand nicht automatisch.`;
}
function extractUpdate(answer){const start='---PFLANZEN_UPDATE_START---',end='---PFLANZEN_UPDATE_ENDE---';const a=answer.indexOf(start),b=answer.indexOf(end);if(a<0||b<a)return null;let raw=answer.slice(a+start.length,b).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(raw);}
async function copyText(text){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}

$('askPlantBtn').addEventListener('click',()=>{assistantPlantId=$('plantId').value||null;$('questionInput').value='';$('answerInput').value='';$('assistantStatus').textContent='';els.assistantDialog.showModal();});
$('closeAssistantBtn').addEventListener('click',()=>els.assistantDialog.close());
$('copyPromptBtn').addEventListener('click',async()=>{const q=$('questionInput').value.trim();if(!q){toast('Bitte zuerst eine Frage eingeben');return;}try{await copyText(buildPrompt(formSnapshot(),q));$('assistantStatus').textContent='Frage kopiert. Jetzt ChatGPT öffnen und dort einfügen.';toast('Frage kopiert');}catch(e){console.error(e);toast('Kopieren fehlgeschlagen');}});
$('openChatGPTBtn').addEventListener('click',()=>{window.open('https://chatgpt.com/','_blank','noopener');});
$('applyAnswerBtn').addEventListener('click',async()=>{const answer=$('answerInput').value.trim();if(!answer){toast('Bitte Antwort einfügen');return;}try{const update=extractUpdate(answer);if(!update){$('assistantStatus').textContent='Kein Datenblock erkannt. Die Antwort wurde nicht automatisch verändert.';toast('Keine Steckbrief-Daten erkannt');return;}let changed=[];const set=(id,key,allowed)=>{const value=update[key];if(typeof value!=='string'||!value.trim())return;if(allowed&&!allowed.includes(value))return;$(id).value=value.trim();changed.push(key);};set('botanicalInput','botanical');set('lifespanInput','lifespan',['unbekannt','einjaehrig','mehrjaehrig']);if($('collectionInput').value==='owned'){set('wateringInput','watering');set('fertilizingInput','fertilizing');set('winterTypeInput','winterType',['unbekannt','winterhart','frostfrei','drinnen','nicht-noetig']);set('winterInput','winter');set('gardenerInput','gardener');}if(typeof update.notesAppend==='string'&&update.notesAppend.trim()){const old=$('notesInput').value.trim();$('notesInput').value=old?`${old}\n\n${update.notesAppend.trim()}`:update.notesAppend.trim();changed.push('notes');}if($('collectionInput').value==='wishlist'){set('plannedSpotInput','plannedSpot');if(typeof update.wishReasonAppend==='string'&&update.wishReasonAppend.trim()){const oldWish=$('wishReasonInput').value.trim();$('wishReasonInput').value=oldWish?`${oldWish}\n\n${update.wishReasonAppend.trim()}`:update.wishReasonAppend.trim();changed.push('wishReason');}}updateTip();els.assistantDialog.close();if(changed.length&&$('plantId').value){els.form.requestSubmit();}else{toast(changed.length?'Antwort in Steckbrief übernommen – bitte noch speichern':'Keine neuen Daten zu übernehmen');}}catch(e){console.error(e);$('assistantStatus').textContent='Der Datenblock konnte nicht gelesen werden. Bitte die komplette ChatGPT-Antwort kopieren.';toast('Antwort konnte nicht ausgewertet werden');}});

$('exportBtn').addEventListener('click',async()=>{try{const all=await getAllPlants();const payload={app:'My Plant Paradise',schemaVersion:2,appVersion:'1.2',exportedAt:new Date().toISOString(),plants:all};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`pflanzen-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exportiert');}catch(e){console.error(e);toast('Backup konnte nicht erstellt werden');}});
$('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.plants))throw new Error('invalid');const valid=parsed.plants.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim());if(!valid.length&&parsed.plants.length)throw new Error('none');for(const p of valid){if(!p.collection)p.collection='owned';await putPlant(p);}els.dataDialog.close();await refresh();toast(`${valid.length} ${valid.length===1?'Pflanze':'Pflanzen'} importiert`);}catch(err){console.error(err);toast('Backup-Datei ist ungültig');}finally{e.target.value='';}});

(async function init(){try{db=await openDB();await refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service Worker:',e));}catch(error){console.error(error);document.body.innerHTML='<main style="padding:30px"><h1>Die lokale Datenbank konnte nicht geöffnet werden.</h1><p>Bitte öffne die App nicht im privaten Browsermodus und prüfe, ob lokale Speicherung erlaubt ist.</p></main>';}})();
