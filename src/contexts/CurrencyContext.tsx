import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrencySymbol } from '../constants';

interface CurrencyContextType {
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: 'INR',
  setBaseCurrency: () => {},
  currencySymbol: '₹',
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [baseCurrency, setBaseCurrency] = useState(() => {
    return localStorage.getItem('baseCurrency') || 'INR';
  });

  useEffect(() => {
    localStorage.setItem('baseCurrency', baseCurrency);
  }, [baseCurrency]);

  const currencySymbol = getCurrencySymbol(baseCurrency);

  return (
    <CurrencyContext.Provider value={{ baseCurrency, setBaseCurrency, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
