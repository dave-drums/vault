/* components.js
   Purpose: UI components - toast notifications + hamburger menu navigation + universal site footer + scroll to top button
   Usage: Loaded conditionally on most pages
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
