const express = require('express');
const controller = require('./idempotency-keys.controller');

const router = express.Router();

router.post('/payments', controller.createPayment);

module.exports = router;
