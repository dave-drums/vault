/* components.js
   Purpose: UI components - toast notifications + hamburger menu navigation + universal site footer + scroll to top button
   Usage: Loaded conditionally on /vault and /members pages
*/

(function(){
  'use strict';

  window.VaultToast = (function(){
    var container = null;
    
    function init(){
      if(container) return;
      container = document.createElement('div');
      container.id = 'vault-toast-container';
      container.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999999;pointer-events:none;';
      document.body.appendChild(container);
    }
    
    function show(message, type){
      init();
      
      type = type || 'success';
      var colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
      };
      
      var toast = document.createElement('div');
      toast.style.cssText = 
        'background:' + colors[type] + ';' +
        'color:#fff;' +
        'padding:12px 20px;' +
        'border-radius:8px;' +
        'margin-bottom:10px;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.15);' +
        'pointer-events:auto;' +
        'animation:slideIn 0.3s ease;' +
        'font-size:var(--text-ui);' +
        'max-width:300px;';
      toast.textContent = message;
      
      container.appendChild(toast);
      
      setTimeout(function(){ 
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function(){ toast.remove(); }, 300);
      }, 2500);
    }
    
    return {
      success: function(msg){ show(msg, 'success'); },
      error: function(msg){ show(msg, 'error'); },
      info: function(msg){ show(msg, 'info'); }
    };
  })();

  // Inject animations CSS
  var style = document.createElement('style');
  style.textContent = 
    '@keyframes slideIn {' +
    '  from { transform: translateY(100px); opacity: 0; }' +
    '  to { transform: translateY(0); opacity: 1; }' +
    '}' +
    '@keyframes slideOut {' +
    '  from { transform: translateY(0); opacity: 1; }' +
    '  to { transform: translateY(100px); opacity: 0; }' +
    '}';
  document.head.appendChild(style);
})();

/* vault-hamburger-menu.js
   Purpose: Hamburger menu navigation for logged-in users
   Usage: Loaded conditionally on course pages
*/

(function(){
  'use strict';

  if (typeof firebase === 'undefined') return;

  function init(){
    if (!firebase.auth || !firebase.firestore) {
      setTimeout(init, 100);
      return;
    }
    
    var auth = firebase.auth();
    var db = firebase.firestore();
    
    injectStyles();
    
    auth.onAuthStateChanged(function(user){
      if(user){
        document.body.classList.add('vault-logged-in');
        createHamburgerMenu(user.uid, auth, db);
      } else {
        document.body.classList.remove('vault-logged-in');
        removeHamburgerMenu();
      }
    });
  }
  
  function createHamburgerMenu(uid, auth, db){
    removeHamburgerMenu();
    
    // Create hamburger button inside hero
    var hamburger = document.createElement('button');
    hamburger.id = 'vault-hamburger-btn';
    hamburger.className = 'vault-hamburger-btn';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    
    // Find hero and insert hamburger
    var hero = document.querySelector('.course-hero, .vault-hero, .members-hero, .create-hero, .groove-hero, .contact-hero');
    if (hero) {
      hero.appendChild(hamburger);
    } else {
      document.body.appendChild(hamburger);
    }
    
    // Create backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'vault-menu-backdrop';
    backdrop.className = 'vault-menu-backdrop';
    document.body.appendChild(backdrop);
    
    // Create menu overlay
    var menu = document.createElement('div');
    menu.id = 'vault-menu-overlay';
    menu.className = 'vault-menu-overlay';
    
    var menuHTML = 
      '<div class="vault-menu-header">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-menu-logo">' +
      '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
      '</div>' +
      '<div class="vault-menu-content">' +
      '  <div class="vault-menu-section">' +
      '    <div class="vault-menu-section-title">Navigation</div>' +
      '    <a href="/" class="vault-menu-link">Practice Vault Home</a>' +
      '    <a href="/members" class="vault-menu-link">Members Area</a>' +
      '    <a href="https://vault.davedrums.com.au/groove" class="vault-menu-link">GrooveScribe</a>' +
      '  </div>' +
      '  <div class="vault-menu-divider"></div>' +
      '  <div class="vault-menu-section">' +
      '    <a href="/contact" class="vault-menu-link">Contact Support</a>' +
      '    <button class="vault-menu-btn vault-menu-logout" id="vault-menu-logout">Logout</button>' +
      '  </div>' +
      '</div>';
    
    menu.innerHTML = menuHTML;
    document.body.appendChild(menu);
    
    // Event handlers
    var closeBtn = document.getElementById('vault-menu-close');
    var logoutBtn = document.getElementById('vault-menu-logout');
    
    function openMenu(){
      hamburger.classList.add('open');
      backdrop.classList.add('open');
      menu.classList.add('open');
    }
    
    function closeMenu(){
      hamburger.classList.remove('open');
      backdrop.classList.remove('open');
      menu.classList.remove('open');
    }
    
    hamburger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
    
    logoutBtn.addEventListener('click', function(){
      auth.signOut().then(function(){
        window.location.href = '/members.html';
      });
    });
    
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeMenu();
    });
    
    highlightActive(menu);
  }
  
  function removeHamburgerMenu(){
    var hamburger = document.getElementById('vault-hamburger-btn');
    var backdrop = document.getElementById('vault-menu-backdrop');
    var menu = document.getElementById('vault-menu-overlay');
    if(hamburger) hamburger.remove();
    if(backdrop) backdrop.remove();
    if(menu) menu.remove();
  }
  
  function highlightActive(menu){
    var path = window.location.pathname;
    var links = menu.querySelectorAll('.vault-menu-link');
    links.forEach(function(link){
      var href = link.getAttribute('href');
      if(href && href.indexOf('http') === -1 && path.indexOf(href) === 0 && href !== '/'){
        link.classList.add('active');
      }
    });
  }
  
  function injectStyles(){
    var css = `
    .vault-hamburger-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 3;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      display: none;
      flex-direction: column;
      gap: 5px;
      width: 44px;
      height: 44px;
      justify-content: center;
      align-items: center;
      transition: all 0.2s;
    }
    body.vault-logged-in .vault-hamburger-btn {
      display: flex;
    }
    .vault-hamburger-btn:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    .vault-hamburger-btn span {
      width: 24px;
      height: 2px;
      background: #fff;
      border-radius: 2px;
      transition: all 0.3s;
      display: block;
    }
    .vault-hamburger-btn.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .vault-hamburger-btn.open span:nth-child(2) {
      opacity: 0;
    }
    .vault-hamburger-btn.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
    .vault-menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .vault-menu-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .vault-menu-overlay {
      position: fixed;
      top: 0;
      right: -100%;
      width: 100%;
      max-width: 280px;
      height: 100vh;
      background: rgba(26, 26, 46, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 2px solid rgba(6, 179, 253, 0.3);
      z-index: 9999;
      transition: right 0.3s ease;
      box-shadow: -4px 0 20px rgba(0,0,0,0.3);
    }
    .vault-menu-overlay.open {
      right: 0;
    }
    .vault-menu-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .vault-menu-logo {
      height: 68px;
      width: auto;
      opacity: 0.9;
    }
    .vault-menu-close {
      background: none;
      border: none;
      color: #fff;
      font-size: var(--heading-section);
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background 0.2s;
      font-family: inherit;
    }
    .vault-menu-close:hover {
      background: rgba(255,255,255,0.1);
    }
    .vault-menu-content {
      padding: 24px;
    }
    .vault-menu-section {
      margin-bottom: 24px;
    }
    .vault-menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 16px 0;
    }
    .vault-menu-section-title {
      font-size: var(--text-micro);
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 12px;
      font-weight: 600;
    }
    .vault-menu-link {
      display: block;
      padding: 12px 16px;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: all 0.2s;
      font-size: var(--text-ui);
    }
    .vault-menu-link:hover {
      background: rgba(255,255,255,0.1);
      transform: translateX(4px);
    }
    .vault-menu-link.active {
      background: rgba(6,179,253,0.2);
      color: #06b3fd;
    }
    .vault-menu-btn {
      display: block;
      width: 100%;
      padding: 14px 16px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: #fff;
      font-size: var(--text-ui);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      text-align: left;
    }
    .vault-menu-btn:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    .vault-menu-logout {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;
    }
    .vault-menu-logout:hover {
      background: rgba(239,68,68,0.15);
    }
    @media (max-width: 768px) {
      .vault-menu-overlay {
        max-width: 260px;
      }
    }
    `;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* vault-footer.js
   Purpose: Universal footer for all pages
   Usage: Automatically added on all pages
*/

(function(){
  'use strict';
  
  function init(){
    injectStyles();
    createFooter();
  }
  
  function createFooter(){
    var footer = document.createElement('footer');
    footer.id = 'vault-footer';
    footer.className = 'vault-footer';
    
    var footerHTML = 
      '<div class="vault-footer-content">' +
      '  <img src="/assets/dwd-logo-500px.webp" alt="Dave Drums" class="vault-footer-logo">' +
      '  <nav class="vault-footer-links">' +
      '    <a href="https://www.davedrums.com.au/about" target="_blank" rel="noopener">About</a>' +
      '    <a href="https://vault.davedrums.com.au/contact" target="_blank" rel="noopener">Contact</a>' +
      '    <a href="https://www.davedrums.com.au/terms" target="_blank" rel="noopener">Terms</a>' +
      '    <a href="https://www.davedrums.com.au/privacy" target="_blank" rel="noopener">Privacy</a>' +
      '  </nav>' +
      '  <div class="vault-footer-copyright">© 2026 Dave D\'Amore Drums</div>' +
      '</div>';
    
    footer.innerHTML = footerHTML;
    document.body.appendChild(footer);
  }
  
  function injectStyles(){
    var css = `
    .vault-footer {
      background: #1a1a2e;
      padding: 32px 20px;
      color: #fff;
      border-top: 3px solid #06b3fd;
      margin-top: 60px;
    }
    .vault-footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .vault-footer-logo {
      height: 64px;
      width: auto;
      opacity: 0.9;
    }
    .vault-footer-links {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .vault-footer-links a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: var(--text-small);
      transition: color 0.2s;
    }
    .vault-footer-links a:hover {
      color: #06b3fd;
    }
    .vault-footer-copyright {
      color: rgba(255,255,255,0.5);
      font-size: var(--text-tiny);
    }
    @media (max-width: 768px) {
      .vault-footer {
        padding: 28px 20px;
      }
      .vault-footer-links {
        gap: 24px;
      }
    }
    `;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* vault-scroll-to-top.js
   Purpose: Scroll to top button for all pages
   Usage: Automatically added on all pages
*/

(function(){
  'use strict';
  
  function init(){
    injectStyles();
    createScrollButton();
  }
  
  function createScrollButton(){
    var btn = document.createElement('button');
    btn.id = 'vault-scroll-top';
    btn.className = 'vault-scroll-top';
    btn.innerHTML = '';
    btn.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(btn);
    
    // Show/hide based on scroll position
    function toggleButton(){
      if(window.pageYOffset > 300){
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }
    
    window.addEventListener('scroll', toggleButton);
    toggleButton(); // Check initial position
    
    // Scroll to top on click
    btn.addEventListener('click', function(){
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  function injectStyles(){
    var css = `
    .vault-scroll-top {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      background: rgba(6, 179, 253, 0.9);
      border: none;
      border-radius: 50%;
      color: #fff;
      cursor: pointer;
      z-index: 9997;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vault-scroll-top::before {
      content: '';
      width: 16px;
      height: 16px;
      border-top: 4px solid white;
      border-right: 4px solid white;
      transform: rotate(-45deg);
      margin-top: 5px;
    }
    .vault-scroll-top.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .vault-scroll-top:hover {
      background: rgba(5, 153, 220, 0.9);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    @media (max-width: 768px) {
      .vault-scroll-top {
        bottom: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
      }
      .vault-scroll-top::before {
        width: 14px;
        height: 14px;
        border-top: 3px solid white;
        border-right: 3px solid white;
      }
    }
    `;
    
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
