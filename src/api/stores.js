import client from './client';

export const createStore = (storeDto) => client.post('/api/stores', storeDto).then((r) => r.data);
export const getStoreById = (id) => client.get(`/api/stores/${id}`).then((r) => r.data);
export const getAllStores = () => client.get('/api/stores').then((r) => r.data);
export const getStoreByAdmin = () => client.get('/api/stores/admin').then((r) => r.data);
export const getStoreByEmployee = () => client.get('/api/stores/employee').then((r) => r.data);
export const updateStore = (id, storeDto) => client.put(`/api/stores/${id}`, storeDto).then((r) => r.data);
export const moderateStore = (id, status) => client.put(`/api/stores/${id}/moderate`, status, {
  headers: { 'Content-Type': 'application/json' },
}).then((r) => r.data);
export const deleteStore = (id) => client.delete(`/api/stores/${id}`).then((r) => r.data);
