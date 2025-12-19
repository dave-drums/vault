# Firebase data & access notes (non-authoritative)

This file documents intent only.  
It is not a replacement for Firebase Security Rules.

## Roles
- Admin access is determined by existence of document:  
  `/admins/{uid}`
- No email-based checks are performed client-side or server-side.

## Users
- User profile documents live at:  
  `/users/{uid}`
- Users can read and write their own user document.
- User documents may include derived fields such as joined date or last login,  
  but role decisions are not made from user document fields.

## Metrics
- Metrics data is written by authenticated clients only.
- **Some metrics are read client-side for UX (e.g. “Continue” links, last viewed lesson, and lightweight dashboard summaries).**
- **Reads of metrics are restricted to the owning user (self-only) unless explicitly admin-only.**
- Clients should not assume read access to metrics collections **other than the specific documents or fields required to render UI.**

## Course progress (lesson completion)
- **Course progress is stored per user and per course**  
  (e.g. `/users/{uid}/courseProgress/{courseId}`).
- **Users may read their own course progress.**
- **Users may write/toggle their own progress only when self-progress is enabled for that user.**
- **Admins may read/write course progress for any user.**
- **Client code must not assume progress documents exist**  
  (treat a missing document as `0%` complete).

## Comments / user-generated content
- User-generated content (e.g. comments) is scoped to authenticated users (above 16 years of age).
- Users may write and delete their own content.
- Admin may write and delete their own content, and delete other users content.
- Client code should not assume cross-user read/write access unless explicitly granted.

## General guidance for client code
- Always assume Firebase Security Rules are the source of truth.
- Client-side checks are for UX only and must not be relied on for enforcement.
- Do not infer roles by inspecting arbitrary fields or emails.
- **Design reads to be coarse-grained** (one document per feature) rather than per-item  
  (e.g. avoid per-lesson reads).
- **Avoid storing derived totals that can desynchronise**  
  (prefer deriving percentages from completion maps and known lesson counts).

## When rules change (quick checklist)
- Update this file if role logic or read/write access changes.
- If any client assumptions changed, update the relevant `/vault/*.js` code.
- If access failures are expected (`permission-denied`), ensure the UI handles it cleanly.
