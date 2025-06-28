import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const createGroupChat = async (memberIds, chatName) => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/chats/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ members: memberIds, chatName }),
  });

  const data = await response.json();
  return data;
};

export async function shareToChat(chatId, contentType, itemId) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(
    `${API_BASE_URL}/api/messages/${chatId}/share`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType, itemId }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
