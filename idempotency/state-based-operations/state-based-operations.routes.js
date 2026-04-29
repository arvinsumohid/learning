const express = require('express');
const controller = require('./state-based-operations.controller');

const router = express.Router();

router.put('/directories/:name', controller.ensureDirectory);

module.exports = router;
