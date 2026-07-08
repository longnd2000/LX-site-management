/**
 * Dịch các thông báo lỗi từ Supabase Auth sang Tiếng Việt thân thiện với người dùng.
 */
export function translateAuthError(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('email rate limit exceeded') || msg.includes('rate limit')) {
    return 'Tần suất gửi yêu cầu quá nhanh. Vui lòng đợi một vài phút (hoặc thử lại sau 1 giờ) để tiếp tục.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (msg.includes('user already exists')) {
    return 'Địa chỉ Email này đã được đăng ký cho tài khoản khác.';
  }
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email của bạn để kích hoạt.';
  }
  if (msg.includes('password should be at least')) {
    return 'Mật khẩu phải có độ dài ít nhất 6 ký tự.';
  }
  if (msg.includes('signup requires a valid email')) {
    return 'Vui lòng nhập địa chỉ email hợp lệ.';
  }
  if (msg.includes('network error') || msg.includes('fetch')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.';
  }
  
  return message; // Trả về thông báo gốc nếu không khớp các mã trên
}
