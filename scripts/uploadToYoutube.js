/**
 * uploadToYoutube.js
 *
 * Uploads a rendered MP4 to YouTube as a Short using the YouTube Data API v3.
 *
 * Required env vars:
 *   YOUTUBE_CLIENT_ID       – OAuth 2.0 client ID
 *   YOUTUBE_CLIENT_SECRET   – OAuth 2.0 client secret
 *   YOUTUBE_REFRESH_TOKEN   – offline refresh token (run getYoutubeToken.js once)
 *
 * Optional:
 *   YOUTUBE_PRIVACY         – 'public' | 'private' | 'unlisted'  (default: 'public')
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs         = require('fs');

/**
 * @param {string}   videoPath   Absolute path to the MP4 file
 * @param {string}   title       Video title (topic)
 * @param {string}   description Custom description (optional)
 * @param {Function} emit        Progress emitter from server pipeline
 * @returns {Promise<string>}    YouTube Shorts URL
 */
async function uploadToYoutube(videoPath, title, description = '', emit = () => {}) {
  const {
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REFRESH_TOKEN,
    YOUTUBE_PRIVACY = 'public',
  } = process.env;

  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error(
      'YouTube credentials missing. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, ' +
      'and YOUTUBE_REFRESH_TOKEN in your .env file.\n' +
      'Run: node scripts/getYoutubeToken.js  to obtain a refresh token.'
    );
  }

  // ── OAuth2 client ─────────────────────────────────────────────────────────
  const oauth2Client = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    'http://localhost:4242/callback'
  );
  oauth2Client.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });

  const youtube  = google.youtube({ version: 'v3', auth: oauth2Client });
  const fileSize = fs.statSync(videoPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);

  emit('log', { message: `Uploading to YouTube Shorts… (${fileSizeMB} MB)` });

  // ── Upload ────────────────────────────────────────────────────────────────
  // YouTube Shorts = vertical video ≤ 60 s  +  #Shorts in title / description
  // Title: use the AI-generated hook title, append #Shorts, cap at 100 chars
  const shortTitle = (`${title} #Shorts`).slice(0, 100);
  const shortDesc  = [
    description || `${title} – AI-generated explainer`,
    '',
    '#Shorts #AI #ExplainerVideo #Education #MRExplorer',
  ].join('\n');

  let lastPct = -1;

  const response = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title            : shortTitle,
          description      : shortDesc,
          tags             : ['Shorts', 'AI', 'ExplainerVideo', 'Education', title],
          categoryId       : '27',          // Education
          defaultLanguage  : 'en',
          defaultAudioLanguage: 'en',
        },
        status: {
          privacyStatus           : YOUTUBE_PRIVACY,
          selfDeclaredMadeForKids : false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body    : fs.createReadStream(videoPath),
      },
    },
    {
      onUploadProgress(evt) {
        const pct = Math.min(100, Math.round((evt.bytesRead / fileSize) * 100));
        if (pct !== lastPct && pct % 10 === 0) {
          emit('youtube_progress', { progress: pct });
          lastPct = pct;
        }
      },
    }
  );

  const videoId  = response.data.id;
  const videoUrl = `https://www.youtube.com/shorts/${videoId}`;

  emit('youtube_progress', { progress: 100 });
  emit('log', { message: `YouTube upload complete → ${videoUrl}` });

  return videoUrl;
}

module.exports = { uploadToYoutube };
