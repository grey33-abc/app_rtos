import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useSmartHome } from '../hooks/useSmartHome';

import { HeaderBanner } from '../components/HeaderBanner';
import { DoorStatus } from '../components/DoorStatus';
import { EnvironmentGrid } from '../components/EnvironmentGrid';
import { SecurityPanel } from '../components/SecurityPanel';
import { PasswordPanel } from '../components/PasswordPanel';
import { CriticalAlertModal } from '../components/CriticalAlertModal';
import { registerForPushNotificationsAsync } from '../services/pushNotification';
import { SmartHomeAPI } from '../services/api';

export default function HomeScreen() {
  const { sensorData, doorStatus, toggleAntiTheft } = useSmartHome();

  React.useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        SmartHomeAPI.registerPushToken(token)
          .catch(e => console.log('Lỗi gửi Push Token lên server:', e));
      }
    });
  }, []);

  const handleDismissAlert = () => {};

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        bounces={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderBanner />
        <View style={styles.contentWrapper}>
          <DoorStatus status={doorStatus} />
          <EnvironmentGrid data={sensorData} />
          <SecurityPanel data={sensorData} onToggle={toggleAntiTheft} />
          <PasswordPanel />
        </View>
      </ScrollView>
      <CriticalAlertModal data={sensorData} onDismiss={handleDismissAlert} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  scrollContent: {
    paddingBottom: 40 
  },
  contentWrapper: {
    marginTop: 120, // Start floating over the gradient header
    paddingHorizontal: 20
  }
});

