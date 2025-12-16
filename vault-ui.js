document.addEventListener('DOMContentLoaded', function () {
  var tries = 0;

  function start(){
    tries++;
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      if (tries < 80) return setTimeout(start, 50); // wait up to ~4 seconds
      return;
    }

    var auth = firebase.auth();
    var db = firebase.firestore();

    // ------------------------------
    // Login metrics (once per tab session)
    // Prevents loginCount/lastLoginAt from incrementing on every refresh.
    // ------------------------------
    var LOGIN_MARK_PREFIX = 'vault_login_mark_v1:'; // per-user
    var LAST_UID_KEY = 'vault_last_uid_v1';

    function markKeyForUser(uid){
      return LOGIN_MARK_PREFIX + uid;
    }

    function hasMarkedLogin(uid){
      try { return sessionStorage.getItem(markKeyForUser(uid)) === '1'; } catch(_) { return false; }
    }

    function markLogin(uid){
      try { sessionStorage.setItem(markKeyForUser(uid), '1'); sessionStorage.setItem(LAST_UID_KEY, uid); } catch(_) {}
    }

    function clearLoginMark(uid){
      try { if (uid) sessionStorage.removeItem(markKeyForUser(uid)); } catch(_) {}
    }

    function clearAllLoginMarks(){
      try{
        for (var i = sessionStorage.length - 1; i >= 0; i--){
          var k = sessionStorage.key(i);
          if (k && k.indexOf(LOGIN_MARK_PREFIX) === 0) sessionStorage.removeItem(k);
        }
        sessionStorage.removeItem(LAST_UID_KEY);
      } catch(_){}
    }

    function detectDevice(){
      try {
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
        var coarse = false;
        try {
          coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        } catch(_) {}

        if (isTouch || coarse) return { type: 'mobile', emoji: '📱' };
        return { type: 'desktop', emoji: '🖥️' };
      } catch(e) {
        return { type: 'other', emoji: '🧩' };
      }
    }

    function recordLoginOnce(user){
      if (!user || !user.uid) return;
      if (hasMarkedLogin(user.uid)) return;

      markLogin(user.uid);

      var device = detectDevice();

      // Store user profile data in users/<uid>
      var userDoc = db.collection('users').doc(user.uid);
      userDoc.set({
        email: user.email || null
      }, { merge: true }).catch(function(){});

      // Store metrics in users/<uid>/metrics/stats
      var statsDoc = userDoc.collection('metrics').doc('stats');
      statsDoc.set({
        loginCount: firebase.firestore.FieldValue.increment(1),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastDeviceType: device.type,
        lastDeviceEmoji: device.emoji
      }, { merge: true }).catch(function(){});
    }

    // Edit these if your URLs differ
    var VAULT_URL = '/vault';
    var SUPPORT_URL = '/contact';

    var loginBox = document.getElementById('members-login');
    var accountBox = document.getElementById('members-account');

    var titleEl =
      document.getElementById('members-title') ||
      document.querySelector('.members-title');

    var msgEl = document.getElementById('members-message');

    var emailInput =
      document.getElementById('auth-email') ||
      document.getElementById('members-email');

    var passInput =
      document.getElementById('auth-password') ||
      document.getElementById('members-pass');

    var loginBtn = document.getElementById('login-btn');
    var resetLink = document.getElementById('reset-link');

    var logoutBtn = document.getElementById('logout-btn');

    var btnRow = null;
    if (accountBox) {
      btnRow = accountBox.querySelector('.account-btn-row');
      if (!btnRow) {
        btnRow = document.createElement('div');
        btnRow.className = 'account-btn-row';
        btnRow.style.display = 'grid';
        btnRow.style.gap = '10px';
        btnRow.style.marginTop = '16px';
        accountBox.insertBefore(btnRow, logoutBtn || null);
      }
    }

    // create account text AFTER btnRow exists
    var accountTextEl = document.getElementById('members-account-text');
    if (!accountTextEl && accountBox) {
      accountTextEl = document.createElement('div');
      accountTextEl.id = 'members-account-text';
      accountTextEl.style.marginBottom = '18px';
      if (btnRow) accountBox.insertBefore(accountTextEl, btnRow);
      else accountBox.appendChild(accountTextEl);
    }

    function setTitle(t){ if (titleEl) titleEl.textContent = t; }

    function setMessage(text) {
      if (!msgEl) return;
      msgEl.textContent = String(text || '').trim();
    }

    function clearMessage(){ setMessage(''); }

    function showLogin(){
      if (loginBox) loginBox.style.display = 'block';
      if (accountBox) accountBox.style.display = 'none';
      setTitle('MEMBER LOGIN');
      clearMessage();
    }

    function showAccount(user){
      if (loginBox) loginBox.style.display = 'none';
      if (accountBox) accountBox.style.display = 'block';
      setTitle('ACCOUNT');
      clearMessage();

      if (accountTextEl) {
        accountTextEl.textContent = 'Logged in as ' + (user && user.email ? user.email : '');
        accountTextEl.style.marginBottom = '18px';
      }

      buildAccountButtons(user);
    }

    function mkAccountBtn(tag, text, href) {
      var el = document.createElement(tag);
      el.className = 'account-btn';
      el.textContent = text;

      if (tag === 'a') {
        el.href = href || '#';
        el.style.display = 'block';
      } else {
        el.type = 'button';
      }
      return el;
    }

    function stylePrimaryBlue(el) {
      // Match your existing blue buttons (login button styling)
      el.style.background = '#06b3fd';
      el.style.borderColor = '#06b3fd';
      el.style.color = '#fff';
      el.style.cursor = 'pointer';
    }

    function mkPanel() {
      var p = document.createElement('div');
      p.style.display = 'none';
      p.style.border = '1px solid #ccc';
      p.style.borderRadius = '6px';
      p.style.padding = '14px';
      p.style.background = '#fff';
      p.style.marginTop = '-6px';
      return p;
    }

    function mkLabel(text) {
      var l = document.createElement('label');
      l.textContent = text;
      l.style.display = 'block';
      l.style.marginBottom = '6px';
      return l;
    }

    function mkInput(type) {
      var i = document.createElement('input');
      i.type = type;
      i.style.display = 'block';
      i.style.width = '100%';
      i.style.boxSizing = 'border-box';
      i.style.padding = '10px';
      i.style.border = '1px solid #ccc';
      i.style.borderRadius = '6px';
      i.style.marginBottom = '14px';
      return i;
    }

    function mkInlineBtn(text, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.padding = '10px 12px';
      b.style.borderRadius = '6px';
      b.style.border = '1px solid #ccc';
      b.style.background = '#f4f4f4';
      b.style.cursor = 'pointer';
      b.style.font = 'inherit';
      if (primary) stylePrimaryBlue(b);
      return b;
    }

    function togglePanel(panel, closeOthers) {
      if (!panel) return;
      var isOpen = panel.style.display === 'block';

      if (closeOthers) {
        var panels = btnRow ? btnRow.querySelectorAll('[data-panel="true"]') : [];
        for (var i = 0; i < panels.length; i++) panels[i].style.display = 'none';
      }

      panel.style.display = isOpen ? 'none' : 'block';
    }

    function buildAccountButtons(user) {
  if (!btnRow) return;

  // Clear existing row buttons
  btnRow.innerHTML = '';

  // Load progress data first, then build UI
  db.collection('users').doc(user.uid).collection('metrics').doc('progress').get().then(function(progSnap){
    var prog = (progSnap.exists ? progSnap.data() : null) || {};
    var hasProgress = !!(prog.grooves || prog.fills || prog.hands || prog.feet);

    // Now build all buttons in order

    // 1) Open Practice Vault (primary)
    var openVault = mkAccountBtn('a', 'Open Practice Vault', VAULT_URL);
    stylePrimaryBlue(openVault);
    btnRow.appendChild(openVault);

    // 2) My Progress (only if progress exists)
    if (hasProgress) {
      var progBtn = mkAccountBtn('button', 'My Progress');
      var progPanel = mkPanel();
      progPanel.setAttribute('data-panel', 'true');

      var grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gap = '12px';
      grid.style.marginBottom = '14px';

      function mkCard(title, value){
        var card = document.createElement('div');
        card.style.padding = '12px';
        card.style.border = '1px solid #ddd';
        card.style.borderRadius = '8px';
        card.style.background = '#f9f9f9';
        
        var titleEl = document.createElement('div');
        titleEl.style.fontSize = '13px';
        titleEl.style.opacity = '0.75';
        titleEl.style.marginBottom = '6px';
        titleEl.textContent = title;
        
        var valueEl = document.createElement('div');
        valueEl.style.fontSize = '18px';
        valueEl.style.fontWeight = '600';
        valueEl.textContent = value || '-';
        
        card.appendChild(titleEl);
        card.appendChild(valueEl);
        return card;
      }

      grid.appendChild(mkCard('Groove Studies', prog.grooves));
      grid.appendChild(mkCard('Fill Studies', prog.fills));
      grid.appendChild(mkCard('Stick Studies', prog.hands));
      grid.appendChild(mkCard('Foot Control', prog.feet));

      progPanel.appendChild(grid);

      var progClose = mkInlineBtn('Close', false);
      progClose.addEventListener('click', function(){ progPanel.style.display = 'none'; });
      progPanel.appendChild(progClose);

      progBtn.addEventListener('click', function(){ clearMessage(); togglePanel(progPanel, true); });

      btnRow.appendChild(progBtn);
      btnRow.appendChild(progPanel);
    }

    // 3) Change Name (accordion)
    var nameBtn = mkAccountBtn('button', 'Change Name');
    var namePanel = mkPanel();
    namePanel.setAttribute('data-panel', 'true');

    var fn = mkInput('text');
    var ln = mkInput('text');
    namePanel.appendChild(mkLabel('First name'));
    namePanel.appendChild(fn);
    namePanel.appendChild(mkLabel('Last name'));
    namePanel.appendChild(ln);

    var nameActions = document.createElement('div');
    nameActions.style.display = 'flex';
    nameActions.style.gap = '10px';
    nameActions.style.justifyContent = 'flex-end';

    var nameClose = mkInlineBtn('Close', false);
    var nameSave = mkInlineBtn('Save', true);

    nameActions.appendChild(nameClose);
    nameActions.appendChild(nameSave);
    namePanel.appendChild(nameActions);

    nameBtn.addEventListener('click', function(){ clearMessage(); togglePanel(namePanel, true); });
    nameClose.addEventListener('click', function(){ namePanel.style.display = 'none'; });

    // preload existing name (blank if none)
    db.collection('users').doc(user.uid).get().then(function(snap){
      if (!snap.exists) return;
      var d = snap.data() || {};
      fn.value = String(d.firstName || '').trim();
      ln.value = String(d.lastName || '').trim();
    }).catch(function(){});

    nameSave.addEventListener('click', function(){
      clearMessage();
      var firstName = String(fn.value || '').trim();
      var lastName = String(ln.value || '').trim();

      if (!firstName || !lastName) {
        setMessage('Please enter your first and last name.');
        return;
      }

      var displayName = (firstName + ' ' + lastName.charAt(0).toUpperCase() + '.').trim();

      db.collection('users').doc(user.uid).set({
        firstName: firstName,
        lastName: lastName,
        displayName: displayName
      }, { merge: true }).then(function(){
        namePanel.style.display = 'none';
      }).catch(function(e){
        setMessage(e && e.message ? e.message : 'Missing or insufficient permissions.');
      });
    });

    btnRow.appendChild(nameBtn);
    btnRow.appendChild(namePanel);

    // 4) Change Password (accordion)
    var pwBtn = mkAccountBtn('button', 'Change Password');
    var pwPanel = mkPanel();
    pwPanel.setAttribute('data-panel', 'true');

    var curPw = mkInput('password');
    var newPw = mkInput('password');
    var newPw2 = mkInput('password');

    pwPanel.appendChild(mkLabel('Current password'));
    pwPanel.appendChild(curPw);
    pwPanel.appendChild(mkLabel('New password'));
    pwPanel.appendChild(newPw);
    pwPanel.appendChild(mkLabel('Repeat new password'));
    pwPanel.appendChild(newPw2);

    var pwActions = document.createElement('div');
    pwActions.style.display = 'flex';
    pwActions.style.gap = '10px';
    pwActions.style.justifyContent = 'flex-end';

    var pwClose = mkInlineBtn('Close', false);
    var pwSave = mkInlineBtn('Update', true);

    pwActions.appendChild(pwClose);
    pwActions.appendChild(pwSave);
    pwPanel.appendChild(pwActions);

    pwBtn.addEventListener('click', function(){ clearMessage(); togglePanel(pwPanel, true); });
    pwClose.addEventListener('click', function(){ pwPanel.style.display = 'none'; });

    pwSave.addEventListener('click', function(){
      clearMessage();

      var userNow = auth.currentUser;
      if (!userNow || !userNow.email) {
        setMessage('Please log out and use the reset link.');
        return;
      }

      var a = String(curPw.value || '');
      var b = String(newPw.value || '');
      var c = String(newPw2.value || '');

      if (!a || !b || !c) {
        setMessage('Please fill in all password fields.');
        return;
      }
      if (b !== c) {
        setMessage('New passwords do not match.');
        return;
      }

      var cred = firebase.auth.EmailAuthProvider.credential(userNow.email, a);

      userNow.reauthenticateWithCredential(cred)
        .then(function(){ return userNow.updatePassword(b); })
        .then(function(){
          curPw.value = '';
          newPw.value = '';
          newPw2.value = '';
          pwPanel.style.display = 'none';
        })
        .catch(function(e){
          setMessage(e && e.message ? e.message : 'Could not update password.');
        });
    });

    btnRow.appendChild(pwBtn);
    btnRow.appendChild(pwPanel);

    // 5) Change Email (modal)
    var emailBtn = mkAccountBtn('button', 'Change Email');
    emailBtn.addEventListener('click', function(){
      clearMessage();
      openModal('Change Email', 'To change your email address, please contact support.');
    });
    btnRow.appendChild(emailBtn);

    // 6) Contact Support
    var supportBtn = mkAccountBtn('a', 'Contact Support', SUPPORT_URL);
    btnRow.appendChild(supportBtn);

    // 7) Logout (existing button, keep styling)
    if (logoutBtn) btnRow.appendChild(logoutBtn);

  }).catch(function(){
  });
}

    function openModal(title, bodyText) {
      var overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,.45)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '18px';
      overlay.style.zIndex = '99999';

      var box = document.createElement('div');
      box.style.width = '100%';
      box.style.maxWidth = '520px';
      box.style.background = '#fff';
      box.style.borderRadius = '10px';
      box.style.boxShadow = '0 10px 40px rgba(0,0,0,.25)';
      box.style.padding = '22px';
      box.style.color = '#111';

      var h = document.createElement('h3');
      h.textContent = title;
      h.style.margin = '0 0 10px 0';

      var p = document.createElement('div');
      p.className = 'p2';
      p.textContent = bodyText;
      p.style.opacity = '.9';
      p.style.lineHeight = '1.5';
      p.style.margin = '0 0 16px 0';

      var actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';

      var closeBtn = mkInlineBtn('Close', false);
      closeBtn.addEventListener('click', function(){ overlay.remove(); });

      actions.appendChild(closeBtn);

      box.appendChild(h);
      box.appendChild(p);
      box.appendChild(actions);

      overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    // Auth wiring
    auth.onAuthStateChanged(function(user){
      if (!user) {
        clearAllLoginMarks();
        return showLogin();
      }
      recordLoginOnce(user);
      showAccount(user);
    });

    if (loginBtn) {
      loginBtn.addEventListener('click', function(){
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        var pass = passInput ? String(passInput.value || '') : '';

        if (!email || !pass) {
          setMessage('Please enter email and password.');
          return;
        }

        auth.signInWithEmailAndPassword(email, pass).catch(function(e){
          setMessage(e && e.message ? e.message : 'Could not log in.');
        });
      });
    }

    if (resetLink) {
      resetLink.addEventListener('click', function(e){
        e.preventDefault();
        clearMessage();
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        if (!email) {
          setMessage('Please enter your email first.');
          return;
        }
        auth.sendPasswordResetEmail(email).then(function(){
          setMessage('Password reset email sent.');
        }).catch(function(e){
          setMessage(e && e.message ? e.message : 'Unable to send reset email.');
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(){
        clearMessage();
        try{
          var u = auth.currentUser;
          if (u) clearLoginMark(u.uid);
          else clearAllLoginMarks();
        } catch(_){}
        auth.signOut();
      });
    }
  } // end start()

  start();
});



