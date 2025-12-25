# Netlify Deployment Checklist

## Pre-Deployment

- [ ] All files in /netlify-vault/ directory
- [ ] Firebase SDK files in /firebase/ subdirectory
- [ ] netlify.toml configuration file present
- [ ] test.html page created for diagnostics

## GitHub Setup

- [ ] Create/update vault branch in dave-drums.github.io repo
- [ ] Commit all files:
  ```bash
  git add .
  git commit -m "Netlify-ready vault with consolidated scripts"
  git push origin main
  ```

## Netlify Configuration

- [ ] Log into Netlify dashboard
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Connect to GitHub repository: dave-drums.github.io
- [ ] Select branch (main or vault)
- [ ] Build settings:
  - Build command: (leave empty)
  - Publish directory: `.` or `vault/` depending on repo structure
- [ ] Click "Deploy site"

## Initial Testing (on Netlify URL)

Visit `https://[your-site].netlify.app/test.html` first:
- [ ] All script load tests pass (green checkmarks)
- [ ] Firebase initialized successfully
- [ ] VaultToast success message appears
- [ ] Daily quote displays
- [ ] No console errors

Then test each page:

### Index Page (/)
- [ ] Page loads without errors
- [ ] Navigation links work
- [ ] Styles apply correctly

### Members Page (/members.html)
- [ ] Login form displays
- [ ] Firebase auth initialized
- [ ] Can login with test account
- [ ] Dashboard tabs appear when logged in
- [ ] Practice tab loads
- [ ] Profile tab loads
- [ ] Charts render (if data exists)
- [ ] Logout works

### Components
- [ ] Toast notifications work (test via browser console: `VaultToast.success('test')`)
- [ ] Side nav appears when logged in
- [ ] Side nav toggle works

## Issues to Watch For

Common problems and solutions:

### Scripts not loading
- Check Network tab in browser DevTools
- Verify all files deployed to Netlify
- Check file paths (should start with `/`)

### Firebase errors
- Verify API key and project ID in config
- Check Firebase console for any restrictions
- Ensure Netlify domain is authorized in Firebase

### Styling issues
- Check that CSS is inline in HTML or loading from external files
- Verify no Content-Security-Policy blocking styles

### Auth not persisting
- Check browser allows cookies/localStorage
- Verify Firebase auth domain includes Netlify domain

## Post-Deployment Monitoring

Monitor for 24-48 hours:
- [ ] Check Netlify analytics for errors
- [ ] Monitor Firebase usage/errors
- [ ] Watch for user reports
- [ ] Check browser console on different devices

## DNS Cutover (When Ready)

Only after thorough testing:
- [ ] In Netlify: Domain settings → Add custom domain
- [ ] Update DNS records to point to Netlify
- [ ] Verify SSL certificate issues
- [ ] Test again on custom domain
- [ ] Keep Squarespace backup active for 1 week

## Rollback Plan

If issues occur:
1. Revert DNS to Squarespace
2. Keep Netlify site active for debugging
3. Fix issues
4. Re-test before DNS cutover again

## Success Criteria

Site is ready for production when:
- [ ] All test.html diagnostics pass
- [ ] Members can login/logout
- [ ] Dashboard displays correctly
- [ ] Lesson pages render content
- [ ] No console errors on any page
- [ ] Mobile experience is good
- [ ] Practice tracking works
- [ ] Comments load (if enabled)
- [ ] All features from Squarespace version work

---

**Notes:**
- Test on multiple browsers (Chrome, Safari, Firefox)
- Test on mobile devices (iOS, Android)
- Test with ad blockers enabled (Firebase should still load from self-hosted files)
- Monitor Netlify build logs for any warnings

Last updated: 2024-12-25
