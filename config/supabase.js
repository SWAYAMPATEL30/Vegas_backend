import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // node-fetch includes a sane timeout option if needed

// ensure required env vars are present when the module is loaded
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  throw new Error('Supabase configuration is incomplete. Check your .env file.');
}

// validate that the SUPABASE_URL is a proper URL so we catch typos early
try {
  new URL(url);
} catch (e) {
  console.error('SUPABASE_URL is not a valid URL:', url);
  throw new Error('Supabase URL is invalid. Please check your environment variables.');
}

// create client; the SDK already ships a fetch implementation but we
// explicitly pass node-fetch so that the same timeout option works
// and we avoid surprise behavior in older node versions.
export const supabase = createClient(url, key, {
  global: {
    fetch, // use node-fetch which understands a `timeout` option if you supply it
  },
});
