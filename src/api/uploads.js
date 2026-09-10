import client from './client';

export const uploadImage = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/api/uploads/image', formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    })
    .then((r) => r.data);
};