const User = require("../models/User");
const getOAuth2Client = require('../utils/googleAuthClient');
const { google } = require('googleapis');
//@desc     Register user
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, telephone, role } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      telephone,
      role,
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false });
    console.log(err.stack);
  }
};

// controllers/users.js
exports.addTelephone = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { telephone: req.body.telephone },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     Login user
//@route    POST /api/v1/auth/login
//@access   Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  // Validate email & password
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, msg: "Please provide an email and password" });
  }

  // Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(400).json({ success: false, msg: "Invalid credentials" });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({ success: false, msg: "Invalid credentials" });
  }
  // Create token
  //const token = user.getSignedJwtToken();
  //res.status(200).json({success:true, token})
  sendTokenResponse(user, 200, res);
};

//@desc     Log user out / clear cookie
//@route    GET /api/v1/auth/logout
//@access   Private
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    // add for frontend
    _id: user._id,
    name: user.name,
    email: user.email,
    telephone: user.telephone,
    // end for frontend
    token,
  });
};

//@desc     Get current Logged in user
//@route    POST /api/v1/auth/me
//@access   Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
};

// @desc     Redirect user to Google for authentication
// @route    GET /api/v1/auth/google/auth
// @access   Public
exports.googleAuth = (req, res) => {
  const oAuth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar'
  ];

  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });

  res.redirect(url);
};

// @desc     Handle Google OAuth callback and login/register user
// @route    GET /api/v1/auth/google/callback
// @access   Public
exports.googleCallback = async (req, res) => {
  const code = req.query.code;

  try {
    const oAuth2Client = getOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: 'v2'
    });

    const { data } = await oauth2.userinfo.get();
    const { email, name } = data;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || 'Unnamed User',
        email,
        role: 'user',
        authProvider: 'google',
        refreshToken: tokens.refresh_token
      });
    } else if (tokens.refresh_token) {
      user.refreshToken = tokens.refresh_token;
      await user.save();
    }

    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('Google OAuth error:', error.message);
    res.status(500).json({ success: false, message: 'Google login failed' });
  }
};
