import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as c } from '../constants/theme';

// Ảnh: "Fleurs de dahlia orange avec des gouttelettes d'eau" của Liana S trên Unsplash
// (Unsplash License, dùng miễn phí), cắt dọc 1080x1920 giữ bông hoa bên trái:
// https://unsplash.com/photos/plb6WRPuxO0
const IMAGE = require('../../assets/background.jpg');

/**
 * Nền chung: ảnh hoa dahlia hiển thị gần như nguyên bản. Chữ đặt thẳng trên ảnh dùng
 * kiểu `onPhoto` (trắng, có bóng) trong theme; nội dung chính nằm trong thẻ trắng.
 * Ảnh đặt tuyệt đối trong khung để không bao giờ làm khung giãn theo kích thước ảnh gốc.
 */
export default memo(function AppBackground({ children }) {
  return <View style={s.root}>
    <Image source={IMAGE} resizeMode="cover" style={s.image} accessibilityIgnoresInvertColors />
    {/* Chỉ một lớp tối rất nhẹ ở trên cùng để chữ trắng của tiêu đề đọc được; giữa ảnh để nguyên. */}
    <LinearGradient pointerEvents="none" colors={['#00000047', '#00000000', '#00000000', '#00000026']} locations={[0, 0.3, 0.75, 1]} style={StyleSheet.absoluteFill} />
    {children}
  </View>;
});
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
