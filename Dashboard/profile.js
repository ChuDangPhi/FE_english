document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load data from localStorage (Instant feedback)
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('access_token'); // relo.js saves as 'access_token'

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            fillProfileForm(user);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // 2. Fetch latest data from server
    if (token) {
        try {
            const response = await fetch('http://localhost:8000/api/v1/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();

                // Set global user ID context
                window.currentUserId = userData.id || userData.user_id;

                // Update localStorage with fresh data
                localStorage.setItem('user', JSON.stringify(userData));

                // Update UI
                fillProfileForm(userData);
                updateProfileStats(); // Reload stats with correct user ID
            } else {
                console.log('Could not fetch fresh profile data:', response.status);
                if (response.status === 401) {
                    // Start logout flow or refresh token if needed
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    // 3. Update stats from localStorage
    updateProfileStats();

    // Handle form submission
    const profileForm = document.querySelector('form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const bio = document.getElementById('bio').value;
            const password = document.getElementById('password').value;

            // Basic validation?

            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'Đang lưu...';
            submitBtn.disabled = true;

            try {
                // Prepare request body - match backend schema
                const updateData = {
                    full_name: fullName,
                    phone: phone,  // Backend expects 'phone' not 'phone_number'
                    bio: bio
                };

                // 1. Update profile via PUT /user/profile
                const response = await fetch('http://localhost:8000/api/v1/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                // 2. If user wants to change password, call separate endpoint
                if (password && password.trim() !== "") {
                    const currentPassword = prompt('Nhập mật khẩu hiện tại để xác nhận đổi mật khẩu:');
                    if (currentPassword) {
                        const pwResponse = await fetch('http://localhost:8000/api/v1/user/change-password', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                current_password: currentPassword,
                                new_password: password,
                                confirm_password: password
                            })
                        });
                        
                        if (!pwResponse.ok) {
                            const pwError = await pwResponse.json().catch(() => ({}));
                            alert('Lỗi đổi mật khẩu: ' + (pwError.detail || 'Mật khẩu hiện tại không đúng'));
                        }
                    }
                }

                if (response.ok) {
                    const updatedUser = await response.json();

                    // Update localStorage with server response
                    localStorage.setItem('user', JSON.stringify(updatedUser));

                    // Update UI
                    fillProfileForm(updatedUser);

                    alert('Cập nhật thông tin thành công!');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Server update failed:', errorData);
                    
                    // Fallback saving to localStorage
                    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
                    const updatedUser = { ...currentUser, full_name: fullName, phone: phone, bio: bio };

                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    fillProfileForm(updatedUser);

                    alert('Lỗi server: ' + (errorData.detail || 'Dữ liệu đã lưu cục bộ'));
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                // Fallback saving to localStorage on network error
                const currentUser = JSON.parse(localStorage.getItem('user')) || {};
                const updatedUser = { ...currentUser, full_name: fullName, phone_number: phone, bio: bio };

                localStorage.setItem('user', JSON.stringify(updatedUser));
                fillProfileForm(updatedUser);

                alert('Lỗi kết nối server: Dữ liệu đã được lưu tạm vào máy của bạn.');
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Handle Avatar Upload (Local Preview & Save)
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', function (e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];

                // Limit size if needed (e.g. 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert('Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64Image = e.target.result;

                    // 1. Update UI
                    updateAvatarUI(base64Image);

                    // 2. Save locally
                    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
                    currentUser.avatar = base64Image;
                    localStorage.setItem('user', JSON.stringify(currentUser));

                    // 3. TODO: Upload to server here if API exists
                    // uploadAvatarToServer(file);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle Password Visibility Toggle
    const togglePasswordIcon = document.querySelector('.toggle-password-profile');
    if (togglePasswordIcon) {
        togglePasswordIcon.addEventListener('click', function () {
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
    }
});

function fillProfileForm(user) {
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const bioInput = document.getElementById('bio');

    if (fullNameInput && (user.full_name || user.name)) fullNameInput.value = user.full_name || user.name;
    if (emailInput && user.email) emailInput.value = user.email;
    if (phoneInput && (user.phone_number || user.phone)) phoneInput.value = user.phone_number || user.phone || '';
    if (bioInput && (user.bio || user.description)) bioInput.value = user.bio || user.description || '';

    // Also update sidebar avatar name if present
    const sidebarName = document.querySelector('.user-section div div');
    if (sidebarName && (user.full_name || user.name)) {
        sidebarName.textContent = user.full_name || user.name;
    }

    if (user.avatar) {
        updateAvatarUI(user.avatar);
    }
}

function updateAvatarUI(imageSrc) {
    if (!imageSrc) return;

    // 1. Large Profile Avatar
    const profileAvatar = document.querySelector('.large-avatar');
    if (profileAvatar) {
        if (imageSrc.startsWith('http') || imageSrc.startsWith('data:')) {
            profileAvatar.innerHTML = '';
            profileAvatar.style.backgroundImage = `url('${imageSrc}')`;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
            // Remove icon if present, handled by innerHTML = ''
        }
    }

    // 2. Sidebar Avatar
    const sidebarAvatar = document.querySelector('.user-avatar');
    if (sidebarAvatar) {
        if (imageSrc.startsWith('http') || imageSrc.startsWith('data:')) {
            sidebarAvatar.innerHTML = '';
            sidebarAvatar.style.backgroundImage = `url('${imageSrc}')`;
            sidebarAvatar.style.backgroundSize = 'cover';
            sidebarAvatar.style.backgroundPosition = 'center';
        }
    }
}

// Update profile stats (streak and words)
function updateProfileStats() {
    const datesKey = (window.getStudyKey) ? window.getStudyKey('studyDates') : 'studyDates';
    const wordsKey = (window.getStudyKey) ? window.getStudyKey('totalWordsLearned') : 'totalWordsLearned';

    const studyDates = JSON.parse(localStorage.getItem(datesKey) || '[]');
    const totalWords = parseInt(localStorage.getItem(wordsKey) || '0');

    // Calculate streak using shared logic from dashboard.js
    const currentStreak = (window.calculateStreak) ? window.calculateStreak(studyDates) : 0;

    // Update UI
    const streakElement = document.getElementById('profileStreakDays');
    if (streakElement) {
        streakElement.textContent = currentStreak;
    }

    const wordsElement = document.getElementById('profileTotalWords');
    if (wordsElement) {
        wordsElement.textContent = totalWords;
    }
}
