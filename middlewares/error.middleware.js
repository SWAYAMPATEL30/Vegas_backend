const IS_PROD = process.env.NODE_ENV === 'production';

export default (err, req, res, next) => {
  // Always log the full error on the server
  console.error('[ERROR]', err.stack || err);

  // Determine HTTP status
  const status = err.status || (err.code === '23505' ? 409 : 500);

  // Build user-facing message — never expose internals in production
  let message = err.message || 'Server error';

  const networkErrors = ['fetch failed', 'Unable to reach Supabase service', 'ETIMEDOUT', 'FetchError'];
  if (networkErrors.some((e) => message.includes(e))) {
    message = 'Cannot connect to database. Please try again later.';
  }

  // In production, only send safe messages for 500-level errors
  if (IS_PROD && status >= 500) {
    message = 'An unexpected server error occurred. Please try again later.';
  }

  res.status(status).json({ message });
};
