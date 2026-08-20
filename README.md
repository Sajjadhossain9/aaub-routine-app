# FlightPlan - AAUB Routine

A mobile-first, offline-capable personal routine and study-preparation tracker for AAUB Avionics Engineering, Batch 04, Semester 05 (July-December 2026).

## Features

- Date-specific daily and weekly routine, including adjustment classes and holidays
- Tap-to-cycle preparation status for every class
- Lab report tracker with due reminders
- CT and MID readiness tracker with countdowns
- Editable custom classes, reports and assessments
- Local JSON backup/import, dark/light themes and browser notifications
- Installable Progressive Web App with offline caching

## Run locally

The service worker requires HTTP. Use a local web server instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Privacy

There is no account, analytics or backend. Progress stays in the current browser's local storage. Browser notifications are best-effort and may not fire when the app is fully closed.
