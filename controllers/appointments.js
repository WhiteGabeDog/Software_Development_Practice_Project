const Appointment = require("../models/Appointment");
const User = require("../models/User");
const CoWorkingSpace = require("../models/CoWorkingSpace");
const createGoogleMeetEvent = require("../utils/createGoogleMeetEvent");
const { google } = require('googleapis');
//@desc     Get all appointments
//@route    GET /api/v1/appointments
//@access   Public
exports.getAppointments = async (req, res, next) => {
  let query;
  // General users can see only their appointments!
  if (req.user.role !== "admin") {
    query = Appointment.find({ user: req.user.id }).populate({
      path: "coworkingSpace",
      select: "name province tel",
    });
  } else {
    if (req.params.coworkingspaceId) {
      console.log(req.params.coworkingspaceId);
      query = Appointment.find({
        coworkingspace: req.params.coworkingspaceId,
      }).populate({
        path: "coworkingSpace",
        select: "name province tel",
      });
    } else
      query = Appointment.find().populate({
        path: "coworkingSpace",
        select: "name province tel",
      });
  }

  try {
    const appointments = await query;

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot Find Apppointment" });
  }
};

//@desc     Get single appointment
//@route    GET /api/v1/appointments/:id
//@access   Public
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: "coworkingSpace",
      select: "name description tel",
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Appointment" });
  }
};

//@desc     Add appointment
//@route    POST /api/v1/coworkingspaces/:coworkingspaceId/appointment
//@access   Private
exports.addAppointment = async (req, res, next) => {
  try {
    req.body.coworkingSpace = req.params.coworkingspaceId;

    const coworkingSpace = await CoWorkingSpace.findById(req.params.coworkingspaceId);

    if (!coworkingSpace) {
      return res.status(404).json({
        success: false,
        message: `No co-working space with the id of ${req.params.coworkingspaceId}`,
      });
    }

    req.body.user = req.user.id;

    const sameUserSameDate = await Appointment.findOne({
      user: req.user.id,
      apptDate: req.body.apptDate,
    });

    if (sameUserSameDate && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You already have an appointment on this date.",
      });
    }

    const sameSpaceSameDate = await Appointment.findOne({
      coworkingSpace: req.body.coworkingSpace,
      apptDate: req.body.apptDate,
    });

    if (sameSpaceSameDate && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "This co-working space is already booked on the selected date.",
      });
    }

    const existedAppointment = await Appointment.find({ user: req.user.id });

    if (existedAppointment.length >= 3 && req.user.role !== "admin") {
      return res.status(400).json({
        success: true,
        message: `The user with ID ${req.user.id} has already made 3 appointments`,
      });
    }

    const user = await User.findById(req.user.id);
    let meetLink = "";
    let googleEventId = "";

    if (user.refreshToken) {
      const startTime = new Date(`${req.body.apptDate}T${coworkingSpace.openTime}:00`);
      const endTime = new Date(`${req.body.apptDate}T${coworkingSpace.closeTime}:00`);

      const event = await createGoogleMeetEvent({
        summary: coworkingSpace.name,
        description: coworkingSpace.address,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        refreshToken: user.refreshToken,
      });

      if (event) {
        meetLink = event.hangoutLink || "";
        googleEventId = event.id || "";
      }
    } else {
      console.log("User has not connected Google — skipping Meet link.");
    }

    req.body.meetLink = meetLink;
    req.body.googleEventId = googleEventId;

    const appointment = await Appointment.create(req.body);

    res.status(200).json({
      success: true,
      data: appointment,
    });

  } catch (error) {
    console.error(error.stack);
    return res.status(500).json({
      success: false,
      message: "Cannot create Appointment"
    });
  }
};

//@desc     Update appointment
//@route    PUT /api/v1/appointments/:id
//@access   Private
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`,
      });
    }

    if (
      appointment.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this appointment`,
      });
    }

    const user = await User.findById(req.user.id);
    const coworkingSpace = await CoWorkingSpace.findById(appointment.coworkingSpace);

    // If user connected Google + event exists, update event
    if (user.refreshToken && appointment.googleEventId) {
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      const start = new Date(`${req.body.apptDate}T${coworkingSpace.openTime}:00`).toISOString();
      const end = new Date(`${req.body.apptDate}T${coworkingSpace.closeTime}:00`).toISOString();

      await calendar.events.update({
        calendarId: 'primary',
        eventId: appointment.googleEventId,
        resource: {
          summary: coworkingSpace.name,
          description: coworkingSpace.address,
          start: { dateTime: start, timeZone: 'Asia/Bangkok' },
          end: { dateTime: end, timeZone: 'Asia/Bangkok' }
        }
      });
    }

    // Update appointment in DB
    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: appointment,
    });

  } catch (error) {
    console.error(error.stack || error);
    return res.status(500).json({ success: false, message: "Cannot update Appointment" });
  }
};

//@desc     Delete appointment
//@route    DELETE /api/v1/appointments/:id
//@access   Private
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`,
      });
    }

    // Make sure user is the appointment owner
    if (
      appointment.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this appointment`,
      });
    }

    const user = await User.findById(req.user.id);

    if (user.refreshToken && appointment.googleEventId) {
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
          eventId: appointment.googleEventId
        });
      } catch (calendarErr) {
        console.warn('Google Calendar event deletion failed:', calendarErr.message);
        // Don't block appointment deletion if event delete fails
      }
    }

    await appointment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully',
      data: {}
    });

  } catch (error) {
    console.error(error.stack || error);
    return res.status(500).json({ success: false, message: "Cannot delete Appointment" });
  }
};
