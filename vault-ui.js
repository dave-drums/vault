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

  var changePwBtn = document.getElementById('change-password-btn');
  var logoutBtn = document.getElementById('logout-btn');

  var accountTextEl = document.getElementById('members-account-text');
  var legacyMsgEl = document.getElementById('members-message');

  var CONTACT_TEXT = 'Contact Support';
  var CONTACT_HREF = '/contact';

  var injected = false;
  var uiWrap = null;

  var headerWrap = null;
  var loggedInP = null;
  var errorLine = null;

  var openVaultBtn = null;
  var myProgressBtn = null;
  var progressBox = null;

  var contactBtn = null;
  var isAccordionOpen = false;

  var unsubProgress = null;
  var hasProgressData = false;

  // Prevent repeated writes + UI spam
  var didWritePublicEmail = false;
  var lastErrorText = '';

  function setTitle(t) {
    if (!titleEls) return;
    for (var i = 0; i < titleEls.length; i++) titleEls[i].textContent = t;
  }

  function stopProgressListener() {
    if (typeof unsubProgress === 'function') {
      try { unsubProgress(); } catch (e) {}
    }
    unsubProgress = null;
  }

  function setLoggedInText(email) {
    if (!loggedInP) return;
    loggedInP.textContent = 'You are logged in as ' + (email || 'member');
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

  function ensureProgressStyles() {
    if (document.getElementById('members-progress-style')) return;

    var css =
      '#members-progress-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px;}' +
      '.members-prog-card{padding:14px;border:1px solid rgba(0,0,0,0.12);border-radius:12px;background:#fff;}' +
      '.members-prog-label{margin:0 0 6px 0;opacity:.75;}' +
      '.members-prog-value{margin:0;}';

    var style = document.createElement('style');
    style.id = 'members-progress-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s || '').replace(/[&<>\"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function renderProgressGrid(values) {
    ensureProgressStyles();

    function card(label, value) {
      var v = value ? esc(value) : '-';
      return (
        '<div class="members-prog-card">' +
          '<p class="p2 members-prog-label">' + label + '</p>' +
          '<h3 class="members-prog-value">' + v + '</h3>' +
        '</div>'
      );
    }

    if (!progressBox) return;

    progressBox.innerHTML =
      '<div id="members-progress-grid">' +
        card('Groove Studies', values.grooves) +
        card('Fill Studies', values.fills) +
        card('Stick Studies', values.hands) +
        card('Foot Control', values.feet) +
      '</div>';
  }

  function findBaseButtonClass() {
    var el = changePwBtn || logoutBtn;
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
    if (changePwBtn && changePwBtn.parentNode) return changePwBtn.parentNode;
    return accountBox || document.body;
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

  function setAccordion(open) {
    isAccordionOpen = !!open;
    if (!progressBox) return;
    progressBox.style.display = isAccordionOpen ? 'block' : 'none';
  }

  function showOrHideProgressButton() {
    if (!myProgressBtn) return;
    if (!hasProgressData) {
      myProgressBtn.style.display = 'none';
      setAccordion(false);
      return;
    }
    myProgressBtn.style.display = 'block';
  }

  function enforceOrder() {
    if (!uiWrap) return;

    var list = [];
    if (headerWrap) list.push(headerWrap);
    if (openVaultBtn) list.push(openVaultBtn);
    if (myProgressBtn) list.push(myProgressBtn);
    if (progressBox) list.push(progressBox);
    if (contactBtn) list.push(contactBtn);
    if (changePwBtn) list.push(changePwBtn);
    if (logoutBtn) list.push(logoutBtn);

    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el) continue;
      try { uiWrap.appendChild(el); } catch (e) {}
    }
  }

  function ensureInjectedUI() {
    if (injected || !accountBox) return;
    injected = true;

    uiWrap = detectUiWrap();

    if (accountTextEl) accountTextEl.style.display = 'none';
    if (legacyMsgEl) legacyMsgEl.style.display = 'none';

    if (logoutBtn) logoutBtn.textContent = 'Logout';

    removeAllContactSupportButtons();

    headerWrap = document.createElement('div');
    headerWrap.id = 'members-header-wrap';
    headerWrap.style.width = '100%';

    loggedInP = document.createElement('p');
    loggedInP.className = 'p3';
    loggedInP.style.margin = '0';
    loggedInP.style.textAlign = 'center';

    // Single error line
    errorLine = document.createElement('div');
    errorLine.id = 'dd-members-error';
    errorLine.className = 'p2';
    errorLine.style.margin = '8px 0 0 0';
    errorLine.style.textAlign = 'center';
    errorLine.style.color = '#c00';
    errorLine.style.display = 'none';

    headerWrap.appendChild(loggedInP);
    headerWrap.appendChild(errorLine);

    openVaultBtn = createNativeButton('Open Practice Vault', 'open-vault-btn');
    openVaultBtn.style.background = '#06b3fd';
    openVaultBtn.style.borderColor = 'transparent';
    openVaultBtn.style.color = '#fff';

    myProgressBtn = createNativeButton('My Progress', 'my-progress-btn');
    contactBtn = createNativeButton(CONTACT_TEXT, 'contact-support-btn-injected');

    matchLogoutRounding(openVaultBtn);
    matchLogoutRounding(myProgressBtn);
    matchLogoutRounding(contactBtn);

    progressBox = document.createElement('div');
    progressBox.id = 'members-progress';
    progressBox.style.display = 'none';

    uiWrap.appendChild(headerWrap);
    uiWrap.appendChild(openVaultBtn);
    uiWrap.appendChild(myProgressBtn);
    uiWrap.appendChild(progressBox);
    uiWrap.appendChild(contactBtn);

    openVaultBtn.addEventListener('click', function () { window.location.href = '/vault'; });
    myProgressBtn.addEventListener('click', function () { setAccordion(!isAccordionOpen); });
    contactBtn.addEventListener('click', function () { window.location.href = CONTACT_HREF; });

    myProgressBtn.style.display = 'none';
    setAccordion(false);

    enforceOrder();
  }

  function startProgressListener(user) {
    stopProgressListener();
    hasProgressData = false;

    if ((user.email || '').toLowerCase() === adminEmail.toLowerCase()) {
      if (myProgressBtn) myProgressBtn.style.display = 'none';
      setAccordion(false);
      return;
    }

    var pubRef = db.collection('users_public').doc(user.uid);

    unsubProgress = pubRef.onSnapshot(function (snap) {
      if (!snap.exists) {
        hasProgressData = false;
        showOrHideProgressButton();
        setAccordion(false);
        return;
      }

      var p = (snap.data() || {}).progress || {};
      var grooves = String(p.grooves || '').trim();
      var fills = String(p.fills || '').trim();
      var hands = String(p.hands || '').trim();
      var feet = String(p.feet || '').trim();

      hasProgressData = !!(grooves || fills || hands || feet);

      if (!hasProgressData) {
        showOrHideProgressButton();
        setAccordion(false);
        return;
      }

      renderProgressGrid({ grooves: grooves, fills: fills, hands: hands, feet: feet });
      showOrHideProgressButton();
    }, function (e) {
      hasProgressData = false;
      showOrHideProgressButton();
      setAccordion(false);
      setError((e && e.message) ? e.message : 'Missing or insufficient permissions.');
    });
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

  function showLogin() {
    stopProgressListener();
    didWritePublicEmail = false;
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

    setAccordion(false);
    startProgressListener(user);

    if ((user.email || '').toLowerCase() !== adminEmail.toLowerCase()) {
      writePublicEmailOnce(user);
    }

    enforceOrder();
  }

  // For quick testing in console
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

  if (changePwBtn) {
    changePwBtn.addEventListener('click', function () {
      var u = auth.currentUser;
      ensureInjectedUI();

      if (!u || !u.email) {
        setError('Please log out and use the reset link.');
        return;
      }

      auth.sendPasswordResetEmail(u.email)
        .then(function () { setError(''); })
        .catch(function (e) { setError(e && e.message ? e.message : 'Unable to send reset email.'); });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      stopProgressListener();
      didWritePublicEmail = false;
      auth.signOut();
    });
  }
});
