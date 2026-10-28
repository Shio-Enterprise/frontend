/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/axios';
import { getAccessToken } from '../lib/authToken';
import { useAuth } from './AuthContext';

const emptyIds = new Set();
const WishlistContext = createContext({
  ids: emptyIds, pending: emptyIds, loading: false, error: null, idsError: null,
  revision: 0, sessionKey: '', isAuthenticated: false, onUnauthorized: () => {},
  toggleWishlist: async () => false, refreshWishlist: async () => {}, reconcileWishlist: () => false,
  isWishlisted: () => false,
});

// Remounting on a session change prevents even one render with another user's data.
export function WishlistProvider({ children }) {
  const { accessToken, user, isAuthLoading, logout } = useAuth();
  const token = isAuthLoading ? null : accessToken;
  const sessionKey = token ? `${user?.id ?? ''}:${token}` : '';
  return (
    <WishlistSession key={sessionKey} token={token} sessionKey={sessionKey} logout={logout}>
      {children}
    </WishlistSession>
  );
}

function WishlistSession({ token, sessionKey, logout, children }) {
  const [ids, setIds] = useState(() => new Set());
  const [pending, setPending] = useState(() => new Set());
  const [loading, setLoading] = useState(Boolean(token));
  const [idsError, setIdsError] = useState(null);
  const [revision, setRevision] = useState(0);
  const idsRef = useRef(new Set());
  const pendingRef = useRef(new Set());
  const ready = useRef(false);
  const generation = useRef(0);
  const idsRequest = useRef(0);
  const revisionRef = useRef(0);
  const mutationVersion = useRef(0);
  const active = useRef(false);

  const isCurrent = useCallback((epoch) => (
    active.current && generation.current === epoch && getAccessToken() === token
  ), [token]);

  const refreshWishlist = useCallback(async () => {
    if (!token || pendingRef.current.size) return;
    const epoch = generation.current;
    const request = ++idsRequest.current;
    const requestMutationVersion = mutationVersion.current;
    ready.current = false;
    setLoading(true);
    setIdsError(null);
    try {
      const response = await apiClient.get('/catalog/wishlist/ids/');
      if (!isCurrent(epoch) || request !== idsRequest.current
        || requestMutationVersion !== mutationVersion.current) return;
      const next = new Set(response.data.product_ids);
      idsRef.current = next;
      ready.current = true;
      setIds(next);
    } catch (error) {
      if (!isCurrent(epoch) || request !== idsRequest.current) return;
      if (error.response?.status === 401) { void logout(); return; }
      setIdsError(error);
    } finally {
      if (isCurrent(epoch) && request === idsRequest.current
        && requestMutationVersion === mutationVersion.current) setLoading(false);
    }
  }, [token, isCurrent, logout]);

  useEffect(() => {
    active.current = true;
    // Synchronize the external API with the current authenticated session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshWishlist();
    return () => { active.current = false; generation.current += 1; };
  }, [refreshWishlist]);

  const toggleWishlist = useCallback(async (productId) => {
    const epoch = generation.current;
    if (!token || !isCurrent(epoch) || !ready.current || pendingRef.current.has(productId)) return false;
    const removing = idsRef.current.has(productId);
    mutationVersion.current += 1;
    pendingRef.current.add(productId);
    setPending(new Set(pendingRef.current));
    try {
      if (removing) await apiClient.delete(`/catalog/wishlist/${productId}/`);
      else await apiClient.post('/catalog/wishlist/', { product: productId });
      if (!isCurrent(epoch)) return false;
      const next = new Set(idsRef.current);
      if (removing) next.delete(productId); else next.add(productId);
      idsRef.current = next;
      setIds(next);
      revisionRef.current += 1;
      setRevision(revisionRef.current);
      return true;
    } catch (error) {
      if (isCurrent(epoch) && error.response?.status === 401) void logout();
      return false;
    } finally {
      if (isCurrent(epoch)) {
        pendingRef.current.delete(productId);
        setPending(new Set(pendingRef.current));
      }
    }
  }, [token, isCurrent, logout]);

  const reconcileWishlist = useCallback((productIds, expectedRevision = revisionRef.current) => {
    const epoch = generation.current;
    if (!isCurrent(epoch) || expectedRevision !== revisionRef.current) return false;
    const next = new Set(idsRef.current);
    productIds.forEach((productId) => next.add(productId));
    idsRef.current = next;
    ready.current = true;
    setIds(next);
    return true;
  }, [isCurrent]);

  return (
    <WishlistContext.Provider value={{
      ids, pending, loading, error: idsError, idsError, revision, sessionKey,
      isAuthenticated: Boolean(token), onUnauthorized: logout, toggleWishlist, refreshWishlist,
      reconcileWishlist,
      isWishlisted: (id) => ids.has(id),
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
