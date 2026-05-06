export function validClerkPublishableKey(value) {
  const key = String(value || "").trim();
  return /^pk_(test|live)_[A-Za-z0-9_-]{20,}$/.test(key) && !/xxx|your|placeholder/i.test(key);
}

export function validClerkSecretKey(value) {
  const key = String(value || "").trim();
  return /^sk_(test|live)_[A-Za-z0-9_-]{20,}$/.test(key) && !/xxx|your|placeholder/i.test(key);
}
