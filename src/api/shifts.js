import client from './client';

export const startShift = () => client.post('/api/shift-reports/start').then((r) => r.data);
export const endShift = () => client.patch('/api/shift-reports/end').then((r) => r.data);
export const getCurrentShift = () =>
  client.get('/api/shift-reports/current')
    .then((r) => r.data)
    .catch((err) => {
      const message = err.response?.data?.message || '';
      const isNoActiveShift = err.response?.status === 404 || /no active shift/i.test(message);
      if (isNoActiveShift) {
        // Expected state: the cashier hasn't clocked in yet. No shift to show.
        return null;
      }
      // Anything else is a real failure — surface it instead of hiding it.
      console.error('Failed to load current shift:', err);
      throw err;
    });
export const getShiftReportByCashierId = (cashierId) => client.get(`/api/shift-reports/cashier/${cashierId}`).then((r) => r.data);
export const getShiftReportsByBranch = (branchId) => client.get(`/api/shift-reports/branch/${branchId}`).then((r) => r.data);
export const getShiftReportById = (id) => client.get(`/api/shift-reports/${id}`).then((r) => r.data);
