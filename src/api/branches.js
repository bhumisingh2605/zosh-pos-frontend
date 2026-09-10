import client from './client';

export const createBranch = (branchDto) => client.post('/api/branches', branchDto).then((r) => r.data);
export const getBranchById = (id) => client.get(`/api/branches/${id}`).then((r) => r.data);
export const getBranchesByStoreId = (storeId) => client.get(`/api/branches/store/${storeId}`).then((r) => r.data);
export const updateBranch = (id, branchDto) => client.put(`/api/branches/${id}`, branchDto).then((r) => r.data);
export const deleteBranch = (id) => client.delete(`/api/branches/${id}`).then((r) => r.data);
