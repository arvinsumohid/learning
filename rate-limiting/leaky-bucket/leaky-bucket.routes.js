const express = require('express');
const controller = require('./leaky-bucket.controller');

const router = express.Router();

router.post('/emails', controller.sendEmail);

module.exports = router;
