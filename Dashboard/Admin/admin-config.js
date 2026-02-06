// Admin Configuration
const ADMIN_CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api/v1',
    ENDPOINTS: {
        DASHBOARD: '/admin/stats/dashboard',
        OVERVIEW: '/admin/stats/overview',
        USER_DISTRIBUTION: '/admin/stats/user-distribution',
        USERS: '/admin/stats/users',
        USER_DETAIL: '/admin/stats/users/', // + user_id
        ACTIVITY: '/admin/stats/activity',
        LESSONS: '/admin/stats/lessons',
        TOP_LESSONS: '/admin/stats/lessons/top',
        LEADERBOARD: '/admin/stats/leaderboard',
        LESSON_TYPES: '/admin/stats/lesson-types'
    }
};

window.ADMIN_CONFIG = ADMIN_CONFIG;
