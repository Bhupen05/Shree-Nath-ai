function containsUnsafeVoiceQuery(text) {
  const lower = String(text || '').toLowerCase();
  const blockedFragments = [
    'password',
    'jwt',
    'token',
    'credit card',
    'drop table',
    'delete all',
  ];

  return blockedFragments.some((fragment) => lower.includes(fragment));
}

module.exports = {
  containsUnsafeVoiceQuery,
};
