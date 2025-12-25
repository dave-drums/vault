# Firebase Data & Access Notes (Non-Authoritative)
This file documents intent only.  
It is not a replacement for Firebase Security Rules.

Last updated: December 25, 2024

---

## Site Architecture Overview

### Course System (Universal Template)
The site uses a **universal course template system** that dynamically renders any course (gs1, fs1, ss1, ks1, etc.) from a single code block.

**Key files:**
- `vault-course-config.js` - Course definitions (name, pathway, lesson arrays)
- `CODE-BLOCK_course-pages.txt` - Universal code block (same for all course pages)
- Firebase Storage: `/courses/{courseId}.txt` - Course content files with chapter markers

**How it works:**
1. User visits `/vault/gs?c=1` or `/vault/fs?c=1`
2. URL parsed to determine courseId (gs1, fs1, etc.)
3. Universal code block reads course config from `window.VAULT_COURSES`
4. Fetches course content from Firebase Storage (`/courses/gs1.txt`)
5. Parses chapter markers: `=== CHAPTER | Title ===` and `=== LESSON | G1.01 Name ===`
6. Renders course index with chapters, lessons, progress bar, and checkboxes
7. Loads user's progress from Firestore and updates UI

**Course content format:**
```
=== CHAPTER | Eighth Note Grooves ===

=== LESSON | G1.01 Start Here ===
T> Welcome text
V> video-id
G> groove-url

=== LESSON | G1.02 Kick Variations ===
...
```

**Benefits:**
- Add new course: Just upload .txt file and update vault-course-config.js
- No HTML duplication (was 360+ lines per course, now 0)
- Single source of truth for styling and functionality
- Easy maintenance - fix once, applies to all courses

### Page Structure

**Public pages:**
- Home, About, Contact, Services (no Firebase)
- Conditional script loading - Firebase only on protected pages

**Protected pages:**
- `/vault` - Course selection hub
- `/vault/gs`, `/vault/fs`, etc. - Course index pages (universal template)
- `/vault/gs?c=1&l=1.01` - Individual lesson pages
- `/members` - Dashboard with progress cards and Continue button
- `/vault/admin` - Admin console for user/progress management

**Authentication flow:**
1. HEADER_sitewide.txt loads Firebase SDK conditionally (only on /vault, /members paths)
2. Self-hosted Firebase SDK from dave-drums.github.io (bypasses tracker blockers)
3. Page headers check auth state, redirect to /members if not logged in
4. Body opacity hidden until auth check completes

### Script Loading Order

**HEADER_sitewide.txt** (all pages):
- Conditional Firebase SDK loading (self-hosted from dave-drums.github.io/vault/firebase/)
- vault-toast.js (conditional - /vault, /members only)
- vault-sidenav.js (conditional - /vault, /members only)  
- vault-render.js (conditional - /vault pages only)

**HEADER_members.txt** (/members page):
- vault-course-config.js (course definitions)
- Chart.js (for practice charts)
- vault-cues.js (motivational quotes)
- vault-metrics.js (login/practice tracking)
- vault-notifications.js (user notifications)
- vault-ui.js (dashboard rendering)

**HEADER_course-pages.txt** (/vault/gs, /vault/fs, etc.):
- Auth gate (redirect if not logged in)
- vault-course-config.js (course definitions)
- vault-lesson-comments.js (lesson discussions)

**Note:** vault-metrics.js is NOT loaded on course pages - complete buttons handled by universal code block to avoid duplicates.

### File Naming Convention
- `vault-*.js` - Core functionality files on GitHub
- `HEADER_*.txt` - Squarespace page header injections
- `CODE-BLOCK_*.txt` - Squarespace code blocks
- `{courseId}.txt` - Course content in Firebase Storage (e.g., gs1.txt, fs1.txt)

### Self-Hosted Firebase SDK
To bypass tracker blockers (Bitdefender, uBlock, etc.), Firebase SDK is hosted on dave-drums.github.io instead of Google's CDN:
- firebase-app-compat.js
- firebase-auth-compat.js
- firebase-firestore-compat.js
- firebase-functions-compat.js
- firebase-storage-compat.js

This ensures the site works for all users regardless of browser extensions.

---

## Roles
- Admin access is determined by existence of document:  
  `/admins/{uid}`
- No email-based checks are performed client-side or server-side.
- Admins have full read/write access to all collections.

## Users
- User profile documents live at:  
  `/users/{uid}`
- Users can read and write their own user document.
- Admins can read/write any user document.

### User Document Fields
- `email` (string)
- `displayName` (string)
- `firstName` (string)
- `lastName` (string)
- `birthdate` (string, format: "DD/MM/YYYY")
- `createdAt` (timestamp)
- `selfProgress` (boolean) - **Controls whether user can mark their own lessons complete**
  - **Default: `false`** for all new users (set during account creation)
  - **Admin can enable** via Progress modal checkbox in admin console
  - **Purpose**: Gives admin control over who can self-report progress
- `activeCourses` (map) - Tracks most recently viewed course per pathway  
  Example: `{ groove: 'gs1', fills: 'fs2' }`

### User Subcollections
- `/users/{uid}/metrics/{docId}` - Practice metrics (see Metrics section)
- `/users/{uid}/progress/{courseId}` - Course completion data (see Course Progress section)
- `/users/{uid}/notifications/{notificationId}` - User notifications
- `/users/{uid}/admin/notes` - Admin-only notes about this user

## Metrics
Metrics data is written by authenticated clients only.  
**Some metrics are read client-side for UX (e.g. "Continue" links, last viewed lesson, dashboard summaries).**

### Metrics Documents
Location: `/users/{uid}/metrics/{docId}`

#### stats
- `lastLoginAt` (timestamp) - Last login time
- `loginCount` (number) - Total number of logins
- `totalSeconds` (number) - Total practice time in seconds
- `lastSeenAt` (timestamp) - Last activity timestamp
- `lastDeviceType` (string) - 'mobile' or 'desktop'
- `lastDeviceEmoji` (string) - Device icon for display

#### practice
- `lastLessonUrl` (string) - Full URL including query params (e.g., `/vault/gs1?lesson=1.01`)
- `lastLessonTitle` (string) - Extracted lesson title
- `lastLessonViewedAt` (timestamp) - When lesson was last viewed

#### daily
- Subcollection: `/users/{uid}/metrics/daily/sessions/{dateKey}`
- `dateKey` format: YYYY-MM-DD (Brisbane timezone)
- Fields per session:
  - `practiced` (boolean) - Always true
  - `totalSeconds` (number) - Accumulated practice time for this day
  - `lastSessionAt` (timestamp) - Last session timestamp

### Access
- Users can read/write their own metrics only
- Admins can read/write all user metrics
- **Reads of metrics are restricted to the owning user (self-only) unless explicitly admin-only**

## Course Progress (Lesson Completion)
**Course progress is stored per user per course.**

### Structure
Location: `/users/{uid}/progress/{courseId}`

**Correct structure (nested object):**
```javascript
{
  completed: {
    "1.01": true,
    "1.02": false,
    "1.03": true,
    // ... sparse map of lesson completions
  },
  updatedAt: timestamp
}
```

**Important:** The `completed` field is a **nested object**, not flat fields. Earlier implementations mistakenly created flat fields like `"completed.1.01": true` which caused read failures.

### Updates
- **Uses Firestore `.update()` method** with dot notation for efficient nested updates:  
  ```javascript
  update({ "completed.1.01": true })
  ```
- **Not `.set()` with merge**, which creates flat fields incorrectly
- Avoids replacing entire `completed` map on each toggle
- If document doesn't exist yet, creates it with proper nested structure first

### Access Rules
- **Users may read their own course progress** (always)
- **Users may write/toggle their own progress ONLY when `selfProgress === true` on their user document**
- **Admins may read/write course progress for any user** (always)
- **Client code must not assume progress documents exist**  
  (treat missing document as 0% complete)
- **Firestore rules do NOT check selfProgress via `get()` call** (causes silent failures)
  - Instead, client-side JavaScript checks `selfProgress` before making checkboxes clickable
  - Security rules only verify user owns the document

### User Experience
**For users with `selfProgress: false` (default):**
- Can view course pages and lessons
- Can see progress bar and completion status
- **Cannot** click checkboxes to mark lessons complete
- Admin must mark their progress OR enable selfProgress

**For users with `selfProgress: true`:**
- All above features, plus:
- Can click checkboxes on course index page to toggle completion
- Can click "Complete Lesson" button on lesson pages
- Changes save immediately to Firestore

**For admins:**
- Full access to all users' progress
- Can toggle any user's lesson completion in admin console
- Can enable/disable selfProgress per user via Progress modal

### Implementation Details
- **Event handler**: Uses `onclick` property (not addEventListener) for maximum reliability
- **Click detection**: Status circles use `e.stopPropagation()` to prevent parent link navigation
- **Visual state**: Green checkmark when complete, white circle when incomplete
- **Page reload**: After toggling, page reloads to show updated state
- **Error handling**: Falls back to document creation if update fails with 'not-found'

### Course Configuration
- Course definitions (name, pathway, lesson list) stored in JavaScript  
  (`window.VAULT_COURSES` in vault-course-config.js)
- Currently configured courses:
  - Groove Studies: gs1 (23 lessons), gs2, gs3, gs4
  - Fill Studies: fs1 (23 lessons), fs2, fs3, fs4
  - Stick Studies: ss1, ss2, ss3, ss4
  - Kick Studies: ks1, ks2, ks3
- Course content files stored in Firebase Storage:  
  `/courses/{courseId}.txt` (e.g., gs1.txt, fs1.txt)
- Storage rules: Authenticated users can read, no one can write
- To add a new course:
  1. Add entry to `window.VAULT_COURSES` in vault-course-config.js
  2. Upload course .txt file to Firebase Storage
  3. Create Squarespace page at `/vault/{pathway}` (e.g., /vault/ss for Stick Studies)
  4. Copy universal CODE-BLOCK to the page
  5. Works automatically - no custom HTML needed

## Comments (Lesson Discussions)
User-generated content scoped to authenticated users.

### Structure
Location: `/lessonComments/{threadId}/comments/{commentId}`

- `threadId` derived from URL path (e.g., `vault_gs1` for course pages)
- Each comment document:
  - `uid` (string) - Comment author ID
  - `displayName` (string) - Author display name at time of comment
  - `text` (string) - Comment text (max 1000 chars)
  - `createdAt` (timestamp)
  - `deleted` (boolean) - Soft deletion flag
  - `deletedBy` (string) - 'user' or 'admin'
  - `parentId` (string, optional) - For nested replies

### Access
- **All authenticated users can read comments**
- **Authenticated users can create comments** (must set `uid` to their own)
- **Comment author can update their own `displayName`** (when profile changes)
- **Comment author or admin can soft-delete** (set `deleted: true`)
- **Only admins can permanently delete** (remove document)

### Client Implementation
- Comments load with pagination (10 per page)
- Real-time listener on current page only
- Listener detaches when tab hidden (saves reads)

## Invites
Invite system for adding new users.

### Structure
Location: `/invites/{token}`

- `token` is randomly generated 32-char hex string
- Fields:
  - `email` (string) - Invitee email
  - `used` (boolean) - Whether invite has been claimed
  - `createdAt` (timestamp)
  - `expiresAt` (timestamp) - 7 days from creation
  - `usedByUid` (string, optional) - UID of user who claimed invite
  - `usedAt` (timestamp, optional) - When invite was claimed

### Access
- **Admins: full read/write/delete**
- **Logged-out users: can read ONE valid invite** (unused, not expired)
- **Claiming user: can update once to mark as used**
- **Revocation: Admin can delete invite document**

### Account Creation Flow
1. Admin generates invite via admin console
2. Invite email sent with link containing token
3. User clicks link, fills out registration form
4. Account created with Firebase Auth
5. User document created in Firestore with:
   - Basic profile info (email, name, birthdate)
   - **`selfProgress: false`** (new users can't self-progress by default)
   - `createdAt` timestamp
6. Metrics document created at `/users/{uid}/metrics/stats`
7. Invite marked as used
8. User redirected to members area

## Notifications
User-to-user and system notifications.

### Structure
Location: `/users/{uid}/notifications/{notificationId}`

- Each notification contains:
  - `type` (string) - e.g., 'comment_reply'
  - `message` (string) - Notification text
  - `read` (boolean) - Whether user has read it
  - `createdAt` (timestamp)
  - `fromUid` (string, optional) - Sender ID
  - `relatedUrl` (string, optional) - Link to related content

### Access
- **User can read/update their own notifications**
- **Any authenticated user can create notifications for others**
- **Only owner or admin can delete**

## General Guidance for Client Code
- Always assume Firebase Security Rules are the source of truth
- Client-side checks are for UX only and must not be relied on for enforcement
- Do not infer roles by inspecting arbitrary fields or emails
- **Design reads to be coarse-grained** (one document per feature) rather than per-item  
  (e.g., avoid per-lesson reads - use single progress doc with completion map)
- **Avoid storing derived totals that can desynchronize**  
  (prefer deriving percentages from completion maps and known lesson counts)
- **Handle missing documents gracefully** (assume 0% progress, no metrics yet, etc.)
- **Use `.update()` for nested field updates, not `.set()` with merge**
- **Check for document existence before update, create if needed**

## Optimization Strategies
1. **Progress tracking**: Single doc per course with sparse completion map  
   → 1 read per lesson page load, 1 write per completion toggle
   
2. **Comments**: Paginated loading (10 per page) with real-time listener  
   → ~10 reads per lesson page, detaches on tab hide
   
3. **Metrics**: Multi-tab leader lock prevents double-counting practice time  
   → Only one tab writes metrics at a time
   
4. **Daily tracking**: Date-keyed sessions for "days practiced this week"  
   → One doc per day, incremental updates

5. **SelfProgress checking**: Checked once on page load, result cached  
   → Status circles rendered based on cached value, no per-click reads

## Common Pitfalls & Solutions

### Issue: Progress not saving
**Symptoms:** Checkboxes don't change state, no errors in console  
**Causes:**
- `selfProgress` field missing or undefined on user document
- Using `.set()` instead of `.update()` creates wrong data structure
- Firestore rules using `get()` call that fails silently

**Solutions:**
- Ensure all users have `selfProgress` boolean field (default: false)
- Use `.update()` method with dot notation for nested updates
- Avoid `get()` calls in Firestore rules; do client-side checks instead
- Check browser console for `[CLICK]` and `[TOGGLE]` debug logs

### Issue: Data structure is flat instead of nested
**Symptoms:** Firestore shows `"completed.1.01": true` instead of `completed: {"1.01": true}`  
**Cause:** Using `.set(data, {merge: true})` with dot notation in field names  
**Solution:**
- Use `.update()` method which properly interprets dot notation as paths
- Run data cleanup script to convert existing flat fields to nested structure
- Update vault-console.js and vault-course-progress.js to use `.update()`

### Issue: Login fails after account creation
**Symptoms:** "Invalid credential" error immediately after creating account  
**Causes:**
- Extra spaces in email field (browser autofill)
- API restrictions blocking Identity Toolkit API

**Solutions:**
- Always `.trim()` and `.toLowerCase()` emails during account creation
- Check Firebase Console → Authentication for exact email format
- Verify Google Cloud Console API restrictions don't block Identity Toolkit
- Use password reset if credentials don't match

## When Rules Change (Quick Checklist)
- Update this file if role logic or read/write access changes
- Update Firebase Security Rules in Firebase Console
- If any client assumptions changed, update the relevant `/vault/*.js` code
- If access failures are expected (`permission-denied`), ensure the UI handles it cleanly
- Test with non-admin user account to verify rule enforcement
- Clear browser cache and test with hard refresh after updates

## Known Firestore Read Patterns
**Course Index Page** (/vault/gs1):
- 1 read: progress doc
- 1 read: user doc (for selfProgress check)
- **Total: 2 reads**

**Lesson Page** (/vault/gs1?lesson=1.01):
- 1 read: progress doc (if selfProgress enabled)
- 1 read: user doc (for selfProgress check)
- ~10 reads: comments (paginated, first page)
- **Total: ~12 reads**

**Admin Console** (/vaultadmin):
- N reads: all users collection
- N reads: all user stats
- 1 read per lesson/course when Progress modal opened
- **Total: varies by user count**

**Typical user session**: 10-30 reads (well within free tier: 50k reads/day)

## File Versions & Updates
**Latest production files (December 19, 2025):**
- `vault-create-account.js` - Sets selfProgress: false for new users
- `vault-course-progress.js` - Uses onclick handlers, .update() method
- `vault-console.js` - Fixed admin checkbox state handling
- `firestore.rules` - Removed problematic get() call for selfProgress check

**Deprecated/debug versions:**
- `vault-course-progress-debug.js` - Excessive logging, use for diagnostics only
- Any version using `.set({merge: true})` for progress updates

## API Configuration
**Google Cloud Console settings:**
- **Website restrictions**: Enabled (whitelist davedrums.com.au domains)
- **API restrictions**: Disabled (all Firebase APIs allowed)
  - Website restrictions provide sufficient security
  - API restrictions were blocking Identity Toolkit (login) functionality
- **Authorized domains** (Firebase Console → Authentication):
  - davedrums.com.au
  - www.davedrums.com.au
  - davedrums.squarespace.com
  - dave-drums.firebaseapp.com

## Security Notes
- Email/password auth only (no third-party providers)
- All reads/writes require authentication
- Firestore rules enforce user ownership for personal data
- Admin role verified via document existence check (not email patterns)
- Course content in Firebase Storage is read-only
- Invite tokens expire after 7 days
- User passwords managed by Firebase Auth (never stored in Firestore)
