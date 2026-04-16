import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../constants/Colors';
import { SensorData } from '../hooks/useSmartHome';

interface SecurityPanelProps {
  data: SensorData;
  onToggle: (val: boolean) => void;
}

export function SecurityPanel({ data, onToggle }: SecurityPanelProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>An ninh & Cảnh báo</Text>
      </View>

      <View style={[styles.bigCard, styles.shadow]}>
        <Text style={styles.bigCardTitle}>Chống Trộm</Text>
        <Switch
          value={data.antiTheft}
          onValueChange={onToggle}
          trackColor={{ false: Colors.securitySwitchTrackFalse, true: Colors.securitySwitchTrackTrue }}
          thumbColor="#fff"
          style={styles.switchObj}
        />
      </View>

      <View style={styles.grid}>
        <View style={[
          styles.alertCard, 
          styles.shadow,
          { backgroundColor: data.pir ? Colors.pirActiveBg : Colors.pirInactiveBg }
        ]}>
          <Text style={[styles.alertCardTitle, { color: data.pir ? Colors.pirActiveText : Colors.pirInactiveText }]}>
            Chuyển động
          </Text>
          <Text style={[styles.alertCardTitle, { color: data.pir ? Colors.pirActiveText : Colors.pirInactiveText }]}>
            (PIR)
          </Text>
        </View>

        <View style={[
          styles.alertCard, 
          styles.shadow,
          { backgroundColor: data.vib ? Colors.vibActiveBg : Colors.vibInactiveBg }
        ]}>
          <Text style={[styles.alertCardTitle, { color: data.vib ? Colors.vibActiveText : Colors.vibInactiveText }]}>
            Cảm biến
          </Text>
          <Text style={[styles.alertCardTitle, { color: data.vib ? Colors.vibActiveText : Colors.vibInactiveText }]}>
            Rung
          </Text>
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
  bigCard: {
    backgroundColor: Colors.card,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  bigCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text
  },
  switchObj: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }]
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  alertCard: {
    width: '48%',
    borderRadius: 15,
    padding: 20,
    minHeight: 90,
    justifyContent: 'center'
  },
  alertCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  }
});
