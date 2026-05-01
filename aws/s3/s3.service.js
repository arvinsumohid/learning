const crypto = require('node:crypto');
const path = require('node:path');

const { objects, uploadSessions } = require('./s3.store');

const MAX_OBJECT_BYTES = 5 * 1024 * 1024;
const UPLOAD_TTL_MS = 15 * 60 * 1000;

function getConfig() {
  return {
    bucket: process.env.AWS_S3_BUCKET || 'learning-local-bucket',
    region: process.env.AWS_REGION || 'local',
    mode: 'local-memory',
    maxObjectBytes: MAX_OBJECT_BYTES,
    uploadTtlSeconds: UPLOAD_TTL_MS / 1000,
  };
}

function createSafeFileName(fileName) {
  const fallback = `object-${crypto.randomUUID()}.bin`;
  const baseName = path.basename(String(fileName || fallback)).trim();
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-') || fallback;
}

function createObjectKey(fileName, key) {
  if (key) {
    return String(key).replace(/^\/+/, '');
  }

  return `uploads/${createSafeFileName(fileName)}`;
}

function createETag(buffer) {
  return `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
}

function isExpired(uploadSession) {
  return Date.now() > uploadSession.expiresAt;
}

function toObjectSummary(object) {
  return {
    bucket: object.bucket,
    key: object.key,
    eTag: object.eTag,
    contentType: object.contentType,
    sizeBytes: object.body.length,
    metadata: object.metadata,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}

function readStatus() {
  const config = getConfig();

  return {
    name: 'S3 upload process example',
    configured: true,
    config,
    process: [
      'Create an upload request with the desired file name, content type, and size.',
      'Upload bytes to the returned upload URL before it expires.',
      'Complete the upload so the object key and metadata are recorded.',
      'List, read, or delete the completed object by key.',
    ],
    endpoints: {
      createUpload: 'POST /aws/s3/uploads',
      uploadBody: 'PUT /aws/s3/uploads/:uploadId/body',
      completeUpload: 'POST /aws/s3/uploads/:uploadId/complete',
      listObjects: 'GET /aws/s3/objects',
      readObject: 'GET /aws/s3/objects/:key',
      deleteObject: 'DELETE /aws/s3/objects/:key',
    },
  };
}

function createUpload(input = {}) {
  const sizeBytes = Number(input.sizeBytes || 0);

  if (!input.fileName && !input.key) {
    return {
      statusCode: 400,
      body: { error: 'fileName or key is required.' },
    };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes < 0 || sizeBytes > MAX_OBJECT_BYTES) {
    return {
      statusCode: 400,
      body: {
        error: `sizeBytes must be between 0 and ${MAX_OBJECT_BYTES}.`,
      },
    };
  }

  const uploadId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + UPLOAD_TTL_MS);
  const key = createObjectKey(input.fileName, input.key);
  const config = getConfig();

  const uploadSession = {
    uploadId,
    bucket: config.bucket,
    key,
    fileName: input.fileName || path.basename(key),
    contentType: input.contentType || 'application/octet-stream',
    expectedSizeBytes: sizeBytes,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.getTime(),
    body: null,
    eTag: null,
  };

  uploadSessions.set(uploadId, uploadSession);

  return {
    statusCode: 201,
    body: {
      upload: {
        uploadId,
        bucket: uploadSession.bucket,
        key: uploadSession.key,
        contentType: uploadSession.contentType,
        expectedSizeBytes: uploadSession.expectedSizeBytes,
        expiresAt: expiresAt.toISOString(),
      },
      uploadUrl: `/aws/s3/uploads/${uploadId}/body`,
      nextStep: 'PUT the file bytes to uploadUrl, then POST to /aws/s3/uploads/:uploadId/complete.',
    },
  };
}

function uploadBody(uploadId, body) {
  const uploadSession = uploadSessions.get(uploadId);

  if (!uploadSession) {
    return {
      statusCode: 404,
      body: { error: 'Upload session was not found.' },
    };
  }

  if (isExpired(uploadSession)) {
    uploadSessions.delete(uploadId);

    return {
      statusCode: 410,
      body: { error: 'Upload session expired. Create a new upload.' },
    };
  }

  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || '');

  if (buffer.length > MAX_OBJECT_BYTES) {
    return {
      statusCode: 413,
      body: {
        error: `Object is larger than the ${MAX_OBJECT_BYTES} byte local limit.`,
      },
    };
  }

  if (uploadSession.expectedSizeBytes && buffer.length !== uploadSession.expectedSizeBytes) {
    return {
      statusCode: 400,
      body: {
        error: 'Uploaded byte length does not match sizeBytes from the upload request.',
        expectedSizeBytes: uploadSession.expectedSizeBytes,
        actualSizeBytes: buffer.length,
      },
    };
  }

  uploadSession.body = buffer;
  uploadSession.eTag = createETag(buffer);

  return {
    statusCode: 200,
    body: {
      message: 'Upload body received.',
      uploadId,
      key: uploadSession.key,
      eTag: uploadSession.eTag,
      sizeBytes: buffer.length,
      nextStep: `POST /aws/s3/uploads/${uploadId}/complete`,
    },
  };
}

function completeUpload(uploadId, input = {}) {
  const uploadSession = uploadSessions.get(uploadId);

  if (!uploadSession) {
    return {
      statusCode: 404,
      body: { error: 'Upload session was not found.' },
    };
  }

  if (isExpired(uploadSession)) {
    uploadSessions.delete(uploadId);

    return {
      statusCode: 410,
      body: { error: 'Upload session expired. Create a new upload.' },
    };
  }

  if (!uploadSession.body) {
    return {
      statusCode: 409,
      body: { error: 'Upload body has not been received yet.' },
    };
  }

  const now = new Date().toISOString();
  const object = {
    bucket: uploadSession.bucket,
    key: uploadSession.key,
    body: uploadSession.body,
    eTag: uploadSession.eTag,
    contentType: uploadSession.contentType,
    metadata: input.metadata || {},
    createdAt: objects.get(uploadSession.key)?.createdAt || now,
    updatedAt: now,
  };

  objects.set(object.key, object);
  uploadSessions.delete(uploadId);

  return {
    statusCode: 201,
    body: {
      message: 'Upload completed and object stored.',
      object: toObjectSummary(object),
      readUrl: `/aws/s3/objects/${encodeURIComponent(object.key)}`,
    },
  };
}

function abortUpload(uploadId) {
  if (!uploadSessions.delete(uploadId)) {
    return {
      statusCode: 404,
      body: { error: 'Upload session was not found.' },
    };
  }

  return {
    statusCode: 200,
    body: {
      message: 'Upload session aborted.',
      uploadId,
    },
  };
}

function listObjects(prefix = '') {
  const normalizedPrefix = String(prefix || '');
  const matchingObjects = Array.from(objects.values())
    .filter((object) => object.key.startsWith(normalizedPrefix))
    .map(toObjectSummary);

  return {
    statusCode: 200,
    body: {
      bucket: getConfig().bucket,
      prefix: normalizedPrefix,
      count: matchingObjects.length,
      objects: matchingObjects,
    },
  };
}

function readObject(key) {
  const object = objects.get(key);

  if (!object) {
    return {
      statusCode: 404,
      body: { error: 'Object was not found.' },
    };
  }

  const isTextLike =
    object.contentType.startsWith('text/') ||
    object.contentType === 'application/json' ||
    object.contentType.endsWith('+json');

  return {
    statusCode: 200,
    body: {
      object: toObjectSummary(object),
      bodyText: isTextLike ? object.body.toString('utf8') : null,
      bodyBase64: object.body.toString('base64'),
    },
  };
}

function deleteObject(key) {
  if (!objects.delete(key)) {
    return {
      statusCode: 404,
      body: { error: 'Object was not found.' },
    };
  }

  return {
    statusCode: 200,
    body: {
      message: 'Object deleted.',
      key,
    },
  };
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

