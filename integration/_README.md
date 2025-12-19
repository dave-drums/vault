# Firebase Data & Access Notes (Non-Authoritative)
This file documents intent only.  
It is not a replacement for Firebase Security Rules.

Last updated: December 2024

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

Document format:
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

### Updates
- Uses Firestore dot notation for efficient nested updates:  
  `{ "completed.1.01": true }`
- Avoids replacing entire `completed` map on each toggle

### Access Rules
- **Users may read their own course progress** (always)
- **Users may write/toggle their own progress ONLY when `selfProgress === true` on their user document**
- **Admins may read/write course progress for any user** (always)
- **Client code must not assume progress documents exist**  
  (treat missing document as 0% complete)

### Course Configuration
- Course definitions (name, pathway, lesson list) stored in JavaScript  
  (`window.VAULT_COURSES` in vault-console.js and vault-course-progress.js)
- Course content files stored in Firebase Storage:  
  `/courses/{courseId}.txt`
- Storage rules: Authenticated users can read, no one can write

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

## Optimization Strategies
1. **Progress tracking**: Single doc per course with sparse completion map  
   → 1 read per course page load, 1 write per completion toggle
   
2. **Comments**: Paginated loading (10 per page) with real-time listener  
   → ~10 reads per lesson page, detaches on tab hide
   
3. **Metrics**: Multi-tab leader lock prevents double-counting practice time  
   → Only one tab writes metrics at a time
   
4. **Daily tracking**: Date-keyed sessions for "days practiced this week"  
   → One doc per day, incremental updates

## When Rules Change (Quick Checklist)
- Update this file if role logic or read/write access changes
- Update Firebase Security Rules in Firebase Console
- If any client assumptions changed, update the relevant `/vault/*.js` code
- If access failures are expected (`permission-denied`), ensure the UI handles it cleanly
- Test with non-admin user account to verify rule enforcement

## Known Firestore Read Patterns
**Course Index Page** (/vault/gs1):
- 1 read: progress doc
- 1 read: user doc (for selfProgress check)

**Lesson Page** (/vault/gs1?lesson=1.01):
- 1 read: progress doc (if selfProgress enabled)
- 1 read: user doc (for selfProgress check)
- ~10 reads: comments (paginated)

**Admin Console** (/vault-admin):
- N reads: all users collection
- N reads: all user stats
- 1 read per course when Progress modal opened

**Typical session**: 10-20 reads (well within free tier: 50k/day)
