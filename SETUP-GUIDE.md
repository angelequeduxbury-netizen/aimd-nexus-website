# AiMD Nexus — Consultation Booking Setup Guide

Same pattern as the Bell Guesthouse booking system, adapted for consultation
calls. Two files:

- **Code.gs** — the backend (runs free on Google's servers)
- This guide

The website side is already built into `index.html` — you just need to
deploy the backend and paste one URL back in.

## Step 1 — Pick a calendar

Recommended: create a dedicated calendar called **"AiMD Nexus Consultations"**
in your Google account, rather than using your personal calendar.

1. Go to calendar.google.com → left sidebar → **+** next to "Other calendars" → **Create new calendar**
2. Name it "AiMD Nexus Consultations" → Create
3. Click the new calendar → **Settings and sharing**
4. Scroll to **Integrate calendar** → copy the **Calendar ID**
   (looks like `abc123xyz@group.calendar.google.com`)

## Step 2 — Deploy the backend

1. Go to **script.google.com** → **New project**
2. Delete the placeholder code, paste in everything from `Code.gs`
3. At the top, confirm:
   - `CALENDAR_ID` → paste the Calendar ID from Step 1
   - `OWNER_EMAIL` → already set to `admin@aimdnexus.co.za`
4. Click **Deploy** → **New deployment**
5. Click the gear icon next to "Select type" → choose **Web app**
6. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**
8. Google will ask you to authorise — click through (it'll warn "Google
   hasn't verified this app" since it's your own private script; click
   **Advanced** → **Go to [project name] (unsafe)** → **Allow**)
9. Copy the **Web app URL** it gives you — you'll need this next

> Any time you edit Code.gs later, you must go to **Deploy → Manage
> deployments → edit (pencil) → New version → Deploy** for the change
> to actually go live. Saving alone isn't enough.

## Step 3 — Connect it to the website

1. Open `index.html` in Notepad++
2. Search for:
   ```
   const CONSULT_BOOKING_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace the placeholder text with the Web app URL from Step 2
4. Save the file

That's the only edit needed — the booking widget, calendar check, and
confirmation email are already wired up.

## What happens when someone books

1. They fill in name, email, date, time, and what they're interested in →
   **Check Availability**
2. If the slot is free → **"Great news! That slot is available"** with a
   summary, then **Confirm Booking**
3. On confirm:
   - A 30 minute event is created on the calendar (visible to you)
   - The requester is added as a calendar guest (they get an invite)
   - An email is sent to **admin@aimdnexus.co.za** with their details

## Notes and limits

- This checks for a clash in that exact 30 minute window only — if you
  need buffer time between calls, say so and I can add a gap.
- There's no online payment step (it's a free consultation, so none is
  needed).
- The Apps Script web app is free with no usage limits realistic for a
  small agency's booking volume.
- Because "Who has access: Anyone" is required for the website to reach
  it, technically anyone with the URL could call the script. This is
  normal for this kind of setup and low risk for a booking form, but
  worth knowing.
- Test locally first by opening `index.html` directly and booking a
  slot yourself — confirm the event appears on the calendar and the
  email arrives at admin@aimdnexus.co.za before this goes live.
