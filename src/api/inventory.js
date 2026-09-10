import client from './client';

export const createInventory = (inventoryDto) => client.post('/api/inventories', inventoryDto).then((r) => r.data);
export const updateInventory = (id, inventoryDto) => client.put(`/api/inventories/${id}`, inventoryDto).then((r) => r.data);
export const deleteInventory = (id) => client.delete(`/api/inventories/${id}`).then((r) => r.data);
export const getInventoryByProductAndBranch = (branchId, productId) =>
  client.get(`/api/inventories/branch/${branchId}/product/${productId}`).then((r) => r.data);
export const getInventoryByBranch = (branchId) => client.get(`/api/inventories/branch/${branchId}`).then((r) => r.data);
