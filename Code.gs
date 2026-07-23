/**
 * BELL GUESTHOUSE — BOOKING BACKEND (Google Apps Script)
 * ---------------------------------------------------------------
 * WHAT THIS DOES
 * 1. Checks a Google Calendar for date clashes on a given room
 * 2. If free, creates a calendar event for the booking
 * 3. Emails the owner (Chris/Sophia) the full booking request
 *
 * SETUP (do this once):
 * 1. Go to https://script.google.com -> New Project
 * 2. Delete the default code, paste in this whole file
 * 3. Edit the CONFIGURATION block below with real values
 * 4. Click Deploy -> New deployment -> type: "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Click Deploy, authorise the permissions Google asks for
 * 6. Copy the "Web app URL" it gives you — that's the SCRIPT_URL
 *    you paste into the booking-widget.html file
 *
 * NOTE: every time you change this code you must create a NEW
 * deployment (or "Manage deployments" -> edit -> new version)
 * for the changes to go live.
 */

// ==================== CONFIGURATION ====================

// The calendar to book into. Use 'primary' for the Google account's
// main calendar, or a specific calendar ID (Calendar settings ->
// "Integrate calendar" -> Calendar ID) if using a dedicated
// "Bell Guesthouse Bookings" calendar (recommended).
const CALENDAR_ID = 'primary';

// Where the "New Booking Request" email gets sent
const OWNER_EMAIL = 'christiaanjohanneswilken@gmail.com';

// Room names — must match exactly what's in the booking form's
// dropdown on the website
const ROOMS = ['Room 1 — Double En-Suite', 'Room 2 — Twin En-Suite', 'Whole cottage'];
const WHOLE_COTTAGE = 'Whole cottage';

// =========================================================

// A booking conflicts if: someone already booked the same room,
// OR someone already booked "Whole cottage" (which blocks everything),
// OR this new request IS "Whole cottage" and ANY room is already booked.
function hasConflict(events, room) {
  return events.some(function (ev) {
    const title = ev.getTitle();
    if (title.indexOf(room) !== -1) return true;
    if (title.indexOf(WHOLE_COTTAGE) !== -1) return true;
    if (room === WHOLE_COTTAGE) return true; // any existing booking blocks a whole-cottage request
    return false;
  });
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'checkAvailability') {
      return checkAvailability(e.parameter.checkin, e.parameter.checkout, e.parameter.room);
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'createBooking') {
      return createBooking(data);
    }
    if (data.action === 'sendEnquiry') {
      return sendEnquiry(data);
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function checkAvailability(checkin, checkout, room) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const start = new Date(checkin + 'T00:00:00');
  const end = new Date(checkout + 'T00:00:00');

  const events = calendar.getEvents(start, end);
  const conflict = hasConflict(events, room);

  return jsonResponse({ available: !conflict });
}

function createBooking(data) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const start = new Date(data.checkin + 'T14:00:00'); // default 2pm check-in
  const end = new Date(data.checkout + 'T10:00:00');  // default 10am check-out

  // Double-check availability again server-side before booking
  // (in case someone else booked between the check and the confirm)
  const events = calendar.getEvents(start, end);
  const conflict = hasConflict(events, data.room);
  if (conflict) {
    return jsonResponse({ success: false, error: 'This room was just booked by someone else. Please choose different dates.' });
  }

  const title = data.room + ' — ' + data.name;
  const description = [
    'Guest: ' + data.name,
    'Email: ' + data.email,
    'Phone: ' + data.phone,
    'Guests: ' + data.guests,
    'Special Requests: ' + (data.specialRequests || 'None')
  ].join('\n');

  calendar.createEvent(title, start, end, { description: description });

  const tz = Session.getScriptTimeZone();
  const checkinStr = Utilities.formatDate(start, tz, 'd MMMM');
  const checkoutStr = Utilities.formatDate(end, tz, 'd MMMM');

  const subject = 'New Booking Request — ' + data.room;
  const body = [
    'New Booking Request',
    '',
    'Guest: ' + data.name,
    'Room: ' + data.room,
    'Dates: ' + checkinStr + ' to ' + checkoutStr,
    'Guests: ' + data.guests,
    'Phone: ' + data.phone,
    'Email: ' + data.email,
    'Special Requests: ' + (data.specialRequests || 'None'),
    '',
    'This booking has been added to the Bell Guesthouse Google Calendar.'
  ].join('\n');

  MailApp.sendEmail(OWNER_EMAIL, subject, body);

  return jsonResponse({ success: true });
}

function sendEnquiry(data) {
  if (!data.name || !data.email || !data.message) {
    return jsonResponse({ success: false, error: 'Missing required fields.' });
  }

  const subject = 'General Enquiry — Bell Guesthouse Website';
  const body = [
    'New general enquiry from the website (no dates attached):',
    '',
    'Name: ' + data.name,
    'Email: ' + data.email,
    'Phone: ' + (data.phone || 'Not provided'),
    '',
    'Message:',
    data.message
  ].join('\n');

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: subject,
    body: body,
    replyTo: data.email // so the owner can hit "reply" and it goes straight to the guest
  });

  return jsonResponse({ success: true });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
