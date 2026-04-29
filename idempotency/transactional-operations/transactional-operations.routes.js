const express = require('express');
const controller = require('./transactional-operations.controller');

const router = express.Router();

router.post('/orders/:orderId', controller.createOrder);

module.exports = router;
