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
    html += '<h4 class="members-title" style="margin:0 0 12px 0;">STUDENT LIST</h4>';
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
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">';

        function inputBlock(label, key) {
          return (
            '<div style="display:flex;flex-direction:column;gap:6px;min-width:180px;flex:1;">' +
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
  }

  function loadOnce() {
    return db.collection('users_admin').get().then(function (snap) {
      var users = [];
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        var email = String(d.email || '').trim();

        if (email.toLowerCase() === adminEmail.toLowerCase()) return;
        if (!email) return;

        users.push({
          uid: doc.id,
          email: email,
          joinedAt: d.joinedAt || null,
          lastLogin: d.lastLogin || null,
          lastActive: d.lastActive || null,
          lastDeviceEmoji: d.lastDeviceEmoji || '',
          totalSeconds: d.totalSeconds || 0,
          loginCount: d.loginCount || 0
        });
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
