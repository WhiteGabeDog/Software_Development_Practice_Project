const express = require("express");
const { register, login, getMe, logout, addTelephone, googleAuth, googleCallback } = require("../controllers/auth");

const router = express.Router();

const { protect } = require("../middleware/auth");

router.post('/add-telephone', protect, addTelephone);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.get('/google/login', googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;