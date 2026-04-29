const express = require('express');
const controller = require('./fixed-window-counter.controller');

const router = express.Router();

router.get('/feed', controller.readFeed);

module.exports = router;
