import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CartContext = createContext({ cartCount: 0, cartItems: [], refreshCart: () => {}, setCartData: () => {} });

const toCount = (data) => {
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return items.reduce((s, item) => s + (item.quantity ?? 1), 0);
};

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  const setCartData = useCallback((data) => {
    const items = Array.isArray(data) ? data : (data.items ?? []);
    setCartItems(items);
    setCartCount(items.reduce((s, item) => s + (item.quantity ?? 1), 0));
  }, []);

  const refreshCart = useCallback(async () => {
    const token = getAccessToken();
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/orders/cart/`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) { setCartCount(0); setCartItems([]); return; }
      const data = await res.json();
      setCartData(data);
    } catch {
      setCartCount(0);
    }
  }, [setCartData]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, cartItems, refreshCart, setCartData }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
