import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export const sendMessageToBackend = async (message, token) => {
  const response = await api.post(
    '/api/chat',
    { message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export default api;