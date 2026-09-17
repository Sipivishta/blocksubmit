// Maps Supabase Auth's raw error messages to user-facing copy. Supabase
// doesn't expose stable error codes for every case in the JS client, so
// this matches on the (fairly stable) message text it does return. Falls
// back to a generic message rather than ever showing the raw string —
// raw auth errors can be technical (rate limits, provider errors) and
// aren't useful to a person filling out a form.
export function friendlyAuthError(rawMessage: string | undefined): string {
  const msg = (rawMessage ?? '').toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('password') && (msg.includes('at least') || msg.includes('weak') || msg.includes('should be'))) {
    return 'Password must meet the minimum requirements (at least 8 characters).';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  if (!rawMessage) {
    return 'Something went wrong. Please try again.';
  }
  // Unrecognized Supabase message: still avoid leaking anything internal —
  // generic fallback rather than the raw string.
  return 'Something went wrong. Please try again.';
}
