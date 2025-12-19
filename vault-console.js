(function(){
/* Vault Admin Console - FIXED
   Fixes:
   - Progress checkmarks now work (proper Firestore nested update)
   - h4 headers (not bold)
   - Removed "Information" from profile header
   - Removed progress section from profile modal
*/

/* ---------- Font helpers ---------- */
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
    '<h4 style="margin:0 0 12px 0;color:#111;font-size:16px;font-weight:400;">Add User</h4>' +
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
    '<h4 style="margin:0 0 12px 0;color:#111;font-size:16px;font-weight:400;">Invites</h4>' +
    '<div id="pv-invites-list" style="margin-top:10px;font:inherit;color:#111;"></div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
      '<button id="pv-invites-close" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Close</button>' +
    '</div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close(){ overlay.remove(); }
  box.querySelector('#pv-invites-close').addEventListener('click', close);

  var listEl = box.querySelector('#pv-invites-list');

  db.collection(INVITES_COL).orderBy('createdAt', 'desc').limit(50).get()
    .then(function(snap){
      if (snap.empty) {
        listEl.textContent = 'No invites yet.';
        return;
      }

      var tbl = '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
                '<thead><tr>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Email</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Status</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Created</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Expires</th>' +
                '</tr></thead><tbody>';

      snap.forEach(function(doc){
        var d = doc.data();
        var email = d.email || '-';
        var used = d.used === true;
        var createdAt = d.createdAt ? formatDateOnly(d.createdAt) : '-';
        var expiresAt = d.expiresAt ? formatDateOnly(d.expiresAt) : '-';

        var status = used ? 'Used' : 'Active';
        var statusColor = used ? '#999' : '#0a0';

        tbl += '<tr>';
        tbl += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + escapeHtml(email) + '</td>';
        tbl += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;color:' + statusColor + ';">' + status + '</td>';
        tbl += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + createdAt + '</td>';
        tbl += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + expiresAt + '</td>';
        tbl += '</tr>';
      });

      tbl += '</tbody></table>';
      listEl.innerHTML = tbl;
    })
    .catch(function(){
      listEl.textContent = 'Error loading invites.';
    });
}

var ONLINE_WINDOW_MS = 3 * 60 * 1000;

var db;
var auth;
var rootEl;

document.addEventListener('DOMContentLoaded', function(){
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  auth = firebase.auth();
  db = firebase.firestore();
  rootEl = document.getElementById('vault-admin-root');
  if (!rootEl) return;

  function pvIsAdmin(user){
    if (!user || !user.uid) return Promise.resolve(false);
    return db.collection('admins').doc(user.uid).get()
      .then(function(doc){ return doc.exists; })
      .catch(function(){ return false; });
  }

  function openProfileModal(db, student){
    openUserDetailsModal(student.uid);
  }

  function openUserDetailsModal(uid){
    var userDoc = db.collection('users').doc(uid);
    var statsDoc = userDoc.collection('metrics').doc('stats');
    var notesDoc = userDoc.collection('admin').doc('notes');
    
    Promise.all([
      userDoc.get(),
      statsDoc.get(),
      notesDoc.get()
    ]).then(function(results){
      var userData = results[0].exists ? results[0].data() : {};
      var statsData = results[1].exists ? results[1].data() : {};
      var notesData = results[2].exists ? results[2].data() : {};
      
      var joinedAt = userData.createdAt;
      var lastLogin = statsData.lastLoginAt;
      
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999;';
      
      var modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);';
      pvApplyFontFromBase(modal);
      
      // FIXED: Removed "Information", removed Progress section, h4 not bold
      modal.innerHTML = 
        '<h4 style="margin:0 0 20px 0;font-size:20px;font-weight:400;">Student Details</h4>' +
        '<div class="p2" style="margin:0 0 20px 0;padding-bottom:20px;border-bottom:1px solid #ddd;">👤 ' + escapeHtml(userData.email || '') + '</div>' +
        
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
        
        '<div style="margin-bottom:16px;">' +
          '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px;" id="modal-dob-label">Date of Birth</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="text" id="modal-dob-day" placeholder="DD" maxlength="2" style="width:60px;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;text-align:center;">' +
            '<span style="color:#999;">/</span>' +
            '<input type="text" id="modal-dob-month" placeholder="MM" maxlength="2" style="width:60px;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;text-align:center;">' +
            '<span style="color:#999;">/</span>' +
            '<input type="text" id="modal-dob-year" placeholder="YYYY" maxlength="4" style="width:90px;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;text-align:center;">' +
          '</div>' +
          '<div id="modal-dob-age" style="margin-top:6px;font-size:12px;color:#666;"></div>' +
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
      
      var birthdate = userData.birthdate || '';
      if (birthdate) {
        var parts = birthdate.split('/');
        if (parts.length === 3) {
          modal.querySelector('#modal-dob-day').value = parts[0];
          modal.querySelector('#modal-dob-month').value = parts[1];
          modal.querySelector('#modal-dob-year').value = parts[2];
        }
      }
      
      function updateAge() {
        var day = modal.querySelector('#modal-dob-day').value.trim();
        var month = modal.querySelector('#modal-dob-month').value.trim();
        var year = modal.querySelector('#modal-dob-year').value.trim();
        var ageDiv = modal.querySelector('#modal-dob-age');
        var labelDiv = modal.querySelector('#modal-dob-label');
        
        if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
          var birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(birthDate.getTime())) {
            var today = new Date();
            var ageYears = today.getFullYear() - birthDate.getFullYear();
            var monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              ageYears--;
              monthDiff = monthDiff < 0 ? 12 + monthDiff : 11;
            }
            
            if (monthDiff < 0) monthDiff = 0;
            
            ageDiv.textContent = ageYears + ' years, ' + Math.abs(monthDiff) + ' months';
            labelDiv.textContent = 'Date of Birth';
            return;
          }
        }
        
        ageDiv.textContent = '';
        labelDiv.textContent = 'Date of Birth';
      }
      
      modal.querySelector('#modal-dob-day').addEventListener('input', updateAge);
      modal.querySelector('#modal-dob-month').addEventListener('input', updateAge);
      modal.querySelector('#modal-dob-year').addEventListener('input', updateAge);
      
      updateAge();
      
      overlay.addEventListener('click', function(e){
        if (e.target === overlay) overlay.remove();
      });
      
      modal.querySelector('#modal-cancel').addEventListener('click', function(){
        overlay.remove();
      });
      
      modal.querySelector('#modal-save').addEventListener('click', function(){
        var dobDay = modal.querySelector('#modal-dob-day').value.trim();
        var dobMonth = modal.querySelector('#modal-dob-month').value.trim();
        var dobYear = modal.querySelector('#modal-dob-year').value.trim();
        var birthdate = '';
        
        if (dobDay && dobMonth && dobYear) {
          dobDay = dobDay.padStart(2, '0');
          dobMonth = dobMonth.padStart(2, '0');
          birthdate = dobDay + '/' + dobMonth + '/' + dobYear;
        }
        
        var updates = {
          displayName: modal.querySelector('#modal-username').value.trim(),
          firstName: modal.querySelector('#modal-firstname').value.trim(),
          lastName: modal.querySelector('#modal-lastname').value.trim(),
          birthdate: birthdate
        };
        
        var notesText = modal.querySelector('#modal-notes').value.trim();
        
        Promise.all([
          userDoc.set(updates, { merge: true }),
          notesDoc.set({ text: notesText, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        ]).then(function(){
          overlay.remove();
          loadOnce();
        }).catch(function(e){
          alert('Save failed: ' + (e.message || e));
        });
      });
      
    }).catch(function(e){
      alert('Failed to load user data: ' + (e.message || e));
    });
  }

  /* ---------- Progress Modal ---------- */
  function openProgressModal(db, uid, displayName){
    var overlay = makeOverlay();

    var box = document.createElement('div');
    box.style.cssText = 'width:100%;max-width:600px;background:#fff;border-radius:12px;' +
      'box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;max-height:90vh;overflow-y:auto;';
    pvApplyFontFromBase(box);

    // FIXED: h4 not bold
    var header = document.createElement('h4');
    header.textContent = 'Progress: ' + displayName;
    header.style.cssText = 'margin:0 0 16px 0;color:#111;font-size:16px;font-weight:400;';
    box.appendChild(header);

    var selfProgressContainer = document.createElement('div');
    selfProgressContainer.style.cssText = 'margin-bottom:20px;padding:12px;background:#f9f9f9;border-radius:8px;';
    
    var selfProgressLabel = document.createElement('label');
    selfProgressLabel.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer;';
    
    var selfProgressCheckbox = document.createElement('input');
    selfProgressCheckbox.type = 'checkbox';
    selfProgressCheckbox.id = 'admin-self-progress';
    selfProgressCheckbox.style.cssText = 'width:18px;height:18px;cursor:pointer;';
    
    var selfProgressText = document.createElement('span');
    selfProgressText.textContent = 'Allow self-progress (user can mark lessons complete)';
    selfProgressText.style.cssText = 'font-size:14px;color:#333;';
    
    selfProgressLabel.appendChild(selfProgressCheckbox);
    selfProgressLabel.appendChild(selfProgressText);
    selfProgressContainer.appendChild(selfProgressLabel);
    box.appendChild(selfProgressContainer);

    db.collection('users').doc(uid).get().then(function(userSnap){
      if (userSnap.exists) {
        selfProgressCheckbox.checked = userSnap.data().selfProgress === true;
      }
    });

    selfProgressCheckbox.addEventListener('change', function(){
      db.collection('users').doc(uid).set({
        selfProgress: selfProgressCheckbox.checked
      }, { merge: true })
      .then(function(){
        window.VaultToast.success('Self-progress ' + (selfProgressCheckbox.checked ? 'enabled' : 'disabled'));
      })
      .catch(function(e){
        console.error('Failed to update selfProgress:', e);
        window.VaultToast.error('Failed to update');
      });
    });

    var courseLabel = document.createElement('label');
    courseLabel.textContent = 'Select Course:';
    courseLabel.style.cssText = 'display:block;margin:0 0 6px 0;font-weight:600;color:#111;';
    box.appendChild(courseLabel);

    var courseSelect = document.createElement('select');
    courseSelect.style.cssText = 'display:block;width:100%;padding:10px;border:1px solid #ccc;' +
      'border-radius:6px;margin-bottom:16px;font:inherit;';
    
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Choose a course --';
    courseSelect.appendChild(defaultOption);

    if (window.VAULT_COURSES) {
      Object.keys(window.VAULT_COURSES).forEach(function(courseId){
        var course = window.VAULT_COURSES[courseId];
        var opt = document.createElement('option');
        opt.value = courseId;
        opt.textContent = course.name + ' (' + courseId + ')';
        courseSelect.appendChild(opt);
      });
    }

    box.appendChild(courseSelect);

    var checklistContainer = document.createElement('div');
    checklistContainer.id = 'admin-lesson-checklist';
    checklistContainer.style.cssText = 'display:none;max-height:400px;overflow-y:auto;' +
      'border:1px solid #ddd;border-radius:8px;padding:12px;background:#fafafa;';
    box.appendChild(checklistContainer);

    courseSelect.addEventListener('change', function(){
      var courseId = courseSelect.value;
      if (!courseId) {
        checklistContainer.style.display = 'none';
        return;
      }

      renderLessonChecklist(db, uid, courseId, checklistContainer);
    });

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.type = 'button';
    closeBtn.style.cssText = 'margin-top:16px;padding:10px 20px;border-radius:6px;border:1px solid #ccc;' +
      'background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;';
    closeBtn.addEventListener('click', function(){ overlay.remove(); });
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function renderLessonChecklist(db, uid, courseId, container){
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Loading...</div>';
    container.style.display = 'block';

    var courseConfig = window.VAULT_COURSES && window.VAULT_COURSES[courseId];
    if (!courseConfig) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Course not configured</div>';
      return;
    }

    db.collection('users').doc(uid).collection('progress').doc(courseId).get()
      .then(function(snap){
        var completed = {};
        if (snap.exists) {
          completed = snap.data().completed || {};
        }

        container.innerHTML = '';

        var list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

        courseConfig.lessons.forEach(function(lessonId){
          var item = document.createElement('label');
          item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;' +
            'background:#fff;border:1px solid #ddd;border-radius:6px;cursor:pointer;' +
            'transition:all 0.2s ease;';
          
          item.addEventListener('mouseenter', function(){
            item.style.background = '#f5f5f5';
          });
          item.addEventListener('mouseleave', function(){
            item.style.background = '#fff';
          });

          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = completed[lessonId] === true;
          checkbox.style.cssText = 'width:18px;height:18px;cursor:pointer;';
          
          checkbox.addEventListener('change', function(){
            toggleAdminCompletion(db, uid, courseId, lessonId, checkbox.checked);
          });

          var label = document.createElement('span');
          label.textContent = 'Lesson ' + lessonId;
          label.style.cssText = 'font-size:14px;color:#333;';

          item.appendChild(checkbox);
          item.appendChild(label);
          list.appendChild(item);
        });

        container.appendChild(list);
      })
      .catch(function(e){
        console.error('Failed to load progress:', e);
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#c00;">Error loading progress</div>';
      });
  }

  // FIXED: Proper Firestore nested field update using dot notation
  function toggleAdminCompletion(db, uid, courseId, lessonId, newState){
    var update = {};
    update['completed.' + lessonId] = newState; // Use dot notation for nested field
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    db.collection('users').doc(uid).collection('progress').doc(courseId)
      .set(update, { merge: true })
      .then(function(){
        window.VaultToast.success('Updated: Lesson ' + lessonId);
      })
      .catch(function(e){
        console.error('Failed to update:', e);
        window.VaultToast.error('Update failed');
      });
  }

  function bindHandlers(){
    rootEl.querySelectorAll('.pv-name-link').forEach(function(link){
      link.addEventListener('click', function(e){
        e.preventDefault();
        openUserDetailsModal(link.getAttribute('data-uid'));
      });
    });

    rootEl.querySelectorAll('.pv-profile-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var uid = btn.getAttribute('data-uid');
        openUserDetailsModal(uid);
      });
    });

    rootEl.querySelectorAll('.pv-progress-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var uid = btn.getAttribute('data-uid');
        var displayName = btn.getAttribute('data-name');
        openProgressModal(db, uid, displayName);
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
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Actions</th>';
    html += '</tr></thead><tbody>';

    if (!users.length) {
      html += '<tr><td colspan="6" style="padding:12px;opacity:.75;">No students yet.</td></tr>';
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
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' +
          '<button class="pv-profile-btn" data-uid="' + escapeHtml(u.uid) + '" style="padding:4px 10px;margin-right:6px;border-radius:6px;border:1px solid #06b3fd;background:#06b3fd;color:#fff;cursor:pointer;font-size:12px;">Profile</button>' +
          '<button class="pv-progress-btn" data-uid="' + escapeHtml(u.uid) + '" data-name="' + escapeHtml(u.fullName || u.email) + '" style="padding:4px 10px;border-radius:6px;border:1px solid #10b981;background:#10b981;color:#fff;cursor:pointer;font-size:12px;">Progress</button>' +
        '</td>';
        html += '</tr>';
      });
    }

    html += '</tbody></table></div></div>';

    rootEl.innerHTML = html;
    bindHandlers();
  }

function loadOnce(){
  Promise.all([
    db.collection('users').get(),
    db.collection('admins').get()
  ]).then(function(results){
    var usersSnap = results[0];
    var adminSnap = results[1];
    
    var adminUids = {};
    adminSnap.forEach(function(doc){ adminUids[doc.id] = true; });
    
    var users = [];
    usersSnap.forEach(function(d){
      var data = d.data() || {};
      
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
