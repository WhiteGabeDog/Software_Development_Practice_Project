// controllers/admin.js
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { google } = require('googleapis');

exports.emergencyCancel = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      apptDate: { $gte: new Date() } // only future appointments
    }).populate('user');

    const cancelled = [];

    for (const appt of appointments) {
      const user = appt.user;

      // Remove from Google Calendar if user is connected
      if (appt.googleEventId && user.refreshToken) {
        const oAuth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oAuth2Client.setCredentials({ refresh_token: user.refreshToken });

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        try {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: appt.googleEventId
          });
        } catch (err) {
          console.warn(`Failed to delete event ${appt.googleEventId}:`, err.message);
        }
      }

      // Delete the appointment
      await appt.deleteOne();

      // "Notify" the user (console only for now)
      console.log(`Notify ${user.email}: Your appointment on ${appt.apptDate.toISOString().split('T')[0]} has been cancelled due to an emergency.`);
      cancelled.push({ user: user.email, date: appt.apptDate });
    }

    res.status(200).json({
      success: true,
      message: `Cancelled ${cancelled.length} appointments.`,
      cancelled
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Emergency cancellation failed."
    });
  }
};
