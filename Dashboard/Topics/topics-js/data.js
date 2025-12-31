// data.js
const topics = [
    {
        id: 1,
        title: "Giới thiệu bản thân",
        description: "Học cách nói về tên, tuổi, công việc và sở thích của bạn",
        icon: "👤",
        level: "Cơ bản",
        category: "daily",
        words: [
            {"word": "Xin chào", "meaning": "Hello"},
            {"word": "Tên", "meaning": "Name"},
            {"word": "Tuổi", "meaning": "Age"},
            {"word": "Quê quán", "meaning": "Hometown"},
            {"word": "Nghề nghiệp", "meaning": "Occupation"},
            {"word": "Sở thích", "meaning": "Hobby"},
            {"word": "Gia đình", "meaning": "Family"},
            {"word": "Quốc tịch", "meaning": "Nationality"},
            {"word": "Ngôn ngữ", "meaning": "Language"},
            {"word": "Trình độ", "meaning": "Education level"}
        ]
    },
    {
        id: 2,
        title: "Đặt phòng khách sạn",
        description: "Thực hành đàm phán giá cả và yêu cầu phòng khách sạn",
        icon: "🏨",
        level: "Trung bình",
        category: "travel",
        words: [
            {"word": "Khách sạn", "meaning": "Hotel"},
            {"word": "Đặt phòng", "meaning": "Book a room"},
            {"word": "Phòng đơn", "meaning": "Single room"},
            {"word": "Phòng đôi", "meaning": "Double room"},
            {"word": "Ngày nhận phòng", "meaning": "Check-in date"},
            {"word": "Ngày trả phòng", "meaning": "Check-out date"},
            {"word": "Giá phòng", "meaning": "Room rate"},
            {"word": "Bao gồm", "meaning": "Include"},
            {"word": "Dịch vụ", "meaning": "Service"},
            {"word": "Nhân viên", "meaning": "Staff"}
        ]
    },
    {
        id: 3,
        title: "Tại nhà hàng",
        description: "Gọi món ăn, hỏi thực đơn và thanh toán tại nhà hàng",
        icon: "🍽️",
        level: "Cơ bản",
        category: "daily",
        words: [
            {"word": "Nhà hàng", "meaning": "Restaurant"},
            {"word": "Thực đơn", "meaning": "Menu"},
            {"word": "Gọi món", "meaning": "Order food"},
            {"word": "Món khai vị", "meaning": "Appetizer"},
            {"word": "Món chính", "meaning": "Main course"},
            {"word": "Món tráng miệng", "meaning": "Dessert"},
            {"word": "Đồ uống", "meaning": "Beverage"},
            {"word": "Nước lọc", "meaning": "Water"},
            {"word": "Rượu vang", "meaning": "Wine"},
            {"word": "Bia", "meaning": "Beer"}
        ]
    },
    {
        id: 4,
        title: "Phỏng vấn việc làm",
        description: "Chuẩn bị cho buổi phỏng vấn xin việc bằng tiếng Anh",
        icon: "💼",
        level: "Nâng cao",
        category: "work",
        words: [
            {"word": "Phỏng vấn", "meaning": "Interview"},
            {"word": "CV", "meaning": "CV/Resume"},
            {"word": "Kinh nghiệm", "meaning": "Experience"},
            {"word": "Kỹ năng", "meaning": "Skill"},
            {"word": "Mức lương", "meaning": "Salary"},
            {"word": "Công ty", "meaning": "Company"},
            {"word": "Vị trí", "meaning": "Position"},
            {"word": "Điểm mạnh", "meaning": "Strength"},
            {"word": "Điểm yếu", "meaning": "Weakness"},
            {"word": "Phúc lợi", "meaning": "Benefits"}
        ]
    },
    {
        id: 5,
        title: "Du lịch thành phố",
        description: "Hỏi đường, mô tả địa điểm du lịch và trải nghiệm",
        icon: "✈️",
        level: "Trung bình",
        category: "travel",
        words: [
            {"word": "Du lịch", "meaning": "Travel"},
            {"word": "Thành phố", "meaning": "City"},
            {"word": "Địa điểm", "meaning": "Place"},
            {"word": "Tham quan", "meaning": "Sightseeing"},
            {"word": "Hướng dẫn viên", "meaning": "Tour guide"},
            {"word": "Bản đồ", "meaning": "Map"},
            {"word": "Phương tiện", "meaning": "Transportation"},
            {"word": "Xe buýt", "meaning": "Bus"},
            {"word": "Tàu điện", "meaning": "Train"},
            {"word": "Taxi", "meaning": "Taxi"}
        ]
    },
    {
        id: 6,
        title: "Tại cửa hàng",
        description: "Mua sắm, hỏi giá, đổi trả hàng hóa",
        icon: "🛍️",
        level: "Cơ bản",
        category: "daily",
        words: [
            {"word": "Cửa hàng", "meaning": "Shop"},
            {"word": "Mua sắm", "meaning": "Shopping"},
            {"word": "Mua", "meaning": "Buy"},
            {"word": "Bán", "meaning": "Sell"},
            {"word": "Giá", "meaning": "Price"},
            {"word": "Giảm giá", "meaning": "Discount"},
            {"word": "Thanh toán", "meaning": "Payment"},
            {"word": "Tiền mặt", "meaning": "Cash"},
            {"word": "Thẻ", "meaning": "Card"},
            {"word": "Hóa đơn", "meaning": "Bill"}
        ]
    },
    {
        id: 7,
        title: "Chuyện công việc",
        description: "Thảo luận về công việc, dự án và đồng nghiệp",
        icon: "📊",
        level: "Trung bình",
        category: "work",
        words: [
            {"word": "Công việc", "meaning": "Work"},
            {"word": "Dự án", "meaning": "Project"},
            {"word": "Đồng nghiệp", "meaning": "Colleague"},
            {"word": "Sếp", "meaning": "Boss"},
            {"word": "Cuộc họp", "meaning": "Meeting"},
            {"word": "Thời hạn", "meaning": "Deadline"},
            {"word": "Báo cáo", "meaning": "Report"},
            {"word": "Kế hoạch", "meaning": "Plan"},
            {"word": "Mục tiêu", "meaning": "Goal"},
            {"word": "Thành công", "meaning": "Success"}
        ]
    },
    {
        id: 8,
        title: "Lễ hội và truyền thống",
        description: "Hiểu và nói về các lễ hội truyền thống khác nhau",
        icon: "🎉",
        level: "Trung bình",
        category: "culture",
        words: [
            {"word": "Lễ hội", "meaning": "Festival"},
            {"word": "Tết", "meaning": "Lunar New Year"},
            {"word": "Trung thu", "meaning": "Mid-Autumn Festival"},
            {"word": "Bánh chưng", "meaning": "Chung cake"},
            {"word": "Múa lân", "meaning": "Lion dance"},
            {"word": "Pháo hoa", "meaning": "Fireworks"},
            {"word": "Lì xì", "meaning": "Lucky money"},
            {"word": "Chúc Tết", "meaning": "New Year wishes"},
            {"word": "Hoa đào", "meaning": "Peach blossom"},
            {"word": "Câu đối", "meaning": "Parallel sentences"}
        ]
    }
];

let filteredTopics = topics;
let currentCategory = 'all';
let currentTopic = null;