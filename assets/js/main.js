/**
 * Xolotl Canadian Shield Cooperative — Shared Platform Scripts
 * Handles Navigation, Audio Pronunciation, Modal Dialogs, Telemetry & Mailto Transmission
 */

// --- Language Helpers (EN / FR / ES) ---
const LANGS = {
  en: { dir: '' },
  fr: { dir: 'fr/' },
  es: { dir: 'es/' },
};

function getCurrentLang() {
  const path = window.location.pathname;
  if (path.includes('/fr/') || path.endsWith('/fr') || path.endsWith('/fr/')) return 'fr';
  if (path.includes('/es/') || path.endsWith('/es') || path.endsWith('/es/')) return 'es';
  return 'en';
}

function pick(strings) {
  const lang = getCurrentLang();
  return strings[lang] !== undefined ? strings[lang] : strings.en;
}

// --- Audio Playback (Calibrated Female Spanish Voice with Canadian Shield Ambience) ---
let pronounceAudio = null;

function playPronounceAudio(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const chips = document.querySelectorAll('.pronounce-chip, .meta-speaker-btn');
  chips.forEach(c => c.classList.add('playing'));

  const clearPlaying = () => {
    chips.forEach(c => c.classList.remove('playing'));
  };

  try {
    if (!pronounceAudio) {
      const audioPath = getCurrentLang() === 'en' ? 'assets/audio/xolotl_pronunciation.mp3' : '../assets/audio/xolotl_pronunciation.mp3';
      pronounceAudio = new Audio(audioPath);
      pronounceAudio.preload = 'auto';
    }
    
    pronounceAudio.currentTime = 0;
    const playPromise = pronounceAudio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          pronounceAudio.onended = clearPlaying;
          pronounceAudio.onerror = () => fallbackSpeechSynthesis(clearPlaying);
        })
        .catch(err => {
          console.warn("HTML5 audio playback restricted, using Web Speech fallback:", err);
          fallbackSpeechSynthesis(clearPlaying);
        });
    } else {
      setTimeout(clearPlaying, 3500);
    }
  } catch (err) {
    console.warn("Audio exception, falling back to Web Speech:", err);
    fallbackSpeechSynthesis(clearPlaying);
  }
}

function fallbackSpeechSynthesis(onComplete) {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance("Show lot. Canadian Shield.");
      utter.rate = 0.82;
      utter.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(v => (v.lang.includes('es-MX') || v.lang.includes('es')) && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.includes('es-MX') || v.lang.includes('es')) ||
                          voices.find(v => (v.lang.includes('en-CA') || v.lang.includes('en-US')) && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.includes('en-CA') || v.lang.includes('en-US'));
        if (preferred) utter.voice = preferred;
      }

      utter.onend = () => { if (onComplete) onComplete(); };
      utter.onerror = () => { if (onComplete) onComplete(); };
      window.speechSynthesis.speak(utter);
      return;
    } catch (e) {
      console.warn("Web Speech synthesis failed:", e);
    }
  }
  if (onComplete) setTimeout(onComplete, 3200);
}

// --- Mobile Navigation Drawer ---
function toggleMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  const btn = document.getElementById('mobileMenuBtn');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (btn) btn.classList.toggle('open');
  if (drawer.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  const btn = document.getElementById('mobileMenuBtn');
  if (drawer) drawer.classList.remove('open');
  if (btn) btn.classList.remove('open');
  document.body.style.overflow = '';
}

// --- Accordions (FAQ) ---
function toggleAccordion(btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.classList.toggle('open');
  }
}

// --- Modal Controls & Pilot Transmission ---
let currentApplicationText = '';

function openModal(type) {
  closeMobileMenu();
  if (type === 'privacy') {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.add('active');
  } else if (type === 'beta') {
    const modal = document.getElementById('betaModal');
    if (modal) {
      modal.classList.add('active');
      initBetaLocationDetection();
    }
  } else if (type === 'dispatch' || type === 'article') {
    const modal = document.getElementById('dispatchModal');
    if (modal) modal.classList.add('active');
  } else {
    const modal = document.getElementById('pilotModal');
    if (modal) {
      modal.classList.add('active');
      // Restore saved draft/inputs if available
      try {
        const saved = localStorage.getItem('xolotl_pilot_application');
        if (saved) {
          const data = JSON.parse(saved);
          const oInput = document.getElementById('oName');
          const wInput = document.getElementById('wEmail');
          const pInput = document.getElementById('pNotes');
          if (oInput && !oInput.value && data.org) oInput.value = data.org;
          if (wInput && !wInput.value && data.email) wInput.value = data.email;
          if (pInput && !pInput.value && data.notes) pInput.value = data.notes;
        }
      } catch (e) {}
    }
  }
}

function closeModal() {
  const pilot = document.getElementById('pilotModal');
  const priv = document.getElementById('privacyModal');
  const beta = document.getElementById('betaModal');
  const dispatch = document.getElementById('dispatchModal');
  if (pilot) pilot.classList.remove('active');
  if (priv) priv.classList.remove('active');
  if (beta) beta.classList.remove('active');
  if (dispatch) dispatch.classList.remove('active');
}

function handleBackdrop(e) {
  if (e && (e.target.id === 'pilotModal' || e.target.id === 'privacyModal' || e.target.id === 'betaModal' || e.target.id === 'dispatchModal')) {
    closeModal();
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  const org = (document.getElementById('oName')?.value || '').trim();
  const email = (document.getElementById('wEmail')?.value || '').trim();
  const sectorSelect = document.getElementById('iSector');
  const sector = sectorSelect ? sectorSelect.options[sectorSelect.selectedIndex].text : pick({ en: 'General Enterprise', fr: 'Entreprise Générale', es: 'Empresa General' });
  const notes = (document.getElementById('pNotes')?.value || '').trim();
  const timestamp = new Date().toUTCString();

  // Populate Visual Receipt
  const rOrg = document.getElementById('rOrg');
  const rEmail = document.getElementById('rEmail');
  const rSector = document.getElementById('rSector');
  const rNotes = document.getElementById('rNotes');
  const rNotesRow = document.getElementById('rNotesRow');

  const notSpecified = pick({ en: 'Not specified', fr: 'Non spécifié', es: 'No especificado' });
  if (rOrg) rOrg.innerText = org || notSpecified;
  if (rEmail) rEmail.innerText = email || notSpecified;
  if (rSector) rSector.innerText = sector;
  if (rNotesRow && rNotes) {
    if (notes) {
      rNotes.innerText = notes;
      rNotesRow.style.display = 'block';
    } else {
      rNotesRow.style.display = 'none';
    }
  }

  // Build structured email payload
  const subject = pick({
    en: `Institutional Pilot Application: ${org}`,
    fr: `Demande de Pilote Institutionnel : ${org}`,
    es: `Solicitud de Piloto Institucional: ${org}`,
  });
  const emailBody = 
`INSTITUTIONAL PILOT APPLICATION // XOLOTL CANADIAN SHIELD
=========================================================

Organization:   ${org}
Contact Email:  ${email}
Target Sector:  ${sector}
Submitted At:   ${timestamp}

Residency / Topology / Deployment Parameters:
---------------------------------------------
${notes || 'Standard 3-of-5 threshold topology deployment requested.'}

---------------------------------------------
Direct Routing: cooperate@xolotl.ca
Portal: https://xolotl.ca`;

  currentApplicationText = emailBody;
  const mailtoUrl = `mailto:cooperate@xolotl.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  
  const mailBtn = document.getElementById('pMailtoBtn');
  if (mailBtn) {
    mailBtn.href = mailtoUrl;
  }

  // Persist to localStorage
  try {
    localStorage.setItem('xolotl_pilot_application', JSON.stringify({
      org, email, sector, notes, timestamp
    }));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }

  // Display Receipt Card
  const pForm = document.getElementById('pForm');
  const pSuccess = document.getElementById('pSuccess');
  if (pForm) pForm.style.display = 'none';
  if (pSuccess) pSuccess.style.display = 'block';

  // Automatically launch default email client
  try {
    const tempLink = document.createElement('a');
    tempLink.href = mailtoUrl;
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);
    tempLink.click();
    setTimeout(() => tempLink.remove(), 1000);
  } catch (err) {
    console.warn('Auto mailto invocation deferred to user click:', err);
  }
}

function copyApplicationDetails() {
  if (!currentApplicationText) return;
  navigator.clipboard.writeText(currentApplicationText).then(() => {
    const btn = document.getElementById('pCopyBtn');
    if (btn) {
      const origText = btn.innerHTML;
      btn.innerHTML = pick({ en: '✓ Copied to Clipboard!', fr: '✓ Copié dans le presse-papiers !', es: '✓ ¡Copiado al Portapapeles!' });
      btn.style.borderColor = 'var(--accent-sage)';
      btn.style.color = 'var(--accent-sage)';
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2500);
    }
  }).catch(() => {
    alert('Please select and copy the text inside the submission receipt box.');
  });
}

function editApplicationDetails() {
  const pForm = document.getElementById('pForm');
  const pSuccess = document.getElementById('pSuccess');
  if (pSuccess) pSuccess.style.display = 'none';
  if (pForm) pForm.style.display = 'block';
}

// --- Supabase & Sovereign Beta Waitlist Integration ---
const XOLOTL_SUPABASE = {
  url: (window.XOLOTL_SUPABASE_CONFIG && window.XOLOTL_SUPABASE_CONFIG.url) || 'https://zqaitwxasunttgvxbnga.supabase.co',
  anonKey: (window.XOLOTL_SUPABASE_CONFIG && window.XOLOTL_SUPABASE_CONFIG.anonKey) || 'sb_publishable_NPuIZJCjr0ZXuDw8Q5JvJQ_COfyQ2LS',
  tableName: 'beta_signups'
};

let detectedGeo = {
  city: '',
  region: '',
  country: '',
  countryCode: '',
  latitude: null,
  longitude: null,
  timezone: '',
  isCoarse: true
};

let currentBetaBadgeText = '';

function initBetaLocationDetection() {
  // 1. Passive Timezone Detection (zero-permission, privacy-respecting)
  try {
    detectedGeo.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (e) {}

  const locInput = document.getElementById('bLocation');
  const geoStatus = document.getElementById('bGeoStatus');

  if (locInput && locInput.value.trim().length > 0) return;

  if (geoStatus) {
    geoStatus.innerText = pick({
      en: 'Detecting regional node...',
      fr: 'Détection du nœud régional...',
      es: 'Detectando nodo regional...'
    });
  }

  // 2. Coarse IP-based reverse geo lookup (privacy-friendly, non-invasive)
  fetch('https://freeipapi.com/api/json')
    .then(res => {
      if (!res.ok) throw new Error('Geo API failed');
      return res.json();
    })
    .then(data => {
      if (data && data.cityName) {
        detectedGeo.city = data.cityName || '';
        detectedGeo.region = data.regionName || '';
        detectedGeo.country = data.countryName || '';
        detectedGeo.countryCode = data.countryCode || '';
        if (data.latitude && data.longitude) {
          detectedGeo.latitude = Number(Number(data.latitude).toFixed(2));
          detectedGeo.longitude = Number(Number(data.longitude).toFixed(2));
        }

        const formatted = [detectedGeo.city, detectedGeo.region, detectedGeo.country].filter(Boolean).join(', ');
        if (locInput && !locInput.value) {
          locInput.value = formatted + (detectedGeo.countryCode === 'CA' ? ' 🍁' : '');
        }

        if (geoStatus) {
          geoStatus.innerHTML = pick({
            en: `✓ Node Region: <strong>${detectedGeo.city || detectedGeo.country}</strong>`,
            fr: `✓ Région du Nœud : <strong>${detectedGeo.city || detectedGeo.country}</strong>`,
            es: `✓ Región del Nodo: <strong>${detectedGeo.city || detectedGeo.country}</strong>`
          });
        }
      }
    })
    .catch(() => {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.city) {
            detectedGeo.city = data.city || '';
            detectedGeo.region = data.region || '';
            detectedGeo.country = data.country_name || '';
            detectedGeo.countryCode = data.country_code || '';
            if (data.latitude && data.longitude) {
              detectedGeo.latitude = Number(Number(data.latitude).toFixed(3));
              detectedGeo.longitude = Number(Number(data.longitude).toFixed(3));
            }
            const formatted = [detectedGeo.city, detectedGeo.region, detectedGeo.country].filter(Boolean).join(', ');
            if (locInput && !locInput.value) {
              locInput.value = formatted + (detectedGeo.countryCode === 'CA' ? ' 🍁' : '');
            }
            if (geoStatus) {
              geoStatus.innerHTML = `✓ Node Region: <strong>${detectedGeo.city || detectedGeo.country}</strong>`;
            }
          } else {
            if (geoStatus) geoStatus.innerText = detectedGeo.timezone ? `Timezone: ${detectedGeo.timezone}` : '';
          }
        })
        .catch(() => {
          if (geoStatus) {
            geoStatus.innerText = detectedGeo.timezone ? `Zone: ${detectedGeo.timezone}` : '';
          }
        });
    });
}

function detectExactGPSLocation() {
  const geoStatus = document.getElementById('bGeoStatus');
  const locInput = document.getElementById('bLocation');

  if (!navigator.geolocation) {
    alert(pick({
      en: 'Geolocation is not supported by your browser.',
      fr: 'La géolocalisation n\'est pas prise en charge par votre navigateur.',
      es: 'La geolocalización no es compatible con su navegador.'
    }));
    return;
  }

  if (geoStatus) {
    geoStatus.innerText = pick({
      en: 'Requesting device node coordinates...',
      fr: 'Demande des coordonnées de l\'appareil...',
      es: 'Solicitando coordenadas del dispositivo...'
    });
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      // Rounded to 2 decimal places (~1.1km) before it ever leaves the browser —
      // data minimization at the source, not just at display time. 3 decimals
      // (~111m) was still precise enough to identify a specific building in a
      // low-density area; 2 decimals actually matches what the DB schema's own
      // column comment has always claimed to provide.
      detectedGeo.latitude = Number(pos.coords.latitude.toFixed(2));
      detectedGeo.longitude = Number(pos.coords.longitude.toFixed(2));
      detectedGeo.isCoarse = false;

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${detectedGeo.latitude}&lon=${detectedGeo.longitude}`)
        .then(res => res.json())
        .then(data => {
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || '';
          const state = addr.state || addr.province || '';
          const country = addr.country || '';
          detectedGeo.city = city;
          detectedGeo.region = state;
          detectedGeo.country = country;
          detectedGeo.countryCode = (addr.country_code || '').toUpperCase();

          const formatted = [city, state, country].filter(Boolean).join(', ');
          if (locInput) locInput.value = formatted + (detectedGeo.countryCode === 'CA' ? ' 🍁' : '');
          if (geoStatus) {
            geoStatus.innerHTML = pick({
              en: `✓ Node Verified: <strong>${city || country}</strong> [${detectedGeo.latitude}, ${detectedGeo.longitude}]`,
              fr: `✓ Nœud Vérifié : <strong>${city || country}</strong> [${detectedGeo.latitude}, ${detectedGeo.longitude}]`,
              es: `✓ Nodo Verificado: <strong>${city || country}</strong> [${detectedGeo.latitude}, ${detectedGeo.longitude}]`
            });
          }
        })
        .catch(() => {
          if (locInput && !locInput.value) {
            locInput.value = `Lat: ${detectedGeo.latitude}, Lon: ${detectedGeo.longitude}`;
          }
          if (geoStatus) {
            geoStatus.innerHTML = `✓ Coordinates Captured [${detectedGeo.latitude}, ${detectedGeo.longitude}]`;
          }
        });
    },
    err => {
      console.warn('Geolocation permission denied or timed out:', err);
      if (geoStatus) {
        geoStatus.innerText = pick({
          en: 'Device location skipped. Regional timezone retained.',
          fr: 'Localisation de l\'appareil ignorée. Fuseau horaire conservé.',
          es: 'Ubicación omitida. Zona horaria conservada.'
        });
      }
    },
    { timeout: 8000, maximumAge: 60000 }
  );
}

function generateNodeId(countryCode) {
  const code = (countryCode || 'CA').toUpperCase().substring(0, 2);
  const randHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `NODE-${code}-${randHex}`;
}

async function handleBetaFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('bSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = pick({
      en: 'Enlisting Node...',
      fr: 'Enrôlement du nœud...',
      es: 'Alistando nodo...'
    });
  }

  const fullName = (document.getElementById('bName')?.value || '').trim();
  const email = (document.getElementById('bEmail')?.value || '').trim();
  const platform = document.getElementById('bPlatform')?.value || 'all';
  const interestType = document.getElementById('bInterest')?.value || 'individual';
  const locationText = (document.getElementById('bLocation')?.value || '').trim();
  const notes = (document.getElementById('bNotes')?.value || '').trim();
  const lang = getCurrentLang();

  let locCity = detectedGeo.city;
  let locRegion = detectedGeo.region;
  let locCountry = detectedGeo.country;
  let locCountryCode = detectedGeo.countryCode;

  if (locationText && locationText !== `${locCity}, ${locRegion}, ${locCountry}`) {
    const parts = locationText.replace('🍁', '').split(',').map(s => s.trim());
    if (parts.length >= 2) {
      locCity = parts[0];
      locCountry = parts[parts.length - 1];
    } else if (parts.length === 1) {
      locCity = parts[0];
    }
  }

  const nodeId = generateNodeId(locCountryCode || 'CA');
  const timestamp = new Date().toISOString();

  const payload = {
    full_name: fullName,
    email: email,
    platform: platform,
    interest_type: interestType,
    city: locCity || locationText,
    region: locRegion,
    country: locCountry,
    country_code: locCountryCode,
    latitude: detectedGeo.latitude,
    longitude: detectedGeo.longitude,
    detected_timezone: detectedGeo.timezone,
    language: lang,
    notes: notes,
    node_badge_id: nodeId,
    status: 'waitlist'
  };

  // 1. Post to Supabase REST API
  let supabaseSuccess = false;
  try {
    const supabaseEndpoint = `${XOLOTL_SUPABASE.url}/rest/v1/${XOLOTL_SUPABASE.tableName}`;
    const res = await fetch(supabaseEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': XOLOTL_SUPABASE.anonKey,
        'Authorization': `Bearer ${XOLOTL_SUPABASE.anonKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok || res.status === 201) {
      supabaseSuccess = true;
    } else {
      console.warn('Supabase post response non-200:', res.status);
    }
  } catch (err) {
    console.warn('Supabase connection deferred or not configured:', err);
  }

  // 2. Persist locally to guarantee zero data loss
  try {
    const existing = JSON.parse(localStorage.getItem('xolotl_beta_signups') || '[]');
    existing.push({ ...payload, submitted_at: timestamp, synced_to_supabase: supabaseSuccess });
    localStorage.setItem('xolotl_beta_signups', JSON.stringify(existing));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 3. Render Visual Node Certificate / Badge
  const bBadgeId = document.getElementById('bBadgeId');
  const bBadgeName = document.getElementById('bBadgeName');
  const bBadgeLoc = document.getElementById('bBadgeLoc');
  const bBadgePlatform = document.getElementById('bBadgePlatform');
  const bBadgeTime = document.getElementById('bBadgeTime');

  if (bBadgeId) bBadgeId.innerText = nodeId;
  if (bBadgeName) bBadgeName.innerText = fullName;
  if (bBadgeLoc) bBadgeLoc.innerText = locationText || `${locCity || 'Bedrock'}, ${locCountry || 'Canada'}`;
  if (bBadgePlatform) bBadgePlatform.innerText = platform.toUpperCase();
  if (bBadgeTime) bBadgeTime.innerText = new Date().toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' });

  const isCanadian = locCountryCode === 'CA' || (locationText && locationText.toLowerCase().includes('canada')) || (!locationText && !locCountryCode);
  const jurisdictionNote = isCanadian ? 'Canadian Shield Bedrock (Lake Ontario, not Lake America 🍁)' : `${locCity || 'Bedrock'}, ${locCountry || 'Sovereign Node'}`;

  currentBetaBadgeText = 
`🛡️ XOLOTL CANADIAN SHIELD — SOVEREIGN BETA NODE
===================================================
Node Registry ID:   ${nodeId}
Enlisted Operator:  ${fullName}
Deployment Region:  ${locationText || locCity || 'Canadian Shield Bedrock'}
Jurisdiction:       ${jurisdictionNote}
Client Platform:    ${platform}
Verification:       Pedersen DKG / FROST Threshold Mesh
Sovereign Network:  https://xolotl.ca
===================================================
The cloud has trust issues. Your data doesn't need to. Meet the Canadian Shield.`;

  // 4. Toggle UI views
  const bForm = document.getElementById('bForm');
  const bSuccess = document.getElementById('bSuccess');
  if (bForm) bForm.style.display = 'none';
  if (bSuccess) bSuccess.style.display = 'block';

  // 5. Instantly project newly enlisted node onto live telemetry mesh
  try {
    if (typeof addLiveNodeToMesh === 'function') {
      addLiveNodeToMesh({
        id: nodeId,
        city: locCity || locationText || 'Sovereign Node',
        region: locRegion || '',
        country: locCountry || 'Canada',
        countryCode: locCountryCode || 'CA',
        lat: detectedGeo.latitude || 43.653,
        lon: detectedGeo.longitude || -79.383,
        role: interestType === 'developer' ? 'DKG Custodian Node' : (interestType === 'enterprise' ? 'Institutional Enclave' : 'Citizen Privacy Shield'),
        tier: 'shield',
        status: 'Newly Enlisted',
        isNew: true
      });
    }
  } catch (meshErr) {
    console.warn('Mesh telemetry update error:', meshErr);
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = pick({
      en: 'Enlist in the Sovereign Beta →',
      fr: 'S\'enrôler dans la Bêta Souveraine →',
      es: 'Alistarse en la Beta Soberana →'
    });
  }
}

function copyBetaNodeCertificate() {
  if (!currentBetaBadgeText) return;
  navigator.clipboard.writeText(currentBetaBadgeText).then(() => {
    const btn = document.getElementById('bCopyBtn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = pick({
        en: '✓ Certificate Copied!',
        fr: '✓ Certificat Copié !',
        es: '✓ ¡Certificado Copiado!'
      });
      btn.style.color = '#00ff66';
      btn.style.borderColor = '#00ff66';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2500);
    }
  }).catch(() => {
    alert(currentBetaBadgeText);
  });
}

function shareBetaNode(platform) {
  const badgeId = document.getElementById('bBadgeId')?.innerText || 'NODE-CA-SOVEREIGN';
  const lang = getCurrentLang();
  const url = 'https://xolotl.ca';

  if (platform === 'twitter') {
    let tweet = '';
    if (lang === 'fr') {
      tweet = `Pendant que la Big Tech capitule et que @SouthPark se rebaptise "South America", le lac Ontario demeure 100% ancré dans le socle canadien 🍁\n\nNœud souverain enrôlé [${badgeId}] dans le maillage coopératif.\n\nZéro CLOUD Act. Difficile à épeler. Impossible à contraindre.\n${url}`;
    } else if (lang === 'es') {
      tweet = `Mientras las grandes tecnológicas capitulan y @SouthPark se renombra como "South America", el lago Ontario sigue 100% en el lecho rocoso canadiense 🍁\n\nNodo soberano alistado [${badgeId}] en la red cooperativa.\n\nCero CLOUD Act. Difícil de deletrear. Imposible de coaccionar.\n${url}`;
    } else {
      tweet = `While Big Tech capitulates and @SouthPark rebrands to "South America", Lake Ontario is still 100% Canadian Shield bedrock 🍁\n\nJust enlisted my sovereign node [${badgeId}] in the cooperative mesh.\n\nZero US CLOUD Act jurisdiction. Hard to spell. Impossible to compel.\n${url}`;
    }
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    window.open(intentUrl, '_blank', 'width=600,height=450,noopener,noreferrer');
  } else if (platform === 'linkedin') {
    const intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(intentUrl, '_blank', 'width=600,height=550,noopener,noreferrer');
  }
}

// --- Cookie Consent Notice ---
function initCookie() {
  if (localStorage.getItem('xolotl_cookie_dismissed') === 'true') {
    const b = document.getElementById('cookieNotice');
    if (b) b.classList.add('hidden');
  }
}

function dismissCookieNotice() {
  localStorage.setItem('xolotl_cookie_dismissed', 'true');
  const b = document.getElementById('cookieNotice');
  if (b) b.classList.add('hidden');
}

// --- Threat Mode Simulator (Interactive Security Demo) ---
function switchThreatMode(mode) {
  const bNorm = document.getElementById('btnNorm');
  const bSubp = document.getElementById('btnSubp');
  const bRans = document.getElementById('btnRans');
  const c1 = document.getElementById('cLayer1');
  const c2 = document.getElementById('cLayer2');
  const c3 = document.getElementById('cLayer3');
  const s1 = document.getElementById('sBadge1');
  const s2 = document.getElementById('sBadge2');
  const s3 = document.getElementById('sBadge3');
  const simMessage = document.getElementById('simMessage');

  // Handle scenario pills and architecture topology cards
  if (bNorm && (bSubp || bRans)) {
    [bNorm, bSubp, bRans].forEach(b => { if (b) b.classList.remove('active'); });
    if (c1 && c2 && c3) {
      [c1, c2, c3].forEach(c => c.classList.remove('subpoena-struck', 'active-layer'));
    }

    if (mode === 'normal') {
      if (bNorm) bNorm.classList.add('active');
      if (c2) c2.classList.add('active-layer');
      if (s1) {
        s1.className = 'status-badge';
        s1.innerHTML = pick({
          en: '<span>✓ Private Mesh Operational</span>',
          fr: '<span>✓ Maillage Privé Opérationnel</span>',
          es: '<span>✓ Malla Privada Operativa</span>',
        });
      }
      if (s2) {
        s2.className = 'status-badge';
        s2.innerHTML = pick({
          en: '<span>✓ Active Sync • Plaintext in RAM Only</span>',
          fr: '<span>✓ Synchronisation Active • Texte en Clair Uniquement en RAM</span>',
          es: '<span>✓ Sincronización Activa • Texto Claro Solo en RAM</span>',
        });
      }
      if (s3) {
        s3.className = 'status-badge';
        s3.innerHTML = pick({
          en: '<span>✓ Canadian Core • WORM Vault Active</span>',
          fr: '<span>✓ Noyau Canadien • Coffre-Fort WORM Actif</span>',
          es: '<span>✓ Núcleo Canadiense • Bóveda WORM Activa</span>',
        });
      }
      if (simMessage) {
        simMessage.style.borderLeftColor = 'var(--accent-sage)';
        simMessage.innerHTML = pick({
          en: '<strong>Normal Mode:</strong> In everyday operation, files save locally with zero friction, encrypt on the fly with AES-256-GCM, and stream to Montreal S3. The cloud mirror holds zero decryption authority.',
          fr: '<strong>Mode Standard :</strong> Le moteur client chiffre chaque fichier à la volée en AES-256-GCM et diffuse le flux vers le Coffre-Fort WORM de Montréal. Le miroir infonuagique détient 0 clé et demeure mathématiquement impuissant à déchiffrer.',
          es: '<strong>Modo Estándar:</strong> En operación cotidiana, los archivos se guardan localmente sin fricción, se cifran al vuelo con AES-256-GCM y se transmiten a la Bóveda WORM de Montreal. El espejo en la nube custodia 0 claves y permanece matemáticamente impotente para descifrar.',
        });
      }
    } else if (mode === 'subpoena' || mode === 'cloudact') {
      if (bSubp) bSubp.classList.add('active');
      if (c3) c3.classList.add('subpoena-struck');
      if (s1) {
        s1.className = 'status-badge';
        s1.innerHTML = pick({
          en: '<span>✓ Sovereign Edge: Foreign Order Has No Domestic Jurisdiction</span>',
          fr: '<span>✓ Périphérie Souveraine : L\'ordonnance étrangère n\'a aucune juridiction nationale</span>',
          es: '<span>✓ Borde Soberano: La orden extranjera no tiene jurisdicción doméstica</span>',
        });
      }
      if (s2) {
        s2.className = 'status-badge';
        s2.innerHTML = pick({
          en: '<span>✓ Keys Zeroized • Ephemeral Window Closed</span>',
          fr: '<span>✓ Clés Remises à Zéro • Fenêtre Éphémère Fermée</span>',
          es: '<span>✓ Claves Puestas a Cero • Ventana Efímera Cerrada</span>',
        });
      }
      if (s3) {
        s3.className = 'status-badge alert';
        s3.innerHTML = pick({
          en: '<span>✕ CLOUD Act Served: Mirror Powerless to Produce Plaintext</span>',
          fr: '<span>✕ CLOUD Act Signifié : Le miroir est dans l\'impossibilité de produire du texte en clair</span>',
          es: '<span>✕ Citación Ley CLOUD Notificada: Espejo incapaz de producir texto claro</span>',
        });
      }
      if (simMessage) {
        simMessage.style.borderLeftColor = 'var(--accent-maple)';
        simMessage.innerHTML = pick({
          en: '<strong>Subpoena Compulsion Result:</strong> This is the exact threat from our homepage, made concrete. Federal court orders served on the S3 provider yield only high-entropy AES-256-GCM ciphertext. The provider holds 0 key shards and is mathematically powerless to comply. Subpoena defused without breach.',
          fr: '<strong>Résultat de la Citation :</strong> Voici la menace exacte de notre page d\'accueil, rendue concrète. Les ordonnances d\'un tribunal fédéral signifiées au fournisseur S3 ne donnent que du texte chiffré AES-256-GCM à haute entropie. Le fournisseur détient 0 fragment de clé et est mathématiquement impuissant à obtempérer. Citation désamorcée sans violation.',
          es: '<strong>Resultado de la Citación:</strong> Esta es la amenaza exacta de nuestra página de inicio, hecha concreta. Las órdenes judiciales federales notificadas al proveedor S3 sólo arrojan texto cifrado AES-256-GCM de alta entropía. El proveedor tiene 0 fragmentos de clave y es matemáticamente incapaz de cumplir. Citación desactivada sin filtración.',
        });
      }
    } else if (mode === 'ransomware') {
      if (bRans) bRans.classList.add('active');
      if (c2) c2.classList.add('subpoena-struck');
      if (s1) {
        s1.className = 'status-badge';
        s1.innerHTML = pick({
          en: '<span>✓ Postgres Metadata: Preserves Historical Timestamps</span>',
          fr: '<span>✓ Métadonnées Postgres : Préservent les horodatages historiques</span>',
          es: '<span>✓ Metadatos de Postgres: Conservan las marcas de tiempo históricas</span>',
        });
      }
      if (s2) {
        s2.className = 'status-badge alert';
        s2.innerHTML = pick({
          en: '<span>✕ Local Workstation Drive Encrypted by Attacker</span>',
          fr: '<span>✕ Disque du Poste Local Chiffré par l\'Attaquant</span>',
          es: '<span>✕ Disco de la Estación de Trabajo Local Cifrado por el Atacante</span>',
        });
      }
      if (s3) {
        s3.className = 'status-badge';
        s3.innerHTML = pick({
          en: '<span>✓ WORM Vault: Historical Versions 100% Immutable</span>',
          fr: '<span>✓ Coffre-Fort WORM : Versions historiques 100 % immuables</span>',
          es: '<span>✓ Bóveda WORM: Versiones históricas 100% inmutables</span>',
        });
      }
      if (simMessage) {
        simMessage.style.borderLeftColor = 'var(--accent-gold)';
        simMessage.innerHTML = pick({
          en: '<strong>Ransomware Attack Result:</strong> This is Biological Resilience in practice. Ransomware encrypts local drives, but cannot modify past S3 versions protected by 93-day compliance WORM Vault locks. Administrator triggers <code>restore_vault_as_of()</code> and restores all files uncorrupted &mdash; the system regenerates rather than resists.',
          fr: '<strong>Résultat de l\'attaque par rançongiciel :</strong> Voici la Résilience Biologique à l\'œuvre. Le rançongiciel chiffre les disques locaux, mais ne peut pas modifier les versions antérieures sur S3, protégées par des verrous de conformité de Coffre-Fort WORM de 93 jours. L\'administrateur déclenche <code>restore_vault_as_of()</code> et restaure tous les fichiers sans corruption &mdash; le système se régénère au lieu de résister.',
          es: '<strong>Resultado del Ataque de Ransomware:</strong> Esto es la Resiliencia Biológica en acción. El ransomware cifra los discos locales, pero no puede modificar las versiones anteriores en S3 protegidas por bloqueos de cumplimiento de Bóveda WORM de 93 días. El administrador activa <code>restore_vault_as_of()</code> y restaura todos los archivos sin corrupción &mdash; el sistema se regenera en lugar de resistir.',
        });
      }
    }
  }

  // Also support alternate simMsg / simBadge / simFlow elements if present
  const bCloud = document.getElementById('btnCloud');
  const bRansom = document.getElementById('btnRansom');
  const msg = document.getElementById('simMsg');
  const badge = document.getElementById('simBadge');
  const flow = document.getElementById('simFlow');
  if (msg && badge && flow) {
    if (bNorm) bNorm.className = 'btn btn-secondary';
    if (bCloud) bCloud.className = 'btn btn-secondary';
    if (bRansom) bRansom.className = 'btn btn-secondary';

    if (mode === 'normal') {
      if (bNorm) bNorm.className = 'btn btn-gold';
      badge.innerText = pick({
        en: 'STATUS: NORMAL OPERATION (ZERO-TRUST)',
        fr: 'ÉTAT : OPÉRATION NORMALE (CONFIANCE ZÉRO)',
        es: 'ESTADO: OPERACIÓN NORMAL (CONFIANZA CERO)',
      });
      badge.style.color = 'var(--accent-sage)';
      flow.innerHTML = pick({
        en: 'Edge Node (Local AES-256) ──▶ WireGuard Mesh ──▶ S3 Canadian Shield (Encrypted)',
        fr: 'Nœud en périphérie (AES-256 local) ──▶ Maillage WireGuard ──▶ S3 Bouclier Canadien (chiffré)',
        es: 'Nodo en el Borde (AES-256 Local) ──▶ Malla WireGuard ──▶ S3 Escudo Canadiense (Cifrado)',
      });
      msg.style.borderLeftColor = 'var(--accent-sage)';
      msg.innerHTML = pick({
        en: '<strong>Standard Workflow:</strong> Files are chunked and encrypted on the client before leaving the OS kernel. Montreal core stores only high-entropy ciphertext with 93-day WORM Vault object lock.',
        fr: '<strong>Flux de travail standard :</strong> Les fichiers sont fragmentés et chiffrés côté client avant de quitter le noyau du système d\'exploitation. Le noyau de Montréal ne stocke que du texte chiffré à haute entropie, protégé par un verrouillage d\'objet immuable de Coffre-Fort WORM de 93 jours.',
        es: '<strong>Flujo de Trabajo Estándar:</strong> Los archivos se fragmentan y cifran en el cliente antes de abandonar el núcleo del SO. El núcleo en Montreal almacena exclusivamente texto cifrado de alta entropía con bloqueo inmutable de objetos por Bóveda WORM de 93 días.',
      });
    } else if (mode === 'cloudact' || mode === 'subpoena') {
      if (bCloud) bCloud.className = 'btn btn-gold';
      badge.innerText = pick({
        en: 'SIMULATION: US CLOUD ACT SUBPOENA SERVED',
        fr: 'SIMULATION : CITATION À COMPARAÎTRE EN VERTU DU CLOUD ACT AMÉRICAIN',
        es: 'SIMULACIÓN: CITACIÓN JUDICIAL BAJO EL CLOUD ACT DE EE. UU.',
      });
      badge.style.color = '#F59E0B';
      flow.innerHTML = pick({
        en: 'US Court ──[Subpoena]──▶ US Entity ──[BLOCKED: 0 Shares]──▶ <strong>NO PLAINTEXT</strong>',
        fr: 'Tribunal américain ──[Citation]──▶ Entité américaine ──[BLOQUÉ : 0 fragment]──▶ <strong>AUCUN TEXTE EN CLAIR</strong>',
        es: 'Tribunal de EE. UU. ──[Citación]──▶ Entidad de EE. UU. ──[BLOQUEADO: 0 Fragmentos]──▶ <strong>SIN TEXTO EN CLARO</strong>',
      });
      msg.style.borderLeftColor = '#F59E0B';
      msg.innerHTML = pick({
        en: '<strong>Subpoena Result:</strong> Court order served on cloud providers or US affiliates yields zero decryption shares. Quorum requires independent Canadian and European custodians. Plaintext recovery is mathematically impossible.',
        fr: '<strong>Résultat de la citation :</strong> Une ordonnance judiciaire signifiée à des fournisseurs infonuagiques ou à des filiales américaines ne produit aucun fragment de déchiffrement. Le quorum exige des dépositaires indépendants canadiens et européens. La récupération du texte en clair est mathématiquement impossible.',
        es: '<strong>Resultado de la Citación:</strong> La orden judicial notificada a proveedores de nube o filiales estadounidenses arroja cero fragmentos de descifrado. El cuórum requiere custodios independientes canadienses y europeos. La recuperación de texto en claro es matemáticamente imposible.',
      });
    } else if (mode === 'ransomware') {
      if (bRansom) bRansom.className = 'btn btn-gold';
      badge.innerText = pick({
        en: 'SIMULATION: ZERO-DAY RANSOMWARE ATTACK',
        fr: 'SIMULATION : ATTAQUE DE RANÇONGICIEL JOUR ZÉRO',
        es: 'SIMULACIÓN: ATAQUE DE RANSOMWARE DÍA CERO',
      });
      badge.style.color = 'var(--accent-gold)';
      flow.innerHTML = pick({
        en: 'Endpoint Encrypted ──▶ Point-in-Time Rollback ──▶ <strong>100% Uncorrupted Files Restored</strong>',
        fr: 'Point de terminaison chiffré ──▶ Retour à un point dans le temps ──▶ <strong>100 % des fichiers intacts restaurés</strong>',
        es: 'Punto Final Cifrado ──▶ Reversión a Punto en el Tiempo ──▶ <strong>100% de Archivos Intactos Restaurados</strong>',
      });
      msg.style.borderLeftColor = 'var(--accent-gold)';
      msg.innerHTML = pick({
        en: '<strong>Ransomware Attack Result:</strong> Ransomware encrypts local drives, but cannot modify past S3 versions protected by 93-day compliance WORM Vault locks. Administrator triggers <code>restore_vault_as_of()</code> and restores all files uncorrupted.',
        fr: '<strong>Résultat de l\'attaque par rançongiciel :</strong> Le rançongiciel chiffre les disques locaux, mais ne peut pas modifier les versions antérieures sur S3, protégées par des verrous de conformité de Coffre-Fort WORM de 93 jours. L\'administrateur déclenche <code>restore_vault_as_of()</code> et restaure tous les fichiers sans corruption.',
        es: '<strong>Resultado del Ataque de Ransomware:</strong> El ransomware cifra los discos locales, pero no puede modificar las versiones anteriores en S3 protegidas por bloqueos de cumplimiento de Bóveda WORM de 93 días. El administrador activa <code>restore_vault_as_of()</code> y restaura todos los archivos sin corrupción.',
      });
    }
  }
}

// --- Timeline Scrubber (Point-in-Time Scrubber) ---
function scrubTimeline(val) {
  const pTime = document.getElementById('pTime');
  const f1 = document.getElementById('f1');
  const f2 = document.getElementById('f2');
  const f3 = document.getElementById('f3');
  const f1s = document.getElementById('f1s');
  const f2s = document.getElementById('f2s');
  const f3s = document.getElementById('f3s');
  if (!pTime || !f1 || !f2 || !f3 || !f1s || !f2s || !f3s) return;

  const encryptedLabel = pick({ en: 'Ransomware Encrypted', fr: 'Chiffré par rançongiciel', es: 'Cifrado por Ransomware' });

  if (val > 80) {
    pTime.innerText = pick({
      en: 'T-0: Present Time (Compromised)',
      fr: 'T-0: Heure Actuelle (Compromise)',
      es: 'T-0: Tiempo Presente (Comprometido)'
    });
    f1.className = "file-row corrupted";
    f1.querySelector('span:first-child').innerText = "📄 Turbine_Telemetry_Final.cad.locked";
    f1s.innerText = encryptedLabel;
    f2.className = "file-row corrupted";
    f2.querySelector('span:first-child').innerText = "📊 Stress_Testing_Log_Q3.xlsx.locked";
    f2s.innerText = encryptedLabel;
    f3.className = "file-row corrupted";
    f3.querySelector('span:first-child').innerText = "📑 Export_Compliance_ITAR.pdf.locked";
    f3s.innerText = encryptedLabel;
  } else {
    const mins = Math.round((100 - val) / 5) + 1;
    pTime.innerText = pick({
      en: `Rollback: T - ${mins} minutes ago`,
      fr: `Retour en arrière : T - ${mins} minutes`,
      es: `Reversión: T - ${mins} minutos atrás`,
    });
    const verified = (n) => pick({ en: `Restored & Verified (v${n})`, fr: `Restauré et vérifié (v${n})`, es: `Restaurado y Verificado (v${n})` });
    f1.className = "file-row good";
    f1.querySelector('span:first-child').innerText = "📄 Turbine_Telemetry_Final.cad";
    f1s.innerText = verified(4);
    f2.className = "file-row good";
    f2.querySelector('span:first-child').innerText = "📊 Stress_Testing_Log_Q3.xlsx";
    f2s.innerText = verified(2);
    f3.className = "file-row good";
    f3.querySelector('span:first-child').innerText = "📑 Export_Compliance_ITAR.pdf";
    f3s.innerText = verified(7);
  }
}

// --- Multi-Language & Geo-Location Detection ---
// Spanish: auto-served for Mexico / Latin America / Spain (browser language, timezone, geo-IP).
// French: auto-served only on an explicit browser-language signal (fr, fr-CA, fr-FR, ...).
// Quebec cannot be reliably distinguished from the rest of Canada by timezone (IANA has no
// separate Montreal zone; it is aliased to America/Toronto, shared with English Ontario) or by
// geo-IP country code alone, so neither is used to trigger French — guessing would misfire on
// English-speaking Canadians as often as it would correctly reach Francophones. The always-visible
// three-way switcher (not passive detection) is what keeps French genuinely offered and equally
// prominent for visitors detection can't identify.
function initLanguageRouting() {
  const currentLang = getCurrentLang();

  // 1. If user explicitly chose a language, respect their preference permanently
  const storedLang = localStorage.getItem('xolotl_user_lang');
  if (storedLang) {
    if (storedLang !== currentLang && LANGS[storedLang]) {
      redirectToLang(storedLang);
    }
    return;
  }

  // If already on a non-English page, do not auto-redirect further
  if (currentLang !== 'en') {
    return;
  }

  // 2. Instant Zero-Latency Heuristics (Language & Timezone)
  const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage || ''];

  for (const l of browserLangs) {
    if (l && l.toLowerCase().startsWith('fr')) {
      redirectToLang('fr');
      return;
    }
  }

  let isSpanishUser = false;
  for (const l of browserLangs) {
    if (l && l.toLowerCase().startsWith('es')) {
      isSpanishUser = true;
      break;
    }
  }

  // Timezone check: Mexico & Latin America / Spain
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const spanishTzPrefixes = [
      'Mexico', 'Cancun', 'Merida', 'Monterrey', 'Mazatlan', 'Chihuahua',
      'Hermosillo', 'Tijuana', 'Matamoros', 'Bahia_Banderas', 'Ojinaga',
      'Bogota', 'Buenos_Aires', 'Santiago', 'Lima', 'Caracas', 'Guatemala',
      'Costa_Rica', 'Panama', 'Montevideo', 'Madrid', 'Asuncion', 'La_Paz',
      'El_Salvador', 'Tegucigalpa', 'Managua', 'Santo_Domingo', 'Havana'
    ];
    if (spanishTzPrefixes.some(prefix => tz.includes(prefix))) {
      isSpanishUser = true;
    }
  } catch (e) {
    // ignore
  }

  if (isSpanishUser) {
    redirectToLang('es');
    return;
  }

  // 3. Fast Geo-IP Fallback for users physically in Mexico or Spanish countries with English OS
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    fetch('https://api.country.is', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeoutId);
        const spanishCountries = ['MX', 'ES', 'AR', 'CO', 'CL', 'PE', 'VE', 'GT', 'EC', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR'];
        if (data && data.country && spanishCountries.includes(data.country.toUpperCase())) {
          redirectToLang('es');
        }
      })
      .catch(() => {});
  } catch (e) {}
}

function redirectToLang(lang) {
  if (!LANGS[lang]) return;
  const currentPath = window.location.pathname;
  const currentLang = getCurrentLang();
  if (currentLang === lang) return;
  const fileName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
  const safeFile = fileName.endsWith('.html') ? fileName : 'index.html';
  const prefix = currentLang === 'en' ? '' : '../';
  const target = prefix + LANGS[lang].dir + safeFile;
  window.location.replace(target);
}

function setUserLanguage(lang) {
  try {
    localStorage.setItem('xolotl_user_lang', lang);
  } catch (e) {}
}

// Initialize routing immediately
try {
  initLanguageRouting();
} catch (e) {}

document.addEventListener('DOMContentLoaded', () => {
  initCookie();
  initMeshRadarTelemetry();
});

// ==============================================================================
// LIVE SOVEREIGN MESH TELEMETRY WEBMAP ENGINE
// ==============================================================================

// Founding Origin Anchor (Belize Community GIS & Data Sovereignty Roots)
const SOVEREIGN_FOUNDING_ANCHORS = [
  {
    id: 'NODE-BZ-ORIGIN',
    city: 'Gales Point Manatee',
    region: 'Belize District',
    country: 'Belize',
    countryCode: 'BZ',
    lat: 17.218,
    lon: -88.336,
    role: 'UNESCO Community Origin Anchor',
    tier: 'allied',
    status: 'Founding Origin Anchor',
    isAnchor: true,
    totalNodes: 1
  }
];

let meshNodes = [...SOVEREIGN_FOUNDING_ANCHORS];

let topoMap = null;
let topoMapMarkers = [];
let isDarkTopo = false;

window.toggleTopoTheme = function() {
  const mapEl = document.getElementById('meshRadarMap');
  const btn = document.getElementById('toggleTopoThemeBtn');
  if (!mapEl) return;
  isDarkTopo = !isDarkTopo;
  const isFr = document.documentElement.lang === 'fr';
  const isEs = document.documentElement.lang === 'es';
  mapEl.classList.toggle('map-dark', isDarkTopo);
  mapEl.classList.toggle('topo-dark', isDarkTopo);
  if (isDarkTopo) {
    if (btn) btn.innerText = isFr ? 'CARTE : SOMBRE' : (isEs ? 'MAPA: OSCURO' : 'MAP: DARK');
  } else {
    if (btn) btn.innerText = isFr ? 'CARTE : CLAIR' : (isEs ? 'MAPA: CLARO' : 'MAP: LIGHT');
  }
};

window.focusTopoView = function(preset, btnElement) {
  if (!topoMap) return;
  document.querySelectorAll('.topo-filter-btn').forEach(btn => btn.classList.remove('active'));
  const targetBtn = btnElement || (window.event && window.event.currentTarget);
  if (targetBtn && targetBtn.classList) {
    targetBtn.classList.add('active');
  }

  if (preset === 'origin') {
    // Focus directly onto Gales Point Manatee, Belize
    topoMap.setView([17.218, -88.336], 7);
    const originMarker = topoMapMarkers.find(m => m._isOrigin);
    if (originMarker) {
      setTimeout(() => originMarker.openPopup(), 350);
    }
  } else if (preset === 'canada') {
    // Focus onto Canadian Sovereign Enclaves
    const caNodes = meshNodes.filter(n => n.countryCode === 'CA' && n.lat && n.lon);
    if (caNodes.length > 0) {
      const bounds = caNodes.map(n => [n.lat, n.lon]);
      topoMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    } else {
      topoMap.setView([49.895, -97.138], 5);
    }
  } else {
    // Full network perspective
    const allCoords = meshNodes.filter(n => n.lat && n.lon).map(n => [n.lat, n.lon]);
    if (allCoords.length > 0) {
      topoMap.fitBounds(allCoords, { padding: [50, 50], maxZoom: 5 });
    } else {
      topoMap.setView([36.0, -89.0], 4);
    }
  }
};

window.zoomToCluster = function(lat, lon) {
  if (topoMap) {
    topoMap.setView([lat, lon], 9, { animate: true });
  }
};

function isSouthernOntario(node) {
  const c = (node.city || '').toLowerCase();
  const soCities = ['toronto', 'mississauga', 'hamilton', 'brampton', 'markham', 'vaughan', 'oakville', 'burlington', 'richmond hill', 'scarborough'];
  if (soCities.some(name => c.includes(name))) return true;
  if (node.lat >= 42.8 && node.lat <= 44.4 && node.lon >= -80.5 && node.lon <= -78.8) {
    return true;
  }
  return false;
}

function getClusteredNodes(allNodes, zoom) {
  // If zoomed in (zoom >= 8), display individual enclaves with smart label collision avoidance
  if (zoom >= 8) {
    const result = allNodes.map(n => ({ ...n, isCluster: false, subNodes: [n] }));
    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const n1 = result[i];
        const n2 = result[j];
        if (!n1.lat || !n2.lat) continue;
        const dLat = Math.abs(n1.lat - n2.lat);
        const dLon = Math.abs(n1.lon - n2.lon);
        // If horizontally close and n1 is western (lower longitude), orient n1 label left
        if (dLat < 0.4 && dLon < 0.6 && n1.lon < n2.lon) {
          n1.labelPosition = 'left';
        }
      }
    }
    return result;
  }

  // When zoomed out (zoom < 8): aggregate close regional nodes (Southern Ontario / GTA)
  const originNodes = allNodes.filter(n => n.id === 'NODE-BZ-ORIGIN' || n.tier === 'allied');
  const regularNodes = allNodes.filter(n => n.id !== 'NODE-BZ-ORIGIN' && n.tier !== 'allied');

  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < regularNodes.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);
    const cluster = [regularNodes[i]];

    for (let j = i + 1; j < regularNodes.length; j++) {
      if (visited.has(j)) continue;
      const n1 = regularNodes[i];
      const n2 = regularNodes[j];

      const dLat = (n2.lat - n1.lat) * 111.32;
      const dLon = (n2.lon - n1.lon) * 111.32 * Math.cos(((n1.lat + n2.lat) / 2) * (Math.PI / 180));
      const distKm = Math.hypot(dLat, dLon);

      const isSoOnt1 = isSouthernOntario(n1);
      const isSoOnt2 = isSouthernOntario(n2);

      // Aggregate Southern Ontario corridor (Toronto, Mississauga) or nodes within 40km
      if ((isSoOnt1 && isSoOnt2) || (distKm < 40 && n1.region === n2.region)) {
        visited.add(j);
        cluster.push(n2);
      }
    }

    if (cluster.length > 1) {
      const totalCount = cluster.reduce((sum, n) => sum + (parseInt(n.totalNodes, 10) || 1), 0);
      const avgLat = cluster.reduce((sum, n) => sum + n.lat * (parseInt(n.totalNodes, 10) || 1), 0) / totalCount;
      const avgLon = cluster.reduce((sum, n) => sum + n.lon * (parseInt(n.totalNodes, 10) || 1), 0) / totalCount;
      const cities = cluster.map(n => n.city).filter(Boolean);

      const isSoOnt = cluster.some(n => isSouthernOntario(n));
      const clusterCityName = isSoOnt ? 'Southern Ontario' : (cluster[0].region ? `${cluster[0].region} Cluster` : `${cities[0]} Region`);
      const clusterRegion = isSoOnt ? 'Ontario' : (cluster[0].region || '');

      clusters.push({
        id: isSoOnt ? 'NODE-CLUSTER-SO-ON' : `NODE-CLUSTER-${(cluster[0].countryCode || 'CA').toUpperCase()}`,
        city: clusterCityName,
        region: clusterRegion,
        country: 'Canada',
        countryCode: 'CA',
        lat: Number(avgLat.toFixed(4)),
        lon: Number(avgLon.toFixed(4)),
        role: `${totalCount} Enlisted Sovereign Nodes (${cities.join(' & ')})`,
        tier: 'shield',
        status: 'Aggregated Regional Cluster',
        totalNodes: totalCount,
        isCluster: true,
        subNodes: cluster
      });
    } else {
      clusters.push({ ...cluster[0], isCluster: false, subNodes: cluster });
    }
  }

  return [...originNodes.map(n => ({ ...n, isCluster: false, subNodes: [n] })), ...clusters];
}

function renderTopoMapNodes() {
  if (!topoMap) return;

  // Clean up existing markers
  topoMapMarkers.forEach(m => topoMap.removeLayer(m));
  topoMapMarkers = [];

  const zoom = topoMap.getZoom();
  const displayNodes = getClusteredNodes(meshNodes, zoom);

  // Draw node points
  displayNodes.forEach(node => {
    if (!node.lat || !node.lon) return;

    const isOrigin = (node.tier === 'allied' || node.id === 'NODE-BZ-ORIGIN');
    const isCluster = !!node.isCluster;
    const isNew = !!node.isNew;
    const tierClass = isNew ? 'new-join' : (isOrigin ? 'allied' : 'shield');

    const countSuffix = (node.totalNodes && node.totalNodes > 1) ? ` (${node.totalNodes})` : '';
    const cityLabel = `${node.city}${countSuffix}`;

    let iconHtml;
    let iconSize = [12, 12];
    let iconAnchor = [6, 6];

    if (isCluster) {
      iconSize = [16, 16];
      iconAnchor = [8, 8];
      iconHtml = `
        <div class="topo-marker-core cluster" title="Southern Ontario Cluster (${node.totalNodes} Nodes)"></div>
        <div class="topo-marker-label">${cityLabel}</div>
      `;
    } else if (isOrigin) {
      iconSize = [18, 18];
      iconAnchor = [9, 9];
      iconHtml = `
        <div class="topo-monotone-anchor" title="Founding Origin: Gales Point Manatee, Belize">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a3 3 0 0 0-1 5.83V9H8v2h3v8.94A6.003 6.003 0 0 1 5.09 15H3a8.003 8.003 0 0 0 8 7.94V24h2v-1.06A8.003 8.003 0 0 0 21 15h-2.09A6.003 6.003 0 0 1 13 19.94V11h3V9h-3V7.83A3.001 3.001 0 0 0 12 2zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
        </div>
        <div class="topo-marker-label origin-anchor-label">${cityLabel}</div>
      `;
    } else {
      const posClass = node.labelPosition === 'left' ? 'label-left' : '';
      iconHtml = `
        <div class="topo-marker-core ${tierClass}"></div>
        <div class="topo-marker-label ${posClass}">${cityLabel}</div>
      `;
    }

    const customIcon = L.divIcon({
      className: 'leaflet-node-marker' + (isOrigin ? ' origin-anchor-marker' : (isCluster ? ' cluster-node-marker' : '')),
      iconSize: iconSize,
      iconAnchor: iconAnchor,
      popupAnchor: [0, isOrigin ? -12 : (isCluster ? -10 : -8)],
      html: iconHtml
    });

    const marker = L.marker([node.lat, node.lon], { icon: customIcon }).addTo(topoMap);
    marker._isOrigin = isOrigin;
    marker._isCluster = isCluster;
    marker._nodeData = node;

    // Informational Popup
    let popupHtml = '';
    if (isCluster) {
      popupHtml = `
        <div class="topo-popup-inner" style="min-width: 230px; font-family: var(--font-mono, monospace); font-size: 0.74rem; line-height: 1.45;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
            <strong style="color: #10b981; font-size: 0.78rem;">REGIONAL ENCLAVE CLUSTER</strong>
            <span style="font-size: 0.62rem; color: #10b981; text-transform: uppercase; font-weight: 700; background: rgba(16,185,129,0.15); padding: 2px 6px; border-radius: 4px;">${node.totalNodes} NODES</span>
          </div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #FFFFFF; margin-bottom: 2px;">${node.city}, Canada</div>
          <div style="color: #94a3b8; font-size: 0.72rem; margin-bottom: 6px;">Consolidated Southern Ontario Enclaves</div>
          <div style="background: rgba(255,255,255,0.04); border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.08);">
            ${(node.subNodes || []).map(sn => `
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #cbd5e1; padding: 2px 0;">
                <span>● ${sn.city}</span>
                <strong style="color: #10b981;">${sn.totalNodes || 1} node${(sn.totalNodes || 1) > 1 ? 's' : ''}</strong>
              </div>
            `).join('')}
          </div>
          <div style="font-size: 0.65rem; color: #94a3b8; margin-bottom: 6px;">
            Centroid: ${Math.abs(node.lat).toFixed(2)}°${node.lat >= 0 ? 'N' : 'S'}, ${Math.abs(node.lon).toFixed(2)}°${node.lon >= 0 ? 'E' : 'W'}
          </div>
          <button type="button" class="topo-cluster-zoom-btn" onclick="zoomToCluster(${node.lat}, ${node.lon})">
            🔍 Zoom In to Disaggregate &rarr;
          </button>
        </div>
      `;
    } else if (isOrigin) {
      popupHtml = `
        <div class="topo-popup-inner" style="min-width: 210px; font-family: var(--font-mono, monospace); font-size: 0.74rem; line-height: 1.45;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
            <strong style="color: #f5d074; font-size: 0.78rem;">⚓ NODE-BZ-ORIGIN</strong>
            <span style="font-size: 0.62rem; color: #f5d074; text-transform: uppercase; font-weight: 600;">${node.status || 'ACTIVE ENCLAVE'}</span>
          </div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #FFFFFF; margin-bottom: 2px;">${[node.city, node.region, node.country].filter(Boolean).join(', ')}</div>
          <div style="color: #cbd5e1; font-size: 0.72rem; margin-bottom: 4px;">${node.role || 'Sovereign Cooperative Enclave'}</div>
          <div style="font-size: 0.65rem; color: #94a3b8;">${Math.abs(node.lat).toFixed(2)}°${node.lat >= 0 ? 'N' : 'S'}, ${Math.abs(node.lon).toFixed(2)}°${node.lon >= 0 ? 'E' : 'W'}</div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(212,175,55,0.4);">
            <a href="https://www.youtube.com/watch?v=jMIO2P_r_uU" target="_blank" rel="noopener noreferrer" style="color: #0d110f; background: #f5d074; font-size: 0.74rem; font-family: var(--font-mono); text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
              <span>▶</span> Watch UNESCO Film (2025) ↗
            </a>
          </div>
        </div>
      `;
    } else {
      popupHtml = `
        <div class="topo-popup-inner" style="min-width: 210px; font-family: var(--font-mono, monospace); font-size: 0.74rem; line-height: 1.45;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
            <strong style="color: #10b981; font-size: 0.78rem;">${node.id || 'NODE-CA-ENLISTED'}</strong>
            <span style="font-size: 0.62rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">${node.status || 'ACTIVE ENCLAVE'}</span>
          </div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #FFFFFF; margin-bottom: 2px;">${[node.city, node.region, node.country].filter(Boolean).join(', ')}</div>
          <div style="color: #cbd5e1; font-size: 0.72rem; margin-bottom: 4px;">${node.role || 'Sovereign Cooperative Enclave'}</div>
          <div style="font-size: 0.65rem; color: #94a3b8;">${Math.abs(node.lat).toFixed(2)}°${node.lat >= 0 ? 'N' : 'S'}, ${Math.abs(node.lon).toFixed(2)}°${node.lon >= 0 ? 'E' : 'W'}</div>
        </div>
      `;
    }

    marker.bindPopup(popupHtml, {
      offset: [0, isOrigin ? -12 : (isCluster ? -10 : -8)],
      className: 'custom-topo-popup',
      closeButton: true,
      autoPan: true
    });

    let hoverTimer = null;
    let isPinned = false;

    marker.on('mouseover', () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      if (!marker.isPopupOpen()) {
        marker.openPopup();
      }
    });

    marker.on('mouseout', () => {
      if (isPinned) return;
      hoverTimer = setTimeout(() => {
        if (!isPinned) marker.closePopup();
      }, 2000); // 2 full seconds persistence
    });

    marker.on('click', () => {
      if (isCluster) {
        topoMap.setView([node.lat, node.lon], 9, { animate: true });
        return;
      }
      isPinned = true;
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      marker.openPopup();
    });

    marker.on('popupopen', (e) => {
      const popupEl = e.popup.getElement();
      if (popupEl) {
        popupEl.addEventListener('mouseenter', () => {
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
          }
        });
        popupEl.addEventListener('mouseleave', () => {
          if (isPinned) return;
          hoverTimer = setTimeout(() => {
            if (!isPinned) marker.closePopup();
          }, 1800);
        });
      }
    });

    marker.on('popupclose', () => {
      isPinned = false;
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
    });

    topoMapMarkers.push(marker);
  });
}

function initMeshRadarTelemetry() {
  const container = document.getElementById('meshRadarMap');
  if (!container) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded yet; retrying in 100ms...');
    setTimeout(initMeshRadarTelemetry, 100);
    return;
  }

  if (topoMap) return;

  // 1. Create Leaflet map
  topoMap = L.map('meshRadarMap', {
    center: [36.0, -89.0],
    zoom: 4,
    minZoom: 3,
    maxZoom: 16,
    scrollWheelZoom: false,
    attributionControl: true
  });

  // Enable scroll-wheel zoom when clicked / focused
  topoMap.on('focus', () => { topoMap.scrollWheelZoom.enable(); });

  // Listen for zoom changes to dynamically toggle clusters and individual nodes
  topoMap.on('zoomend', () => {
    renderTopoMapNodes();
  });

  // 2. Add standard OpenStreetMap raster tile basemap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(topoMap);

  // 3. Mouse Interaction on Topo Map (HUD Reticle Coordinates)
  const reticleCoords = document.getElementById('radarReticleCoords');
  topoMap.on('mousemove', (e) => {
    if (reticleCoords) {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
      reticleCoords.innerText = `TOPOLOGY RETICLE: ${latStr}, ${lonStr}`;
    }
  });

  topoMap.on('mouseout', () => {
    if (reticleCoords) {
      reticleCoords.innerText = 'TOPOLOGY RETICLE: ACTIVE';
    }
  });

  // 4. Responsive map resizing
  window.addEventListener('resize', () => {
    if (topoMap) topoMap.invalidateSize();
  });

  // 5. Initial render of nodes
  renderTopoMapNodes();

  // 6. Center and fit initial nodes
  const validCoords = meshNodes.filter(n => n.lat && n.lon).map(n => [n.lat, n.lon]);
  if (validCoords.length > 0) {
    topoMap.fitBounds(validCoords, { padding: [50, 50], maxZoom: 5 });
  }

  // 7. Sync live data from Supabase & LocalStorage
  loadMeshTelemetryData();

  // 8. Start Sovereign Packet Flare & Pulse FX Engine
  initPacketTelemetryFX();
}

// ==============================================================================
// SOVEREIGN TELEMETRY PACKET FLARE & PULSE FX ENGINE
// ==============================================================================

let packetCanvas = null;
let packetCtx = null;
let activePackets = [];
let ambientRipples = [];
let lastPacketTime = 0;
let lastAmbientTime = 0;
let packetAnimFrameId = null;

function triggerNodeArrivalFlash(marker, isSubtle) {
  if (!marker) return;
  const el = (typeof marker.getElement === 'function') ? marker.getElement() : null;
  if (!el) return;

  const core = el.querySelector('.topo-marker-core') || el.querySelector('.topo-monotone-anchor');
  if (!core) return;

  core.classList.remove('packet-arrived');
  void core.offsetWidth; // Trigger CSS reflow to re-fire animation
  core.classList.add('packet-arrived');

  setTimeout(() => {
    core.classList.remove('packet-arrived');
  }, 900);
}

function initPacketTelemetryFX() {
  const container = document.getElementById('meshRadarMap');
  if (!container || !topoMap) return;

  if (!packetCanvas) {
    packetCanvas = document.createElement('canvas');
    packetCanvas.className = 'topo-packet-canvas';
    container.appendChild(packetCanvas);
    packetCtx = packetCanvas.getContext('2d');

    const resizeCanvas = () => {
      if (!packetCanvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      packetCanvas.width = rect.width * dpr;
      packetCanvas.height = rect.height * dpr;
      packetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    topoMap.on('resize moveend zoomend', resizeCanvas);
  }

  if (!packetAnimFrameId) {
    packetAnimFrameId = requestAnimationFrame(animatePackets);
  }
}

function spawnPacket(now) {
  if (!topoMapMarkers || topoMapMarkers.length < 2) return;

  const validMarkers = topoMapMarkers.filter(m => {
    const ll = m.getLatLng();
    return ll && !isNaN(ll.lat) && !isNaN(ll.lng);
  });

  if (validMarkers.length < 2) return;

  // Pick random source and distinct destination marker
  const srcIdx = Math.floor(Math.random() * validMarkers.length);
  let dstIdx = Math.floor(Math.random() * validMarkers.length);
  while (dstIdx === srcIdx) {
    dstIdx = Math.floor(Math.random() * validMarkers.length);
  }

  const srcM = validMarkers[srcIdx];
  const dstM = validMarkers[dstIdx];

  const srcLL = srcM.getLatLng();
  const dstLL = dstM.getLatLng();

  // Gentle, measured flight time: 2.2s to 3.6s based slightly on distance
  const dLat = dstLL.lat - srcLL.lat;
  const dLon = dstLL.lng - srcLL.lng;
  const geoDist = Math.hypot(dLat, dLon);
  const duration = Math.min(3600, Math.max(2200, 1800 + geoDist * 32));

  activePackets.push({
    fromLat: srcLL.lat,
    fromLon: srcLL.lng,
    toLat: dstLL.lat,
    toLon: dstLL.lng,
    targetMarker: dstM,
    startTime: now,
    duration: duration,
    tailSpan: 0.085 // 8.5% trail length
  });
}

function spawnAmbientRipple(now) {
  if (!topoMapMarkers || topoMapMarkers.length === 0) return;

  // 70% chance to pulse on an existing active node, 30% on a random Canadian Shield mesh coordinate
  if (Math.random() < 0.7) {
    const m = topoMapMarkers[Math.floor(Math.random() * topoMapMarkers.length)];
    const ll = m.getLatLng();
    ambientRipples.push({
      lat: ll.lat,
      lon: ll.lng,
      maxRadius: 24,
      duration: 1800,
      startTime: now
    });
    triggerNodeArrivalFlash(m, true);
  } else {
    // Random Canadian coordinates
    const lat = 46.5 + Math.random() * 12;
    const lon = -112 + Math.random() * 38;
    ambientRipples.push({
      lat: lat,
      lon: lon,
      maxRadius: 18,
      duration: 2000,
      startTime: now
    });
  }
}

function animatePackets(now) {
  if (!packetCtx || !packetCanvas || !topoMap) {
    packetAnimFrameId = requestAnimationFrame(animatePackets);
    return;
  }

  const w = packetCanvas.clientWidth;
  const h = packetCanvas.clientHeight;
  packetCtx.clearRect(0, 0, w, h);

  // 1. Packet Spawning: exactly 1 packet active at a time, spaced by 2.2s - 3.8s
  if (activePackets.length === 0 && (now - lastPacketTime > 2400)) {
    spawnPacket(now);
    lastPacketTime = now;
  }

  // 2. Ambient Pulse Spawning: every 4.0s - 6.5s
  if (now - lastAmbientTime > 4200) {
    spawnAmbientRipple(now);
    lastAmbientTime = now;
  }

  // 3. Render Ambient Radar Ripples
  for (let i = ambientRipples.length - 1; i >= 0; i--) {
    const r = ambientRipples[i];
    const progress = (now - r.startTime) / r.duration;
    if (progress >= 1) {
      ambientRipples.splice(i, 1);
      continue;
    }

    const pt = topoMap.latLngToContainerPoint([r.lat, r.lon]);
    if (pt.x < -60 || pt.x > w + 60 || pt.y < -60 || pt.y > h + 60) continue;

    const currentRadius = r.maxRadius * Math.pow(progress, 0.65);
    const alpha = (1 - progress) * (isDarkTopo ? 0.4 : 0.32);

    packetCtx.save();
    packetCtx.beginPath();
    packetCtx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
    packetCtx.strokeStyle = isDarkTopo ? `rgba(52, 211, 153, ${alpha})` : `rgba(5, 150, 105, ${alpha})`;
    packetCtx.lineWidth = 1.3;
    packetCtx.stroke();
    packetCtx.restore();
  }

  // 4. Render Travelling Packets with Faded Gradient Tails
  for (let i = activePackets.length - 1; i >= 0; i--) {
    const pkt = activePackets[i];
    const progress = (now - pkt.startTime) / pkt.duration;

    if (progress >= 1) {
      triggerNodeArrivalFlash(pkt.targetMarker);
      activePackets.splice(i, 1);
      continue;
    }

    const t = Math.min(1, Math.max(0, progress));
    const curLat = pkt.fromLat + (pkt.toLat - pkt.fromLat) * t;
    const curLon = pkt.fromLon + (pkt.toLon - pkt.fromLon) * t;

    // Tail lag
    const tailT = Math.max(0, t - pkt.tailSpan);
    const tailLat = pkt.fromLat + (pkt.toLat - pkt.fromLat) * tailT;
    const tailLon = pkt.fromLon + (pkt.toLon - pkt.fromLon) * tailT;

    const headPt = topoMap.latLngToContainerPoint([curLat, curLon]);
    const tailPt = topoMap.latLngToContainerPoint([tailLat, tailLon]);

    const dx = headPt.x - tailPt.x;
    const dy = headPt.y - tailPt.y;
    const tailDist = Math.hypot(dx, dy);

    if (headPt.x >= -80 && headPt.x <= w + 80 && headPt.y >= -80 && headPt.y <= h + 80) {
      packetCtx.save();

      if (tailDist > 2) {
        const grad = packetCtx.createLinearGradient(tailPt.x, tailPt.y, headPt.x, headPt.y);
        if (isDarkTopo) {
          grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
          grad.addColorStop(0.5, 'rgba(52, 211, 153, 0.22)');
          grad.addColorStop(1, 'rgba(167, 243, 208, 0.85)');
        } else {
          grad.addColorStop(0, 'rgba(5, 150, 105, 0)');
          grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.28)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.85)');
        }

        packetCtx.beginPath();
        packetCtx.moveTo(tailPt.x, tailPt.y);
        packetCtx.lineTo(headPt.x, headPt.y);
        packetCtx.strokeStyle = grad;
        packetCtx.lineWidth = 1.8;
        packetCtx.lineCap = 'round';
        packetCtx.stroke();
      }

      // Head: bright monotone particle with subtle glow
      packetCtx.beginPath();
      packetCtx.arc(headPt.x, headPt.y, 2.2, 0, Math.PI * 2);
      packetCtx.fillStyle = isDarkTopo ? '#f8fafc' : '#ffffff';
      packetCtx.shadowColor = isDarkTopo ? '#34d399' : '#059669';
      packetCtx.shadowBlur = 4;
      packetCtx.fill();

      packetCtx.restore();
    }
  }

  packetAnimFrameId = requestAnimationFrame(animatePackets);
}

function resolveNodeCoords(locText, country, lat, lon) {
  if (lat && lon && !isNaN(lat) && !isNaN(lon) && lat !== 0) {
    return { lat: Number(lat), lon: Number(lon) };
  }
  const text = (locText || '').toLowerCase();
  if (text.includes('toronto') || text.includes('ontario') || text.includes('gta')) return { lat: 43.653, lon: -79.383 };
  if (text.includes('montreal') || text.includes('montréal') || text.includes('quebec') || text.includes('qc')) return { lat: 45.501, lon: -73.567 };
  if (text.includes('winnipeg') || text.includes('manitoba') || text.includes('red river')) return { lat: 49.895, lon: -97.138 };
  if (text.includes('ottawa') || text.includes('gatineau')) return { lat: 45.421, lon: -75.697 };
  if (text.includes('vancouver') || text.includes('bc') || text.includes('british columbia')) return { lat: 49.282, lon: -123.120 };
  if (text.includes('calgary') || text.includes('alberta') || text.includes('edmonton')) return { lat: 51.044, lon: -114.071 };
  if (text.includes('halifax') || text.includes('nova scotia')) return { lat: 44.648, lon: -63.575 };
  if (text.includes('belize') || text.includes('gales point')) return { lat: 17.218, lon: -88.336 };
  if (text.includes('mexico') || text.includes('cdmx')) return { lat: 19.432, lon: -99.133 };
  if (text.includes('zurich') || text.includes('switzerland')) return { lat: 47.376, lon: 8.541 };
  // Default to Canadian Shield Bedrock with subtle offset
  return { lat: 46.5 + (Math.random() * 2 - 1), lon: -80.0 + (Math.random() * 2 - 1) };
}

async function loadMeshTelemetryData() {
  // 1. Load local signups from browser storage
  let localSignups = [];
  try {
    localSignups = JSON.parse(localStorage.getItem('xolotl_beta_signups') || '[]');
  } catch (e) {}

  // 2. Fetch aggregated node clusters from Supabase view or RPC
  let remoteClusters = [];
  try {
    const endpoint = `${XOLOTL_SUPABASE.url}/rest/v1/beta_nodes_geographic_distribution`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': XOLOTL_SUPABASE.anonKey,
        'Authorization': `Bearer ${XOLOTL_SUPABASE.anonKey}`
      }
    });
    if (res.ok) {
      remoteClusters = await res.json();
    } else {
      // Try RPC fallback
      const rpcRes = await fetch(`${XOLOTL_SUPABASE.url}/rest/v1/rpc/get_live_node_clusters`, {
        method: 'POST',
        headers: {
          'apikey': XOLOTL_SUPABASE.anonKey,
          'Authorization': `Bearer ${XOLOTL_SUPABASE.anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (rpcRes.ok) {
        remoteClusters = await rpcRes.json();
      }
    }
  } catch (err) {
    console.info('Supabase geographic telemetry pending schema reload or offline; using local & seed mesh.');
  }

  // 3. Merge Supabase clusters into meshNodes
  if (Array.isArray(remoteClusters) && remoteClusters.length > 0) {
    remoteClusters.forEach((cluster, i) => {
      if (cluster.avg_latitude && cluster.avg_longitude) {
        const existing = meshNodes.find(n => n.city.toLowerCase() === (cluster.city || '').toLowerCase());
        if (existing) {
          existing.role = `${cluster.total_nodes} Enlisted Sovereign Node${cluster.total_nodes > 1 ? 's' : ''}`;
          existing.status = 'Live Verified Enclave';
          existing.lat = Number(cluster.avg_latitude);
          existing.lon = Number(cluster.avg_longitude);
          existing.totalNodes = cluster.total_nodes;
          existing.latestEnlisted = cluster.latest_node_enlisted;
          existing.isLiveDb = true;
        } else {
          meshNodes.push({
            id: `NODE-${(cluster.country_code || 'CA').toUpperCase()}-${String(i + 100).padStart(4, '0')}`,
            city: cluster.city || 'Regional Cluster',
            region: cluster.region || '',
            country: cluster.country || 'Canada',
            countryCode: cluster.country_code || 'CA',
            lat: Number(cluster.avg_latitude),
            lon: Number(cluster.avg_longitude),
            role: `${cluster.total_nodes || 1} Enlisted Nodes`,
            tier: cluster.country_code === 'CA' ? 'shield' : 'allied',
            status: 'Live Verified Enclave',
            totalNodes: cluster.total_nodes,
            latestEnlisted: cluster.latest_node_enlisted,
            isLiveDb: true
          });
        }
      }
    });
  }

  // 4. Merge any local signups from browser storage
  localSignups.forEach(signup => {
    const coords = resolveNodeCoords(signup.city || signup.locationText, signup.country, signup.latitude, signup.longitude);
    const alreadyIn = meshNodes.find(n => n.id === signup.node_badge_id);
    if (!alreadyIn) {
      meshNodes.unshift({
        id: signup.node_badge_id || 'NODE-CA-LOCAL',
        city: signup.city || 'Verified Sovereign Node',
        region: signup.region || '',
        country: signup.country || 'Canada',
        countryCode: signup.country_code || 'CA',
        lat: coords.lat,
        lon: coords.lon,
        role: signup.interest_type === 'developer' ? 'DKG Custodian Node' : (signup.interest_type === 'enterprise' ? 'Institutional Enclave' : 'Citizen Privacy Node'),
        tier: 'shield',
        status: 'Newly Enlisted',
        isNew: true
      });
    }
  });

  // 5. Update Telemetry Metrics Bar
  updateMeshMetricsHUD(remoteClusters);

  // 6. Populate Telemetry Feed List
  populateTelemetryFeedList(localSignups, remoteClusters);

  // 7. Refresh Leaflet map with loaded nodes
  renderTopoMapNodes();
  if (topoMap && meshNodes.length > 0) {
    const validCoords = meshNodes.filter(n => n.lat && n.lon).map(n => [n.lat, n.lon]);
    if (validCoords.length > 0) {
      topoMap.fitBounds(validCoords, { padding: [50, 50], maxZoom: 5 });
    }
  }
}

function updateMeshMetricsHUD(remoteClusters) {
  const nodeCountEl = document.getElementById('telemetryNodeCount');
  const clusterCountEl = document.getElementById('telemetryClusterCount');

  // Exact real count: 1 (Gales Point Founding Origin Anchor) + live DB nodes
  const dbCount = (remoteClusters || []).reduce((acc, c) => acc + (parseInt(c.total_nodes, 10) || 0), 0);
  const totalCount = Math.max(1 + dbCount, meshNodes.length);

  const distinctCities = new Set(meshNodes.map(n => n.city.toLowerCase()));

  if (nodeCountEl) {
    nodeCountEl.innerText = totalCount.toLocaleString();
  }
  if (clusterCountEl) {
    clusterCountEl.innerText = distinctCities.size.toLocaleString();
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Active';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch (e) {
    return 'Recently';
  }
}

function populateTelemetryFeedList(localSignups, remoteClusters) {
  const feedList = document.getElementById('telemetryFeedList');
  if (!feedList) return;

  feedList.innerHTML = '';

  // Remote clusters from live database formatted as live feeds
  const dbFeeds = (remoteClusters || []).map(c => ({
    id: `NODE-${(c.country_code || 'CA').toUpperCase()}-${(c.city || 'CA').substring(0, 3).toUpperCase()}`,
    loc: [c.city, c.region, c.country_code].filter(Boolean).join(', '),
    role: `Verified Cooperative Enclave (${c.total_nodes} node${c.total_nodes > 1 ? 's' : ''})`,
    time: formatRelativeTime(c.latest_node_enlisted),
    isNew: false,
    isLiveDb: true
  }));

  // Combine real signups + live DB clusters + Gales Point founding anchor
  const feedEntries = [
    ...(localSignups || []).slice(-3).reverse().map(s => ({
      id: s.node_badge_id || 'NODE-CA-NEW',
      loc: [s.city, s.region, s.country_code].filter(Boolean).join(', '),
      role: s.interest_type === 'developer' ? 'DKG Custodian' : (s.interest_type === 'enterprise' ? 'Institutional Enclave' : 'Citizen Privacy Node'),
      time: 'Just now',
      isNew: true
    })),
    ...dbFeeds,
    {
      id: 'NODE-BZ-ORIGIN',
      loc: 'Gales Point Manatee, Belize',
      role: 'UNESCO Community Origin Anchor',
      time: 'Founding Anchor',
      isNew: false
    }
  ];

  feedEntries.forEach(item => {
    const div = document.createElement('div');
    div.className = `telemetry-feed-item ${item.isNew ? 'just-enlisted' : ''}`;
    div.innerHTML = `
      <div class="feed-item-top">
        <span class="feed-item-id">${item.id}</span>
        <span class="feed-item-time">${item.time}</span>
      </div>
      <div class="feed-item-loc">${item.loc}</div>
      <div class="feed-item-role">${item.role}</div>
    `;
    feedList.appendChild(div);
  });
}

function addLiveNodeToMesh(nodeData) {
  // Add new node to active array
  meshNodes.unshift(nodeData);

  // Refresh Leaflet markers & transit links
  renderTopoMapNodes();

  if (topoMap && nodeData.lat && nodeData.lon) {
    topoMap.panTo([nodeData.lat, nodeData.lon]);
  }

  // Update HUD
  const nodeCountEl = document.getElementById('telemetryNodeCount');
  if (nodeCountEl) {
    const cur = parseInt(nodeCountEl.innerText.replace(/,/g, ''), 10) || meshNodes.length + 18;
    nodeCountEl.innerText = (cur + 1).toLocaleString();
  }

  // Prepend to Feed List
  const feedList = document.getElementById('telemetryFeedList');
  if (feedList) {
    const div = document.createElement('div');
    div.className = 'telemetry-feed-item just-enlisted';
    div.innerHTML = `
      <div class="feed-item-top">
        <span class="feed-item-id">${nodeData.id}</span>
        <span class="feed-item-time" style="color:#10b981;">ACTIVE NOW</span>
      </div>
      <div class="feed-item-loc">${[nodeData.city, nodeData.region, nodeData.countryCode].filter(Boolean).join(', ')}</div>
      <div class="feed-item-role">${nodeData.role || 'Cooperative Node'}</div>
    `;
    feedList.insertBefore(div, feedList.firstChild);
  }
}

// Expose globally for form submission callback
window.addLiveNodeToMesh = addLiveNodeToMesh;

// --- Showcase Sector Pilot Direct Modal Trigger ---
function openPilotForSector(sectorValue) {
  openModal('pilot');
  const sectorSelect = document.getElementById('iSector') || document.getElementById('pInterest') || document.getElementById('bInterest');
  if (sectorSelect && sectorValue) {
    sectorSelect.value = sectorValue;
  }
}

window.openPilotForSector = openPilotForSector;



