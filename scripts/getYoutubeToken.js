/**
 * getYoutubeToken.js  –  Run ONCE to obtain a YouTube OAuth refresh token.
 *
 * Works with "Desktop app" OAuth credentials (no redirect URI setup needed
 * in Google Cloud Console — localhost is always allowed for Desktop apps).
 *
 * Steps:
 *   1.  Make sure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are in your .env
 *   2.  Run:  npm run youtube:setup
 *   3.  Your browser will open automatically — sign in and allow access
 *   4.  The refresh token is written to .env automatically
 */

require('dotenv').config();
const { google } = require('googleapis');
const http       = require('http');
const url        = require('url');
const fs         = require('fs');
const path       = require('path');

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = process.env;

if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
  console.error(
    '\n❌  YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set in your .env file.\n'
  );
  process.exit(1);
}

const PORT         = 4242;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES       = ['https://www.googleapis.com/auth/youtube.upload'];

const oauth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope      : SCOPES,
  prompt     : 'consent',  // always re-consent so refresh_token is returned
});

console.log('\n=== YouTube OAuth Token Setup ===\n');
console.log('Opening browser for authorisation…');
console.log('If the browser does not open, visit this URL manually:\n');
console.log(`  ${authUrl}\n`);

// Open the browser automatically
try {
  const { execSync } = require('child_process');
  execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
} catch {}

// Start a one-shot local HTTP server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/callback') {
    res.end('Not found');
    return;
  }

  const code  = parsed.query.code;
  const error = parsed.query.error;

  if (error || !code) {
    res.writeHead(400);
    res.end(`<h2>❌ Auth failed: ${error || 'no code returned'}</h2>`);
    server.close();
    console.error('\n❌  Auth failed:', error || 'no code returned');
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(400);
      res.end(
        '<h2>⚠️ No refresh_token received.</h2>' +
        '<p>Go to <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>, ' +
        'revoke access for this app, then run the script again.</p>'
      );
      server.close();
      console.warn(
        '\n⚠️  No refresh_token returned.\n' +
        '   Revoke access at https://myaccount.google.com/permissions then re-run.'
      );
      process.exit(1);
    }

    // Auto-write the token into .env
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /YOUTUBE_REFRESH_TOKEN=.*/,
          `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
      } else {
        envContent += `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅  Refresh token saved to .env automatically!');
    } else {
      console.log('\n✅  Success! Add this to your .env file:\n');
      console.log(`   YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<h2>✅ Authorisation complete!</h2>' +
      '<p>Your refresh token has been saved to <code>.env</code>. You can close this tab.</p>'
    );
  } catch (err) {
    res.writeHead(500);
    res.end(`<h2>❌ Error: ${err.message}</h2>`);
    console.error('\n❌  Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Waiting for Google to redirect to http://localhost:${PORT}/callback …\n`);
});
