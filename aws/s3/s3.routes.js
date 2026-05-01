const express = require('express');
const controller = require('./s3.controller');

const router = express.Router();

router.get('/', controller.readStatus);
router.post('/uploads', controller.createUpload);
router.put('/uploads/:uploadId/body', express.raw({ type: '*/*', limit: '5mb' }), controller.uploadBody);
router.post('/uploads/:uploadId/complete', controller.completeUpload);
router.delete('/uploads/:uploadId', controller.abortUpload);
router.get('/objects', controller.listObjects);
router.get('/objects/:key', controller.readObject);
router.delete('/objects/:key', controller.deleteObject);

module.exports = router;

