/* firebase-init.js
   Purpose: Centralized Firebase initialization with error handling
   Usage: Load after Firebase SDK scripts, before any other app scripts
*/

(function() {
  'use strict';
  
  // Check if Firebase SDK is loaded
  if (typeof firebase === 'undefined') {
    console.error('[Firebase Init] Firebase SDK not loaded. Ensure firebase-app-compat.js is loaded first.');
    return;
  }
  
  // Don't initialize twice
  if (firebase.apps.length > 0) {
    console.log('[Firebase Init] Already initialized');
    return;
  }
  
  // Firebase configuration
  var config = {
    apiKey: "AIzaSyDfiWX_TGcCopulONaTFBIaPb7ZRAiC_dc",
    authDomain: "dave-drums.firebaseapp.com",
    projectId: "dave-drums",
    storageBucket: "dave-drums.firebasestorage.app",
    messagingSenderId: "602823096344",
    appId: "1:602823096344:web:b6402156a4d1c16a21ab6d",
    measurementId: "G-RHL1DSNTJ7"
  };
  
  // Initialize Firebase with error handling
  try {
    firebase.initializeApp(config);
    console.log('[Firebase Init] Successfully initialized');
  } catch (error) {
    console.error('[Firebase Init] Initialization failed:', error);
    
    // Show user-friendly error if possible
    if (typeof window.VaultToast !== 'undefined') {
      window.VaultToast.error('Failed to connect to database. Please refresh the page.');
    }
  }
})();
