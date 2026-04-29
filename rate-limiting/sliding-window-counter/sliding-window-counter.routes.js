const express = require('express');
const controller = require('./sliding-window-counter.controller');

const router = express.Router();

router.get('/metrics', controller.readMetrics);

module.exports = router;
