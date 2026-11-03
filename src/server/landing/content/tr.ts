import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Hex\'i ücretsiz çevrim içi oyna',
    metaDescription: 'Hex masa oyununu dünyanın dört bir yanından oyunculara veya yapay zekâya karşı ücretsiz çevrim içi oyna. Canlı ve yazışmalı oyunlar, turnuvalar, bulmacalar ve yapay zekâ ile oyun analizi.',

    nav: {
        play: 'Oyna',
        tournaments: 'Turnuvalar',
        ladder: 'Tepenin Kralı',
        puzzles: 'Bulmacalar',
        tutorial: 'Öğren',
        language: 'Dil',
    },

    hero: {
        title: 'Hex\'i çevrim içi oyna',
        subtitle: 'Hex masa oyununu dünyanın dört bir yanından oyunculara veya yapay zekâya karşı ücretsiz oyna.',
        tagline: 'Öğrenmesi kolay, ustalaşması zor.',
        cta: 'Hemen oyna',
        ctaSecondary: 'Kuralları öğren',
    },

    features: {
        live: {
            title: 'Gerçek zamanlı oyunlar',
            text: 'Yıldırım oyna ya da ayarlanabilir sürelerle acele etme. Ön hamlelerle anında yanıt ver, oyun sırasında rakibinle sohbet et.',
            imageAlt: 'PlayHex\'te gerçek zamanlı bir Hex oyunu',
            linkLabel: 'Rakip bul',
            highlights: ['Anında yanıt için ön hamleler', 'Tüm tahta boyutları, 19×19 ve ötesi'],
        },
        correspondence: {
            title: 'Yazışmalı oyunlar',
            text: 'Kendi temponda oyna, günde bir hamle ya da daha fazla. Koşullu hamlelerle merdivenleri ve zorunlu dizileri rakibini beklemeden önceden oyna.',
            imageAlt: 'Yazışmalı bir oyunda koşullu hamle ağacı',
            linkLabel: 'Yazışmalı oyna',
            highlights: ['Koşullu hamleler', 'Sıra sana geldiğinde bildirim'],
        },
        ai_analysis: {
            title: 'Yapay zekâ ile oyun analizi',
            text: 'Oyundan sonra yapay zekâ her hamleyi analiz eder: en iyi hamleleri, hatalarını ve oyunun her anında kimin kazandığını gör.',
            imageAlt: 'Yapay zekâ ile analiz edilen bir oyunun kazanma olasılığı grafiği',
            linkLabel: 'Bir oyun oyna',
            highlights: ['Hatalarını ve seni kurtaracak hamleyi bul', 'Kazanma olasılığı grafiği'],
        },
        ranked: {
            title: 'Sıralı oyunlar',
            text: 'Bir puan edin, kendi seviyendeki rakiplerle oyna ve puan grafiğinde gelişimini takip et.',
            imageAlt: 'Bir oyuncunun puan geçmişi grafiği',
            linkLabel: 'Sıralı oyun oyna',
            highlights: ['Canlı ve yazışmalı oyunlarda puanlı', 'Her rakibe karşı istatistikler'],
        },
        devices: {
            title: 'Mobil ve bilgisayar',
            text: 'PlayHex telefonda, tablette ve bilgisayarda tarayıcında çalışır. Kurulacak bir şey yok, oyunların cihazların arasında senkronize edilir.',
            imageAlt: 'Telefonda bir Hex oyunu',
            linkLabel: 'Tarayıcından oyna',
            highlights: ['Uygulama olarak yüklenebilir', 'Oyunlar cihazlar arasında senkronize'],
        },
        tournaments: {
            title: 'Turnuvalar',
            text: 'İsviçre sistemi veya eleme usulü turnuvalara, canlı ya da yazışmalı olarak katıl; her hafta aynı oyuncularla buluşmak için düzenli serilere gir.',
            imageAlt: 'Bir Hex turnuvasının sonuçları',
            linkLabel: 'Turnuvaları gör',
            highlights: ['İsviçre, lig ve eleme usulü', 'Düzenli turnuva serileri'],
        },
        ladder: {
            title: 'Tepenin Kralı',
            text: 'Senden üst sıradaki oyunculara meydan oku, kazan ve yerlerini al. Zirveye tırman ve yerini savun.',
            imageAlt: 'Tepenin Kralı sıralaması',
            linkLabel: 'Tepeye tırman',
            highlights: ['Canlı ve yazışmalı', 'Her saltanatın geçmişi'],
        },
        puzzles: {
            title: 'Bulmacalar',
            text: 'Topluluk tarafından hazırlanan, başlangıçtan uzman seviyesine kadar koleksiyonlara ayrılmış bulmacalarla taktiğini geliştir.',
            imageAlt: 'Bir Hex bulmacası',
            linkLabel: 'Bulmaca çöz',
            highlights: ['Herkes bulmaca oluşturabilir ve çözebilir', 'Bulmacanı hatalara karşı kontrol eden tam bir düzenleyici'],
        },
        bots: {
            title: 'Yapay zekâya karşı oyna',
            text: 'Başlangıçtan çok güçlüye kadar farklı seviyelerdeki botlara karşı, çevrim dışıyken bile pratik yap.',
            imageAlt: 'Bir Hex yapay zekâsına karşı oyun',
            linkLabel: 'Yapay zekâya karşı oyna',
            highlights: ['Birkaç güç seviyesi', 'Çevrimdışı bile oynanabilir'],
        },
        tutorial: {
            title: 'Etkileşimli eğitim',
            text: 'Hex\'in yalnızca iki kuralı var. Etkileşimli eğitimle birkaç dakikada öğren, ardından temel stratejileri keşfet.',
            imageAlt: 'Etkileşimli Hex eğitimi',
            linkLabel: 'Eğitime başla',
            highlights: ['Kurallar birkaç dakikada', 'Temel stratejiler'],
        },
    },

    footer: {
        cta: 'Kenarlarını birleştirmeye hazır mısın?',
        free: 'PlayHex ücretsiz, açık kaynaklı ve reklamsızdır.',
    },
} satisfies LandingContent;
