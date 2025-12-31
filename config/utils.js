/* utils.js
   Shared utility functions used across multiple files
   Prevents duplication of common helpers
   
   USAGE: All functions available via window.VaultUtils
   Example: VaultUtils.escapeHtml(text)
*/

(function() {
  'use strict';

  window.VaultUtils = {
    
    // ============================================
    // URL & QUERY PARAMETERS
    // ============================================
    
    // Get URL parameters as URLSearchParams object
    getUrlParams: function() {
      return new URLSearchParams(window.location.search);
    },
    
    // Get specific URL parameter
    getUrlParam: function(key) {
      return new URLSearchParams(window.location.search).get(key);
    },
    
    // Get URL parameters as plain object
    getQueryParams: function() {
      var params = {};
      var search = window.location.search.substring(1);
      if (!search) return params;
      search.split('&').forEach(function(pair) {
        var parts = pair.split('=');
        if (parts.length === 2) {
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
        }
      });
      return params;
    },
    
    // ============================================
    // COURSE & LESSON HELPERS
    // ============================================
    
    // Get course ID from URL (e.g., "gs1" from /gs?c=1)
    getCourseIdFromUrl: function() {
      var path = window.location.pathname;
      var parts = path.split('/').filter(function(p) { return p.length > 0; });
      if (parts.length < 1) return null;
      
      var pathway = parts[0]; // gs, fs, rs, etc.
      var params = this.getQueryParams();
      var courseNum = params.c;
      
      if (!courseNum) return null;
      return pathway + courseNum; // gs1, fs2, etc.
    },
    
    // Parse course ID into parts (e.g., "gs1" → {pathway: "gs", num: "1"})
    parseCourseId: function(courseId) {
      if (!courseId) return null;
      var match = courseId.match(/^([a-z]+)(\d+)$/);
      if (!match) return null;
      return { pathway: match[1], num: match[2] };
    },
    
    // ============================================
    // FIREBASE HELPERS
    // ============================================
    
    // Wait for Firebase to initialize
    waitForFirebase: function(callback) {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
        callback();
      } else {
        setTimeout(function() {
          window.VaultUtils.waitForFirebase(callback);
        }, 100);
      }
    },
    
    // ============================================
    // TEXT & HTML HELPERS
    // ============================================
    
    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    // ============================================
    // TIME & DATE HELPERS
    // ============================================
    
    // Format duration (seconds → MM:SS or HH:MM:SS)
    formatDuration: function(seconds) {
      if (!seconds || seconds < 0) return '0:00';
      
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      
      if (h > 0) {
        return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      }
      return m + ':' + (s < 10 ? '0' : '') + s;
    },
    
    // Get current date in YYYY-MM-DD format (Brisbane timezone)
    getDateKey: function() {
      var now = new Date();
      var offset = 10 * 60; // 10 hour offset for Brisbane
      var localMs = now.getTime() + (offset * 60 * 1000);
      var localDate = new Date(localMs);
      
      var y = localDate.getUTCFullYear();
      var m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      var d = String(localDate.getUTCDate()).padStart(2, '0');
      
      return y + '-' + m + '-' + d;
    },
    
    // Format timestamp for display
    formatTimestamp: function(timestamp) {
      if (!timestamp) return 'Never';
      
      var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      var now = new Date();
      var diff = now - date;
      
      // Less than 1 minute
      if (diff < 60000) return 'Just now';
      
      // Less than 1 hour
      if (diff < 3600000) {
        var mins = Math.floor(diff / 60000);
        return mins + ' minute' + (mins > 1 ? 's' : '') + ' ago';
      }
      
      // Less than 1 day
      if (diff < 86400000) {
        var hours = Math.floor(diff / 3600000);
        return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
      }
      
      // Less than 1 week
      if (diff < 604800000) {
        var days = Math.floor(diff / 86400000);
        return days + ' day' + (days > 1 ? 's' : '') + ' ago';
      }
      
      // Format as date
      return date.toLocaleDateString();
    },
    
    // ============================================
    // DOM HELPERS
    // ============================================
    
    // Query selector (shorthand)
    qs: function(selector, parent) {
      return (parent || document).querySelector(selector);
    },
    
    // Query selector all (shorthand)
    qsa: function(selector, parent) {
      return (parent || document).querySelectorAll(selector);
    },
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    // Wait for condition with timeout
    waitFor: function(condition, callback, timeout) {
      timeout = timeout || 5000;
      var start = Date.now();
      
      function check() {
        if (condition()) {
          callback();
        } else if (Date.now() - start < timeout) {
          setTimeout(check, 100);
        }
      }
      
      check();
    },
    
    // Debounce function calls
    debounce: function(func, wait) {
      var timeout;
      return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          func.apply(context, args);
        }, wait);
      };
    },
    
    // Get device type
    getDeviceType: function() {
      try {
        var w = window.innerWidth || 1024;
        return w <= 768 ? 'mobile' : 'desktop';
      } catch(e) {
        return 'other';
      }
    }
    
  };
  
})();
