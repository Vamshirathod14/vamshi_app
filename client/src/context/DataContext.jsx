import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMeta = useCallback(async () => {
    try {
      const [accData, catData] = await Promise.all([
        api.get("/api/accounts"),
        api.get("/api/categories"),
      ]);
      setAccounts(accData.accounts);
      setCategories(catData.categories);
    } catch {
      // keep previous state
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const bumpMeta = useCallback(() => loadMeta(), [loadMeta]);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <DataContext.Provider
      value={{
        accounts,
        categories,
        expenseCategories,
        incomeCategories,
        metaLoading,
        refresh,
        bumpMeta,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}