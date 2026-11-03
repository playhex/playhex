import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Maglaro ng Hex Online nang Libre',
    metaDescription: 'Maglaro ng board game na Hex online nang libre laban sa mga manlalaro mula sa buong mundo o laban sa AI. Mga live at correspondence na laro, torneo, puzzle, at pagsusuri ng laro gamit ang AI.',

    nav: {
        play: 'Maglaro',
        tournaments: 'Mga Torneo',
        ladder: 'Hari ng Burol',
        puzzles: 'Mga Puzzle',
        tutorial: 'Matuto',
        language: 'Wika',
    },

    hero: {
        title: 'Maglaro ng Hex Online',
        subtitle: 'Maglaro ng board game na Hex nang libre laban sa mga manlalaro mula sa buong mundo, o laban sa AI.',
        tagline: 'Madaling matutunan, mahirap maging eksperto.',
        cta: 'Maglaro na',
        ctaSecondary: 'Alamin ang mga patakaran',
    },

    features: {
        live: {
            title: 'Mga larong real-time',
            text: 'Maglaro ng blitz o maglaan ng oras gamit ang nako-customize na time control. Sa premove, makakasagot ka agad, at puwede kang makipag-chat sa kalaban habang naglalaro.',
            imageAlt: 'Isang real-time na laro ng Hex sa PlayHex',
            linkLabel: 'Humanap ng kalaban',
            highlights: ['Premove para makasagot agad', 'Lahat ng laki ng board, hanggang 19×19 at mas malaki pa'],
        },
        correspondence: {
            title: 'Mga larong correspondence',
            text: 'Maglaro sa sarili mong bilis, isang tira kada araw o mas matagal pa. Sa conditional moves, maitatakda mo nang maaga ang mga ladder at sapilitang sunod-sunod na tira nang hindi hinihintay ang kalaban.',
            imageAlt: 'Puno ng conditional moves sa isang larong correspondence',
            linkLabel: 'Maglaro ng correspondence',
            highlights: ['Mga conditional move', 'Abiso kapag ikaw na ang titira'],
        },
        ai_analysis: {
            title: 'Pagsusuri ng laro gamit ang AI',
            text: 'Pagkatapos ng laro, sinusuri ng AI ang bawat tira: tingnan ang pinakamahuhusay na tira, ang mga pagkakamali mo, at kung sino ang nananalo sa bawat sandali ng laro.',
            imageAlt: 'Tsart ng win rate ng isang larong sinuri ng AI',
            linkLabel: 'Maglaro ng isang laro',
            highlights: ['Tukuyin ang mga pagkakamali mo at ang tirang makapagliligtas sana sa iyo', 'Tsart ng win rate ng laro'],
        },
        ranked: {
            title: 'Mga larong may ranggo',
            text: 'Magkaroon ng rating, makipaglaro sa mga kalabang kapantay mo ang antas, at subaybayan ang iyong pag-unlad sa rating chart.',
            imageAlt: 'Tsart ng kasaysayan ng rating ng isang manlalaro',
            linkLabel: 'Maglaro ng may ranggo',
            highlights: ['May ranggo sa live at correspondence', 'Head-to-head na estadistika laban sa bawat kalaban'],
        },
        devices: {
            title: 'Mobile at desktop',
            text: 'Gumagana ang PlayHex sa browser ng iyong telepono, tablet, at computer. Walang kailangang i-install, at naka-sync ang mga laro mo sa lahat ng device.',
            imageAlt: 'Isang laro ng Hex sa telepono',
            linkLabel: 'Maglaro sa browser',
            highlights: ['Puwedeng i-install bilang app', 'Naka-sync ang mga laro sa lahat ng device'],
        },
        tournaments: {
            title: 'Mga Torneo',
            text: 'Sumali sa mga torneong Swiss o elimination, live man o correspondence, at sa mga paulit-ulit na serye para makalaban ang parehong mga manlalaro bawat linggo.',
            imageAlt: 'Mga resulta ng isang torneo ng Hex',
            linkLabel: 'Tingnan ang mga torneo',
            highlights: ['Swiss, round-robin, at elimination', 'Mga paulit-ulit na serye ng torneo'],
        },
        ladder: {
            title: 'Hari ng Burol',
            text: 'Hamunin ang mga manlalarong mas mataas ang ranggo sa iyo, manalo, at agawin ang puwesto nila. Umakyat sa tuktok at ipagtanggol ang iyong puwesto.',
            imageAlt: 'Ranggo ng Hari ng Burol',
            linkLabel: 'Akyatin ang burol',
            highlights: ['Mga burol para sa live at correspondence', 'Kasaysayan ng bawat paghahari'],
        },
        puzzles: {
            title: 'Mga Puzzle',
            text: 'Sanayin ang iyong taktika gamit ang mga puzzle na gawa ng komunidad, mula baguhan hanggang eksperto, na nakapangkat sa mga koleksyon.',
            imageAlt: 'Isang puzzle ng Hex',
            linkLabel: 'Lutasin ang mga puzzle',
            highlights: ['Lahat ay puwedeng gumawa at lumutas ng puzzle', 'Kumpletong editor na sumusuri sa mga pagkakamali ng puzzle mo'],
        },
        bots: {
            title: 'Makipaglaro sa AI',
            text: 'Magsanay laban sa mga bot na may iba\'t ibang lakas, mula baguhan hanggang napakalakas, kahit offline.',
            imageAlt: 'Isang laro laban sa AI ng Hex',
            linkLabel: 'Makipaglaro sa AI',
            highlights: ['Iba\'t ibang antas ng lakas', 'Puwedeng laruin kahit offline'],
        },
        tutorial: {
            title: 'Interactive na tutorial',
            text: 'Dalawa lang ang patakaran ng Hex. Matutunan ang mga ito sa loob ng ilang minuto gamit ang interactive na tutorial, at tuklasin ang mga batayang estratehiya.',
            imageAlt: 'Interactive na tutorial ng Hex',
            linkLabel: 'Simulan ang tutorial',
            highlights: ['Ang mga patakaran sa ilang minuto', 'Mga batayang estratehiya'],
        },
    },

    footer: {
        cta: 'Handa ka na bang pagdugtungin ang iyong mga gilid?',
        free: 'Libre, open source, at walang ads ang PlayHex.',
    },
} satisfies LandingContent;
