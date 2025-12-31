/* error-handler.js
   Purpose: Centralized error handling for Firebase and application errors
   Usage: VaultErrors.handle(error, context)
*/

(function() {
  'use strict';
  
  window.VaultErrors = {
    
    /**
     * Main error handler
     * @param {Error|Object} error - Error object or Firebase error
     * @param {string} context - Where the error occurred (for logging)
     */
    handle: function(error, context) {
      // Log to console with context
      console.error('[' + (context || 'Error') + ']', error);
      
      // Get user-friendly message
      var message = this.getUserMessage(error);
      
      // Show toast notification
      if (window.VaultToast) {
        window.VaultToast.error(message);
      } else {
        // Fallback if toast not loaded
        alert(message);
      }
      
      // Optional: Future extension point for analytics/logging
      this.logError(error, context);
    },
    
    /**
     * Convert error to user-friendly message
     * @param {Error|Object} error
     * @returns {string}
     */
    getUserMessage: function(error) {
      if (!error) return 'An unknown error occurred.';
      
      // Firebase error codes
      var code = error.code || '';
      
      // Auth errors
      if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
      }
      if (code === 'auth/user-disabled') {
        return 'This account has been disabled. Please contact support.';
      }
      if (code === 'auth/user-not-found') {
        return 'No account found with this email.';
      }
      if (code === 'auth/wrong-password') {
        return 'Incorrect password. Please try again.';
      }
      if (code === 'auth/email-already-in-use') {
        return 'This email is already registered. Please log in instead.';
      }
      if (code === 'auth/weak-password') {
        return 'Password must be at least 6 characters.';
      }
      if (code === 'auth/invalid-credential') {
        return 'Invalid email or password. Please try again.';
      }
      if (code === 'auth/too-many-requests') {
        return 'Too many failed attempts. Please try again later.';
      }
      if (code === 'auth/network-request-failed') {
        return 'Network error. Please check your connection.';
      }
      if (code === 'auth/requires-recent-login') {
        return 'Please log out and log in again to perform this action.';
      }
      
      // Firestore errors
      if (code === 'permission-denied') {
        return 'You don\'t have permission to do that.';
      }
      if (code === 'not-found') {
        return 'Content not found.';
      }
      if (code === 'already-exists') {
        return 'This item already exists.';
      }
      if (code === 'failed-precondition') {
        return 'Action cannot be completed at this time.';
      }
      if (code === 'aborted') {
        return 'Operation was cancelled. Please try again.';
      }
      if (code === 'out-of-range') {
        return 'Invalid input value.';
      }
      if (code === 'unauthenticated') {
        return 'Please log in to continue.';
      }
      if (code === 'resource-exhausted') {
        return 'Too many requests. Please wait a moment.';
      }
      if (code === 'cancelled') {
        return 'Operation was cancelled.';
      }
      if (code === 'data-loss') {
        return 'Data error occurred. Please contact support.';
      }
      if (code === 'deadline-exceeded') {
        return 'Request timed out. Please try again.';
      }
      if (code === 'unavailable') {
        return 'Service temporarily unavailable. Please try again.';
      }
      
      // Storage errors
      if (code === 'storage/unauthorized') {
        return 'You don\'t have permission to access this file.';
      }
      if (code === 'storage/object-not-found') {
        return 'File not found.';
      }
      if (code === 'storage/quota-exceeded') {
        return 'Storage quota exceeded. Please contact support.';
      }
      if (code === 'storage/unauthenticated') {
        return 'Please log in to access files.';
      }
      
      // Generic Firebase errors
      if (code.startsWith('auth/') || code.startsWith('storage/')) {
        return 'Authentication error. Please try again.';
      }
      
      // Use error message if available
      if (error.message) {
        // Clean up Firebase error messages
        var msg = error.message;
        // Remove Firebase error prefixes
        msg = msg.replace(/^Firebase: /, '');
        msg = msg.replace(/\(auth\/[^)]+\)\.?$/, '');
        msg = msg.replace(/\(storage\/[^)]+\)\.?$/, '');
        return msg.trim() || 'An error occurred. Please try again.';
      }
      
      return 'Something went wrong. Please try again.';
    },
    
    /**
     * Log error for debugging/analytics
     * @param {Error|Object} error
     * @param {string} context
     */
    logError: function(error, context) {
      // Future: Send to Firebase Analytics, Sentry, etc.
      // For now, just console logging (already done in handle())
    },
    
    /**
     * Show success message
     * @param {string} message
     */
    success: function(message) {
      if (window.VaultToast) {
        window.VaultToast.success(message);
      }
    },
    
    /**
     * Show info message
     * @param {string} message
     */
    info: function(message) {
      if (window.VaultToast) {
        window.VaultToast.info(message);
      }
    }
  };
})();
