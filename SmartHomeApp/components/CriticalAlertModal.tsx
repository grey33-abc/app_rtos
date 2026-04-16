import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { SensorData } from '../hooks/useSmartHome';
import { Colors } from '../constants/Colors';

interface CriticalAlertModalProps {
  data: SensorData;
  onDismiss: () => void;
}

export function CriticalAlertModal({ data, onDismiss }: CriticalAlertModalProps) {
  // Logic phát hiện nguy hiểm
  const isFire = data.fire < 500;
  const isGas = data.gas < 800;
  const isThief = data.pir || data.vib; // Đã cấu hình trên STM32 chỉ báo khi bật chống trộm

  const isDanger = isFire || isGas || isThief;
  const [muted, setMuted] = React.useState(false);

  // Animation nhấp nháy
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDanger && !muted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [isDanger, muted]);

  // Nếu hết nguy hiểm thì reset lại state Muted cho lần sau
  useEffect(() => {
    if (!isDanger) setMuted(false);
  }, [isDanger]);

  if (!isDanger || muted) return null;

  const handleDismiss = () => {
    setMuted(true);
    onDismiss();
  };

  let title = "";
  let iconName = "";
  let description = "";

  if (isFire) {
    title = "PHÁT HIỆN HỎA HOẠN";
    iconName = "fire";
    description = "Cảm biến LỬA vừa bị kích hoạt. Vui lòng kiểm tra khu vực ngay lập tức!";
  } else if (isGas) {
    title = "RÒ RỈ KHÍ GAS";
    iconName = "fire-extinguisher";
    description = "Nồng độ GAS cao bất thường. Hãy mở cửa thông gió và tránh bật nẹt lửa!";
  } else if (isThief) {
    title = "CẢNH BÁO ĐỘT NHẬP";
    iconName = "user-ninja";
    description = "Phát hiện có chuyển động hoặc cạy phá cửa! Hệ thống chống trộm đã kích hoạt.";
  }

  const bgColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(231, 76, 60, 0.85)', 'rgba(192, 57, 43, 0.98)']
  });

  return (
    <Modal transparent={true} visible={isDanger} animationType="fade">
      <Animated.View style={[styles.overlay, { backgroundColor: bgColor }]}>
        <View style={styles.alertBox}>
          
          <View style={styles.iconCircle}>
            <FontAwesome5 name={iconName} size={45} color="#e74c3c" />
          </View>
          
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertDesc}>{description}</Text>

          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissTxt}>Đã Rõ / Tắt Cảnh Báo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fceaea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center'
  },
  alertDesc: {
    fontSize: 15,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22
  },
  dismissBtn: {
    backgroundColor: '#e74c3c',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  dismissTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
