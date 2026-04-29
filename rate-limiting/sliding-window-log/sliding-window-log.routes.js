const express = require('express');
const controller = require('./sliding-window-log.controller');

const router = express.Router();

router.get('/search', controller.search);

module.exports = router;
