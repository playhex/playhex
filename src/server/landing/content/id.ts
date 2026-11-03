import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Main Hex online gratis',
    metaDescription: 'Mainkan permainan papan Hex online secara gratis melawan pemain dari seluruh dunia atau melawan AI. Permainan langsung dan korespondensi, turnamen, teka-teki, analisis permainan dengan AI.',

    nav: {
        play: 'Main',
        tournaments: 'Turnamen',
        ladder: 'Raja Bukit',
        puzzles: 'Teka-teki',
        tutorial: 'Belajar',
        language: 'Bahasa',
    },

    hero: {
        title: 'Main Hex online',
        subtitle: 'Mainkan permainan papan Hex secara gratis melawan pemain dari seluruh dunia, atau melawan AI.',
        tagline: 'Mudah dipelajari, sulit dikuasai.',
        cta: 'Main sekarang',
        ctaSecondary: 'Pelajari aturannya',
    },

    features: {
        live: {
            title: 'Permainan langsung',
            text: 'Main blitz atau santai dengan pengaturan waktu yang bisa disesuaikan. Langkah awal memungkinkan kamu membalas seketika, dan kamu bisa mengobrol dengan lawan selama permainan.',
            imageAlt: 'Permainan Hex langsung di PlayHex',
            linkLabel: 'Cari lawan',
            highlights: ['Langkah awal untuk membalas seketika', 'Semua ukuran papan, hingga 19×19 dan lebih'],
        },
        correspondence: {
            title: 'Permainan korespondensi',
            text: 'Main sesuai ritmemu, satu langkah sehari atau lebih. Langkah bersyarat memungkinkan kamu memainkan tangga dan urutan paksa lebih dulu, tanpa menunggu lawan.',
            imageAlt: 'Pohon langkah bersyarat dalam permainan korespondensi',
            linkLabel: 'Main korespondensi',
            highlights: ['Langkah bersyarat', 'Notifikasi saat giliranmu'],
        },
        ai_analysis: {
            title: 'Analisis permainan dengan AI',
            text: 'Setelah permainan, AI menganalisis setiap langkah: lihat langkah terbaik, kesalahanmu, dan siapa yang unggul di setiap momen permainan.',
            imageAlt: 'Grafik peluang menang dari permainan yang dianalisis AI',
            linkLabel: 'Mainkan satu permainan',
            highlights: ['Temukan kesalahanmu dan langkah yang bisa menyelamatkanmu', 'Grafik peluang menang dalam permainan'],
        },
        ranked: {
            title: 'Permainan bertingkat',
            text: 'Dapatkan rating, lawan pemain selevelmu, dan pantau perkembanganmu dari waktu ke waktu di grafik ratingmu.',
            imageAlt: 'Grafik riwayat rating seorang pemain',
            linkLabel: 'Mainkan permainan bertingkat',
            highlights: ['Bertingkat baik langsung maupun korespondensi', 'Statistik head-to-head melawan setiap lawan'],
        },
        devices: {
            title: 'Ponsel dan komputer',
            text: 'PlayHex berjalan di browsermu, di ponsel, tablet, dan komputer. Tidak perlu memasang apa pun, dan permainanmu tersinkron di semua perangkatmu.',
            imageAlt: 'Permainan Hex di ponsel',
            linkLabel: 'Main dari browser',
            highlights: ['Dapat dipasang sebagai aplikasi', 'Permainan tersinkron antarperangkat'],
        },
        tournaments: {
            title: 'Turnamen',
            text: 'Ikuti turnamen sistem Swiss atau gugur, langsung atau korespondensi, serta seri berulang untuk bertemu pemain yang sama setiap minggu.',
            imageAlt: 'Hasil turnamen Hex',
            linkLabel: 'Lihat turnamen',
            highlights: ['Swiss, setengah kompetisi, dan sistem gugur', 'Seri turnamen berulang'],
        },
        ladder: {
            title: 'Raja Bukit',
            text: 'Tantang pemain yang peringkatnya di atasmu, menangkan, dan ambil tempat mereka. Naik ke puncak dan pertahankan posisimu.',
            imageAlt: 'Peringkat Raja Bukit',
            linkLabel: 'Daki bukitnya',
            highlights: ['Bukit langsung dan korespondensi', 'Riwayat setiap masa kekuasaan'],
        },
        puzzles: {
            title: 'Teka-teki',
            text: 'Latih taktikmu dengan teka-teki buatan komunitas, dari pemula hingga ahli, dikelompokkan dalam koleksi.',
            imageAlt: 'Teka-teki Hex',
            linkLabel: 'Pecahkan teka-teki',
            highlights: ['Semua orang bisa membuat dan memecahkan teka-teki', 'Editor lengkap yang memeriksa kesalahan teka-tekimu'],
        },
        bots: {
            title: 'Main melawan AI',
            text: 'Berlatih melawan bot dengan beberapa tingkat kekuatan, dari pemula hingga sangat kuat, bahkan secara offline.',
            imageAlt: 'Permainan melawan AI Hex',
            linkLabel: 'Main melawan AI',
            highlights: ['Beberapa tingkat kekuatan', 'Bisa dimainkan bahkan secara offline'],
        },
        tutorial: {
            title: 'Tutorial interaktif',
            text: 'Hex hanya punya dua aturan. Pelajari dalam beberapa menit dengan tutorial interaktif, lalu temukan strategi dasarnya.',
            imageAlt: 'Tutorial interaktif Hex',
            linkLabel: 'Mulai tutorial',
            highlights: ['Aturannya dalam beberapa menit', 'Strategi dasar'],
        },
    },

    footer: {
        cta: 'Siap menghubungkan sisi-sisimu?',
        free: 'PlayHex gratis, open source, dan tanpa iklan.',
    },
} satisfies LandingContent;
