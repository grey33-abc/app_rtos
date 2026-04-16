import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';

export function HeaderBanner() {
  return (
    <LinearGradient
      colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Xin chào, Chủ Nhà</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={28} color={Colors.headerText} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    height: 250,
    width: '100%',
    position: 'absolute',
    top: 0
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 65
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold'
  }
});
