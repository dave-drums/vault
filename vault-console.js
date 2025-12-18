(function(){
/* Vault Admin Console
   - Student list + editable progress + name fields
   - Invite-only onboarding (no Cloud Functions)
   - Admin gate via /admins/{uid} doc existence
*/

/* ---------- Font helpers (inherit Squarespace font) ---------- */
function pvGetFontBaseEl(){
  return (
    document.querySelector('.sqs-block-content') ||
    document.querySelector('.sqs-layout') ||
    document.getElementById('vault-admin-root') ||
    document.body
  );
}
function pvApplyFontFromBase(el){
  var baseEl = pvGetFontBaseEl();
  var cs = window.getComputedStyle(baseEl);
  if (cs.font && cs.font !== 'normal') el.style.font = cs.font;
  el.style.fontFamily = cs.fontFamily;
  el.style.fontSize = cs.fontSize;
  el.style.fontWeight = cs.fontWeight;
  el.style.lineHeight = cs.lineHeight;
  el.style.color = cs.color;
}

/* ---------- Utils ---------- */
function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, function (c) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
  });
}
function tsToMs(ts){
  if (!ts || !ts.toDate) return 0;
  try { return ts.toDate().getTime(); } catch (e) { return 0; }
}
function formatTs(ts){
  if (!ts || !ts.toDate) return '-';
  return ts.toDate().toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Australia/Brisbane'
  });
}
function formatDateOnly(ts){
  if (!ts || !ts.toDate) return '-';
  return ts.toDate().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Brisbane'
  });
}
function formatDuration(sec){
  sec = Number(sec || 0);
  if (sec <= 0) return '0 min';
  var mins = Math.round(sec / 60);
  if (mins < 60) return mins + ' min';
  var hours = Math.floor(mins / 60);
  var rem = mins % 60;
  return rem === 0 ? hours + ' hrs' : hours + ' hrs ' + rem + ' min';
}
function formatAvgTime(totalSeconds, loginCount){
  totalSeconds = Number(totalSeconds || 0);
  loginCount = Number(loginCount || 0);
  if (totalSeconds <= 0 || loginCount <= 0) return '0 min';
  return formatDuration(Math.round(totalSeconds / loginCount));
}
function statusDot(lastLoginTs, joinedAtTs){
  var ms = tsToMs(lastLoginTs);
  if (!ms) ms = tsToMs(joinedAtTs);
  if (!ms) return '🔴';
  var days = (Date.now() - ms) / (1000 * 60 * 60 * 24);
  if (days < 14) return '🟢';
  if (days < 30) return '🟡';
  return '🔴';
}
function formatRelativeTime(ts){
  if (!ts || !ts.toDate) return '';
  var ms = tsToMs(ts);
  if (!ms) return '';
  
  var now = Date.now();
  var diff = now - ms;
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  var weeks = Math.floor(days / 7);
  var months = Math.floor(days / 30);
  var years = Math.floor(days / 365);
  
  if (days < 7) return '(' + days + ' day' + (days === 1 ? '' : 's') + ' ago)';
  if (weeks < 4) return '(' + weeks + ' week' + (weeks === 1 ? '' : 's') + ' ago)';
  if (months < 12) return '(' + months + ' month' + (months === 1 ? '' : 's') + ' ago)';
  
  var remainingMonths = months - (years * 12);
  if (remainingMonths === 0) return '(' + years + ' year' + (years === 1 ? '' : 's') + ' ago)';
  return '(' + years + ' year' + (years === 1 ? '' : 's') + ', ' + remainingMonths + ' month' + (remainingMonths === 1 ? '' : 's') + ' ago)';
}
function copyText(text){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    } catch (e) { reject(e); }
  });
}
function showBody(){
  if (document.body) document.body.style.opacity = '1';
}

/* ---------- Invites ---------- */
var INVITES_COL = 'invites';
var CREATE_ACCOUNT_URL_BASE = 'https://www.davedrums.com.au/create-account?t=';

function randomToken(len){
  len = len || 16;
  try {
    var bytes = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  } catch (e) {
    return (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, len * 2);
  }
}

/* ---------- Modals ---------- */
function makeOverlay(){
  var overlay = document.createElement('div');
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999;';
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  return overlay;
}

function openAddUserModal(db){
  var overlay = makeOverlay();

  var box = document.createElement('div');
  box.style.cssText = 'width:100%;max-width:760px;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;';
  pvApplyFontFromBase(box);

  box.innerHTML =
    '<h3 style="margin:0 0 12px 0;color:#111;font-size:16px;font-weight:600;">Add user</h3>' +
    '<div style="margin:0 0 12px 0;line-height:1.4;color:#111;font-size:15px;">Create an invite link (expires in 7 days)</div>' +
    '<label style="display:block;margin:0 0 6px 0;color:#111;font:inherit;">Email</label>' +
    '<input id="pv-invite-email" type="email" style="display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:6px;margin:0 0 14px 0;font:inherit;">' +
    '<div id="pv-invite-out" style="display:none;margin:10px 0 0 0;padding:12px;border:1px solid #ddd;background:#f3f3f3;border-radius:12px;word-break:break-word;color:#111;font:inherit;"></div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
      '<button id="pv-invite-cancel" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Close</button>' +
      '<button id="pv-invite-create" style="padding:6px 10px;border-radius:6px;border:1px solid #06b3fd;background:#06b3fd;color:#fff;cursor:pointer;font:inherit;font-size:14px;">Create Invite</button>' +
    '</div>' +
    '<div id="pv-invite-msg" style="text-align:center;margin-top:12px;min-height:18px;color:#c00;line-height:1.4;font:inherit;"></div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  box.querySelector('#pv-invite-cancel').addEventListener('click', close);

  var createBtn = box.querySelector('#pv-invite-create');
  var emailEl = box.querySelector('#pv-invite-email');
  var outEl = box.querySelector('#pv-invite-out');
  var msgEl = box.querySelector('#pv-invite-msg');
  function setMsg(t){ msgEl.textContent = t || ''; }

  function createInvite(email){
    var token = randomToken(16);
    var expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return db.collection(INVITES_COL).doc(token).set({
      email: email,
      used: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expires)
    }).then(function(){
      return { token: token, link: CREATE_ACCOUNT_URL_BASE + token };
    });
  }

  createBtn.addEventListener('click', function(){
    setMsg('');
    var email = (emailEl.value || '').trim().toLowerCase();
    if (!email) { setMsg('Enter an email.'); return; }

    createBtn.disabled = true;

    createInvite(email).then(function(res){
      createBtn.disabled = false;

      outEl.style.display = 'block';
      outEl.innerHTML =
        '<div style="font-weight:600;margin:0 0 6px 0;font:inherit;color:#111;">Invite link</div>' +
        '<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;">' +
          '<div style="word-break:break-word;flex:1;font:inherit;color:#111;">' + escapeHtml(res.link) + '</div>' +
          '<button id="pv-invite-copy" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;white-space:nowrap;">Copy</button>' +
        '</div>';

      box.querySelector('#pv-invite-copy').addEventListener('click', function(){
        copyText(res.link).catch(function(){});
      });
    }).catch(function(err){
      createBtn.disabled = false;
      setMsg('Could not create invite. Please try again.');
      try { console.warn(err); } catch(e){}
    });
  });
}

function openInvitesModal(db){
  var overlay = makeOverlay();

  var box = document.createElement('div');
  box.style.cssText = 'width:100%;max-width:760px;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;';
  pvApplyFontFromBase(box);

  box.innerHTML =
    '<h3 style="margin:0 0 12px 0;color:#111;font-size:16px;font-weight:600;">Invites</h3>' +
    '<div id="pv-invites-list" style="margin-top:10px;font:inherit;color:#111;"></div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
      '<button id="pv-invites-close" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Close</button>' +
    '</div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  box.querySelector('#pv-invites-close').addEventListener('click', close);

  var listEl = box.querySelector('#pv-invites-list');
  listEl.innerHTML = '<div style="opacity:.8;font:inherit;color:#111;">Loading…</div>';

  db.collection(INVITES_COL).get().then(function(snap){
    var now = Date.now();
    var items = [];

    snap.forEach(function(doc){
      var d = doc.data() || {};
      var expMs = (d.expiresAt && d.expiresAt.toDate) ? d.expiresAt.toDate().getTime() : 0;
      if (d.used) return;
      if (expMs && expMs < now) return;
      items.push({ token: doc.id, email: String(d.email || '').trim(), expiresAt: d.expiresAt || null, createdAt: d.createdAt || null });
    });

    items.sort(function(a,b){
      var aT = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      var bT = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return bT - aT;
    });

    if (!items.length) {
      listEl.innerHTML = '<div style="opacity:.8;font:inherit;color:#111;">No active invites.</div>';
      return;
    }

    var html =
      '<div style="overflow-x:auto;">' +
      '<table style="width:100%;border-collapse:collapse;font:inherit;font-size:14px;color:#111;">' +
      '<thead><tr>' +
        '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;font:inherit;">Email</th>' +
        '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;font:inherit;">Expires</th>' +
        '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;font:inherit;">Link</th>' +
        '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;font:inherit;"></th>' +
      '</tr></thead><tbody>';

    items.forEach(function(it){
      var link = CREATE_ACCOUNT_URL_BASE + it.token;
      html +=
        '<tr>' +
          '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font:inherit;">' + escapeHtml(it.email || '-') + '</td>' +
          '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font:inherit;">' + formatDateOnly(it.expiresAt) + '</td>' +
          '<td style="padding:8px;border-bottom:1px solid #f0f0f0;word-break:break-all;font:inherit;">' + escapeHtml(link) + '</td>' +
          '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;text-align:right;font:inherit;">' +
            '<button class="pv-invite-copy" data-link="' + escapeHtml(link) + '" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Copy</button> ' +
            '<button class="pv-invite-revoke" data-token="' + escapeHtml(it.token) + '" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Revoke</button>' +
          '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    listEl.innerHTML = html;

    listEl.querySelectorAll('.pv-invite-copy').forEach(function(btn){
      btn.addEventListener('click', function(){
        var link = btn.getAttribute('data-link') || '';
        copyText(link).catch(function(){});
      });
    });

    listEl.querySelectorAll('.pv-invite-revoke').forEach(function(btn){
      btn.addEventListener('click', function(){
        var tok = btn.getAttribute('data-token');
        if (!tok) return;
        btn.disabled = true;
        db.collection(INVITES_COL).doc(tok).set({ used: true, revokedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true })
          .then(function(){ close(); openInvitesModal(db); })
          .catch(function(){ btn.disabled = false; });
      });
    });

  }).catch(function(){
    listEl.innerHTML = '<div style="color:#c00;font:inherit;">Could not load invites.</div>';
  });
}

/* ---------- Main ---------- */
document.addEventListener('DOMContentLoaded', function(){
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    var root0 = document.getElementById('vault-admin-root');
    showBody();
    if (root0) root0.textContent = 'Firebase not available.';
    return;
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  var rootEl = document.getElementById('vault-admin-root');
  if (!rootEl) { showBody(); return; }

  rootEl.textContent = 'Loading admin data…';

  var ONLINE_WINDOW_MS = 5 * 60 * 1000;

  function pvIsAdmin(user){
    return db.collection('admins').doc(user.uid).get()
      .then(function(s){ return s.exists; })
      .catch(function(){ return false; });
  }

  function getMsgEl(uid){
    return rootEl.querySelector('.pv-save-msg[data-uid="' + uid + '"]');
  }
  function setMsg(uid, text, isErr){
    var el = getMsgEl(uid);
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isErr ? '#c00' : '#060';
  }

  function openEditor(uid){
    var row = rootEl.querySelector('.pv-editor-row[data-uid="' + uid + '"]');
    if (!row) return;
    row.style.display = 'table-row';
    setMsg(uid, 'Loading…', false);

    Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('metrics').doc('progress').get()
    ]).then(function(snaps){
      var adm = snaps[0].exists ? (snaps[0].data() || {}) : {};
      var pub = snaps[1].exists ? (snaps[1].data() || {}) : {};
      var p = pub || {};

      rootEl.querySelectorAll('.pv-prog[data-uid="' + uid + '"]').forEach(function(inp){
        var key = inp.getAttribute('data-key');
        inp.value = String(p[key] || '');
      });

      var firstName = String(adm.firstName || '').trim();
      var lastName  = String(adm.lastName || '').trim();

      rootEl.querySelectorAll('.pv-name[data-uid="' + uid + '"]').forEach(function(inp){
        var key = inp.getAttribute('data-key');
        if (key === 'firstName') inp.value = firstName;
        if (key === 'lastName') inp.value = lastName;
      });

      setMsg(uid, '', false);
    }).catch(function(e){
      setMsg(uid, (e && e.message) ? e.message : 'Could not load progress.', true);
    });
  }

  function closeEditor(uid){
    var row = rootEl.querySelector('.pv-editor-row[data-uid="' + uid + '"]');
    if (row) row.style.display = 'none';
    setMsg(uid, '', false);
  }

  function saveProgress(uid){
    var p = {};
    rootEl.querySelectorAll('.pv-prog[data-uid="' + uid + '"]').forEach(function(inp){
      var key = inp.getAttribute('data-key');
      var val = String(inp.value || '').trim();
      if (val) p[key] = val;
    });

    var firstName = '';
    var lastName = '';
    rootEl.querySelectorAll('.pv-name[data-uid="' + uid + '"]').forEach(function(inp){
      var key = inp.getAttribute('data-key');
      var val = String(inp.value || '').trim();
      if (key === 'firstName') firstName = val;
      if (key === 'lastName') lastName = val;
    });

    if (!firstName || !lastName){
      setMsg(uid, 'Please enter first name and surname.', true);
      return;
    }

    setMsg(uid, 'Saving…', false);

    var displayName = (firstName + ' ' + lastName.charAt(0).toUpperCase() + '.').trim();

    var batch = db.batch();

    var progressUpdate = {
      grooves: (p.grooves ? p.grooves : firebase.firestore.FieldValue.delete()),
      fills: (p.fills ? p.fills : firebase.firestore.FieldValue.delete()),
      hands: (p.hands ? p.hands : firebase.firestore.FieldValue.delete()),
      feet: (p.feet ? p.feet : firebase.firestore.FieldValue.delete())
    };

    batch.set(db.collection('users').doc(uid), {
      firstName: firstName,
      lastName: lastName,
      displayName: displayName
    }, { merge:true });
    batch.set(db.collection('users').doc(uid).collection('metrics').doc('progress'), progressUpdate, { merge:true });

    batch.commit().then(function(){
      setMsg(uid, '', false);
      window.VaultToast.success('Progress saved');

      var editBtn = rootEl.querySelector('.pv-edit-btn[data-uid="' + uid + '"]');
      if (editBtn) {
        var tr = editBtn.closest('tr');
        if (tr && tr.children && tr.children.length > 1) {
          tr.children[1].textContent = (firstName + ' ' + lastName).trim();
        }
      }
    }).catch(function(e){
      setMsg(uid, (e && e.message) ? e.message : 'Save failed.', true);
    });
  }

  function openUserDetailsModal(uid){
    // Find user data
    var userDoc = db.collection('users').doc(uid);
    var statsDoc = userDoc.collection('metrics').doc('stats');
    var progressDoc = userDoc.collection('metrics').doc('progress');
    var notesDoc = userDoc.collection('admin').doc('notes');
    
    Promise.all([
      userDoc.get(),
      statsDoc.get(),
      progressDoc.get(),
      notesDoc.get()
    ]).then(function(results){
      var userData = results[0].exists ? results[0].data() : {};
      var statsData = results[1].exists ? results[1].data() : {};
      var progressData = results[2].exists ? results[2].data() : {};
      var notesData = results[3].exists ? results[3].data() : {};
      
      var joinedAt = userData.createdAt;
      var lastLogin = statsData.lastLoginAt;
      
      // Create modal
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999;';
      
      var modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);';
      pvApplyFontFromBase(modal);
      
      modal.innerHTML = 
        '<h3 style="margin:0 0 20px 0;font-size:20px;">Student Details</h3>' +
        '<div class="p2" style="margin:0 0 20px 0;padding-bottom:20px;border-bottom:1px solid #ddd;">👤 ' + escapeHtml(userData.email || '') + ' Information</div>' +
        
        '<div style="margin-bottom:16px;">' +
          '<div style="font-size:13px;color:#666;margin-bottom:4px;">Joined</div>' +
          '<div style="font-size:15px;">' + formatDateOnly(joinedAt) + ' <span style="color:#999;font-size:14px;">' + formatRelativeTime(joinedAt) + '</span></div>' +
        '</div>' +
        
        '<div style="margin-bottom:16px;">' +
          '<div style="font-size:13px;color:#666;margin-bottom:4px;">Last Login</div>' +
          '<div style="font-size:15px;">' + formatTs(lastLogin) + ' <span style="color:#999;font-size:14px;">' + formatRelativeTime(lastLogin) + '</span></div>' +
        '</div>' +
        
        '<div style="margin-bottom:16px;">' +
          '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px;">Username</label>' +
          '<input type="text" id="modal-username" value="' + escapeHtml(userData.displayName || '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;">' +
        '</div>' +
        
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px;">First Name</label>' +
            '<input type="text" id="modal-firstname" value="' + escapeHtml(userData.firstName || '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px;">Last Name</label>' +
            '<input type="text" id="modal-lastname" value="' + escapeHtml(userData.lastName || '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;">' +
          '</div>' +
        '</div>' +
        
        '<div style="margin-bottom:4px;font-size:13px;color:#666;">Progress</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
          '<div>' +
            '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px;">Groove Studies</label>' +
            '<input type="text" id="modal-grooves" value="' + escapeHtml(progressData.grooves || '') + '" placeholder="(empty)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:14px;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px;">Fill Studies</label>' +
            '<input type="text" id="modal-fills" value="' + escapeHtml(progressData.fills || '') + '" placeholder="(empty)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:14px;">' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
          '<div>' +
            '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px;">Stick Studies</label>' +
            '<input type="text" id="modal-hands" value="' + escapeHtml(progressData.hands || '') + '" placeholder="(empty)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:14px;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px;">Kick Studies</label>' +
            '<input type="text" id="modal-feet" value="' + escapeHtml(progressData.feet || '') + '" placeholder="(empty)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:14px;">' +
          '</div>' +
        '</div>' +
        
        '<div style="margin-bottom:20px;">' +
          '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px;">Notes</label>' +
          '<textarea id="modal-notes" style="width:100%;min-height:80px;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:14px;resize:vertical;">' + escapeHtml(notesData.text || '') + '</textarea>' +
        '</div>' +
        
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="modal-cancel" style="padding:10px 20px;border:1px solid #ccc;background:#f3f3f3;border-radius:8px;cursor:pointer;font-size:14px;">Cancel</button>' +
          '<button id="modal-save" style="padding:10px 20px;border:1px solid #06b3fd;background:#06b3fd;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;">Save</button>' +
        '</div>';
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Close handlers
      overlay.addEventListener('click', function(e){
        if (e.target === overlay) overlay.remove();
      });
      
      modal.querySelector('#modal-cancel').addEventListener('click', function(){
        overlay.remove();
      });
      
      // Save handler
      modal.querySelector('#modal-save').addEventListener('click', function(){
        var updates = {
          displayName: modal.querySelector('#modal-username').value.trim(),
          firstName: modal.querySelector('#modal-firstname').value.trim(),
          lastName: modal.querySelector('#modal-lastname').value.trim()
        };
        
        var progressUpdates = {
          grooves: modal.querySelector('#modal-grooves').value.trim(),
          fills: modal.querySelector('#modal-fills').value.trim(),
          hands: modal.querySelector('#modal-hands').value.trim(),
          feet: modal.querySelector('#modal-feet').value.trim()
        };
        
        var notesText = modal.querySelector('#modal-notes').value.trim();
        
        Promise.all([
          userDoc.set(updates, { merge: true }),
          progressDoc.set(progressUpdates, { merge: true }),
          notesDoc.set({ text: notesText, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        ]).then(function(){
          overlay.remove();
          loadOnce(); // Reload the table
        }).catch(function(e){
          alert('Save failed: ' + (e.message || e));
        });
      });
      
    }).catch(function(e){
      alert('Failed to load user data: ' + (e.message || e));
    });
  }

  function bindHandlers(){
    rootEl.querySelectorAll('.pv-name-link').forEach(function(link){
      link.addEventListener('click', function(e){
        e.preventDefault();
        openUserDetailsModal(link.getAttribute('data-uid'));
      });
    });

    var addBtn = rootEl.querySelector('#pv-add-user-btn');
    if (addBtn) addBtn.addEventListener('click', function(){ openAddUserModal(db); });

    var invitesBtn = rootEl.querySelector('#pv-invites-btn');
    if (invitesBtn) invitesBtn.addEventListener('click', function(){ openInvitesModal(db); });
  }

  function render(users){
    var nowMs = Date.now();

    var online = users.filter(function(u){
      return (nowMs - tsToMs(u.lastActive)) <= ONLINE_WINDOW_MS;
    }).sort(function(a,b){ return tsToMs(b.lastActive) - tsToMs(a.lastActive); });

    users.sort(function(a,b){
      var aT = tsToMs(a.lastLogin) || tsToMs(a.joinedAt) || tsToMs(a.lastActive);
      var bT = tsToMs(b.lastLogin) || tsToMs(b.joinedAt) || tsToMs(b.lastActive);
      return bT - aT;
    });

    var onlineText = online.length
      ? ('🥁 ' + online.map(function(u){ return escapeHtml(u.email); }).join(', '))
      : 'No one online right now.';

    var html = '';
    html += '<div style="margin:0 0 18px 0;padding:18px 20px;border-radius:12px;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,0.12);">';
    html += '<h4 class="members-title" style="margin:0 0 10px 0;">CURRENTLY ONLINE</h4>';
    html += '<div style="font-size:14px;line-height:1.5;word-break:break-word;">' + onlineText + '</div>';
    html += '</div>';

    html += '<div style="padding:18px 20px;border-radius:12px;background:#fff;box-shadow:0 8px 28px rgba(0,0,0,0.12);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin:0 0 12px 0;">' +
              '<h4 class="members-title" style="margin:0;">STUDENT LIST</h4>' +
              '<div style="display:flex;gap:10px;align-items:center;">' +
                '<button id="pv-add-user-btn" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Add user</button>' +
                '<button id="pv-invites-btn" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Invites</button>' +
              '</div>' +
            '</div>';

    html += '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
    html += '<thead><tr>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Account</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Name</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Last Login</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Avg Time</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Total Time</th>';
    html += '</tr></thead><tbody>';

    if (!users.length) {
      html += '<tr><td colspan="5" style="padding:12px;opacity:.75;">No students yet.</td></tr>';
    } else {
      users.forEach(function(u){
        var isOnline = (nowMs - tsToMs(u.lastActive)) <= ONLINE_WINDOW_MS;
        var dot = statusDot(u.lastLogin, u.joinedAt);
        var device = String(u.lastDeviceEmoji || '').trim() || '❓';

        html += '<tr>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;"><a href="#" class="pv-name-link" data-uid="' + escapeHtml(u.uid) + '" style="color:#06b3fd;text-decoration:none;cursor:pointer;">' + (isOnline ? '🥁 ' : '') + escapeHtml(u.email) + '</a></td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + escapeHtml(u.fullName || '-') + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + dot + ' ' + formatTs(u.lastLogin) + ' ' + device + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatAvgTime(u.totalSeconds, u.loginCount) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatDuration(u.totalSeconds) + '</td>';
        html += '</tr>';
      });
    }

    html += '</tbody></table></div></div>';

    rootEl.innerHTML = html;
    bindHandlers();
  }

function loadOnce(){
  // Load users + per-user metrics/progress + filter out admins
  Promise.all([
    db.collection('users').get(),
    db.collection('admins').get()
  ]).then(function(results){
    var usersSnap = results[0];
    var adminSnap = results[1];
    
    // Build admin UID lookup
    var adminUids = {};
    adminSnap.forEach(function(doc){ adminUids[doc.id] = true; });
    
    var users = [];
    usersSnap.forEach(function(d){
      var data = d.data() || {};
      
      // Skip admins
      if (adminUids[d.id]) return;
      
      users.push({
        uid: d.id,
        email: data.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        displayName: data.displayName || '',
        joinedAt: data.createdAt || null,
        fullName: (data.firstName && data.lastName) ? (data.firstName + ' ' + data.lastName).trim() : (data.displayName || '-')
      });
    });

    var statGets = users.map(function(u){
      return db.collection('users').doc(u.uid).collection('metrics').doc('stats').get()
        .then(function(s){ return { uid: u.uid, data: (s.exists ? (s.data() || {}) : {}) }; });
    });

    var progGets = users.map(function(u){
      return db.collection('users').doc(u.uid).collection('metrics').doc('progress').get()
        .then(function(s){ return { uid: u.uid, data: (s.exists ? (s.data() || {}) : {}) }; });
    });

    return Promise.all([Promise.all(statGets), Promise.all(progGets)]).then(function(res){
      var statsArr = res[0];
      var progArr = res[1];

      var statsByUid = {};
      statsArr.forEach(function(x){ statsByUid[x.uid] = x.data || {}; });

      var progByUid = {};
      progArr.forEach(function(x){ progByUid[x.uid] = x.data || {}; });

      users.forEach(function(u){
        var st = statsByUid[u.uid] || {};
        var pr = progByUid[u.uid] || {};

        u.lastLogin = st.lastLoginAt || null;
        u.lastActive = st.lastSeenAt || st.lastLoginAt || null;
        u.lastDeviceType = st.lastDeviceType || '';
        u.lastDeviceEmoji = st.lastDeviceEmoji || '';
        u.loginCount = (typeof st.loginCount === 'number') ? st.loginCount : 0;
        u.totalSeconds = (typeof st.totalSeconds === 'number') ? st.totalSeconds : 0;
        u.progress = pr || {};
      });

      render(users);
    });
  }).catch(function(e){
    console.error(e);
    alert('Load error: ' + (e && e.message || e));
  });
}

  auth.onAuthStateChanged(function(user){
    showBody();

    if (!user) {
      rootEl.textContent = 'Please log in as admin.';
      return;
    }

    pvIsAdmin(user).then(function(ok){
      if (!ok) {
        rootEl.textContent = 'You do not have permission to view this page.';
        return;
      }

      loadOnce().catch(function(e){
        rootEl.textContent = (e && e.message) ? e.message : 'Error loading admin data.';
      });

      setInterval(function(){ loadOnce().catch(function(){}); }, 15000);
    });
  });
});
})();
