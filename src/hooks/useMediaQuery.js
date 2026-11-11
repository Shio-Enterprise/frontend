import { useEffect, useState } from 'react';

const matches = (query) => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;

// true enquanto a media query casar; acompanha redimensionamento da janela.
export function useMediaQuery(query) {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setValue(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return value;
}
