import client from './client';

export const createOrder = (orderDto) => client.post('/api/orders', orderDto).then((r) => r.data);
export const getOrderById = (id) => client.get(`/api/orders/${id}`).then((r) => r.data);
export const getOrdersByBranch = (branchId, filters = {}) =>
  client.get(`/api/orders/branch/${branchId}`, { params: filters }).then((r) => r.data);
export const getOrdersByCashier = (id) => client.get(`/api/orders/cashier/${id}`).then((r) => r.data);
export const getTodayOrders = (branchId) => client.get(`/api/orders/today/branch/${branchId}`).then((r) => r.data);
export const getOrdersByCustomer = (id) => client.get(`/api/orders/customer/${id}`).then((r) => r.data);
export const getRecentOrders = (branchId) => client.get(`/api/orders/recent/${branchId}`).then((r) => r.data);
