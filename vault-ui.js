// vault-ui.js
// Members page UI (login/account) + optional progress accordion
// Fix: Contact Support button keeps floating above because Squarespace places it in a different wrapper.
// Solution: remove/hide ALL existing "Contact Support" buttons/links and inject our own in the correct spot.

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

  // We will IGNORE any existing contact button block and inject our own
  var CONTACT_TEXT = 'Contact Support';
  var CONTACT_HREF = '/contact'; // change if your contact URL differs

  // Original elements (hide to avoid layout fights)
  var accountTextEl = document.getElementById('members-account-text');
  var legacyMsgEl = document.getElementById('members-message');

  var injected = false;
  var uiWrap = null;

  var headerWrap = null;
  var loggedInP = null;
  var errorP = null;

  var openVaultBtn = null;
  var myProgressBtn = null;
  var progressBox = null;

  var contactBtn = null; // injected contact
  var isAccordionOpen = false;

  var unsubProgress = null;
  var hasProgressData = false;

  var LOGIN_REDIRECT_FLAG = 'dd_login_redirect_to_vault';
  var redirectTimer = null;

  function setTitle(t) {
    if (!titleEls) return;
    for (var i = 0; i < titleEls.length; i++) titleEls[i].textContent = t;
  }

  function clearRedirectTimer() {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      redirectTimer = null;
    }
  }

  function scheduleAutoRedirectIfFreshLogin() {
    try {
      if (sessionStorage.getItem(LOGIN_REDIRECT_FLAG) === '1') {
        sessionStorage.removeItem(LOGIN_REDIRECT_FLAG);
        clearRedirectTimer();
        redirectTimer = setTimeout(function () {
          window.location.href = '/vault';
        }, 2200);
      }
    } catch (e) {}
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
    if (!errorP) return;
    var t = String(text || '').trim();
    errorP.textContent = t;
    errorP.style.display = t ? 'block' : 'none';
  }

  function ensureProgressStyles() {
    if (document.getElementById('members-progress-style')) return;

    var css =
      '#members-progress-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:6px;}' +
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

    if (!progressBox) {
      progressBox = document.createElement('div');
      progressBox.id = 'members-progress';
      uiWrap.appendChild(progressBox);
    }

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
    // Use the existing action stack parent (same as Logout/Change Password)
    if (logoutBtn && logoutBtn.parentNode) return logoutBtn.parentNode;
    if (changePwBtn && changePwBtn.parentNode) return changePwBtn.parentNode;
    return accountBox || document.body;
  }

  function removeAllContactSupportButtons() {
    // Remove any <a> or <button> that reads "Contact Support" (case-insensitive)
    var nodes = document.querySelectorAll('a,button');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var txt = (el.textContent || '').trim().toLowerCase();
      if (txt === CONTACT_TEXT.toLowerCase()) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
  }

  function removeDuplicateVaultButtons() {
    if (!uiWrap) return;
    var items = uiWrap.querySelectorAll('a,button');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (openVaultBtn && el === openVaultBtn) continue;

      var txt = (el.textContent || '').trim().toLowerCase();
      var href = (el.getAttribute && el.getAttribute('href')) ? String(el.getAttribute('href')) : '';

      var looksLikeVault =
        txt === 'open practice vault' ||
        (href && /\/vault\b/.test(href));

      if (looksLikeVault) {
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

    // Hide legacy display elements
    if (accountTextEl) accountTextEl.style.display = 'none';
    if (legacyMsgEl) legacyMsgEl.style.display = 'none';

    // Normalise logout label
    if (logoutBtn) logoutBtn.textContent = 'Logout';

    // Remove any existing Contact Support buttons anywhere on the page
    removeAllContactSupportButtons();

    // Header block inside uiWrap
    headerWrap = document.createElement('div');
    headerWrap.id = 'members-header-wrap';
    headerWrap.style.width = '100%';

    loggedInP = document.createElement('p');
    loggedInP.className = 'p3';
    loggedInP.style.margin = '0';
    loggedInP.style.textAlign = 'center';

    errorP = document.createElement('p');
    errorP.className = 'p2';
    errorP.style.margin = '8px 0 0 0';
    errorP.style.textAlign = 'center';
    errorP.style.color = '#c00';
    errorP.style.display = 'none';

    headerWrap.appendChild(loggedInP);
    headerWrap.appendChild(errorP);

    // Buttons we control
    openVaultBtn = createNativeButton('Open Practice Vault', 'open-vault-btn');
    openVaultBtn.style.background = '#06b3fd';
    openVaultBtn.style.borderColor = 'transparent';
    openVaultBtn.style.color = '#fff';

    myProgressBtn = createNativeButton('My Progress', 'my-progress-btn');

    contactBtn = createNativeButton(CONTACT_TEXT, 'contact-support-btn-injected');

    matchLogoutRounding(openVaultBtn);
    matchLogoutRounding(myProgressBtn);
    matchLogoutRounding(contactBtn);

    // Progress container
    progressBox = document.createElement('div');
    progressBox.id = 'members-progress';
    progressBox.style.display = 'none';

    // Add into stack
    uiWrap.appendChild(headerWrap);
    uiWrap.appendChild(openVaultBtn);
    uiWrap.appendChild(myProgressBtn);
    uiWrap.appendChild(progressBox);
    uiWrap.appendChild(contactBtn);

    // Remove duplicates in stack from page markup
    removeDuplicateVaultButtons();

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
    }, function () {
      hasProgressData = false;
      showOrHideProgressButton();
      setAccordion(false);
    });
  }

  function showLogin() {
    stopProgressListener();
    clearRedirectTimer();
    if (loginBox) loginBox.style.display = 'block';
    if (accountBox) accountBox.style.display = 'none';
    setTitle('MEMBER LOGIN');
  }

  function showAccount(user) {
    if (loginBox) loginBox.style.display = 'none';
    if (accountBox) accountBox.style.display = 'block';

    ensureInjectedUI();

    setTitle('ACCOUNT');
    setLoggedInText(user.email || '');
    setError('');

    // Ensure users_public exists with email only (no progress defaults)
    db.collection('users_public').doc(user.uid)
      .set({ email: user.email || '' }, { merge: true })
      .catch(function (e) {
        setError((e && e.message) ? e.message : 'Missing or insufficient permissions.');
      });

    setAccordion(false);
    startProgressListener(user);
    enforceOrder();
    scheduleAutoRedirectIfFreshLogin();
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) return showLogin();
    showAccount(user);
  });

  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      var email = emailInput ? String(emailInput.value || '').trim() : '';
      var pass = passInput ? String(passInput.value || '') : '';

      ensureInjectedUI();

      if (!email || !pass) {
        setError('Please enter email and password.');
        return;
      }

      try { sessionStorage.setItem(LOGIN_REDIRECT_FLAG, '1'); } catch (e) {}

      auth.signInWithEmailAndPassword(email, pass)
        .catch(function (e) {
          try { sessionStorage.removeItem(LOGIN_REDIRECT_FLAG); } catch (e2) {}
          setError(e.message || 'Could not log in.');
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
        .catch(function (e) { setError(e.message || 'Unable to send reset email.'); });
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
        .catch(function (e) { setError(e.message || 'Unable to send reset email.'); });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      stopProgressListener();
      clearRedirectTimer();
      auth.signOut();
    });
  }
});
