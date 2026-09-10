import client from './client';

export const createCategory = (categoryDto) => client.post('/api/categories', categoryDto).then((r) => r.data);
export const getCategoriesByStore = (storeId) => client.get(`/api/categories/store/${storeId}`).then((r) => r.data);
export const updateCategory = (id, categoryDto) => client.put(`/api/categories/${id}`, categoryDto).then((r) => r.data);
export const deleteCategory = (id, categoryDto) => client.delete(`/api/categories/${id}`, { data: categoryDto }).then((r) => r.data);
