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
        const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const newRates: Record<string, number> = {};
        for (const currency in data.rates) {
          // The API returns rates as (currency / baseCurrency).
          // We need (baseCurrency / currency) to convert from foreign currency to base currency.
          newRates[currency] = 1 / data.rates[currency];
        }
        setExchangeRates(prev => ({ ...prev, ...newRates }));
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        alert(`Failed to fetch exchange rates: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    fetchRates();
    
    // Fetch rates every hour
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
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
