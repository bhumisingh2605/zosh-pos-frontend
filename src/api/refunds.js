import client from './client';

export const createRefund = (refundDto) => client.post('/api/refunds', refundDto).then((r) => r.data);
export const getAllRefunds = () => client.get('/api/refunds').then((r) => r.data);
export const getRefundsByCashier = (cashierId) => client.get(`/api/refunds/cashier/${cashierId}`).then((r) => r.data);
export const getRefundsByBranch = (branchId) => client.get(`/api/refunds/branch/${branchId}`).then((r) => r.data);
export const getRefundsByShift = (shiftId) => client.get(`/api/refunds/shift/${shiftId}`).then((r) => r.data);
export const getRefundById = (id) => client.get(`/api/refunds/${id}`).then((r) => r.data);
