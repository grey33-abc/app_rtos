import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { io } from 'socket.io-client';
import { Config } from '../constants/Config';
import { SmartHomeAPI } from '../services/api';

export interface SensorData {
  temperature: number;
  humidity: number;
  gas: number;
  fire: number;
  pir: boolean;
  vib: boolean;
  antiTheft: boolean;
}

export function useSmartHome() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    gas: 1023,   // giá trị max = không có gas
    fire: 1023,  // giá trị max = không có lửa
    pir: false,
    vib: false,
    antiTheft: false
  });
  
  const [doorStatus, setDoorStatus] = useState<string>('CLOSED');
  
  // Timestamp lần cuối gửi lệnh toggle - dùng để bỏ qua sensor data trong 6 giây
  const antiTheftPendingUntil = useRef<number>(0);

  useEffect(() => {
    const socket = io(Config.SERVER_URL);

    // Load trạng thái ban đầu từ server
    SmartHomeAPI.getDashboard().then(res => {
      const devices: any[] = res.data.devices || [];
      const antiTheftDevice = devices.find((d: any) => d.type === 'ANTI_THEFT');
      if (antiTheftDevice) {
        setSensorData(prev => ({ ...prev, antiTheft: antiTheftDevice.status === 1 || antiTheftDevice.status === true }));
      }
    }).catch(() => {});

    socket.on('new_sensor_data', (data: any) => {
      setSensorData(prev => {
        // Nếu vừa gửi lệnh toggle, bỏ qua antiTheft từ sensor trong grace period
        const isPending = Date.now() < antiTheftPendingUntil.current;
        return {
          ...prev,
          ...data,
          pir: data.pir === 1 || data.pir === true,
          vib: data.vib === 1 || data.vib === true,
          antiTheft: isPending ? prev.antiTheft : (data.antiTheft === 1 || data.antiTheft === true)
        };
      });
    });

    socket.on('door_status_change', (status: string) => {
      setDoorStatus(status);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleAntiTheft = async (val: boolean) => {
    setSensorData(prev => ({ ...prev, antiTheft: val }));
    // Giữ grace period 6 giây để STM32 kịp nhận lệnh và gửi lại sensor data mới
    antiTheftPendingUntil.current = Date.now() + 6000;
    try {
      await SmartHomeAPI.toggleAntiTheft(val);
    } catch (e) {
      Alert.alert('Lỗi kết nối', 'Chưa gửi được lệnh lên Server. Hãy kiểm tra IP Của SERVER_URL.');
      antiTheftPendingUntil.current = 0;
      setSensorData(prev => ({ ...prev, antiTheft: !val }));
    }
  };

  return {
    sensorData,
    doorStatus,
    toggleAntiTheft
  };
}
