import client from './client';

export const createProduct = (productDto) => client.post('/api/products', productDto).then((r) => r.data);
export const getProductsByStoreId = (storeId) => client.get(`/api/products/store/${storeId}`).then((r) => r.data);
export const updateProduct = (id, productDto) => client.patch(`/api/products/${id}`, productDto).then((r) => r.data);
export const searchProducts = (storeId, keyword) =>
  client.get(`/api/products/store/${storeId}/search`, { params: { keyword } }).then((r) => r.data);
export const deleteProduct = (id) => client.delete(`/api/products/${id}`).then((r) => r.data);
