/**
 * getYoutubeToken.js  –  Run ONCE to obtain a YouTube OAuth refresh token.
 *
 * Steps:
 *   1.  Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to your .env file.
 *   2.  Run:  node scripts/getYoutubeToken.js
 *   3.  Open the printed URL, authorize the app, copy the code.
 *   4.  Paste the code when prompted – your refresh token will be printed.
 *   5.  Add  YOUTUBE_REFRESH_TOKEN=<token>  to your .env file.
 *
 * Google Cloud Console setup:
 *   1. Go to https://console.cloud.google.com
 *   2. Create / select a project, enable "YouTube Data API v3"
 *   3. Create OAuth 2.0 credentials (Desktop app type)
 *   4. Copy Client ID + Client Secret into .env
 */

require('dotenv').config();
const { google }   = require('googleapis');
const readline     = require('readline');

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = process.env;

if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
  console.error(
    '\n❌  YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set in your .env file.\n'
  );
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const oauth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'   // "Out-of-band" – no redirect server needed
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope      : SCOPES,
  prompt     : 'consent',        // force consent screen so refresh_token is issued
});

console.log('\n=== YouTube OAuth Token Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl}\n`);
console.log('2. Sign in with your YouTube channel account.');
console.log('3. After authorising, Google will show a code — copy it.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('4. Paste the code here and press Enter: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
      console.warn(
        '\n⚠️  No refresh_token returned.\n' +
        '   This usually means the app was already authorised.\n' +
        '   Go to https://myaccount.google.com/permissions , revoke access, then run this script again.'
      );
      process.exit(1);
    }

    console.log('\n✅  Success! Add this line to your .env file:\n');
    console.log(`   YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error('\n❌  Failed to exchange code for tokens:', err.message);
    process.exit(1);
  }
});
