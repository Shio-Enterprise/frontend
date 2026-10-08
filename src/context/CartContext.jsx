import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CartContext = createContext({
  cartCount: 0,
  cartItems: [],
  welcomeDiscountEligible: false,
  welcomeDiscountAmount: '0.00',
  refreshCart: () => {},
  setCartData: () => {},
});

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [welcomeDiscountEligible, setWelcomeDiscountEligible] = useState(false);
  const [welcomeDiscountAmount, setWelcomeDiscountAmount] = useState('0.00');

  const setCartData = useCallback((data) => {
    const items = Array.isArray(data) ? data : (data.items ?? []);
    setCartItems(items);
    setCartCount(items.reduce((s, item) => s + (item.quantity ?? 1), 0));
    setWelcomeDiscountEligible(Boolean(data?.eligible_for_welcome_discount));
    setWelcomeDiscountAmount(data?.welcome_discount_amount ?? '0.00');
  }, []);

  const clearCartData = useCallback(() => {
    setCartCount(0);
    setCartItems([]);
    setWelcomeDiscountEligible(false);
    setWelcomeDiscountAmount('0.00');
  }, []);

  const refreshCart = useCallback(async () => {
    const token = getAccessToken();
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/orders/cart/`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) { clearCartData(); return; }
      const data = await res.json();
      setCartData(data);
    } catch {
      clearCartData();
    }
  }, [setCartData, clearCartData]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cartCount,
        cartItems,
        welcomeDiscountEligible,
        welcomeDiscountAmount,
        refreshCart,
        setCartData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
