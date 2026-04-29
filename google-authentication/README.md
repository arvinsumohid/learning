# Google Authentication

This folder contains a small Express example that uses `google-auth-library` to start a Google OAuth sign-in flow, exchange the authorization code, and verify the returned ID token.

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Create Google OAuth credentials:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project.
3. Go to **APIs & Services** > **OAuth consent screen**.
4. Configure the consent screen. For local testing, add your Google account as a test user if the app is in testing mode.
5. Go to **APIs & Services** > **Credentials**.
6. Click **Create Credentials** > **OAuth client ID**.
7. Choose **Web application** as the application type.
8. Add this authorized redirect URI:

```text
http://localhost:3004/auth/google/callback
```

9. Click **Create**, then copy the generated **Client ID** and **Client secret**.

Then update `google-authentication/.env` with those real values:

```env
PORT=3004
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3004/auth/google/callback
GOOGLE_AUTH_SCOPES=openid email profile
```

## Run

```bash
npm run start:google-authentication
```

Open:

```text
http://localhost:3004/auth/google
```

Google redirects back to `/auth/google/callback`. The sample verifies the ID token and returns the signed-in user's basic profile plus a token summary. It intentionally avoids returning raw access, refresh, or ID tokens in the response.

## File Breakdown

- `example-app.js`: creates the Express app, loads `.env`, mounts routes, and starts the server
- `google-authentication.routes.js`: defines the HTTP routes for the example
- `google-authentication.controller.js`: handles Express request and response objects
- `google-authentication.service.js`: builds the Google auth URL, exchanges the code, and verifies the ID token
- `google-authentication.store.js`: keeps pending OAuth `state` values in memory for callback validation
