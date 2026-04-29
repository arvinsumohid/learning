const express = require('express');
const controller = require('./google-authentication.controller');

const router = express.Router();

router.get('/', controller.readStatus);
router.get('/auth/google', controller.redirectToGoogle);
router.get('/auth/google/callback', controller.handleGoogleCallback);

module.exports = router;
