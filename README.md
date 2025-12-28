# Practice Vault - Complete Technical Documentation

> **Purpose**: This document provides complete understanding of the Practice Vault website architecture, logic, routing, file organization, and critical implementation details for AI assistants or developers who need to work on the codebase.

---

## Table of Contents
1. [Overview & Technology Stack](#overview--technology-stack)
2. [Architecture & Routing](#architecture--routing)
3. [File Organization](#file-organization)
4. [Typography System](#typography-system)
5. [Database Structure](#database-structure)
6. [Authentication & Authorization](#authentication--authorization)
7. [Progress Tracking System](#progress-tracking-system)
8. [Content Rendering System](#content-rendering-system)
9. [Components & UI System](#components--ui-system)
10. [Critical Implementation Rules](#critical-implementation-rules)
11. [Common Tasks & Patterns](#common-tasks--patterns)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview & Technology Stack

### What is Practice Vault?
Practice Vault is a drum education platform built for Dave Drums (davedrums.com.au). It provides:
- Structured online courses (Groove Studies, Fill Studies, Stick Studies, Kick Studies)
- Progress tracking and lesson completion
- Practice logging and statistics
- Admin console for user management
- GrooveScribe integration for drum notation

### Technology Stack
**Frontend**:
- Pure HTML/CSS/JavaScript (no frameworks)
- Firebase SDK (compat mode)
- Chart.js (practice statistics)
- BunnyStream (video hosting)

**Backend**:
- Firebase Authentication
- Firestore (NoSQL database)
- Firebase Storage (encrypted file storage)
- Firebase Functions (serverless backend)

**External Integrations**:
- GrooveScribe (groove.davedrums.com.au)
- Squarespace (main website + lesson content)
- BunnyStream (video library ID: `556221`)

---

## Architecture & Routing

### Site Structure

```
vault.davedrums.com.au/
├── index.html              → Course pathways (home)
├── members.html            → User dashboard/login
├── create-account.html     → Registration
├── contact.html            → Contact form ⭐NEW
├── reset-pass.html         → Password reset ⭐NEW
├── admin.html              → Admin console
├── groove.html             → GrooveScribe tool
├── gs.html                 → Groove Studies (template)
├── fs.html                 → Fill Studies (template)
├── CNAME                   → Domain configuration
├── LICENSE                 → License file
└── README.md               → Project documentation
```

**Note**: ss.html (Stick Studies) and ks.html (Kick Studies) are planned for future implementation.

### Routing Logic

#### Static Routes
- `/` or `/index.html` → Course pathways overview (PROTECTED)
- `/members.html` → Login/dashboard (PUBLIC - handles both states)
- `/create-account.html` → Registration (PUBLIC)
- `/contact.html` → Contact support form (PROTECTED) ⭐NEW
- `/reset-pass.html` → Password reset handler (PUBLIC) ⭐NEW
- `/admin.html` → Admin console (PROTECTED + ADMIN ONLY)
- `/groove.html` → GrooveScribe embed (PROTECTED)

#### Dynamic Routes (Course Pages)
Course pages (gs.html, fs.html, etc.) use **URL parameters** for routing:

**Course Index View**:
```
/gs.html?c=1        → Groove Studies Level 1 (course index)
/gs.html?c=2        → Groove Studies Level 2
/fs.html?c=1        → Fill Studies Level 1
```

**Individual Lesson View**:
```
/gs.html?c=1&l=1.01    → Groove Studies Level 1, Lesson 1.01
/gs.html?c=1&l=1.02    → Groove Studies Level 1, Lesson 1.02
/fs.html?c=1&l=1.05    → Fill Studies Level 1, Lesson 1.05
```

#### How Dynamic Routing Works

**File**: `course-loader.js` (loaded on all course template pages)

1. **Extracts pathway from filename**:
   ```javascript
   // URL: /gs.html?c=1
   // Extracts: pathway = "gs"
   ```

2. **Gets course number from URL param**:
   ```javascript
   const courseNum = urlParams.get('c');  // "1"
   ```

3. **Constructs courseId**:
   ```javascript
   const courseId = pathway + courseNum;  // "gs1"
   ```

4. **Looks up course in config**:
   ```javascript
   const courseConfig = window.VAULT_COURSES['gs1'];
   ```

5. **Determines view**:
   ```javascript
   const lessonId = urlParams.get('l');  // "1.01" or null
   
   if (lessonId) {
     // Show individual lesson content
     loadLesson(courseId, lessonId);
   } else {
     // Show course index (lesson grid)
     loadCourseIndex(courseId);
   }
   ```

### Course ID Format

**Pattern**: `{pathway}{level}`

Examples:
- `gs1` = Groove Studies Level 1
- `gs2` = Groove Studies Level 2
- `fs1` = Fill Studies Level 1
- `ss3` = Stick Studies Level 3

### Lesson ID Format

**Pattern**: `{courseLevel}.{lessonNumber}`

Examples:
- `1.01` = Level 1, Lesson 1
- `1.15` = Level 1, Lesson 15
- `2.03` = Level 2, Lesson 3

**Important**: Lesson IDs are strings, not numbers (leading zeros matter).

---

## File Organization

### Directory Structure

```
/
├── index.html              # Course pathways homepage
├── members.html            # Login/dashboard
├── create-account.html     # Registration
├── admin.html              # Admin console
├── contact.html            # Contact form (members-only) ⭐NEW
├── reset-pass.html         # Password reset handler ⭐NEW
├── groove.html             # GrooveScribe embed
├── gs.html                 # Groove Studies template
├── fs.html                 # Fill Studies template
│
├── /assets/                # Static assets
│   ├── favicon.webp
│   ├── pv-home.webp
│   ├── groove-studies.webp
│   ├── fill-studies.webp
│   ├── stick-studies.webp
│   ├── kick-studies.webp
│   ├── other-courses.webp  ⭐NEW
│   ├── members.webp
│   ├── dwd-logo-500px.webp
│   ├── drum-blue-200.png
│   └── youtube-logo.png
│
├── /firebase/              # Firebase SDK (compat mode)
│   ├── firebase-app-compat.js
│   ├── firebase-auth-compat.js
│   ├── firebase-firestore-compat.js
│   ├── firebase-storage-compat.js
│   ├── firebase-functions-compat.js
│   └── firebase-init.js            # Firebase config
│
└── /config/                # JavaScript modules
    ├── typography.css              # Central typography variables ⭐NEW
    ├── components.js               # UI components (menu, footer, toasts)
    ├── course-data.js              # ⭐ SINGLE SOURCE OF TRUTH for courses
    ├── course-loader.js            # Dynamic course routing
    ├── members.js                  # Members page logic
    ├── admin.js                    # Admin console logic
    ├── render.js                   # Lesson content renderer
    ├── lesson-comments.js          # Comment system
    ├── error-handler.js            # Error handling
    ├── cues.js                     # Daily motivational quotes
    ├── auth-guard.js               # Auth protection
    ├── progress-manager.js         # Progress tracking
    └── audio-player.js             # Custom audio player
```

### Critical Files Explained

#### `course-data.js` - SINGLE SOURCE OF TRUTH ⭐
**CRITICAL**: This is the ONLY place course definitions exist. All other files reference it.

```javascript
window.VAULT_COURSES = {
  'gs1': {
    name: 'Groove Studies',
    level: 'Level 1 – Beginner',
    pathway: 'groove',
    lessons: ['1.01', '1.02', '1.03', ...] // Array of lesson IDs
  },
  'gs2': { /* ... */ },
  'fs1': { /* ... */ },
  // ... more courses
}
```

**Load order requirement**: Must load BEFORE any script that references courses.

#### `typography.css` - Central Typography Control ⭐NEW
All font sizes are controlled by CSS custom properties:

```css
:root {
  /* Inter Font (Body/UI) */
  --text-large: 18px;
  --text-body: 16px;
  --text-ui: 15px;
  --text-small: 14px;
  --text-tiny: 13px;
  --text-micro: 12px;
  
  /* Oswald Font (Headings) */
  --heading-hero-desktop: 42px;
  --heading-hero-mobile: 36px;
  --heading-section: 28px;
  --heading-card: 20px;
  --heading-badge: 16px;
  --heading-stat-desktop: 36px;
  --heading-stat-mobile: 32px;
}
```

**To change a font size site-wide**: Edit typography.css once, all pages update.

#### `course-loader.js` - Dynamic Routing Engine
- Extracts pathway from URL filename
- Gets course number from `?c=` parameter
- Gets lesson ID from `?l=` parameter
- Loads appropriate view (course index or lesson)

#### `components.js` - Global UI Components
Provides:
- Toast notifications (`window.VaultToast.success()`, `.error()`, `.info()`)
  - ⭐NEW: Vertical slide animations (up/down instead of left/right)
- Hamburger menu (auto-injected)
  - ⭐NEW: Glass morphism styling with blur effect
  - ⭐NEW: Compact width (280px desktop, 260px mobile)
  - ⭐NEW: Thin blue left border matching hero headers
- Footer (auto-injected)
- Scroll-to-top button
  - ⭐NEW: Thick chevron design (more visible than previous arrow)

#### `render.js` - Content Parser
Converts Squarespace markdown syntax to HTML:
- `V>` → BunnyStream video
- `T>` → Text block
- `G>` → GrooveScribe embed
- `A>` → Audio player
- `H>` → Section heading
- `BR>` → Spacer
- `HR>` → Divider

#### `progress-manager.js` - Progress Tracking
Handles:
- Marking lessons complete/incomplete
- Updating Firestore
- Showing toast notifications
- Progress persistence

---

## Typography System

### Overview
Practice Vault uses a **centralized typography system** where all font sizes are defined as CSS custom properties in `/config/typography.css`.

### Font Families
- **Inter** (Google Fonts) - Body text, UI elements, buttons
- **Oswald** (Google Fonts) - Headings, titles, display text

### Typography Variables

#### Inter (Body/UI Text)
```css
--text-large: 18px;      /* Emphasis text, large callouts */
--text-body: 16px;       /* Standard body text (NEVER smaller) */
--text-ui: 15px;         /* Buttons, form labels, UI elements */
--text-small: 14px;      /* Metadata, timestamps, secondary info */
--text-tiny: 13px;       /* Captions, hints */
--text-micro: 12px;      /* Very small text (use sparingly) */
```

#### Oswald (Headings)
```css
--heading-hero-desktop: 42px;   /* Page hero titles (desktop) */
--heading-hero-mobile: 36px;    /* Page hero titles (mobile) */
--heading-section: 28px;        /* Section headings (H2) */
--heading-card: 20px;           /* Card titles (H3) */
--heading-badge: 16px;          /* Badges, small headings */
--heading-stat-desktop: 36px;   /* Stat numbers (desktop) */
--heading-stat-mobile: 32px;    /* Stat numbers (mobile) */
```

### Usage in HTML/CSS

```css
.my-heading {
  font-size: var(--heading-section);
}

.my-body-text {
  font-size: var(--text-body);
}
```

### Usage in JavaScript

```javascript
element.style.fontSize = 'var(--text-ui)';
```

### Benefits
1. **Single source of truth** - Change one file, update entire site
2. **Consistency** - All elements using `--text-body` are guaranteed same size
3. **Readability** - 16px minimum for body text (never smaller on mobile)
4. **Maintainability** - No hunting through files for hardcoded sizes

### Design Principles
- **Body text never smaller than 16px** (accessibility & readability)
- **Minimal responsive scaling** (gentler transitions)
- **No iOS zoom issues** (16px minimum prevents auto-zoom on input focus)

---

## Database Structure

### Firestore Collections

#### `/users/{uid}`
User profile and account data
```javascript
{
  email: "user@example.com",
  displayName: "John Doe",
  createdAt: timestamp,
  lastActive: timestamp,
  photoURL: "https://...",
  dateOfBirth: "1990-01-15",  // For age verification
  preferences: {
    notifications: true,
    theme: "default"
  }
}
```

#### `/users/{uid}/progress/{courseId}`
Course progress (e.g., `gs1`, `fs1`)

**Current Format**: Progress is stored as **ARRAY**:
```javascript
{
  completed: ["1.01", "1.02", "1.03"],  // Array of completed lesson IDs
  lastLesson: "1.03",
  lastUpdated: timestamp
}
```

**Legacy Format**: Some old data may be in **OBJECT** format:
```javascript
{
  completed: {
    "1.01": true,
    "1.02": true,
    "1.03": false
  }
}
```

**Normalization**: `course-loader.js` includes `normalizeProgressData()` that handles both formats when reading.

#### `/users/{uid}/practice/{YYYY-MM-DD}`
Daily practice logs
```javascript
{
  date: "2024-12-27",
  minutes: 45,
  notes: "Worked on paradiddles",
  timestamp: timestamp
}
```

#### `/users/{uid}/metrics/daily/sessions/{YYYY-MM-DD}`
Daily session tracking (for streak counting)
```javascript
{
  lastSessionAt: timestamp,
  sessionCount: 1
}
```

#### `/users/{uid}/notifications/{notificationId}`
User notifications
```javascript
{
  type: "comment_reply",
  title: "New reply to your comment",
  message: "Jane replied to your comment",
  link: "/gs.html?c=1&l=1.01",
  seen: false,
  read: false,
  createdAt: timestamp
}
```

#### `/admins/{uid}`
Admin privileges (document existence = admin)
```javascript
{
  role: "admin",
  grantedAt: timestamp,
  grantedBy: "adminUid"
}
```

#### `/invites/{token}`
Invitation codes
```javascript
{
  code: "DRUM2024",
  used: false,
  usedBy: null,
  createdAt: timestamp,
  expiresAt: timestamp,
  createdBy: "adminUid"
}
```

#### `/courses/{courseId}/lessons/{lessonId}/comments/{commentId}`
Lesson comments
```javascript
{
  userId: "uid",
  userName: "John Doe",
  text: "Great lesson!",
  createdAt: timestamp,
  isAdmin: false,
  replies: [ /* nested reply objects */ ]
}
```

---

## Authentication & Authorization

### Auth States

1. **Not logged in**
   - Redirected to `/members.html`
   - Shows login form

2. **Logged in (regular user)**
   - Access to: courses, members area, GrooveScribe
   - Cannot access: admin console

3. **Logged in (admin)**
   - Access to: everything + admin console
   - Admin status checked via `/admins/{uid}` document

### Auth Protection System

#### Page Protection
Protected pages include:
```html
<script>document.documentElement.dataset.protected = 'true';</script>
<script src="/config/auth-guard.js"></script>
```

**auth-guard.js** handles:
- Checking Firebase auth state
- Redirecting unauthenticated users to `/members.html`
- Hiding page content (opacity: 0) until auth verified
- Showing page after auth check passes

#### Admin Protection
Admin-only pages (e.g., admin.html) additionally check:
```javascript
db.collection('admins').doc(user.uid).get()
  .then(function(snap) {
    if (!snap.exists) {
      window.location.href = '/index.html';  // Redirect non-admins
    }
  });
```

### Auth Flow

```
User visits protected page
    ↓
auth-guard.js runs
    ↓
Firebase auth state checked
    ↓
┌─────────────────┬──────────────────┐
│  Authenticated  │  Not Authenticated│
└─────────────────┴──────────────────┘
         ↓                    ↓
    Show page          Redirect to
    (opacity: 1)       /members.html
         ↓
    Check if admin
    (if admin page)
         ↓
┌─────────────┬─────────────┐
│   Is Admin  │  Not Admin  │
└─────────────┴─────────────┘
      ↓               ↓
  Show admin   Redirect to
  console      /index.html
```

### Login Process

1. User enters email/password on `/members.html`
2. Firebase auth attempt via `firebase.auth().signInWithEmailAndPassword()`
3. Success → Redirect to `/index.html`
4. Failure → Show error toast

### Registration Process

1. User fills form on `/create-account.html`
2. Age verification (must be 16+)
3. Invite code validation (optional/required based on config)
4. Firebase account creation via `createUserWithEmailAndPassword()`
5. User document created in Firestore
6. Auto-login → Redirect to `/index.html`

---

## Progress Tracking System

### Data Structure

**Current Format**: Progress is stored as **ARRAY** of completed lesson IDs:

```javascript
// ✅ CURRENT - Array format
{
  completed: ["1.01", "1.03", "1.05"],
  lastLesson: "1.05"
}
```

**Legacy Format**: Some old data uses **OBJECT** format:
```javascript
// ⚠️ LEGACY - Object format (old data only)
{
  completed: {
    "1.01": true,
    "1.02": false,
    "1.03": true
  }
}
```

**Normalization**: The system handles both formats via `normalizeProgressData()` in `course-loader.js`.

### Why Array Format?

1. **Simpler structure**: Just a list of completed lesson IDs
2. **Smaller data**: Only stores completed lessons (not incomplete)
3. **Easy to work with**: `completed.includes(lessonId)`
4. **Backwards compatible**: Normalization handles old object format

### Marking Lessons Complete

**Function**: Handled in `course-loader.js` by `addCompleteLessonHandler()`

**Location**: Lines 536+ in `course-loader.js`

**Process**:
1. User clicks "Complete Lesson" button
2. Function checks current progress (array of completed lessons)
3. Adds lesson ID to array
4. Firestore updated:
   ```javascript
   const newCompleted = completed.concat([lessonId]);
   
   db.collection('users').doc(uid).collection('progress').doc(courseId)
     .set({
       completed: newCompleted,  // Array of lesson IDs
       lastLesson: lessonId,
       lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
     }, { merge: true });  // ⭐ CRITICAL: merge = true
   ```
5. User redirected to next lesson (or back to course index)

### Progress Display

#### Course Page (gs.html, fs.html)
- **Status circles**: ✓ for complete, empty for incomplete
- **Progress bar**: "X/Y Complete"
- **Chapter grouping**: Lessons grouped by chapter

#### Members Page
- **Course cards**: Show completion count "5/23"
- **Progress bars**: Visual representation
- **Last lesson**: "Continue from 1.05"

#### Index Page
- **Pathway cards**: Total lessons per pathway
- **Dynamic stats**: Pulled from course-data.js

### Progress Calculation

```javascript
// Get completed count
const completed = progressData.completed || {};
const completedLessons = Object.keys(completed).filter(k => completed[k]);
const completedCount = completedLessons.length;

// Get total lessons
const totalLessons = window.VAULT_COURSES[courseId].lessons.length;

// Calculate percentage
const percentage = (completedCount / totalLessons) * 100;
```

### Data Normalization

**File**: `course-loader.js`

Handles both old (array) and new (object) progress formats:

```javascript
function normalizeProgressData(completed) {
  if (!completed) return [];
  
  if (Array.isArray(completed)) {
    return completed;  // Old format
  }
  
  if (typeof completed === 'object') {
    // New format - convert to array
    return Object.keys(completed).filter(k => completed[k]);
  }
  
  return [];
}
```

---

## Content Rendering System

### Squarespace Integration

Lessons are authored in Squarespace using **markdown code blocks** with custom syntax.

### Custom Syntax Reference

```
V> video-id-here
   → BunnyStream video embed

T> Lesson text content here
   Can span multiple lines
   Supports basic markdown
   → Text block (with YouTube detection)

G> ?TimeSig=4/4&Div=16&Tempo=120&Measures=4&StaveCount=1&Sticking=RLRR
   → GrooveScribe drum notation embed

A> Audio Title | https://audio-url.mp3
   → Custom audio player

BR> 2
   → Spacer (2rem height)

HR>
   → Horizontal divider

H> Section Header Text
   → Section heading (styled)
```

### Render Pipeline

**File**: `render.js`

1. **Fetch lesson HTML** from Squarespace via proxy
2. **Extract code block** with lesson content
3. **Parse custom syntax** line by line
4. **Convert to HTML elements**:
   - Videos → iframe embeds
   - Text → styled divs
   - GrooveScribe → responsive iframe
   - Audio → custom player
5. **Inject into DOM** at `#lesson-content`

### BunnyStream Videos

**Library ID**: `556221`

**Embed format**:
```html
<iframe 
  src="https://iframe.mediadelivery.net/embed/556221/{VIDEO_ID}"
  allow="autoplay; fullscreen"
  allowfullscreen
></iframe>
```

**Features**:
- Responsive sizing (16:9 aspect ratio)
- Auto-play disabled
- Fullscreen support

### GrooveScribe Embeds

**External tool**: `groove.davedrums.com.au`

**URL parameters**:
```
?TimeSig=4/4          # Time signature
&Div=16               # Note division
&Tempo=120            # BPM
&Measures=4           # Number of measures
&StaveCount=1         # Number of staves
&Sticking=RLRR        # Sticking pattern (optional)
```

**Dynamic sizing**:
- Uses `postMessage` for height auto-resize
- Listens for resize events from iframe

### YouTube Detection

Text blocks (`T>`) with YouTube URLs automatically get a YouTube button:

```
T> Check out this tutorial: https://youtube.com/watch?v=...
```

Renders with embedded "Watch on YouTube" button.

---

## Components & UI System

### Global Components (components.js)

#### Toast Notifications
```javascript
window.VaultToast.success('Operation successful!');
window.VaultToast.error('Something went wrong');
window.VaultToast.info('Here\'s some info');
```

**Features**:
- Bottom-center positioning
- Auto-dismiss after 2.5 seconds
- Slide-in/out animations
- Color-coded by type

#### Hamburger Menu
- Auto-injected on all logged-in pages
- Navigation links to:
  - Home (index.html)
  - Courses (dynamic based on enrollment)
  - GrooveScribe
  - Members area
  - Logout
- Remembers last active course
- Smooth slide-in animation

#### Footer
- Universal footer with links
- Copyright info
- Auto-injected on all pages
- Sticky to bottom on short pages

#### Scroll-to-Top Button
- Appears after scrolling 300px
- Smooth scroll to top
- Fade in/out animation

### Hero Banners

**Structure** (all pages):
```html
<div class="[page]-hero">
  <div class="[page]-hero-bg"></div>
  <div class="[page]-hero-content">
    <h1 class="[page]-hero-title">PAGE TITLE</h1>
    <div class="[page]-hero-badge">Subtitle</div>
  </div>
</div>
```

**Features**:
- Background image with overlay
- Gradient text effect on title
- Animated gradient underline (4px bar)
- Responsive sizing

**Typography**:
- Desktop: `var(--heading-hero-desktop)` (42px)
- Mobile: `var(--heading-hero-mobile)` (36px)
- Badge: `var(--heading-badge)` (16px)

### CSS Variables

```css
:root {
  --accent: #06b3fd;              /* Primary brand color */
  --accent-hover: #0590d4;        /* Hover state */
  --text-primary: #1a1a1a;        /* Main text */
  --text-secondary: #6c757d;      /* Secondary text */
  --surface: #fff;                /* Card backgrounds */
  --surface-hover: #f8f9fa;       /* Hover states */
  --border: #e9ecef;              /* Border color */
  --shadow: 0 2px 8px rgba(0,0,0,0.08);  /* Box shadows */
}
```

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop container */
max-width: 1200px;
```

---

## Critical Implementation Rules

### ⚠️ NEVER DO THESE THINGS

1. **NEVER treat `completed` as an array**
   ```javascript
   // ❌ WRONG
   completed.push('1.01');
   
   // ✅ CORRECT
   completed['1.01'] = true;
   ```

2. **NEVER redefine `window.VAULT_COURSES`**
   - Only defined in `course-data.js`
   - All other files reference it

3. **NEVER update Firestore without `{ merge: true }`**
   ```javascript
   // ❌ WRONG - Overwrites entire document
   .set({ completed: { '1.01': true }});
   
   // ✅ CORRECT - Merges with existing data
   .set({ completed: { '1.01': true }}, { merge: true });
   ```

4. **NEVER use hardcoded font sizes**
   ```css
   /* ❌ WRONG */
   font-size: 16px;
   
   /* ✅ CORRECT */
   font-size: var(--text-body);
   ```

5. **NEVER forget auth protection**
   ```html
   <!-- ✅ REQUIRED for protected pages -->
   <script>document.documentElement.dataset.protected = 'true';</script>
   <script src="/config/auth-guard.js"></script>
   ```

6. **NEVER use relative paths**
   ```html
   <!-- ❌ WRONG -->
   <script src="config/components.js"></script>
   
   <!-- ✅ CORRECT -->
   <script src="/config/components.js"></script>
   ```

### ✅ ALWAYS DO THESE THINGS

1. **ALWAYS load scripts in correct order**:
   ```html
   <script src="/firebase/firebase-app-compat.js"></script>
   <script src="/firebase/firebase-auth-compat.js"></script>
   <script src="/firebase/firebase-firestore-compat.js"></script>
   <script src="/firebase/firebase-init.js"></script>
   <script src="/config/course-data.js"></script>  <!-- BEFORE other scripts -->
   <script src="/config/components.js"></script>
   <script src="/config/members.js"></script>
   ```

2. **ALWAYS include typography.css**:
   ```html
   <link rel="stylesheet" href="/config/typography.css">
   ```

3. **ALWAYS use CSS variables for typography**:
   ```css
   .my-element {
     font-size: var(--text-body);
   }
   ```

4. **ALWAYS wait for Firebase before database operations**:
   ```javascript
   waitForFirebase(function() {
     // Safe to use firebase.auth(), firebase.firestore()
   });
   ```

5. **ALWAYS normalize progress data**:
   ```javascript
   const completedArray = normalizeProgressData(progressData.completed);
   ```

6. **ALWAYS use absolute paths from root**:
   ```html
   <script src="/config/components.js"></script>
   <img src="/assets/favicon.webp">
   ```

### Script Load Order (CRITICAL)

**Correct order**:
```html
<!-- 1. Firebase SDK -->
<script src="/firebase/firebase-app-compat.js"></script>
<script src="/firebase/firebase-auth-compat.js"></script>
<script src="/firebase/firebase-firestore-compat.js"></script>
<script src="/firebase/firebase-storage-compat.js"></script>
<script src="/firebase/firebase-init.js"></script>

<!-- 2. Core config (MUST be before other scripts) -->
<script src="/config/course-data.js"></script>

<!-- 3. Global components -->
<script src="/config/components.js"></script>
<script src="/config/error-handler.js"></script>

<!-- 4. Page-specific scripts -->
<script src="/config/members.js" defer></script>
<!-- or -->
<script src="/config/course-loader.js" defer></script>
<script src="/config/render.js" defer></script>
```

**Why order matters**:
- Firebase SDK must load before init
- `course-data.js` defines `window.VAULT_COURSES` used by other scripts
- Components must exist before page scripts use them

---

## Common Tasks & Patterns

### Check if User is Admin

```javascript
const user = firebase.auth().currentUser;
if (!user) return;

db.collection('admins').doc(user.uid).get()
  .then(function(snap) {
    const isAdmin = snap.exists;
    if (isAdmin) {
      // User is admin
    }
  });
```

### Get User's Progress for a Course

```javascript
const uid = firebase.auth().currentUser.uid;
const courseId = 'gs1';

db.collection('users').doc(uid).collection('progress').doc(courseId)
  .get()
  .then(function(snap) {
    if (snap.exists) {
      const data = snap.data();
      const completed = data.completed || {};
      
      // Count completed lessons
      const completedCount = Object.keys(completed)
        .filter(k => completed[k]).length;
    }
  });
```

### Mark Lesson as Complete

```javascript
const uid = firebase.auth().currentUser.uid;
const courseId = 'gs1';
const lessonId = '1.01';

db.collection('users').doc(uid).collection('progress').doc(courseId)
  .set({
    completed: {
      [lessonId]: true  // Bracket notation for dynamic key
    },
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })  // ⭐ CRITICAL: merge = true
  .then(function() {
    window.VaultToast.success('Lesson marked complete!');
  })
  .catch(function(err) {
    window.VaultErrors.handle(err, 'Mark lesson complete');
  });
```

### Show Toast Notification

```javascript
// Success
window.VaultToast.success('Changes saved!');

// Error
window.VaultToast.error('Failed to save');

// Info
window.VaultToast.info('Lesson loaded');
```

### Navigate to Course/Lesson

```javascript
// Go to course index
window.location.href = '/gs.html?c=1';

// Go to specific lesson
window.location.href = '/gs.html?c=1&l=1.05';

// Go to different course
window.location.href = '/fs.html?c=2&l=2.03';
```

### Create New Course (Admin)

1. **Update course-data.js**:
   ```javascript
   window.VAULT_COURSES = {
     // ... existing courses
     'ss1': {
       name: 'Stick Studies',
       level: 'Level 1 – Beginner',
       pathway: 'sticks',
       lessons: ['1.01', '1.02', '1.03', /* ... */]
     }
   };
   ```

2. **Create HTML template** (copy gs.html → ss.html)
3. **Update hero background**: Change `background-image` URL
4. **Add to index.html**: Create pathway card
5. **Test**: Visit `/ss.html?c=1`

### Create New Lesson

1. **Add to course-data.js**:
   ```javascript
   'gs1': {
     // ...
     lessons: ['1.01', '1.02', '1.03', '1.04'] // Add '1.04'
   }
   ```

2. **Create in Squarespace**: Add code block with lesson content
3. **Test**: Visit `/gs.html?c=1&l=1.04`
4. Progress tracking works automatically

---

## Troubleshooting Guide

### Blank Page / White Screen

**Symptoms**: Page loads but shows nothing

**Causes**:
1. JavaScript error before page renders
2. Auth protection blocking display
3. Firebase not loaded

**Fix**:
1. Open browser console (F12)
2. Check for errors
3. Verify script load order
4. Check `course-data.js` loaded before other scripts
5. Verify Firebase initialized (`firebase.app()` in console)

### Progress Not Showing

**Symptoms**: Course shows 0/X complete despite completed lessons

**Causes**:
1. `course-data.js` not loaded
2. Course ID mismatch
3. Progress data in wrong format

**Fix**:
1. Console: Check `window.VAULT_COURSES` exists
2. Console: Check `window.VAULT_COURSES['gs1']` returns course object
3. Console: Inspect Firestore data structure (should be object, not array)
4. Verify `normalizeProgressData()` function exists

### "Not Authorized" Errors

**Symptoms**: Firestore operations fail with permission errors

**Causes**:
1. User not logged in
2. Firestore security rules deny access
3. Admin-only operation attempted by non-admin

**Fix**:
1. Verify user logged in: `firebase.auth().currentUser`
2. Check Firestore rules in Firebase console
3. For admin operations: Verify `/admins/{uid}` document exists
4. Check network tab for 401/403 errors

### Video Not Playing

**Symptoms**: BunnyStream video shows error or blank

**Causes**:
1. Incorrect video ID
2. Video not public in BunnyStream
3. Embedding disabled

**Fix**:
1. Verify video ID in Squarespace code block
2. Check BunnyStream dashboard: video is public
3. Check BunnyStream: embedding enabled
4. Test video URL directly: `https://iframe.mediadelivery.net/embed/556221/{VIDEO_ID}`

### Course Index Not Loading

**Symptoms**: `/gs.html?c=1` shows error

**Causes**:
1. Invalid course ID
2. `course-data.js` not loaded
3. URL parameter missing

**Fix**:
1. Check URL has `?c=` parameter
2. Console: Verify `window.VAULT_COURSES['gs1']` exists
3. Check console for errors
4. Verify `course-loader.js` loaded

### Hamburger Menu Not Appearing

**Symptoms**: No menu icon/button visible

**Causes**:
1. `components.js` not loaded
2. User not logged in
3. JavaScript error before menu injection

**Fix**:
1. Verify `components.js` in `<script>` tags
2. Check user auth state
3. Console: Check for errors
4. Console: Verify `window.VaultComponents` exists

### Progress Not Saving

**Symptoms**: Clicking complete doesn't persist

**Causes**:
1. Firestore permission denied
2. Not using `{ merge: true }`
3. Network error

**Fix**:
1. Check browser console for Firestore errors
2. Verify `progress-manager.js` uses `{ merge: true }`
3. Check network tab for failed requests
4. Test Firestore write manually in console

### Typography Not Updating

**Symptoms**: Changed `typography.css` but no visual change

**Causes**:
1. Browser cache
2. `typography.css` not linked in HTML
3. Using hardcoded values instead of variables

**Fix**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify `<link rel="stylesheet" href="/config/typography.css">` in `<head>`
3. Inspect element: Check computed font-size uses `var(--...)`
4. Check element CSS: Should use variables, not hardcoded px values

---

## Quick Reference Card

### File Types & Purposes

| File Type | Purpose | Examples |
|-----------|---------|----------|
| HTML | Page structure | index.html, members.html, gs.html |
| CSS | Styling (centralized) | typography.css |
| JS (config) | Core logic | course-data.js, components.js |
| JS (Firebase) | Backend SDK | firebase-auth-compat.js |
| JS (page) | Page-specific | members.js, admin.js |
| Squarespace | Lesson content | (external) |

### URL Patterns

| URL | What It Shows |
|-----|---------------|
| `/` or `/index.html` | Course pathways |
| `/members.html` | Login/Dashboard |
| `/gs.html?c=1` | Groove Studies L1 index |
| `/gs.html?c=1&l=1.01` | GS L1, Lesson 1.01 |
| `/admin.html` | Admin console |

### Key Functions

| Function | Purpose |
|----------|---------|
| `window.VaultToast.success()` | Show success toast |
| `window.vaultToggleLesson()` | Mark lesson complete/incomplete |
| `normalizeProgressData()` | Convert progress to array |
| `waitForFirebase()` | Wait for SDK to load |
| `window.VaultErrors.handle()` | Handle errors gracefully |

### Typography Variables Quick Ref

| Variable | Size | Use For |
|----------|------|---------|
| `--text-body` | 16px | Body text (standard) |
| `--text-ui` | 15px | Buttons, labels |
| `--text-small` | 14px | Metadata |
| `--heading-hero-desktop` | 42px | Page titles |
| `--heading-section` | 28px | Section headings |
| `--heading-card` | 20px | Card titles |

### Database Paths

| Path | Data |
|------|------|
| `/users/{uid}` | User profile |
| `/users/{uid}/progress/{courseId}` | Course progress |
| `/users/{uid}/practice/{date}` | Practice logs |
| `/admins/{uid}` | Admin status |
| `/invites/{token}` | Invite codes |

---

## Development Best Practices

### Before Making Changes

1. ✅ Understand which files are affected
2. ✅ Check if `course-data.js` needs updating
3. ✅ Verify script load order won't break
4. ✅ Test on both desktop and mobile
5. ✅ Check browser console for errors

### When Adding New Features

1. ✅ Use CSS variables for typography
2. ✅ Follow existing naming conventions
3. ✅ Add error handling with `window.VaultErrors.handle()`
4. ✅ Use toast notifications for user feedback
5. ✅ Update this README if architecture changes

### When Debugging

1. ✅ Open browser console first
2. ✅ Check network tab for failed requests
3. ✅ Verify Firebase initialized: `firebase.app()`
4. ✅ Check auth state: `firebase.auth().currentUser`
5. ✅ Inspect Firestore data structure manually

### Testing Checklist

Before considering a change complete:

- [ ] Tested on Chrome
- [ ] Tested on Safari/Firefox
- [ ] Tested on mobile device
- [ ] Tested logged in vs logged out
- [ ] Tested admin vs regular user
- [ ] No console errors
- [ ] Progress tracking works
- [ ] Navigation works
- [ ] Error states handled gracefully

---

## Architecture Diagrams

### Request Flow

```
User visits /gs.html?c=1&l=1.01
        ↓
auth-guard.js checks authentication
        ↓
    Authenticated?
        ↓
    course-loader.js extracts:
    - pathway: "gs"
    - courseNum: "1"
    - lessonId: "1.01"
        ↓
    Looks up: window.VAULT_COURSES['gs1']
        ↓
    render.js fetches lesson from Squarespace
        ↓
    Parses custom syntax (V>, T>, G>)
        ↓
    Renders content in #lesson-content
        ↓
    Loads progress from Firestore
        ↓
    Displays lesson with complete/incomplete state
```

### Data Flow (Progress Tracking)

```
User clicks "Complete" button
        ↓
window.vaultToggleLesson('1.01', false)
        ↓
Firestore update:
/users/{uid}/progress/gs1
    .set({
      completed: { '1.01': true }
    }, { merge: true })
        ↓
Toast notification shown
        ↓
Page reloads
        ↓
Progress display updated (checkmark shown)
```

### Component Injection

```
Page loads
        ↓
components.js executes
        ↓
Checks: firebase.auth().currentUser
        ↓
If logged in:
    ↓
    Inject hamburger menu
    Inject footer
    Inject scroll-to-top button
    Initialize toast container
```

---

## Changelog & Version History

### December 28, 2024 - UI/UX Enhancements & New Pages
- ✅ Created `/contact.html` - Members-only contact form
  - Web3Forms integration (free service)
  - VaultToast notifications
  - Standalone toast fallback system
- ✅ Created `/reset-pass.html` - Firebase password reset handler
  - Extracts oobCode from email links
  - Password validation (6+ characters)
  - Success/error state handling
- ✅ Updated `components.js`:
  - Glass morphism sidebar (blurred background, 85% opacity)
  - Vertical toast animations (slide up/down)
  - Thick chevron scroll-to-top button
  - Compact sidebar width (280px → better use of space)
  - Thin blue border on sidebar (matches hero headers)
- ✅ Updated `course-data.js`:
  - Removed dynamic progress loading for course cards
  - Hardcoded lesson counts (23 for GS1, 15 for FS1)
  - Simplified index page (no progress tracking display)
- ✅ Updated `index.html`:
  - Added "Learning to Read Rhythms" to Other Courses
  - Static lesson counts (no JavaScript updating)
- ✅ Updated `groove.html`:
  - Added "Drum Notation Editor" badge below title
- ✅ Updated `admin.js`:
  - Added scrolling to invites modal (max-height: 80vh)
  - Prevents overflow when invite list is large

### December 28, 2024 - Typography Centralization
- ✅ Created `/config/typography.css`
- ✅ Converted all hardcoded font-sizes to CSS variables
- ✅ Updated: admin.html, groove.html, index.html, members.html
- ✅ Updated: gs.html, fs.html, create-account.html
- ✅ Updated: components.js, lesson-comments.js
- ✅ Result: Single source of truth for typography

### December 27, 2024 - Progress System Fixes
- ✅ Fixed progress tracking (object vs array format)
- ✅ Fixed day streak calculation
- ✅ Added toast notifications to progress updates
- ✅ Created fs.html (Fill Studies)
- ✅ Removed duplicate auth code in components.js

### Previous Updates
- Removed duplicate course config from members.js
- File reorganization (moved admin and groove to root)
- Removed hero logos from gs.html and create-account.html
- Fixed hamburger menu links

---

## Support & Contacts

**Platform**: vault.davedrums.com.au  
**Main Website**: davedrums.com.au  
**Owner**: Dave D'Amore  
**Development**: Claude (AI Assistant)

---

*Last Updated: December 28, 2024*  
*Version: 2.1 (UI/UX Enhancements)*
