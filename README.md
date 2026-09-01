# Code with Morais | HTML and CSS Platform

This project now contains a full Firebase-hosted platform for teaching HTML and CSS fundamentals with:

1. Student login
2. In-browser IDE (Monaco)
3. Cloud autosave to Firestore
4. Objective-based progress tracking
5. Teacher snapshot page

## Included Pages

1. `/` homepage
2. `/curriculum` curriculum map aligned to your ITS objectives
3. `/ide` HTML/CSS coding workspace with live preview and autosave
4. `/dashboard` student progress dashboard
5. `/teacher` teacher/admin analytics table

## Firebase Project

1. Target project is set in [.firebaserc](.firebaserc)
2. Hosting behavior is set in [firebase.json](firebase.json)
3. Security rules are set in [firestore.rules](firestore.rules)

## Local Run

```powershell
npm run dev
```

## Deploy

```powershell
npm run deploy
```

## First-Time Teacher Setup

After your first login, open Firestore and set your user role:

1. Collection: `users`
2. Document ID: your Firebase UID
3. Field: `role`
4. Value: `teacher` (or `admin`)

This enables the `/teacher` page.

## Data Model

1. `users/{uid}`: profile and role
2. `workspaces/{uid}_default`: HTML/CSS code and save metadata
3. `userProgress/{uid}`: completed objective IDs and counts

## Notes

1. Firestore rules are least-privilege for student ownership and teacher read access.
2. Objective tracking currently marks one selected objective at a time from the IDE.
3. You can expand modules, quizzes, and grading without changing the core auth/IDE/autosave architecture.

