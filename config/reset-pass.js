    // Wait for Firebase to initialize
    function waitForFirebase() {
      return new Promise((resolve) => {
        if (window.firebase && firebase.auth) {
          resolve();
        } else {
          setTimeout(() => waitForFirebase().then(resolve), 100);
        }
      });
    }
    
    // Initialize the reset password flow
    async function initResetPassword() {
      await waitForFirebase();
      
      const auth = firebase.auth();
      const urlParams = new URLSearchParams(window.location.search);
      const oobCode = urlParams.get('oobCode'); // Firebase action code from email link
      
      const loadingState = document.getElementById('loading-state');
      const errorState = document.getElementById('error-state');
      const formContainer = document.getElementById('reset-form-container');
      const successState = document.getElementById('success-state');
      
      // Check if we have a valid action code
      if (!oobCode) {
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        return;
      }
      
      try {
        // Verify the password reset code is valid
        await auth.verifyPasswordResetCode(oobCode);
        
        // Code is valid, show the reset form
        loadingState.style.display = 'none';
        formContainer.style.display = 'block';
        
        // Handle form submission
        const form = document.getElementById('resetForm');
        const resetBtn = document.getElementById('reset-btn');
        const errorDisplay = document.getElementById('error-display');
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          // Clear previous errors
          errorDisplay.classList.remove('show');
          errorDisplay.textContent = '';
          
          // Validate passwords match
          if (newPassword.value !== confirmPassword.value) {
            errorDisplay.textContent = 'Passwords do not match';
            errorDisplay.classList.add('show');
            return;
          }
          
          // Validate password length
          if (newPassword.value.length < 6) {
            errorDisplay.textContent = 'Password must be at least 6 characters';
            errorDisplay.classList.add('show');
            return;
          }
          
          // Disable button and show loading state
          resetBtn.disabled = true;
          resetBtn.textContent = 'Resetting...';
          
          try {
            // Confirm the password reset with Firebase
            await auth.confirmPasswordReset(oobCode, newPassword.value);
            
            // Success! Show success message
            formContainer.style.display = 'none';
            successState.classList.add('show');
            
            // Use VaultToast if available
            if (window.VaultToast) {
              window.VaultToast.success('Password reset successfully!');
            }
            
          } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to reset password. Please try again.';
            
            switch (error.code) {
              case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password.';
                break;
              case 'auth/expired-action-code':
                errorMessage = 'This reset link has expired. Please request a new one.';
                break;
              case 'auth/invalid-action-code':
                errorMessage = 'This reset link is invalid. Please request a new one.';
                break;
            }
            
            errorDisplay.textContent = errorMessage;
            errorDisplay.classList.add('show');
            
            // Use VaultToast if available
            if (window.VaultToast) {
              window.VaultToast.error(errorMessage);
            }
            
          } finally {
            // Re-enable button
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset Password';
          }
        });
        
      } catch (error) {
        console.error('Invalid reset code:', error);
        
        // Code is invalid or expired
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
      }
    }
    
    // Initialize when page loads
    initResetPassword();
