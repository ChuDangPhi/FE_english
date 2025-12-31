// Register_Login/script12.js - ĐÃ SỬA LỖI

document.addEventListener('DOMContentLoaded', () => {
  // ==== TOGGLE PASSWORD VISIBILITY ====
  const togglePasswordIcons = document.querySelectorAll('.toggle-password');

  togglePasswordIcons.forEach(icon => {
    icon.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      }
    });
  });

  // ==== ĐĂNG KÝ ====
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const full_name = registerForm.fullname.value.trim(); // Lấy từ form
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const confirm_password = registerForm.confirm_password.value;

      // Validate mật khẩu khớp
      if (password !== confirm_password) {
        alert('Mật khẩu không khớp!');
        return;
      }

      // Validate mật khẩu tối thiểu 6 ký tự
      if (password.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự!');
        return;
      }

      try {
        console.log('Đang gửi request đăng ký...');

        const res = await fetch('http://localhost:8000/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,           // ✅ Đúng
            password,        // ✅ Đúng
            full_name        // ✅ SỬA: full_name (có gạch dưới)
          })
        });

        const result = await res.json();
        console.log('Response:', result);

        if (res.ok) {
          alert('Đăng ký thành công! Vui lòng đăng nhập.');
          window.location.href = 'dang-nhap.html';
        } else {
          // Backend trả về { detail: "..." }
          alert(result.detail || 'Lỗi đăng ký!');
        }
      } catch (err) {
        console.error('Lỗi đăng ký:', err);
        alert('Không kết nối được server! Kiểm tra:\n1. Server đã chạy chưa?\n2. CORS đã bật chưa?');
      }
    });
  }

  // ==== ĐĂNG NHẬP ====
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      try {
        console.log('Đang gửi request đăng nhập...');

        const res = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const result = await res.json();
        console.log('Response:', result);

        if (res.ok) {
          alert('Đăng nhập thành công!');

          // ✅ SỬA: Lưu đúng token từ response
          localStorage.setItem('access_token', result.access_token);
          localStorage.setItem('refresh_token', result.refresh_token);
          localStorage.setItem('user', JSON.stringify(result.user));

          // Chuyển sang Dashboard
          window.location.href = '../Dashboard/dashboard.html';
        } else {
          // Backend trả về { detail: "..." }
          alert(result.detail || 'Sai email hoặc mật khẩu!');
        }
      } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        alert('Không kết nối được server! Kiểm tra:\n1. Server đã chạy chưa?\n2. URL API đúng chưa?');
      }
    });
  }
});