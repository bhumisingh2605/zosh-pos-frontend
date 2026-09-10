import client from './client';

export const getProfile = () => client.get('/api/users/profile').then((r) => r.data);
export const getUserById = (id) => client.get(`/api/users/${id}`).then((r) => r.data);
