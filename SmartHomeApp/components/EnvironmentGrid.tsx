import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { SensorData } from '../hooks/useSmartHome';

interface EnvironmentGridProps {
  data: SensorData;
}

export function EnvironmentGrid({ data }: EnvironmentGridProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Môi trường</Text>
      </View>

      <View style={styles.grid}>
        {/* NHIỆT ĐỘ */}
        <View style={[styles.smallCard, styles.shadow]}>
          <View style={[styles.iconBox, { backgroundColor: Colors.tempBox }]}>
            <FontAwesome5 name="thermometer-half" size={20} color={Colors.tempIcon} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardInfoTitle}>Nhiệt độ</Text>
            <View style={styles.valRow}>
              <Text style={styles.cardInfoVal}>{data.temperature.toFixed(1)}</Text>
              <Text style={styles.cardInfoUnit}>°C</Text>
            </View>
          </View>
        </View>

        {/* ĐỘ ẨM */}
        <View style={[styles.smallCard, styles.shadow]}>
          <View style={[styles.iconBox, { backgroundColor: Colors.humBox }]}>
            <Ionicons name="water" size={22} color={Colors.humIcon} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardInfoTitle}>Độ ẩm</Text>
            <View style={styles.valRow}>
              <Text style={styles.cardInfoVal}>{data.humidity.toFixed(1)}</Text>
              <Text style={styles.cardInfoUnit}>%</Text>
            </View>
          </View>
        </View>

        {/* KHÍ GAS */}
        <View style={[styles.smallCard, styles.shadow]}>
          <View style={[styles.iconBox, { backgroundColor: Colors.gasBox }]}>
            <FontAwesome5 name="fire" size={20} color={Colors.gasIcon} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardInfoTitle}>Khí Gas</Text>
            <View style={styles.valRow}>
              <Text style={styles.cardInfoVal}>{data.gas}</Text>
              <Text style={styles.cardInfoUnit}> ADC</Text>
            </View>
          </View>
        </View>

        {/* CẢM BIẾN LỬA */}
        <View style={[styles.smallCard, styles.shadow]}>
          <View style={[styles.iconBox, { backgroundColor: Colors.fireBox }]}>
            <FontAwesome5 name="fire-alt" size={20} color={Colors.fireIcon} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardInfoTitle}>Cảm biến Lửa</Text>
            <View style={styles.valRow}>
              <Text style={styles.cardInfoVal}>{data.fire}</Text>
              <Text style={styles.cardInfoUnit}> ADC</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  sectionHeader: {
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 5
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  smallCard: {
    backgroundColor: Colors.card,
    width: '47%',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoTitle: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 3
  },
  valRow: {
    flexDirection: 'row', 
    alignItems: 'baseline'
  },
  cardInfoVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text
  },
  cardInfoUnit: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginLeft: 2
  }
});
