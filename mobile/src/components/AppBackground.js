import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as c } from '../constants/theme';

// Ảnh: "Fleurs de dahlia orange avec des gouttelettes d'eau" của Liana S trên Unsplash
// (Unsplash License, dùng miễn phí), cắt dọc 1080x1920 giữ bông hoa bên trái:
// https://unsplash.com/photos/plb6WRPuxO0
const IMAGE = require('../../assets/background.jpg');

/**
 * Nền chung: ảnh hoa dahlia làm mờ nhẹ, phủ lớp trắng ngà (đậm dần xuống dưới)
 * vì ảnh gốc tối — giữ được sắc cam/xanh lá mà chữ đen và thẻ trắng vẫn dễ đọc.
 * Ảnh đặt tuyệt đối trong khung để không bao giờ làm khung giãn theo kích thước ảnh gốc.
 */
export default memo(function AppBackground({ children }) {
  return <View style={s.root}>
    <Image source={IMAGE} resizeMode="cover" blurRadius={3} style={s.image} accessibilityIgnoresInvertColors />
    <LinearGradient pointerEvents="none" colors={['#FFFBF866', '#FFFBF894', '#F7F5F3D9']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    {children}
  </View>;
});
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
