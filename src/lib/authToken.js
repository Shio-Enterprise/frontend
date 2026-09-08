export const ACCESS_TOKEN_KEYS = ['accessToken', 'access_token', 'access'];
export const REFRESH_TOKEN_KEYS = ['refreshToken', 'refresh_token', 'refresh'];

const isJwtExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 <= Date.now() : false;
  } catch {
    return false;
  }
};

export const getAccessToken = () => {
  for (const key of ACCESS_TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token && !isJwtExpired(token)) return token;
    if (token) localStorage.removeItem(key);
  }
  return null;
};

export const getRefreshToken = () => {
  for (const key of REFRESH_TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token && !isJwtExpired(token)) return token;
    if (token) localStorage.removeItem(key);
  }
  return null;
};

export const setAuthTokens = ({ access, refresh }) => {
  if (access) {
    ACCESS_TOKEN_KEYS.forEach((key) => localStorage.setItem(key, access));
  }
  if (refresh) {
    REFRESH_TOKEN_KEYS.forEach((key) => localStorage.setItem(key, refresh));
  }
};

export const clearAuthTokens = () => {
  ACCESS_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  REFRESH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};
