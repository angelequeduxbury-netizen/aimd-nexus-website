/**
 * AiMD Nexus — Free Consultation Booking Backend
 * ------------------------------------------------
 * Deploy this as a Google Apps Script Web App (see SETUP-GUIDE.md).
 *
 * Handles two actions sent from the website's booking widget:
 *   - checkAvailability  { date, time }
 *   - confirmBooking     { name, email, date, time, interest }
 *
 * On confirmBooking, this creates a 30 minute event on the connected
 * Google Calendar and emails OWNER_EMAIL with the enquiry details.
 */

// ============ CONFIGURE THESE ============
const CALENDAR_ID = 'PASTE_YOUR_CALENDAR_ID_HERE'; // e.g. abc123xyz@group.calendar.google.com
const OWNER_EMAIL = 'admin@aimdnexus.co.za';
const MEETING_LENGTH_MINUTES = 30;
// ===========================================

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid request.' });
  }

  if (data.action === 'checkAvailability') {
    return checkAvailability(data);
  } else if (data.action === 'confirmBooking') {
    return confirmBooking(data);
  }

  return jsonResponse({ success: false, error: 'Unknown action.' });
}

function checkAvailability(data) {
  const { date, time } = data;

  if (!date || !time) {
    return jsonResponse({ available: false, error: 'Missing date or time.' });
  }

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + MEETING_LENGTH_MINUTES * 60000);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return jsonResponse({ available: false, error: 'Calendar not found. Check CALENDAR_ID.' });
  }

  const existingEvents = calendar.getEvents(start, end);
  const available = existingEvents.length === 0;

  return jsonResponse({ available });
}

function confirmBooking(data) {
  const { name, email, date, time, interest } = data;

  if (!name || !email || !date || !time) {
    return jsonResponse({ success: false, error: 'Missing required details.' });
  }

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + MEETING_LENGTH_MINUTES * 60000);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return jsonResponse({ success: false, error: 'Calendar not found. Check CALENDAR_ID.' });
  }

  // Re-check right before booking to avoid double-booking race conditions
  const existingEvents = calendar.getEvents(start, end);
  if (existingEvents.length > 0) {
    return jsonResponse({ success: false, error: 'That slot was just taken. Please pick another time.' });
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

  return jsonResponse({ success: true });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
