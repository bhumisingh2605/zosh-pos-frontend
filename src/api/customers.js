import client from './client';

export const createCustomer = (customer) => client.post('/api/customers', customer).then((r) => r.data);
export const updateCustomer = (id, customer) => client.put(`/api/customers/${id}`, customer).then((r) => r.data);
export const deleteCustomer = (id) => client.delete(`/api/customers/${id}`).then((r) => r.data);
export const getAllCustomers = () => client.get('/api/customers').then((r) => r.data);
export const searchCustomers = (q) => client.get('/api/customers/search', { params: { q } }).then((r) => r.data);
