const getOAuth2Client = require('../utils/googleAuthClient');
const { google } = require('googleapis');

const createGoogleMeetEvent = async ({ summary, description, start, end, refreshToken }) => {
  try {
    const oAuth2Client = getOAuth2Client();

    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: {
        summary,
        description,
        start: { dateTime: start, timeZone: 'Asia/Bangkok' },
        end: { dateTime: end, timeZone: 'Asia/Bangkok' },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
    });

    return event.data;
  } catch (error) {
    console.error('Google Meet error:', error.response?.data || error.message);
    return null;
  }
};

module.exports = createGoogleMeetEvent;
