const paidUsers = globalThis.__roverPaidUsers || new Map();
globalThis.__roverPaidUsers = paidUsers;

export function isPremiumUser(userId) {
  return Boolean(userId && paidUsers.get(userId)?.premium);
}

export function markUserPremium(userId, provider, reference) {
  if (!userId) return false;
  paidUsers.set(userId, {
    premium: true,
    provider,
    reference,
    paidAt: new Date().toISOString(),
  });
  return true;
}

export function getPaymentStatus(userId) {
  return paidUsers.get(userId) || { premium: false };
}
