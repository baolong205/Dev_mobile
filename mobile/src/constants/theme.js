// Phong cách tham chiếu: Zenvest (Orbix Studio) — nền sáng mát, thẻ gradient ánh xà cừ,
// số lớn nét mảnh, nút viên thuốc đen, nút tròn trắng có nhãn, đường biểu đồ mảnh.
export const colors = {
  background: '#F2F4F7', // nền xám trắng mát
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  text: '#101318', // mực gần đen của chữ và nút chính
  navy: '#101318',
  muted: '#8A919C',
  border: '#E8EBEF',
  hairline: '#EEF0F3',
  primary: '#101318', // hành động chính = nút đen
  deepBlue: '#101318',
  accent: '#5B7CFA', // xanh dịu cho điểm nhấn nhỏ
  green: '#1FA971',
  red: '#E5484D',
  amber: '#C2780B',
  blueSoft: '#EEF2FF', greenSoft: '#E8F7F0', redSoft: '#FDECEC', amberSoft: '#FCF3E3',
  lampOff: '#C9CED6',
  lip: '#E8EBEF',
};
// Dải màu ánh xà cừ cho thẻ chính (xanh băng → tím khói → hồng đào).
export const iridescent = ['#DCE6F5', '#E9E4F4', '#F7DDE6', '#FBD2C9'];
export const fonts = {
  light: 'BeVietnamPro_300Light',
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
};
export const spacing = { xs: 6, sm: 12, md: 16, lg: 20, xl: 24 };
export const radius = { sm: 14, md: 20, lg: 28, pill: 999 };
export const typography = { caption: 12, body: 15, heading: 17, title: 26, measurement: 48 };
// Bóng rất mềm, chỉ dùng cho thẻ nổi (thẻ chính, tấm danh sách).
export const shadow = { shadowColor: '#1B2A44', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 };
