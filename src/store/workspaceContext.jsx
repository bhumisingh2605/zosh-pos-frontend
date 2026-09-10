import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from './authStore';
import * as storesApi from '../api/stores';
import * as branchesApi from '../api/branches';

const WorkspaceContext = createContext(null);

const STORE_ADMIN_ROLES = ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER'];
const BRANCH_ROLES = ['ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'];

export function WorkspaceProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const [store, setStore] = useState(null);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchIdState] = useState(() => {
    const saved = localStorage.getItem('zosh_active_branch');
    return saved ? Number(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setActiveBranchId = useCallback((id) => {
    setActiveBranchIdState(id);
    if (id) localStorage.setItem('zosh_active_branch', String(id));
    else localStorage.removeItem('zosh_active_branch');
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setStore(null);
      setBranches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let resolvedStore = null;

      if (user.role === 'ROLE_ADMIN') {
        // Super admin: no single store scope; picks stores from the Stores page.
        const savedStoreId = localStorage.getItem('zosh_active_store');
        if (savedStoreId) {
          try {
            resolvedStore = await storesApi.getStoreById(Number(savedStoreId));
          } catch {
            resolvedStore = null;
          }
        }
      } else if (STORE_ADMIN_ROLES.includes(user.role)) {
        try {
          resolvedStore = await storesApi.getStoreByAdmin();
        } catch {
          if (user.storeId) resolvedStore = await storesApi.getStoreById(user.storeId);
        }
      } else if (BRANCH_ROLES.includes(user.role)) {
        try {
          resolvedStore = await storesApi.getStoreByEmployee();
        } catch {
          if (user.storeId) resolvedStore = await storesApi.getStoreById(user.storeId);
        }
      }

      setStore(resolvedStore);

      if (resolvedStore?.id) {
        const branchList = await branchesApi.getBranchesByStoreId(resolvedStore.id);
        setBranches(branchList || []);

        if (BRANCH_ROLES.includes(user.role) && user.branchId) {
          setActiveBranchId(user.branchId);
        } else if (!activeBranchId && branchList?.length) {
          setActiveBranchId(branchList[0].id);
        } else if (activeBranchId && branchList?.length && !branchList.some((b) => b.id === activeBranchId)) {
          setActiveBranchId(branchList[0].id);
        }
      } else {
        setBranches([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load workspace.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const setActiveStoreId = useCallback(async (id) => {
    localStorage.setItem('zosh_active_store', String(id));
    setActiveBranchId(null);
    setLoading(true);
    try {
      const s = await storesApi.getStoreById(id);
      setStore(s);
      const branchList = await branchesApi.getBranchesByStoreId(id);
      setBranches(branchList || []);
      if (branchList?.length) setActiveBranchId(branchList[0].id);
    } finally {
      setLoading(false);
    }
  }, [setActiveBranchId]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) || null,
    [branches, activeBranchId]
  );

  const value = useMemo(
    () => ({
      store,
      branches,
      activeBranch,
      activeBranchId,
      setActiveBranchId,
      setActiveStoreId,
      loading,
      error,
      refresh: load,
      isBranchScoped: user ? BRANCH_ROLES.includes(user.role) : false,
      isSuperAdmin: user?.role === 'ROLE_ADMIN',
    }),
    [store, branches, activeBranch, activeBranchId, setActiveBranchId, setActiveStoreId, loading, error, load, user]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
