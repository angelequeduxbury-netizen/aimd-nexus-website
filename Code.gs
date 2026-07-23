/**
 * AiMD Nexus — Free Consultation Booking Backend
 * ------------------------------------------------
 * Deploy this as a Google Apps Script Web App (see SETUP-GUIDE.md).
 *
 * Uses GET + JSONP instead of POST, because Apps Script web app
 * responses don't include the Access-Control-Allow-Origin header
 * that fetch()/POST needs for cross-origin requests. Loading the
 * response via a <script> tag (JSONP) sidesteps that limitation.
 *
 * Handles two actions sent from the website's booking widget:
 *   - checkAvailability  ?action=checkAvailability&date=...&time=...
 *   - confirmBooking     ?action=confirmBooking&name=...&email=...&date=...&time=...&interest=...
 *
 * On confirmBooking, this creates a 30 minute event on the connected
 * Google Calendar and emails OWNER_EMAIL with the enquiry details.
 */

// ============ CONFIGURE THESE ============
const CALENDAR_ID = 'PASTE_YOUR_CALENDAR_ID_HERE'; // e.g. abc123xyz@group.calendar.google.com
const OWNER_EMAIL = 'admin@aimdnexus.co.za';
const MEETING_LENGTH_MINUTES = 30;
// ===========================================

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = params.callback;
  let result;

  try {
    if (params.action === 'checkAvailability') {
      result = checkAvailability(params);
    } else if (params.action === 'confirmBooking') {
      result = confirmBooking(params);
    } else {
      result = { success: false, error: 'Unknown action.' };
    }
  } catch (err) {
    result = { success: false, error: 'Server error: ' + err.message };
  }

  return jsonpResponse(result, callback);
}

function checkAvailability(data) {
  const { date, time } = data;
  if (!date || !time) {
    return { available: false, error: 'Missing date or time.' };
  }

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + MEETING_LENGTH_MINUTES * 60000);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return { available: false, error: 'Calendar not found. Check CALENDAR_ID.' };
  }

  const existingEvents = calendar.getEvents(start, end);
  return { available: existingEvents.length === 0 };
}

function confirmBooking(data) {
  const { name, email, date, time, interest } = data;
  if (!name || !email || !date || !time) {
    return { success: false, error: 'Missing required details.' };
  }

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + MEETING_LENGTH_MINUTES * 60000);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return { success: false, error: 'Calendar not found. Check CALENDAR_ID.' };
  }

  // Re-check right before booking to avoid double-booking race conditions
  const existingEvents = calendar.getEvents(start, end);
  if (existingEvents.length > 0) {
    return { success: false, error: 'That slot was just taken. Please pick another time.' };
  }

  calendar.createEvent(
    `Consultation — ${name}`,
    start,
    end,
    {
      description:
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Interested in: ${interest || 'Not specified'}\n\n` +
        `Booked via the AiMD Nexus website consultation widget.`,
      guests: email,
      sendInvites: true
    }
  );

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: `New consultation request — ${name}`,
    body:
      `You have a new consultation request:\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Date: ${date}\n` +
      `Time: ${time} SAST\n` +
      `Interested in: ${interest || 'Not specified'}\n\n` +
      `A calendar event has been created and the requester has been added as a guest.`
  });

  return { success: true };
}

function jsonpResponse(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
