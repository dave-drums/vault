document.addEventListener('DOMContentLoaded', function () {
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
    var root0 = document.getElementById('vault-admin-root');
    showBody();
    if (root0) root0.textContent = 'Firebase not available.';
    return;
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  var adminEmail = 'info@davedrums.com.au';
  var rootEl = document.getElementById('vault-admin-root');
// ---------- Invite-only account creation (no Cloud Functions) ----------
var INVITES_COL = 'vault_invites';
var CREATE_ACCOUNT_URL_BASE = 'https://www.davedrums.com.au/create-account?t=';

function randomToken(len) {
  len = len || 24;
  try {
    var bytes = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out.slice(0, len * 2);
  } catch (e) {
    // Fallback (lower entropy, but acceptable for short-lived invites)
    return (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, len * 2);
  }
}

function openAddUserModal() {
  var overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999;';

  var box = document.createElement('div');
  box.style.cssText = 'width:100%;max-width:520px;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;';

  box.innerHTML =
    '<div style="color:#111;">' +
      '<h3 style="margin:0 0 12px 0;">Add user</h3>' +
      '<div style="margin:0 0 12px 0;opacity:.8;line-height:1.4;">Creates an invite link (expires in 7 days). If a valid pending invite already exists for this email, it will reuse it. The student sets their name and password on the create account page.</div>' +
      '<label style="display:block;margin:0 0 6px 0;">Email</label>' +
      '<input id="pv-invite-email" type="email" style="display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:6px;margin:0 0 14px 0;">' +

      '<div id="pv-invite-out" style="display:none;margin:10px 0 0 0;padding:12px;border:1px solid #ddd;background:#f3f3f3;border-radius:12px;word-break:break-word;"></div>' +

      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
        '<button id="pv-invite-cancel" style="padding:10px 12px;border-radius:6px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;font:inherit;">Close</button>' +
        '<button id="pv-invite-create" style="padding:10px 12px;border-radius:6px;border:1px solid #06b3fd;background:#06b3fd;color:#fff;cursor:pointer;font:inherit;">Create invite</button>' +
      '</div>' +
      '<div id="pv-invite-msg" style="text-align:center;margin-top:12px;min-height:18px;color:#c00;line-height:1.4;"></div>' +
    '</div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  box.querySelector('#pv-invite-cancel').addEventListener('click', close);

  box.querySelector('#pv-invite-create').addEventListener('click', function () {
    var btn = this;
    var msg = box.querySelector('#pv-invite-msg');
    var out = box.querySelector('#pv-invite-out');
    msg.textContent = '';
    out.style.display = 'none';
    out.textContent = '';

    var email = String(box.querySelector('#pv-invite-email').value || '').trim().toLowerCase();
    if (!email) {
      msg.textContent = 'Please enter an email address.';
      return;
    }

    btn.disabled = true;

    createInvite(email).then(function (inviteLink) {
      out.style.display = 'block';
      out.innerHTML =
        '<div style="font-weight:700;margin-bottom:6px;">Invite link</div>' +
        '<div style="font-size:14px;">' + escapeHtml(inviteLink) + '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">' +
          '<button id="pv-copy-invite" style="padding:8px 10px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;font:inherit;font-size:14px;">Copy</button>' +
        '</div>';

      out.querySelector('#pv-copy-invite').addEventListener('click', function () {
        copyText(inviteLink).then(function () {
          msg.style.color = '#111';
          msg.textContent = 'Copied.';
          setTimeout(function(){ msg.textContent=''; msg.style.color='#c00'; }, 1500);
        }).catch(function(){
          msg.textContent = 'Copy failed. Select and copy manually.';
        });
      });

      btn.disabled = false;

    }).catch(function (err) {
      console.error(err);
      msg.textContent = 'Could not create invite. Please try again.';
      btn.disabled = false;
    });
  });
}

function createInvite(email) {
  // Duplicate-prevention:
  // - If there's a valid pending invite for this email, reuse it
  // - If the pending invite is expired, create a new one
  // - If used, create a new one
  var nowMs = Date.now();

  return db.collection(INVITES_COL)
    .where('email', '==', email)
    .limit(25)
    .get()
    .then(function (snap) {
      var best = null;

      snap.forEach(function (doc) {
        var d = doc.data() || {};
        if (d.used === true) return;

        var expMs = 0;
        try { expMs = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().getTime() : 0; } catch (e) { expMs = 0; }
        if (!expMs) return;

        if (expMs <= nowMs) return; // expired

        // Keep the farthest expiry (most future)
        if (!best || expMs > best.expMs) {
          best = { id: doc.id, expMs: expMs };
        }
      });

      if (best && best.id) {
        return CREATE_ACCOUNT_URL_BASE + best.id;
      }

      // Create a fresh invite
      var token = randomToken(16);
      var expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      var ref = db.collection(INVITES_COL).doc(token);
      return ref.set({
        email: email,
        used: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expires)
      }).then(function () {
        return CREATE_ACCOUNT_URL_BASE + token;
      });
    });
}

function copyText(text) {
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------- Pending Invites modal ---------- */

function openPendingInvitesModal() {
  var overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999;';

  var box = document.createElement('div');
  box.style.cssText = 'width:100%;max-width:820px;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;';

  box.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
      '<h3 style="margin:0;">Pending invites</h3>' +
      '<button id="pv-pending-close" style="padding:8px 10px;border-radius:6px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;font:inherit;font-size:14px;">Close</button>' +
    '</div>' +
    '<div id="pv-pending-wrap" style="margin-top:14px;"></div>' +
    '<div id="pv-pending-msg" style="text-align:center;margin-top:12px;min-height:18px;color:#c00;line-height:1.4;"></div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  box.querySelector('#pv-pending-close').addEventListener('click', close);

  var wrap = box.querySelector('#pv-pending-wrap');
  var msg = box.querySelector('#pv-pending-msg');
  msg.textContent = 'Loading…';
  msg.style.color = '#111';

  loadPendingInvites().then(function (rowsHtml) {
    wrap.innerHTML = rowsHtml;
    msg.textContent = '';
    msg.style.color = '#c00';

    // Bind copy/delete
    wrap.querySelectorAll('[data-copy-link]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var link = btn.getAttribute('data-copy-link') || '';
        copyText(link).then(function () {
          msg.style.color = '#111';
          msg.textContent = 'Copied.';
          setTimeout(function(){ msg.textContent=''; msg.style.color='#c00'; }, 1500);
        }).catch(function(){
          msg.textContent = 'Copy failed. Select and copy manually.';
        });
      });
    });

    wrap.querySelectorAll('[data-del-token]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var token = btn.getAttribute('data-del-token');
        if (!token) return;
        btn.disabled = true;
        db.collection(INVITES_COL).doc(token).delete().then(function(){
          // refresh view quickly
          openPendingInvitesModal();
          close();
        }).catch(function(e){
          console.error(e);
          msg.textContent = (e && e.message) ? e.message : 'Delete failed.';
          btn.disabled = false;
        });
      });
    });

  }).catch(function (e) {
    console.error(e);
    msg.style.color = '#c00';
    msg.textContent = (e && e.message) ? e.message : 'Could not load invites.';
  });
}

function loadPendingInvites() {
  var nowMs = Date.now();

  return db.collection(INVITES_COL)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get()
    .then(function (snap) {
      var rows = [];
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        var email = String(d.email || '').trim();
        if (!email) return;

        var used = d.used === true;
        var expMs = 0;
        try { expMs = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().getTime() : 0; } catch (e) { expMs = 0; }
        var expired = expMs ? (expMs <= nowMs) : false;

        var status = used ? 'Used' : (expired ? 'Expired' : 'Pending');
        var statusBg = used ? '#f3f3f3' : (expired ? '#fff3cd' : '#e8f7ff');
        var link = CREATE_ACCOUNT_URL_BASE + doc.id;

        // We show all, but visually emphasise pending
        rows.push({
          id: doc.id,
          email: email,
          createdAt: d.createdAt || null,
          expiresAt: d.expiresAt || null,
          status: status,
          statusBg: statusBg,
          link: link,
          canDelete: true,
          isPending: (!used && !expired)
        });
      });

      // Pending first, then expired, then used
      rows.sort(function (a, b) {
        var aRank = a.status === 'Pending' ? 0 : (a.status === 'Expired' ? 1 : 2);
        var bRank = b.status === 'Pending' ? 0 : (b.status === 'Expired' ? 1 : 2);
        if (aRank !== bRank) return aRank - bRank;
        return (tsToMs(b.createdAt) - tsToMs(a.createdAt));
      });

      if (!rows.length) {
        return '<div style="opacity:.75;">No invites found.</div>';
      }

      var html = '';
      html += '<div style="overflow-x:auto;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
      html += '<thead><tr>';
      html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Email</th>';
      html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Created</th>';
      html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Expires</th>';
      html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Status</th>';
      html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Actions</th>';
      html += '</tr></thead><tbody>';

      rows.forEach(function (r) {
        html += '<tr>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + escapeHtml(r.email) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatTs(r.createdAt) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatTs(r.expiresAt) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' +
          '<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:' + r.statusBg + ';border:1px solid rgba(0,0,0,0.08);">' + r.status + '</span>' +
        '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' +
          '<button type="button" data-copy-link="' + escapeHtml(r.link) + '" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;cursor:pointer;">Copy link</button>' +
          '<button type="button" data-del-token="' + escapeHtml(r.id) + '" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;cursor:pointer;margin-left:8px;">Delete</button>' +
        '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
      return html;
    });
}



  function showBody() {
    if (document.body) document.body.style.opacity = '1';
  }

  if (!rootEl) return;
  showBody();

  var ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function tsToMs(ts) {
    if (!ts || !ts.toDate) return 0;
    try { return ts.toDate().getTime(); } catch (e) { return 0; }
  }

  function formatTs(ts) {
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

  function formatDateOnly(ts) {
    if (!ts || !ts.toDate) return '-';
    return ts.toDate().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Australia/Brisbane'
    });
  }

  function formatDuration(sec) {
    sec = Number(sec || 0);
    if (sec <= 0) return '0 min';
    var mins = Math.round(sec / 60);
    if (mins < 60) return mins + ' min';
    var hours = Math.floor(mins / 60);
    var rem = mins % 60;
    return rem === 0 ? hours + ' hrs' : hours + ' hrs ' + rem + ' min';
  }

  function formatAvgTime(totalSeconds, loginCount) {
    totalSeconds = Number(totalSeconds || 0);
    loginCount = Number(loginCount || 0);
    if (totalSeconds <= 0 || loginCount <= 0) return '0 min';
    return formatDuration(Math.round(totalSeconds / loginCount));
  }

  function statusDot(lastLoginTs, joinedAtTs) {
    var ms = tsToMs(lastLoginTs);
    if (!ms) ms = tsToMs(joinedAtTs);
    if (!ms) return '🔴';

    var days = (Date.now() - ms) / (1000 * 60 * 60 * 24);
    if (days < 14) return '🟢';
    if (days < 30) return '🟡';
    return '🔴';
  }

  function render(users) {
    var nowMs = Date.now();

    var online = users.filter(function (u) {
      return (nowMs - tsToMs(u.lastActive)) <= ONLINE_WINDOW_MS;
    }).sort(function (a, b) { return tsToMs(b.lastActive) - tsToMs(a.lastActive); });

    users.sort(function (a, b) {
      var aT = tsToMs(a.lastLogin) || tsToMs(a.joinedAt) || tsToMs(a.lastActive);
      var bT = tsToMs(b.lastLogin) || tsToMs(b.joinedAt) || tsToMs(b.lastActive);
      return bT - aT;
    });

    var onlineText = online.length
      ? ('🥁 ' + online.map(function (u) { return escapeHtml(u.email); }).join(', '))
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
        '<button id="pv-pending-invites-btn" style="padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f3f3f3;cursor:pointer;font:inherit;font-size:14px;">Pending Invites</button>' +
      '</div>' +
    '</div>';
    html += '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
    html += '<thead><tr>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Account</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Joined</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Last Login</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Avg Time</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Total Time</th>';
    html += '<th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;">Progress</th>';
    html += '</tr></thead><tbody>';

    if (!users.length) {
      html += '<tr><td colspan="6" style="padding:12px;opacity:.75;">No students yet.</td></tr>';
    } else {
      users.forEach(function (u) {
        var isOnline = (nowMs - tsToMs(u.lastActive)) <= ONLINE_WINDOW_MS;

        var dot = statusDot(u.lastLogin, u.joinedAt);
        var device = String(u.lastDeviceEmoji || '').trim();
        if (!device) device = '❓';
        var lastLoginText = formatTs(u.lastLogin);

        var uid = escapeHtml(u.uid);
        var email = escapeHtml(u.email);

        html += '<tr>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + (isOnline ? '🥁 ' : '') + email + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">' + formatDateOnly(u.joinedAt) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + dot + ' ' + lastLoginText + ' ' + device + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatAvgTime(u.totalSeconds, u.loginCount) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">' + formatDuration(u.totalSeconds) + '</td>';
        html += '<td style="padding:8px;border-bottom:1px solid #f0f0f0;">';
        html += '  <button type="button" class="pv-edit-btn" data-uid="' + uid + '" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;cursor:pointer;">Edit</button>';
        html += '  <span class="pv-save-msg" data-uid="' + uid + '" style="margin-left:8px;font-size:13px;opacity:.85;"></span>';
        html += '</td>';
        html += '</tr>';

        html += '<tr class="pv-editor-row" data-uid="' + uid + '" style="display:none;background:#fafafa;">';
        html += '<td colspan="6" style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">';
        html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:end;">';

        function inputBlock(label, key) {
          return (
            '<div style="display:flex;flex-direction:column;gap:6px;min-width:90px;flex:1;">' +
              '<div style="font-size:12px;opacity:.75;">' + label + '</div>' +
              '<input type="text" class="pv-prog" data-uid="' + uid + '" data-key="' + key + '" ' +
              'style="padding:10px;border:1px solid rgba(0,0,0,0.15);border-radius:10px;width:100%;box-sizing:border-box;" ' +
              'placeholder="(leave blank if not used)">' +
            '</div>'
          );
        }

        html += inputBlock('Groove Studies', 'grooves');
        html += inputBlock('Fill Studies', 'fills');
        html += inputBlock('Stick Studies', 'hands');
        html += inputBlock('Foot Control', 'feet');

        html += '<div style="display:flex;gap:8px;">';
        html += '  <button type="button" class="pv-save-btn" data-uid="' + uid + '" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);background:#111;color:#fff;cursor:pointer;">Save</button>';
        html += '  <button type="button" class="pv-cancel-btn" data-uid="' + uid + '" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);background:#fff;cursor:pointer;">Close</button>';
        html += '</div>';

        html += '</div>';
        html += '</td>';
        html += '</tr>';
      });
    }

    html += '</tbody></table></div></div>';

    rootEl.innerHTML = html;

    bindEditorHandlers();
  }

  function getMsgEl(uid) {
    return rootEl.querySelector('.pv-save-msg[data-uid="' + uid + '"]');
  }

  function setMsg(uid, text, isErr) {
    var el = getMsgEl(uid);
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isErr ? '#c00' : '#060';
  }

  function openEditor(uid) {
    var row = rootEl.querySelector('.pv-editor-row[data-uid="' + uid + '"]');
    if (!row) return;
    row.style.display = 'table-row';

    setMsg(uid, 'Loading…', false);

    db.collection('users_public').doc(uid).get().then(function (snap) {
      var data = snap.exists ? (snap.data() || {}) : {};
      var p = data.progress || {};

      var map = {
        grooves: p.grooves || '',
        fills: p.fills || '',
        hands: p.hands || '',
        feet: p.feet || ''
      };

      rootEl.querySelectorAll('.pv-prog[data-uid="' + uid + '"]').forEach(function (inp) {
        var key = inp.getAttribute('data-key');
        inp.value = map[key] || '';
      });

      setMsg(uid, '', false);
    }).catch(function (e) {
      setMsg(uid, (e && e.message) ? e.message : 'Could not load progress.', true);
    });
  }

  function closeEditor(uid) {
    var row = rootEl.querySelector('.pv-editor-row[data-uid="' + uid + '"]');
    if (row) row.style.display = 'none';
    setMsg(uid, '', false);
  }

  function saveProgress(uid) {
    var p = {};
    rootEl.querySelectorAll('.pv-prog[data-uid="' + uid + '"]').forEach(function (inp) {
      var key = inp.getAttribute('data-key');
      var val = String(inp.value || '').trim();
      if (val) p[key] = val;
    });

    setMsg(uid, 'Saving…', false);

    var update = Object.keys(p).length
      ? { progress: p }
      : { progress: firebase.firestore.FieldValue.delete() };

    db.collection('users_public').doc(uid).set(update, { merge: true }).then(function () {
      setMsg(uid, 'Saved.', false);
      setTimeout(function () { setMsg(uid, '', false); }, 1500);
    }).catch(function (e) {
      setMsg(uid, (e && e.message) ? e.message : 'Save failed.', true);
    });
  }

  function bindEditorHandlers() {
    rootEl.querySelectorAll('.pv-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openEditor(btn.getAttribute('data-uid'));
      });
    });

    rootEl.querySelectorAll('.pv-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveProgress(btn.getAttribute('data-uid'));
      });
    });

    rootEl.querySelectorAll('.pv-cancel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeEditor(btn.getAttribute('data-uid'));
      });
    });
var addBtn = rootEl.querySelector('#pv-add-user-btn');
if (addBtn) {
  addBtn.addEventListener('click', function () {
    openAddUserModal();
  });
}


var pendingBtn = rootEl.querySelector('#pv-pending-invites-btn');
if (pendingBtn) {
  pendingBtn.addEventListener('click', function () {
    openPendingInvitesModal();
  });
}

  }

  
function loadOnce() {
  Promise.all([
    db.collection('users_admin').get(),
    db.collection('users_public').get()
  ]).then(function(results){
    var adminSnap = results[0];
    var publicSnap = results[1];

    var publicByUid = {};
    publicSnap.forEach(function(doc){
      publicByUid[doc.id] = doc.data() || {};
    });

    users = [];

    adminSnap.forEach(function(doc){
      var d = doc.data() || {};
      var p = publicByUid[doc.id] || {};

      users.push({
        uid: doc.id,
        email: d.email || p.email || '',
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        name: d.name || ((d.firstName || '') + ' ' + (d.lastName || '')).trim(),
        role: d.role || 'student',
        joined: p.joined || d.joinedAt || null,
        lastLogin: d.lastLogin || null,
        lastActive: d.lastActive || null,
        totalSeconds: d.totalSeconds || 0,
        loginCount: d.loginCount || 0,
        lastDeviceEmoji: d.lastDeviceEmoji || ''
      });
    });

    render();
  });
}
);
      });
      render(users);
    });
  }

  rootEl.textContent = 'Loading admin data…';

  auth.onAuthStateChanged(function (user) {
    showBody();
    if (!user) {
      rootEl.textContent = 'Please log in as admin.';
      return;
    }

    if ((user.email || '').toLowerCase() !== adminEmail.toLowerCase()) {
      rootEl.textContent = 'You do not have permission to view this page.';
      return;
    }

    loadOnce().catch(function (e) {
      rootEl.textContent = (e && e.message) ? e.message : 'Error loading admin data.';
    });

    setInterval(function () {
      loadOnce().catch(function () {});
    }, 15000);
  });
});

