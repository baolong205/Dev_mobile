// "Mặt bảng điện": nền thép sơn, mặt bảng sáng, phím có gờ nổi, đèn báo theo màu LED thật.
export const colors = {
  background: '#E6EAEE', // thép sơn tĩnh điện
  card: '#FBFCFD', // mặt bảng
  text: '#14202B', // mực in trên bảng
  navy: '#14202B',
  muted: '#5A6775',
  border: '#D3DAE1',
  lip: '#C3CCD5', // gờ dưới của mặt bảng/phím
  primary: '#1D5BD8', // xanh tín hiệu
  deepBlue: '#1546A8', // gờ của phím xanh
  green: '#12A867', // đèn LED xanh
  red: '#E23D44', // đèn LED đỏ
  amber: '#B86E00',
  blueSoft: '#E4ECFB', greenSoft: '#E2F5EC', redSoft: '#FCE7E8', amberSoft: '#FBF0DC',
  lampOff: '#B9C2CB',
};
export const fonts = {
  light: 'BeVietnamPro_300Light',
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
};
export const spacing = { xs: 6, sm: 12, md: 16, lg: 20, xl: 24 };
// Bán kính theo cấp: mặt bảng lớn bo vừa, phím bo nhỏ, đèn tròn.
export const radius = { sm: 10, md: 14, lg: 18 };
// Thang chữ ~1.25 (Elements of Typographic Style: tỉ lệ đều, ít bậc).
export const typography = { caption: 12, body: 15, heading: 18, title: 24, measurement: 44 };
// Gờ nổi đặc (không dùng bóng mờ xám chung cho mọi thứ).
export const shadow = { borderBottomWidth: 3, borderBottomColor: colors.lip };
