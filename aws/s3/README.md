# S3

This example shows a practical S3 object upload process. It runs locally with an in-memory store, so you can learn the workflow without AWS credentials.

## Process

1. The client asks the API to create an upload for a file.
2. The API chooses a bucket/key and returns a short-lived upload URL.
3. The client uploads the file bytes to that URL.
4. The client tells the API to complete the upload.
5. The API stores object metadata and exposes list, read, and delete operations.

In a production AWS setup, step 2 usually returns a real S3 pre-signed URL. The client uploads directly to S3, and the app stores the finished object key and metadata in durable storage.

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Create a local AWS environment file from the sample:

```bash
cp aws/.env.sample aws/.env
```

For the local in-memory example, only `PORT`, `AWS_REGION`, and `AWS_S3_BUCKET` are read. When replacing the local store with real S3 SDK calls, provide:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_SESSION_TOKEN=
```

`AWS_SESSION_TOKEN` is only needed for temporary STS/session credentials.

## Run

```bash
npm run start:aws
```

The example runs on:

```text
http://localhost:3005/aws/s3
```

## Try It

Create an upload:

```bash
curl -X POST http://localhost:3005/aws/s3/uploads \
  -H "Content-Type: application/json" \
  -d '{"fileName":"hello.txt","contentType":"text/plain","sizeBytes":13}'
```

Copy the returned `uploadUrl`, then upload the bytes:

```bash
curl -X PUT http://localhost:3005/aws/s3/uploads/<uploadId>/body \
  -H "Content-Type: text/plain" \
  --data-binary "Hello S3 demo"
```

Complete the upload:

```bash
curl -X POST http://localhost:3005/aws/s3/uploads/<uploadId>/complete \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"ownerId":"user-1","purpose":"learning"}}'
```

List stored objects:

```bash
curl http://localhost:3005/aws/s3/objects
```

Read an object:

```bash
curl http://localhost:3005/aws/s3/objects/uploads%2Fhello.txt
```

Delete an object:

```bash
curl -X DELETE http://localhost:3005/aws/s3/objects/uploads%2Fhello.txt
```

## Endpoints

```http
GET /aws/s3
POST /aws/s3/uploads
PUT /aws/s3/uploads/:uploadId/body
POST /aws/s3/uploads/:uploadId/complete
DELETE /aws/s3/uploads/:uploadId
GET /aws/s3/objects
GET /aws/s3/objects/:key
DELETE /aws/s3/objects/:key
```

Object keys that contain `/` should be URL-encoded when used as a route parameter.

## File Breakdown

- `../example-app.js`: creates the Express app, mounts S3 routes, and starts the server
- `s3.routes.js`: defines the HTTP routes for the example
- `s3.controller.js`: handles Express request and response objects
- `s3.service.js`: implements the S3 upload lifecycle and object operations
- `s3.store.js`: keeps upload sessions and objects in memory
