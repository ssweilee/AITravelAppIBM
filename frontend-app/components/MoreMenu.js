// components/MoreMenu.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const MoreMenu = ({ visible, onClose, options = [] }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        {options.map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => {
              opt.onPress && opt.onPress();
              onClose();
            }}
            style={({ pressed }) => [
              styles.optionRow,
              opt.destructive && styles.destructiveBackground,
              pressed && styles.pressed,
              i === options.length - 1 ? { borderBottomWidth: 0 } : {},
            ]}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
          >
            {renderIcon(opt)}
            <Text style={[styles.optionText, opt.destructive && styles.destructiveText]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const renderIcon = (opt) => {
  if (React.isValidElement(opt.icon)) {
    // clone without forwarding any ref to avoid accessibility warnings
    return <View style={styles.iconWrapper}>{React.cloneElement(opt.icon, { ref: null })}</View>;
  } else if (opt.iconName) {
    return (
      <View style={styles.iconWrapper}>
        <Feather
          name={opt.iconName}
          size={opt.iconSize || 18}
          color={opt.destructive ? '#d32f2f' : opt.iconColor || '#222'}
        />
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 18,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ccc',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  pressed: {
    backgroundColor: '#f2f2f2',
  },
  iconWrapper: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    color: '#222',
    fontWeight: '600',
  },
  destructiveText: {
    color: '#d32f2f',
  },
  destructiveBackground: {
    backgroundColor: '#fff5f5',
  },
  cancelButton: {
    marginTop: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
});

export default MoreMenu;


