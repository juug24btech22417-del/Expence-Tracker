import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrencySymbol } from '../constants';

interface CurrencyContextType {
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  currencySymbol: string;
  exchangeRates: Record<string, number>;
  setExchangeRate: (currency: string, rate: number) => void;
  travelMode: boolean;
  setTravelMode: (mode: boolean) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: 'INR',
  setBaseCurrency: () => {},
  currencySymbol: '₹',
  exchangeRates: {},
  setExchangeRate: () => {},
  travelMode: false,
  setTravelMode: () => {},
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [baseCurrency, setBaseCurrency] = useState(() => {
    return localStorage.getItem('baseCurrency') || 'INR';
  });
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('exchangeRates');
    return saved ? JSON.parse(saved) : {};
  });
  const [travelMode, setTravelMode] = useState(() => {
    return localStorage.getItem('travelMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('baseCurrency', baseCurrency);
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
  }, [exchangeRates]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        const data = await response.json();
        setExchangeRates(prev => ({ ...prev, ...data.rates }));
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      }
    };
    fetchRates();
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('travelMode', String(travelMode));
  }, [travelMode]);

  const setExchangeRate = (currency: string, rate: number) => {
    setExchangeRates(prev => ({ ...prev, [currency]: rate }));
  };

  const currencySymbol = getCurrencySymbol(baseCurrency);

  return (
    <CurrencyContext.Provider value={{ baseCurrency, setBaseCurrency, currencySymbol, exchangeRates, setExchangeRate, travelMode, setTravelMode }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
