const express = require('express');
const controller = require('./http-methods.controller');

const router = express.Router();

router.get('/profiles/:id', controller.showProfile);
router.put('/profiles/:id', controller.replaceProfile);
router.delete('/profiles/:id', controller.deleteProfile);

module.exports = router;
