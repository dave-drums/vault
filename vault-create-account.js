/* vault-create-account.js
   Invite-only account creation for Dave Drums Practice Vault
   - No Cloud Functions required
   - Uses Firestore invite token + client-side Firebase Auth sign-up
*/

(function () {
  if (typeof firebase === "undefined" || !firebase.auth || !firebase.firestore) return;

  const AUTH = firebase.auth();
  const DB = firebase.firestore();

  // Keep this in sync with the admin-side invite generator.
  const INVITES_COL = "vault_invites";

  // Pages
  const MEMBERS_URL = "/members";

  // Elements
  const root = document.getElementById("vault-create-account-root");
  if (!root) return;

  // Show page once JS is running (your page injection sets opacity:0)
  try { document.documentElement.dataset.protected = "false"; } catch(e) {}
  try { document.body.style.opacity = "1"; } catch(e) {}

  injectStyles();

  const token = new URLSearchParams(window.location.search).get("t");

  if (!token) {
    renderMessage("Missing invite link token. Please use the link from your welcome email.");
    return;
  }

  (async function init() {
    try {
      const inviteRef = DB.collection(INVITES_COL).doc(token);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        renderMessage("That invite link is invalid. Please request a new invite link.");
        return;
      }

      const invite = inviteSnap.data() || {};
      const email = String(invite.email || "").trim().toLowerCase();

      if (!email) {
        renderMessage("Invite is missing an email address. Please request a new invite link.");
        return;
      }

      if (invite.used === true) {
        renderMessage('This invite link has already been used. <a href="' + MEMBERS_URL + '">Go to login</a>.');
        return;
      }

      // Optional expiry: store expiresAt as Firestore Timestamp
      if (invite.expiresAt && typeof invite.expiresAt.toDate === "function") {
        const expiresMs = invite.expiresAt.toDate().getTime();
        if (Date.now() > expiresMs) {
          renderMessage("This invite link has expired. Please request a new invite link.");
          return;
        }
      }

      renderForm({ token, email });

    } catch (err) {
      renderMessage("Could not load invite details. Please try again.");
      console.error(err);
    }
  })();

  function renderForm({ token, email }) {
    root.innerHTML = `
      <div class="vca-wrap">
        <div class="vca-card">
          <h3 class="vca-title">CREATE YOUR ACCOUNT</h3>
          <p class="vca-sub">Set your name and password to access the Practice Vault.</p>

          <div class="vca-field">
            <label>Email</label>
            <input id="vca-email" type="email" value="${escapeHtml(email)}" readonly>
          </div>

          <div class="vca-grid">
            <div class="vca-field">
              <label>First name</label>
              <input id="vca-first" type="text" autocomplete="given-name">
            </div>
            <div class="vca-field">
              <label>Last name</label>
              <input id="vca-last" type="text" autocomplete="family-name">
            </div>
          </div>

          <div class="vca-field">
            <label>Password</label>
            <input id="vca-pass" type="password" autocomplete="new-password">
            <div class="vca-hint">Use at least 8 characters.</div>
          </div>

          <button id="vca-create" class="vca-btn">Create account</button>

          <div id="vca-msg" class="vca-msg" aria-live="polite"></div>

          <div class="vca-footer">
            Already have an account? <a href="${MEMBERS_URL}">Log in</a>
          </div>
        </div>
      </div>
    `;

    const btn = document.getElementById("vca-create");
    const msg = document.getElementById("vca-msg");

    btn.addEventListener("click", async () => {
      msg.textContent = "";
      btn.disabled = true;

      const firstName = (document.getElementById("vca-first").value || "").trim();
      const lastName = (document.getElementById("vca-last").value || "").trim();
      const password = (document.getElementById("vca-pass").value || "").trim();

      if (!firstName || !lastName) {
        msg.textContent = "Please enter your first and last name.";
        btn.disabled = false;
        return;
      }

      if (password.length < 8) {
        msg.textContent = "Please use a password of at least 8 characters.";
        btn.disabled = false;
        return;
      }

      try {
        const cred = await AUTH.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        const uid = user.uid;
        const nowServer = firebase.firestore.FieldValue.serverTimestamp();

        await DB.collection("users_admin").doc(uid).set({
          email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          role: "student",
          createdViaInvite: true,
          createdAt: nowServer
        }, { merge: true });

        await DB.collection("users_public").doc(uid).set({
          joined: nowServer,
          progress: {}
        }, { merge: true });

        await DB.collection(INVITES_COL).doc(token).set({
          used: true,
          usedAt: nowServer,
          uid
        }, { merge: true });

        window.location.href = MEMBERS_URL;

      } catch (err) {
        console.error(err);

        const code = (err && err.code) ? String(err.code) : "";
        if (code.includes("email-already-in-use")) {
          msg.innerHTML = 'This email already has an account. <a href="' + MEMBERS_URL + '">Log in here</a>.';
        } else if (code.includes("weak-password")) {
          msg.textContent = "That password is too weak. Please choose a stronger password.";
        } else if (code.includes("invalid-email")) {
          msg.textContent = "That email address looks invalid.";
        } else {
          msg.textContent = "Could not create account. Please try again.";
        }

        btn.disabled = false;
      }
    });
  }

  function renderMessage(html) {
    root.innerHTML = `
      <div class="vca-wrap">
        <div class="vca-card">
          <h3 class="vca-title">CREATE ACCOUNT</h3>
          <div class="vca-msg vca-msg--block">${html}</div>
          <div class="vca-footer"><a href="${MEMBERS_URL}">Go to login</a></div>
        </div>
      </div>
    `;
  }

  function injectStyles() {
    const css = `
      .vca-wrap{max-width:520px;margin:60px auto;padding:0 18px;}
      .vca-card{background:#fff;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:28px;}
      .vca-title{text-align:center;margin:0 0 8px;}
      .vca-sub{text-align:center;margin:0 0 18px;opacity:.8;line-height:1.4;}
      .vca-field{margin:0 0 14px;}
      .vca-field label{display:block;margin:0 0 6px;}
      .vca-field input{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:6px;}
      .vca-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      @media (max-width:520px){.vca-grid{grid-template-columns:1fr;}}
      .vca-hint{margin-top:6px;font-size:12px;opacity:.75;}
      .vca-btn{width:100%;padding:12px;background:#06b3fd;border-radius:6px;border:1px solid #06b3fd;color:#fff;cursor:pointer;font:inherit;}
      .vca-btn:hover{background:#0494d3;border-color:#0494d3;}
      .vca-btn:disabled{opacity:.6;cursor:not-allowed;}
      .vca-msg{margin-top:14px;min-height:18px;color:#c00;line-height:1.4;text-align:center;}
      .vca-msg--block{min-height:auto;}
      .vca-footer{text-align:center;margin-top:14px;opacity:.85;}
      .vca-footer a{color:inherit;}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
