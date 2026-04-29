const express = require('express');
const controller = require('./token-bucket.controller');

const router = express.Router();

router.get('/reports', controller.generateReport);

module.exports = router;
