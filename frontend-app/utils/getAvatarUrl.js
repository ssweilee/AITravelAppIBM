{/* 
import { API_BASE_URL } from '../config'; 

export const getAvatarUrl = (pathOrFilename) => {
   if (!pathOrFilename) {
      return null;
    }
   
    if (pathOrFilename.startsWith('http')) {
      return pathOrFilename;
    }
  
    if (pathOrFilename.startsWith('/')) {
      return `${API_BASE_URL}${pathOrFilename}`;
    }

    return `${API_BASE_URL}/uploads/avatars/${pathOrFilename}`;
};
*/}
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
