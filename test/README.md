# Dave Drums Practice Vault - Netlify Setup

## Overview

This is a consolidated version of the Practice Vault app optimized for Netlify hosting with improved script loading and reduced race conditions.

## Key Changes from Squarespace Version

### 1. Script Consolidation
**Problem**: 8 separate JS files loaded unpredictably causing race conditions
**Solution**: Consolidated to 5 smart bundles:

- `vault-dashboard.js` ← vault-ui.js + vault-metrics.js (used together on /members)
- `vault-components.js` ← vault-toast.js + vault-sidenav.js (UI components)
- `vault-render.js` (standalone - distinct feature)
- `vault-lesson-comments.js` (standalone - distinct feature)  
- `vault-console.js` (standalone - admin only)

### 2. Controlled Load Order
All Firebase SDK files load first, then app scripts load in dependency order with proper initialization.

### 3. File Structure

```
netlify-vault/
├── index.html                    # Landing page
├── members.html                  # Members login/dashboard
├── netlify.toml                  # Netlify configuration
├── firebase/                     # Self-hosted Firebase SDK
│   ├── firebase-app-compat.js
│   ├── firebase-auth-compat.js
│   ├── firebase-firestore-compat.js
│   ├── firebase-functions-compat.js
│   └── firebase-storage-compat.js
├── vault-dashboard.js            # Members UI + metrics (consolidated)
├── vault-components.js           # Toast + sidenav (consolidated)
├── vault-render.js               # Lesson content renderer
├── vault-lesson-comments.js      # Comment system
├── vault-console.js              # Admin console
├── vault-create-account.js       # Account creation
├── vault-notifications.js        # Notification system
├── vault-course-config.js        # Course configuration
└── vault-cues.js                 # Inspirational quotes
```

## Deployment Instructions

### Step 1: Connect to Netlify
1. Go to Netlify dashboard
2. "Add new site" → "Import an existing project"
3. Connect to your GitHub repo: `dave-drums.github.io/vault/`
4. Branch: `main` (or your preferred branch)

### Step 2: Build Settings
- **Build command**: (leave empty - static files only)
- **Publish directory**: `.` (current directory)
- **Functions directory**: (leave empty unless using Netlify Functions)

### Step 3: Deploy
1. Click "Deploy site"
2. Wait for deployment to complete
3. Netlify will assign a URL like `davedrums.netlify.app`

### Step 4: Custom Domain (Optional)
To use vault.davedrums.com.au:
1. In Netlify dashboard → Domain settings
2. Add custom domain: `vault.davedrums.com.au`
3. Follow DNS configuration instructions
4. OR keep on Netlify subdomain for testing

## Testing Checklist

Before switching from Squarespace to Netlify, test:

### Authentication
- [ ] Firebase loads without errors
- [ ] Login works (/members.html)
- [ ] Password reset works
- [ ] Logout works
- [ ] Auth redirects work for protected pages

### Dashboard (/members.html)
- [ ] Practice tab displays correctly
- [ ] Progress charts render
- [ ] "Continue..." button shows last lesson
- [ ] Daily quotes display
- [ ] Profile tab works
- [ ] Notifications icon appears
- [ ] Side nav toggle works

### Course Pages
- [ ] Course index pages display lesson grid
- [ ] Progress circles update correctly
- [ ] Lesson clicks navigate properly

### Lesson Pages
- [ ] Content renders (videos, groove players, text)
- [ ] Complete button appears
- [ ] Next lesson navigation works
- [ ] Comments load (if enabled)
- [ ] Practice time tracking works

### Mobile
- [ ] Test all above on mobile device
- [ ] Touch interactions work
- [ ] Responsive layout correct

## Script Load Order (How It Works)

### On Members Page (`members.html`):
1. Firebase SDK loads (5 files, sequential)
2. Firebase initializes
3. `vault-components.js` loads (toast + sidenav)
4. `vault-course-config.js` loads
5. `vault-cues.js` loads (quotes)
6. `vault-notifications.js` loads
7. Chart.js CDN loads
8. `vault-dashboard.js` loads (UI + metrics combined)

All scripts wait for Firebase to be ready before executing.

### On Lesson Pages:
1. Firebase SDK
2. `vault-components.js`
3. `vault-render.js` (with config)
4. `vault-lesson-comments.js` (if enabled)

## Differences from Squarespace

| Aspect | Squarespace | Netlify |
|--------|-------------|---------|
| Script injection | Page-specific header/footer code | Single HTML files with inline scripts |
| File hosting | dave-drums.github.io/vault/ | Netlify CDN |
| Cache control | Aggressive caching issues | Controlled cache headers |
| Load timing | Race conditions common | Deterministic load order |
| Debugging | Difficult (multiple injection points) | Easier (single HTML source) |

## Troubleshooting

### "Firebase is undefined" errors
- Check browser console for which Firebase file failed to load
- Verify all 5 Firebase files are in `/firebase/` directory
- Check Network tab for 404s

### Scripts not executing
- Check browser console for errors
- Verify script src paths are correct (should start with `/`)
- Ensure scripts load in correct order

### Styles not applying
- Check that inline styles in HTML are not being stripped
- Verify CSS is loading from external files if separated

### Auth not working
- Verify Firebase config credentials are correct
- Check Firebase console for API key restrictions
- Ensure auth domain includes netlify.app domain

## Next Steps After Successful Deployment

1. Test thoroughly on Netlify URL
2. Monitor for 24-48 hours for any edge case bugs
3. Once confident, update DNS to point vault subdomain to Netlify
4. Keep Squarespace version as backup for 1 week
5. Decommission Squarespace version

## Rollback Plan

If issues arise:
1. Change DNS back to Squarespace
2. Keep Netlify deployment active for debugging
3. Fix issues on Netlify
4. Re-test before switching DNS again

## Support

For issues:
1. Check browser console for errors
2. Check Netlify deploy logs
3. Check Firebase console for auth/database errors
4. Review this README for common issues

Last updated: 2024-12-25
