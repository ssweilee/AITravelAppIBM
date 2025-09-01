import { API_BASE_URL } from '../config'; 

export const getAvatarUrl = (pathOrUrl) => {
   if (!pathOrUrl) return null;
   if (pathOrUrl.startsWith('http')) {
     return pathOrUrl;
   }
   if (pathOrUrl.startsWith('/')) {
     return `${API_BASE_URL}${pathOrUrl}`;
   }
   return `${API_BASE_URL}/uploads/avatars/${pathOrUrl}`;
};
