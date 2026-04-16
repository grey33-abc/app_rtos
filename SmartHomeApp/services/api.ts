import axios from 'axios';
import { Config } from '../constants/Config';

export const SmartHomeAPI = {
  getDashboard: async () => {
    return axios.get(`${Config.SERVER_URL}/api/dashboard`);
  },

  toggleAntiTheft: async (val: boolean) => {
    return axios.post(`${Config.SERVER_URL}/api/devices/control`, {
      type: 'ANTI_THEFT',
      value: val ? 1 : 0
    });
  },

  changePassword: (oldPassword: string, newPassword: string) => {
    return axios.post(`${Config.SERVER_URL}/api/door/change-password`, { oldPassword, newPassword });
  },

  registerPushToken: (token: string) => {
    return axios.post(`${Config.SERVER_URL}/api/notifications/register`, { token });
  }
};
