const express = require('express');
const controller = require('./conditional-operations.controller');

const router = express.Router();

router.patch('/users/:id/status', controller.setUserStatus);

module.exports = router;
