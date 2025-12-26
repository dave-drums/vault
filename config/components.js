/* vault-components.js
   Consolidated: vault-toast.js + vault-sidenav.js
   Purpose: UI components (toast notifications + side navigation)
*/

/* vault-toast.js
   Purpose: Global toast notification system
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
        'font-size:14px;' +
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
    '  from { transform: translateX(400px); opacity: 0; }' +
    '  to { transform: translateX(0); opacity: 1; }' +
    '}' +
    '@keyframes slideOut {' +
    '  from { transform: translateX(0); opacity: 1; }' +
    '  to { transform: translateX(400px); opacity: 0; }' +
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
    
    // Create hamburger button
    var hamburger = document.createElement('button');
    hamburger.id = 'vault-hamburger-btn';
    hamburger.className = 'vault-hamburger-btn';
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(hamburger);
    
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
      '  <button class="vault-menu-close" id="vault-menu-close">&times;</button>' +
      '</div>' +
      '<div class="vault-menu-content">' +
      '  <div class="vault-menu-section">' +
      '    <div class="vault-menu-section-title">Navigation</div>' +
      '    <a href="/" class="vault-menu-link">Practice Vault</a>' +
      '    <a href="/members.html" class="vault-menu-link">Members Area</a>' +
      '    <a href="https://davedrums.com.au/groove" class="vault-menu-link">GrooveScribe</a>' +
      '  </div>' +
      '  <div class="vault-menu-section">' +
      '    <div class="vault-menu-section-title">Courses</div>' +
      '    <a href="/gs?c=1" class="vault-menu-link">Groove Studies</a>' +
      '    <a href="/fs?c=1" class="vault-menu-link">Fill Studies</a>' +
      '    <a href="/ss?c=1" class="vault-menu-link">Stick Studies</a>' +
      '    <a href="/ks?c=1" class="vault-menu-link">Kick Studies</a>' +
      '  </div>' +
      '  <div class="vault-menu-section">' +
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
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
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
      max-width: 320px;
      height: 100vh;
      background: rgba(26, 26, 46, 0.98);
      backdrop-filter: blur(10px);
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
      justify-content: flex-end;
    }
    .vault-menu-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 32px;
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
      margin-bottom: 32px;
    }
    .vault-menu-section-title {
      font-size: 11px;
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
      font-size: 15px;
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
      font-size: 15px;
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
        max-width: 280px;
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
