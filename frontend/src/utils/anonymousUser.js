// Utility functions for managing anonymous user sessions

const USER_ID_KEY = 'anonymous_user_id';
const USER_NAME_KEY = 'anonymous_user_name';

/**
 * Generate a random user ID
 */
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Generate a random anonymous user name
 */
function generateUserName() {
  const adjectives = ['Cool', 'Swift', 'Bright', 'Quick', 'Smart', 'Bold', 'Calm', 'Wise'];
  const nouns = ['Panda', 'Eagle', 'Tiger', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
}

/**
 * Get or create anonymous user ID
 */
export function getAnonymousUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Get or create anonymous user name
 */
export function getAnonymousUserName() {
  let userName = localStorage.getItem(USER_NAME_KEY);
  if (!userName) {
    userName = generateUserName();
    localStorage.setItem(USER_NAME_KEY, userName);
  }
  return userName;
}

/**
 * Set custom user name
 */
export function setAnonymousUserName(name) {
  localStorage.setItem(USER_NAME_KEY, name);
}

/**
 * Reset anonymous user (generate new ID and name)
 */
export function resetAnonymousUser() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  return {
    userId: getAnonymousUserId(),
    userName: getAnonymousUserName()
  };
}

/**
 * Get current anonymous user info
 */
export function getAnonymousUser() {
  return {
    userId: getAnonymousUserId(),
    userName: getAnonymousUserName()
  };
}
