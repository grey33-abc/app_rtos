import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutAnimation, UIManager, Platform, Alert, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { SmartHomeAPI } from '../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function PasswordPanel() {
  const [showPasswordChange, setShowPasswordChange] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const newPasswordRef = useRef<TextInput>(null);

  const togglePasswordChange = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowPasswordChange(!showPasswordChange);
    if (showPasswordChange) Keyboard.dismiss();
  };

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    if (newPassword.length !== 4) {
      Alert.alert("Lỗi", "Mật khẩu mới phải bao gồm đúng 4 số!");
      return;
    }
    try {
      const res = await SmartHomeAPI.changePassword(oldPassword, newPassword);
      if (res.data.success) {
        Alert.alert("Thành công", "Đổi mật khẩu cửa an toàn thành công!");
        setOldPassword('');
        setNewPassword('');
        togglePasswordChange();
      }
    } catch (e: any) {
      Alert.alert("Thất bại", e.response?.data?.msg || "Lỗi thay đổi mật khẩu!");
    }
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bảo mật</Text>
      </View>

      <View style={[styles.passwordWrapper, styles.shadow]}>
        <TouchableOpacity style={styles.passwordHeader} onPress={togglePasswordChange}>
          <View style={styles.headerLeft}>
            <View style={styles.passwordIconBox}>
              <Ionicons name="lock-closed" size={20} color={Colors.passwordIcon} />
            </View>
            <Text style={styles.passwordTitleText}>Thay đổi password</Text>
          </View>
          <Ionicons name={showPasswordChange ? "chevron-up" : "chevron-forward"} size={20} color="#bdc3c7" />
        </TouchableOpacity>

        {showPasswordChange && (
          <View style={styles.passwordExpand}>
            <TextInput
              style={styles.inputObj}
              placeholder="Mật khẩu cũ"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextInput
              ref={newPasswordRef}
              style={styles.inputObj}
              placeholder="Mật khẩu mới (4 số)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />
            <TouchableOpacity style={styles.updateBtn} onPress={handleChangePassword}>
              <Text style={styles.btnText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        )}
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
  passwordWrapper: {
    backgroundColor: Colors.card,
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden'
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerLeft: {
    flexDirection: 'row', 
    alignItems: 'center'
  },
  passwordIconBox: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: Colors.passwordIconBox,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  passwordTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text
  },
  passwordExpand: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  inputObj: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: Colors.inputBg
  },
  updateBtn: {
    backgroundColor: Colors.passwordBtn,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5
  },
  btnText: {
    color: '#fff', 
    fontWeight: 'bold'
  }
});
