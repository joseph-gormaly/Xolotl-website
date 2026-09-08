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
  if (pilot) pilot.classList.remove('active');
  if (priv) priv.classList.remove('active');
  if (beta) beta.classList.remove('active');
}

function handleBackdrop(e) {
  if (e && (e.target.id === 'pilotModal' || e.target.id === 'privacyModal' || e.target.id === 'betaModal')) {
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
  url: (window.XOLOTL_SUPABASE_CONFIG && window.XOLOTL_SUPABASE_CONFIG.url) || 'https://xolotl-sovereign.supabase.co',
  anonKey: (window.XOLOTL_SUPABASE_CONFIG && window.XOLOTL_SUPABASE_CONFIG.anonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.public-anon-key',
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
          detectedGeo.latitude = Number(Number(data.latitude).toFixed(3));
          detectedGeo.longitude = Number(Number(data.longitude).toFixed(3));
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
      detectedGeo.latitude = Number(pos.coords.latitude.toFixed(3));
      detectedGeo.longitude = Number(pos.coords.longitude.toFixed(3));
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

  currentBetaBadgeText = 
`🛡️ XOLOTL CANADIAN SHIELD — SOVEREIGN BETA NODE
===================================================
Node Registry ID:   ${nodeId}
Enlisted Operator:  ${fullName}
Deployment Region:  ${locationText || locCity || 'Canadian Shield Bedrock'}
Client Platform:    ${platform}
Verification:       Pedersen DKG / FROST Threshold Mesh
Sovereign Network:  https://xolotl.ca
===================================================
The cloud has trust issues. Meet the Canadian Shield.`;

  // 4. Toggle UI views
  const bForm = document.getElementById('bForm');
  const bSuccess = document.getElementById('bSuccess');
  if (bForm) bForm.style.display = 'none';
  if (bSuccess) bSuccess.style.display = 'block';

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
  const text = encodeURIComponent("I just enlisted my node on the Xolotl Sovereign Beta. The cloud has trust issues. Meet the Canadian Shield: https://xolotl.ca");
  if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  } else if (platform === 'linkedin') {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://xolotl.ca`, '_blank', 'noopener,noreferrer');
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
});
