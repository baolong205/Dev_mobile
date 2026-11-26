import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as c } from '../constants/theme';

// Ảnh: "Turquoise and pink soft gradient" trên Unsplash (Unsplash License, dùng miễn phí):
// https://unsplash.com/photos/turquoise-and-pink-soft-gradient-znivrLI5ZI4
const IMAGE = require('../../assets/background.jpg');

/**
 * Nền chung: ảnh gradient xanh ngọc–hồng, phủ một lớp trắng mờ (đậm dần xuống dưới)
 * để màu bớt gắt và chữ đen, thẻ trắng luôn dễ đọc.
 * Ảnh đặt tuyệt đối trong khung để không bao giờ làm khung giãn theo kích thước ảnh gốc.
 */
export default memo(function AppBackground({ children }) {
  return <View style={s.root}>
    <Image source={IMAGE} resizeMode="cover" style={s.image} accessibilityIgnoresInvertColors />
    <LinearGradient pointerEvents="none" colors={['#FFFFFF59', '#FFFFFF8C', '#F5F6F9D9']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    {children}
  </View>;
});
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
