import client from './client';

export const createStoreEmployee = (storeId, userDto) =>
  client.post(`/api/employee/store/${storeId}`, userDto).then((r) => r.data);
export const createBranchEmployee = (branchId, userDto) =>
  client.post(`/api/employee/branch/${branchId}`, userDto).then((r) => r.data);
export const updateEmployee = (id, userDto) => client.put(`/api/employee/${id}`, userDto).then((r) => r.data);
export const deleteEmployee = (id, userDto) => client.delete(`/api/employee/${id}`, { data: userDto || {} }).then((r) => r.data);
export const getStoreEmployees = (id) => client.get(`/api/employee/store/${id}`).then((r) => r.data);
export const getBranchEmployees = (id) => client.get(`/api/employee/branch/${id}`).then((r) => r.data);
