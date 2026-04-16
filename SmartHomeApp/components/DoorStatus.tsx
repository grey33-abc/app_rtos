import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface DoorStatusProps {
  status: string;
}

export function DoorStatus({ status }: DoorStatusProps) {
  const isOpen = status === 'OPEN';
  
  return (
    <View style={[styles.floatingCard, styles.shadow]}>
      <View style={styles.doorIconBox}>
        <FontAwesome5 
          name={isOpen ? 'unlock-alt' : 'lock'} 
          size={24} 
          color={Colors.doorLocked} 
        />
      </View>
      <View style={styles.doorTextContainer}>
        <Text style={styles.doorSubTitle}>Door Status</Text>
        <Text style={styles.doorTitle}>Cửa Chính</Text>
        <Text style={[styles.doorState, { color: isOpen ? Colors.doorOpen : '#333' }]}>
          {isOpen ? 'ĐANG MỞ' : 'ĐÃ KHÓA AN TOÀN'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  doorIconBox: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: Colors.doorIconBox,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20
  },
  doorTextContainer: {
    justifyContent: 'center'
  },
  doorSubTitle: {
    fontSize: 12,
    color: Colors.textMuted
  },
  doorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2
  },
  doorState: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5
  }
});
