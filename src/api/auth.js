import client from './client';

export const signup = (userDto) => client.post('/auth/signup', userDto).then((r) => r.data);
export const login = (userDto) => client.post('/auth/login', userDto).then((r) => r.data);
