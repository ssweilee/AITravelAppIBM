import { API_BASE_URL } from '../config'; 

export const getAvatarUrl = (filename) => {
  if (!filename) return null;
  return `${API_BASE_URL}/uploads/avatars/${filename}`;
};
