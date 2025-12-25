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
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;pointer-events:none;';
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
