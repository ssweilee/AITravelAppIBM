import { API_BASE_URL } from '../config';

export const loginWithGoogle = async (idToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to login with Google');
    }

    return data; // Return the user data or token as needed
  } catch (error) {
    console.error('Google Login Error:', error.message);
    throw error; // Re-throw the error for further handling
  }
};

