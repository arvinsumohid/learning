const service = require('./s3.service');

function sendResult(res, result) {
  return res.status(result.statusCode).json(result.body);
}

function readStatus(_req, res) {
  return res.json(service.readStatus());
}

function createUpload(req, res) {
  return sendResult(res, service.createUpload(req.body || {}));
}

function uploadBody(req, res) {
  return sendResult(res, service.uploadBody(req.params.uploadId, req.body));
}

function completeUpload(req, res) {
  return sendResult(res, service.completeUpload(req.params.uploadId, req.body || {}));
}

function abortUpload(req, res) {
  return sendResult(res, service.abortUpload(req.params.uploadId));
}

function listObjects(req, res) {
  return sendResult(res, service.listObjects(req.query.prefix));
}

function readObject(req, res) {
  return sendResult(res, service.readObject(req.params.key));
}

function deleteObject(req, res) {
  return sendResult(res, service.deleteObject(req.params.key));
}

module.exports = {
  readStatus,
  createUpload,
  uploadBody,
  completeUpload,
  abortUpload,
  listObjects,
  readObject,
  deleteObject,
};

