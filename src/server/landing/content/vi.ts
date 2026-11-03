import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Chơi cờ Hex trực tuyến miễn phí',
    metaDescription: 'Chơi cờ Hex trực tuyến miễn phí với người chơi khắp thế giới hoặc với AI. Ván đấu trực tiếp và ván đấu thư tín, giải đấu, câu đố, phân tích ván cờ bằng AI.',

    nav: {
        play: 'Chơi',
        tournaments: 'Giải đấu',
        ladder: 'Vua đồi',
        puzzles: 'Câu đố',
        tutorial: 'Học chơi',
        language: 'Ngôn ngữ',
    },

    hero: {
        title: 'Chơi cờ Hex trực tuyến',
        subtitle: 'Chơi cờ Hex miễn phí với người chơi khắp thế giới hoặc với AI.',
        tagline: 'Dễ học, khó tinh thông.',
        cta: 'Chơi ngay',
        ctaSecondary: 'Tìm hiểu luật chơi',
    },

    features: {
        live: {
            title: 'Ván đấu thời gian thực',
            text: 'Chơi cờ chớp hoặc thong thả với thời gian tùy chỉnh. Nước đi trước giúp bạn đáp trả ngay lập tức, và bạn có thể trò chuyện với đối thủ trong ván đấu.',
            imageAlt: 'Một ván Hex thời gian thực trên PlayHex',
            linkLabel: 'Tìm đối thủ',
            highlights: ['Nước đi trước để đáp trả ngay lập tức', 'Mọi kích thước bàn cờ, đến 19×19 và lớn hơn'],
        },
        correspondence: {
            title: 'Ván đấu thư tín',
            text: 'Chơi theo nhịp độ của bạn, mỗi ngày một nước hoặc lâu hơn. Nước đi có điều kiện cho phép bạn đi trước các thế thang và chuỗi nước ép buộc mà không cần chờ đối thủ.',
            imageAlt: 'Cây nước đi có điều kiện trong một ván đấu thư tín',
            linkLabel: 'Chơi đấu thư tín',
            highlights: ['Nước đi có điều kiện', 'Thông báo khi đến lượt bạn'],
        },
        ai_analysis: {
            title: 'Phân tích ván cờ bằng AI',
            text: 'Sau ván đấu, AI phân tích từng nước đi: xem các nước tốt nhất, lỗi của bạn và ai đang thắng ở mỗi thời điểm của ván cờ.',
            imageAlt: 'Biểu đồ tỷ lệ thắng của một ván cờ được AI phân tích',
            linkLabel: 'Chơi một ván',
            highlights: ['Tìm ra lỗi của bạn và nước đi lẽ ra đã cứu được ván cờ', 'Biểu đồ tỷ lệ thắng của ván cờ'],
        },
        ranked: {
            title: 'Ván đấu xếp hạng',
            text: 'Nhận điểm xếp hạng, đấu với đối thủ cùng trình độ và theo dõi sự tiến bộ của bạn qua biểu đồ xếp hạng.',
            imageAlt: 'Biểu đồ lịch sử xếp hạng của một người chơi',
            linkLabel: 'Chơi ván xếp hạng',
            highlights: ['Xếp hạng cho cả ván trực tiếp và ván thư tín', 'Thống kê đối đầu với từng đối thủ'],
        },
        devices: {
            title: 'Điện thoại và máy tính',
            text: 'PlayHex chạy trên trình duyệt của điện thoại, máy tính bảng và máy tính. Không cần cài đặt gì, và các ván cờ của bạn được đồng bộ giữa các thiết bị.',
            imageAlt: 'Một ván Hex trên điện thoại',
            linkLabel: 'Chơi trên trình duyệt',
            highlights: ['Có thể cài đặt như một ứng dụng', 'Ván cờ được đồng bộ giữa các thiết bị'],
        },
        tournaments: {
            title: 'Giải đấu',
            text: 'Tham gia các giải hệ Thụy Sĩ hoặc loại trực tiếp, chơi trực tiếp hoặc thư tín, cùng các chuỗi giải định kỳ để gặp lại những người chơi quen thuộc mỗi tuần.',
            imageAlt: 'Kết quả một giải đấu Hex',
            linkLabel: 'Xem các giải đấu',
            highlights: ['Hệ Thụy Sĩ, vòng tròn và loại trực tiếp', 'Chuỗi giải đấu định kỳ'],
        },
        ladder: {
            title: 'Vua đồi',
            text: 'Thách đấu những người chơi xếp trên bạn, chiến thắng và giành lấy vị trí của họ. Leo lên đỉnh và bảo vệ ngôi vị của bạn.',
            imageAlt: 'Bảng xếp hạng Vua đồi',
            linkLabel: 'Leo lên đồi',
            highlights: ['Các ngọn đồi cho ván trực tiếp và ván thư tín', 'Lịch sử của mọi triều đại'],
        },
        puzzles: {
            title: 'Câu đố',
            text: 'Rèn luyện chiến thuật với các câu đố do cộng đồng tạo ra, từ người mới đến chuyên gia, được sắp xếp thành bộ sưu tập.',
            imageAlt: 'Một câu đố Hex',
            linkLabel: 'Giải câu đố',
            highlights: ['Ai cũng có thể tạo và giải câu đố', 'Trình soạn thảo đầy đủ giúp kiểm tra lỗi trong câu đố của bạn'],
        },
        bots: {
            title: 'Chơi với AI',
            text: 'Luyện tập với các bot ở nhiều mức độ, từ người mới đến rất mạnh, ngay cả khi ngoại tuyến.',
            imageAlt: 'Một ván đấu với AI Hex',
            linkLabel: 'Chơi với AI',
            highlights: ['Nhiều mức độ mạnh khác nhau', 'Chơi được cả khi ngoại tuyến'],
        },
        tutorial: {
            title: 'Hướng dẫn tương tác',
            text: 'Hex chỉ có hai luật. Hãy học chúng trong vài phút với phần hướng dẫn tương tác, rồi khám phá các chiến lược cơ bản.',
            imageAlt: 'Hướng dẫn tương tác về Hex',
            linkLabel: 'Bắt đầu hướng dẫn',
            highlights: ['Luật chơi trong vài phút', 'Các chiến lược cơ bản'],
        },
    },

    footer: {
        cta: 'Sẵn sàng nối hai cạnh của bạn?',
        free: 'PlayHex miễn phí, mã nguồn mở và không có quảng cáo.',
    },
} satisfies LandingContent;
