document.addEventListener('DOMContentLoaded', function () {
  if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;

  var auth = firebase.auth();
  var db = firebase.firestore();
  var adminEmail = 'info@davedrums.com.au';

  var loginBox = document.getElementById('members-login');
  var accountBox = document.getElementById('members-account');
  var titleEls = document.getElementsByClassName('members-title');

  var emailInput = document.getElementById('auth-email');
  var passInput = document.getElementById('auth-password');
  var loginBtn = document.getElementById('login-btn');
  var resetLink = document.getElementById('reset-link');

  var changePwBtn = document.getElementById('change-password-btn'); // will be repurposed into accordion trigger
  var logoutBtn = document.getElementById('logout-btn');

  var accountTextEl = document.getElementById('members-account-text');
  var legacyMsgEl = document.getElementById('members-message');

  var CONTACT_TEXT = 'Contact Support';
  var CONTACT_HREF = '/contact';

  var injected = false;
  var uiWrap = null;

  var headerWrap = null;
  var errorLine = null;
  var loggedInP = null;

  var changeNameBtn = null;
  var changeNamePanel = null;

  var changePasswordBtn = null;
  var changePasswordPanel = null;

  var changeEmailBtn = null;
  var contactBtn = null;

  var openPanelId = null;

  // Prevent repeated writes + UI spam
  var didWritePublicEmail = false;
  var didAutoHealAdminDoc = false;
  var lastErrorText = '';

  function setTitle(t) {
    if (!titleEls) return;
    for (var i = 0; i < titleEls.length; i++) titleEls[i].textContent = t;
  }

  function setLoggedInText(email) {
    if (!loggedInP) return;
    loggedInP.textContent = 'Logged in as ' + (email || 'member');
  }

  function setError(text) {
    var t = String(text || '').trim();

    // De-dupe identical messages
    if (t === lastErrorText) return;
    lastErrorText = t;

    if (errorLine) {
      errorLine.textContent = t;
      errorLine.style.display = t ? 'block' : 'none';
    }

    // Always suppress legacy message to avoid doubling
    if (legacyMsgEl) {
      legacyMsgEl.textContent = '';
      legacyMsgEl.style.display = 'none';
      legacyMsgEl.style.marginTop = '0';
    }
  }

  function findBaseButtonClass() {
    var el = logoutBtn || loginBtn;
    return el ? (el.className || '') : '';
  }

  function matchLogoutRounding(targetEl) {
    if (!logoutBtn || !targetEl) return;
    try {
      var cs = window.getComputedStyle(logoutBtn);
      targetEl.style.borderRadius = cs.borderRadius;
    } catch (e) {}
  }

  function createNativeButton(text, id) {
    var b = document.createElement('button');
    b.type = 'button';
    if (id) b.id = id;
    b.textContent = text;
    b.className = findBaseButtonClass();
    b.style.width = '100%';
    return b;
  }

  function detectUiWrap() {
    if (logoutBtn && logoutBtn.parentNode) return logoutBtn.parentNode;
    if (accountBox) return accountBox;
    return document.body;
  }

  function removeAllContactSupportButtons() {
    var nodes = document.querySelectorAll('a,button');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var txt = (el.textContent || '').trim().toLowerCase();
      if (txt === CONTACT_TEXT.toLowerCase()) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
  }

  function ensureAccordionStyles() {
    if (document.getElementById('dd-members-accordion-style')) return;

    var css =
      '.dd-acc-panel{display:none;margin-top:10px;padding:14px;border:1px solid rgba(0,0,0,0.12);border-radius:12px;background:#fff;}' +
      '.dd-acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
      '.dd-acc-grid-1{display:grid;grid-template-columns:1fr;gap:12px;}' +
      '.dd-acc-field label{display:block;margin:0 0 6px 0;opacity:.8;}' +
      '.dd-acc-field input{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:6px;}' +
      '.dd-acc-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;}' +
      '.dd-acc-actions button{padding:10px 12px;border-radius:6px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;font:inherit;}' +
      '.dd-acc-actions button.dd-primary{border-color:#06b3fd;background:#06b3fd;color:#fff;}' +
      '@media (max-width:520px){.dd-acc-grid{grid-template-columns:1fr;}}';

    var style = document.createElement('style');
    style.id = 'dd-members-accordion-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function setPanelOpen(panelId, open) {
    openPanelId = open ? panelId : null;

    function apply(btn, panel, id) {
      if (!btn || !panel) return;
      var isOpen = (openPanelId === id);
      panel.style.display = isOpen ? 'block' : 'none';
    }

    apply(changeNameBtn, changeNamePanel, 'name');
    apply(changePasswordBtn, changePasswordPanel, 'password');
  }

  function ensureInjectedUI() {
    if (injected || !accountBox) return;
    injected = true;

    uiWrap = detectUiWrap();

    if (accountTextEl) accountTextEl.style.display = 'none';
    if (legacyMsgEl) legacyMsgEl.style.display = 'none';

    if (logoutBtn) logoutBtn.textContent = 'Logout';

    removeAllContactSupportButtons();
    ensureAccordionStyles();

    headerWrap = document.createElement('div');
    headerWrap.id = 'members-header-wrap';
    headerWrap.style.width = '100%';

    // error line area (requested under header)
    errorLine = document.createElement('div');
    errorLine.id = 'dd-members-error';
    errorLine.className = 'p2';
    errorLine.style.margin = '8px 0 0 0';
    errorLine.style.textAlign = 'center';
    errorLine.style.color = '#c00';
    errorLine.style.display = 'none';

    // "Logged in as"
    loggedInP = document.createElement('p');
    loggedInP.className = 'p3';
    loggedInP.style.margin = '12px 0 0 0';
    loggedInP.style.textAlign = 'center';

    headerWrap.appendChild(errorLine);
    headerWrap.appendChild(loggedInP);

    // Remove the old change-password button from original markup (we'll reinsert as accordion trigger)
    if (changePwBtn) {
      changePwBtn.textContent = 'Change Password';
    }

    changeNameBtn = createNativeButton('Change Name', 'dd-change-name-btn');
    changePasswordBtn = createNativeButton('Change Password', 'dd-change-password-btn');
    changeEmailBtn = createNativeButton('Change Email', 'dd-change-email-btn');
    contactBtn = createNativeButton(CONTACT_TEXT, 'dd-contact-support-btn');

    matchLogoutRounding(changeNameBtn);
    matchLogoutRounding(changePasswordBtn);
    matchLogoutRounding(changeEmailBtn);
    matchLogoutRounding(contactBtn);

    // Panels
    changeNamePanel = document.createElement('div');
    changeNamePanel.className = 'dd-acc-panel';
    changeNamePanel.id = 'dd-change-name-panel';
    changeNamePanel.innerHTML =
      '<div class="dd-acc-grid">' +
        '<div class="dd-acc-field">' +
          '<label>First name</label>' +
          '<input type="text" id="dd-first-name" value="">' +
        '</div>' +
        '<div class="dd-acc-field">' +
          '<label>Surname (can be 1 letter)</label>' +
          '<input type="text" id="dd-last-name" value="">' +
        '</div>' +
      '</div>' +
      '<div class="dd-acc-actions">' +
        '<button type="button" id="dd-name-cancel">Close</button>' +
        '<button type="button" class="dd-primary" id="dd-name-save">Save</button>' +
      '</div>';

    changePasswordPanel = document.createElement('div');
    changePasswordPanel.className = 'dd-acc-panel';
    changePasswordPanel.id = 'dd-change-password-panel';
    changePasswordPanel.innerHTML =
      '<div class="dd-acc-grid-1">' +
        '<div class="dd-acc-field">' +
          '<label>Current password</label>' +
          '<input type="password" id="dd-current-pw" value="">' +
        '</div>' +
        '<div class="dd-acc-field">' +
          '<label>New password</label>' +
          '<input type="password" id="dd-new-pw" value="">' +
        '</div>' +
        '<div class="dd-acc-field">' +
          '<label>New password again</label>' +
          '<input type="password" id="dd-new-pw2" value="">' +
        '</div>' +
      '</div>' +
      '<div class="dd-acc-actions">' +
        '<button type="button" id="dd-pw-cancel">Close</button>' +
        '<button type="button" class="dd-primary" id="dd-pw-save">Update</button>' +
      '</div>';

    // Insert elements in order requested
    uiWrap.appendChild(headerWrap);
    uiWrap.appendChild(changeNameBtn);
    uiWrap.appendChild(changeNamePanel);
    uiWrap.appendChild(changePasswordBtn);
    uiWrap.appendChild(changePasswordPanel);
    uiWrap.appendChild(changeEmailBtn);
    uiWrap.appendChild(contactBtn);

    // Ensure logout at end
    if (logoutBtn) uiWrap.appendChild(logoutBtn);

    // Accordion handlers
    changeNameBtn.addEventListener('click', function(){ setError(''); setPanelOpen('name', openPanelId !== 'name'); });
    changePasswordBtn.addEventListener('click', function(){ setError(''); setPanelOpen('password', openPanelId !== 'password'); });

    // Close buttons
    changeNamePanel.querySelector('#dd-name-cancel').addEventListener('click', function(){ setPanelOpen('name', false); });
    changePasswordPanel.querySelector('#dd-pw-cancel').addEventListener('click', function(){ setPanelOpen('password', false); });

    // Change email lightbox
    changeEmailBtn.addEventListener('click', function(){
      setError('');
      openInfoModal(
        'Change Email',
        'To change your email address, please contact support.'
      );
    });

    contactBtn.addEventListener('click', function(){ window.location.href = CONTACT_HREF; });

    // Name save
    changeNamePanel.querySelector('#dd-name-save').addEventListener('click', function(){
      var user = auth.currentUser;
      if (!user) return;

      var firstName = String(changeNamePanel.querySelector('#dd-first-name').value || '').trim();
      var lastName = String(changeNamePanel.querySelector('#dd-last-name').value || '').trim();

      if (!firstName || !lastName) {
        setError('Please enter first name and surname (surname can be one letter).');
        return;
      }

      var displayName = (firstName + ' ' + lastName.charAt(0).toUpperCase() + '.').trim();

      setError('');

      db.collection('users_public').doc(user.uid).set({
        firstName: firstName,
        lastName: lastName,
        displayName: displayName
      }, { merge: true }).then(function(){
        setPanelOpen('name', false);
      }).catch(function(e){
        setError(e && e.message ? e.message : 'Missing or insufficient permissions.');
      });
    });

    // Password change
    changePasswordPanel.querySelector('#dd-pw-save').addEventListener('click', function(){
      var user = auth.currentUser;
      if (!user || !user.email) {
        setError('Please log out and use the reset link.');
        return;
      }

      var currentPw = String(changePasswordPanel.querySelector('#dd-current-pw').value || '');
      var newPw = String(changePasswordPanel.querySelector('#dd-new-pw').value || '');
      var newPw2 = String(changePasswordPanel.querySelector('#dd-new-pw2').value || '');

      if (!currentPw || !newPw || !newPw2) {
        setError('Please fill in all password fields.');
        return;
      }
      if (newPw !== newPw2) {
        setError('New passwords do not match.');
        return;
      }

      setError('');

      var cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);

      user.reauthenticateWithCredential(cred)
        .then(function(){
          return user.updatePassword(newPw);
        })
        .then(function(){
          // clear fields
          changePasswordPanel.querySelector('#dd-current-pw').value = '';
          changePasswordPanel.querySelector('#dd-new-pw').value = '';
          changePasswordPanel.querySelector('#dd-new-pw2').value = '';
          setPanelOpen('password', false);
        })
        .catch(function(e){
          setError(e && e.message ? e.message : 'Could not update password.');
        });
    });

    // Default closed
    setPanelOpen(null, false);
  }

  function openInfoModal(title, text) {
    var overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999;';

    var box = document.createElement('div');
    box.style.cssText = 'width:100%;max-width:520px;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:22px;color:#111;';

    box.innerHTML =
      '<h3 style="margin:0 0 10px 0;">' + title + '</h3>' +
      '<div style="opacity:.85;line-height:1.5;margin:0 0 16px 0;">' + text + '</div>' +
      '<div style="display:flex;justify-content:flex-end;">' +
        '<button id="dd-info-close" style="padding:10px 12px;border-radius:6px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;font:inherit;">Close</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(){ overlay.remove(); }
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    box.querySelector('#dd-info-close').addEventListener('click', close);
  }

  function writePublicEmailOnce(user) {
    if (didWritePublicEmail) return;
    didWritePublicEmail = true;

    db.collection('users_public').doc(user.uid)
      .set({ email: user.email || '' }, { merge: true })
      .catch(function (e) {
        // allow a later retry, but don't hammer on every state callback
        didWritePublicEmail = false;
        setError((e && e.message) ? e.message : 'Missing or insufficient permissions.');
      });
  }

  // Auto-heal legacy accounts: ensure users_admin/{uid} exists after login
  function ensureUsersAdminDoc(user) {
    if (didAutoHealAdminDoc) return;
    didAutoHealAdminDoc = true;

    if (!user || !user.uid) return;

    // Never touch the admin account
    if ((user.email || '').toLowerCase() === adminEmail.toLowerCase()) return;

    var ref = db.collection('users_admin').doc(user.uid);

    ref.get().then(function (snap) {
      if (snap.exists) return;

      return ref.set({
        email: (user.email || '').toLowerCase(),
        firstName: '',
        lastName: '',
        name: '',
        role: 'student',
        createdViaInvite: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        autoHealed: true
      }, { merge: true });
    }).catch(function (e) {
      console.error(e);
    });
  }

  function fillNameFieldsFromDb(user) {
    if (!user || !user.uid) return;

    var firstEl = changeNamePanel ? changeNamePanel.querySelector('#dd-first-name') : null;
    var lastEl = changeNamePanel ? changeNamePanel.querySelector('#dd-last-name') : null;
    if (!firstEl || !lastEl) return;

    // Read from users_public; blank if not set
    db.collection('users_public').doc(user.uid).get().then(function(snap){
      if (!snap.exists) {
        firstEl.value = '';
        lastEl.value = '';
        return;
      }
      var d = snap.data() || {};
      firstEl.value = String(d.firstName || '').trim();
      lastEl.value = String(d.lastName || '').trim();
    }).catch(function(){});
  }

  function showLogin() {
    didWritePublicEmail = false;
    didAutoHealAdminDoc = false;

    if (loginBox) loginBox.style.display = 'block';
    if (accountBox) accountBox.style.display = 'none';
    setTitle('MEMBER LOGIN');

    ensureInjectedUI();
    setError('');
  }

  function showAccount(user) {
    if (loginBox) loginBox.style.display = 'none';
    if (accountBox) accountBox.style.display = 'block';

    ensureInjectedUI();

    setTitle('ACCOUNT');
    setLoggedInText(user.email || '');
    setError('');

    // Populate name fields
    fillNameFieldsFromDb(user);

    if ((user.email || '').toLowerCase() !== adminEmail.toLowerCase()) {
      writePublicEmailOnce(user);
      ensureUsersAdminDoc(user);
    }
  }

  // Expose for quick testing
  window.DD_setMembersError = function (t) { ensureInjectedUI(); setError(t); };

  auth.onAuthStateChanged(function (user) {
    if (!user) return showLogin();
    showAccount(user);
  });

  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      var email = emailInput ? String(emailInput.value || '').trim() : '';
      var pass = passInput ? String(passInput.value || '') : '';

      ensureInjectedUI();
      setError('');

      if (!email || !pass) {
        setError('Please enter email and password.');
        return;
      }

      auth.signInWithEmailAndPassword(email, pass)
        .catch(function (e) {
          setError(e && e.message ? e.message : 'Could not log in.');
        });
    });
  }

  if (resetLink) {
    resetLink.addEventListener('click', function () {
      var email = emailInput ? String(emailInput.value || '').trim() : '';
      ensureInjectedUI();

      if (!email) {
        setError('Please enter your email first.');
        return;
      }

      auth.sendPasswordResetEmail(email)
        .then(function () { setError(''); })
        .catch(function (e) { setError(e && e.message ? e.message : 'Unable to send reset email.'); });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      didWritePublicEmail = false;
      didAutoHealAdminDoc = false;
      auth.signOut();
    });
  }
});
