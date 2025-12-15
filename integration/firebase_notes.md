# Firebase data & access notes (non-authoritative)

This file documents intent only.
It is not a replacement for Firebase Security Rules.

## Roles
- Admin access is determined by existence of document:
  /admins/{uid}
- No email-based checks are performed client-side or server-side.

## Users
- User profile documents live at:
  /users/{uid}
- Users can read and write their own user document.
- User documents may include derived fields such as joined date or last login,
  but role decisions are not made from user document fields.

## Metrics
- Metrics data is written by authenticated clients only.
- Metrics are generally write-only from the client.
- Reads are restricted (e.g. admin-only or server-side usage).
- Clients should not assume read access to metrics collections.

## Comments / user-generated content
- User-generated content (e.g. comments) is scoped to authenticated users.
- Users may write their own content.
- Deletion or moderation may be restricted (e.g. admin-only).
- Client code should not assume cross-user read/write access unless explicitly granted.

## General guidance for client code
- Always assume Firebase Security Rules are the source of truth.
- Client-side checks are for UX only and must not be relied on for enforcement.
- Do not infer roles by inspecting arbitrary fields or emails.
