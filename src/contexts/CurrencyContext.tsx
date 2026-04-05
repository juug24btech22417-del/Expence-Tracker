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
    localStorage.removeItem('exchangeRates');
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
  }, [exchangeRates]);

  useEffect(() => {
    const fetchRates = async () => {
      const apis = [
        `https://open.er-api.com/v6/latest/${baseCurrency}`,
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
        `https://api.frankfurter.app/latest?from=${baseCurrency}`
      ];

      for (const url of apis) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const newRates: Record<string, number> = {};
          
          // Frankfurter returns rates as (currency / baseCurrency)
          // Exchangerate-api returns rates as (currency / baseCurrency)
          const rates = data.rates;
          
          for (const currency in rates) {
            newRates[currency] = 1 / rates[currency];
          }
          setExchangeRates(newRates);
          return; // Success
        } catch (error) {
          console.error(`Failed to fetch exchange rates from ${url}:`, error);
        }
      }
      console.error("All exchange rate APIs failed.");
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
