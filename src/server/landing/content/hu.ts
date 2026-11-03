import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Játssz Hexet online ingyen',
    metaDescription: 'Játssz ingyen a Hex táblajátékkal online a világ minden tájáról érkező játékosok vagy egy MI ellen. Élő és levelezős játszmák, versenyek, feladványok, játszmaelemzés MI-vel.',

    nav: {
        play: 'Játék',
        tournaments: 'Versenyek',
        ladder: 'A domb királya',
        puzzles: 'Feladványok',
        tutorial: 'Tanulás',
        language: 'Nyelv',
    },

    hero: {
        title: 'Játssz Hexet online',
        subtitle: 'Játssz ingyen a Hex táblajátékkal a világ minden tájáról érkező játékosok, vagy egy MI ellen.',
        tagline: 'Könnyű megtanulni, nehéz mesterien játszani.',
        cta: 'Játék most',
        ctaSecondary: 'Szabályok megismerése',
    },

    features: {
        live: {
            title: 'Valós idejű játszmák',
            text: 'Játssz villámpartit, vagy szánj rá időt testreszabható időbeosztással. Az előre lépéssel azonnal válaszolhatsz, és játék közben cseveghetsz az ellenfeleddel.',
            imageAlt: 'Valós idejű Hex-játszma a PlayHexen',
            linkLabel: 'Ellenfél keresése',
            highlights: ['Előre lépés az azonnali válaszhoz', 'Minden táblaméret, 19×19-ig és azon túl'],
        },
        correspondence: {
            title: 'Levelezős játszmák',
            text: 'Játssz a saját tempódban, napi egy lépéssel vagy többel. A feltételes lépésekkel előre lejátszhatod a létrákat és a kényszerített sorozatokat, anélkül, hogy az ellenfeledre várnál.',
            imageAlt: 'Feltételes lépések fája egy levelezős játszmában',
            linkLabel: 'Levelezős játék',
            highlights: ['Feltételes lépések', 'Értesítés, amikor te következel'],
        },
        ai_analysis: {
            title: 'Játszmaelemzés MI-vel',
            text: 'A játszma után egy MI minden lépést elemez: nézd meg a legjobb lépéseket, a hibáidat, és hogy ki állt nyerésre a játszma egyes pillanataiban.',
            imageAlt: 'Egy MI által elemzett játszma nyerési esélyeinek grafikonja',
            linkLabel: 'Játssz egy játszmát',
            highlights: ['Találd meg a hibáidat és a lépést, amely megmentett volna', 'A játszma nyerési esélyeinek grafikonja'],
        },
        ranked: {
            title: 'Rangsorolt játszmák',
            text: 'Szerezz értékszámot, játssz a szintednek megfelelő ellenfelekkel, és kövesd a fejlődésedet az értékszám-grafikonodon.',
            imageAlt: 'Egy játékos értékszám-történetének grafikonja',
            linkLabel: 'Rangsorolt játszma',
            highlights: ['Rangsorolt élőben és levelezősen is', 'Egymás elleni statisztikák minden ellenféllel'],
        },
        devices: {
            title: 'Mobil és számítógép',
            text: 'A PlayHex a böngésződben működik telefonon, táblagépen és számítógépen. Semmit sem kell telepíteni, és a játszmáid szinkronizálódnak az eszközeid között.',
            imageAlt: 'Hex-játszma egy telefonon',
            linkLabel: 'Játék a böngészőben',
            highlights: ['Alkalmazásként telepíthető', 'Az eszközök között szinkronizált játszmák'],
        },
        tournaments: {
            title: 'Versenyek',
            text: 'Vegyél részt svájci vagy kieséses versenyeken, élőben vagy levelezősen, és ismétlődő sorozatokban, hogy minden héten ugyanazokkal a játékosokkal találkozz.',
            imageAlt: 'Egy Hex-verseny eredményei',
            linkLabel: 'Versenyek megtekintése',
            highlights: ['Svájci, körmérkőzéses és kieséses', 'Ismétlődő versenysorozatok'],
        },
        ladder: {
            title: 'A domb királya',
            text: 'Hívd ki a feletted álló játékosokat, győzz, és vedd át a helyüket. Juss fel a csúcsra, és védd meg a helyedet.',
            imageAlt: 'A domb királya rangsor',
            linkLabel: 'Mássz fel a dombra',
            highlights: ['Élő és levelezős dombok', 'Minden uralkodás története'],
        },
        puzzles: {
            title: 'Feladványok',
            text: 'Fejleszd a taktikádat a közösség által készített, kezdőtől a szakértőig terjedő, gyűjteményekbe rendezett feladványokkal.',
            imageAlt: 'Egy Hex-feladvány',
            linkLabel: 'Feladványok megoldása',
            highlights: ['Bárki készíthet és megoldhat feladványokat', 'Teljes szerkesztő, amely ellenőrzi a feladványod hibáit'],
        },
        bots: {
            title: 'Játék az MI ellen',
            text: 'Gyakorolj különböző erősségű botok ellen, a kezdőtől a nagyon erősig, akár offline is.',
            imageAlt: 'Játszma egy Hex MI ellen',
            linkLabel: 'Játék az MI ellen',
            highlights: ['Több erősségi szint', 'Offline is játszható'],
        },
        tutorial: {
            title: 'Interaktív bemutató',
            text: 'A Hexnek csak két szabálya van. Tanuld meg őket néhány perc alatt egy interaktív bemutatóval, majd ismerd meg az alapstratégiákat.',
            imageAlt: 'Interaktív Hex-bemutató',
            linkLabel: 'Bemutató indítása',
            highlights: ['A szabályok néhány perc alatt', 'Az alapstratégiák'],
        },
    },

    footer: {
        cta: 'Készen állsz összekötni az oldalaidat?',
        free: 'A PlayHex ingyenes, nyílt forráskódú és reklámmentes.',
    },
} satisfies LandingContent;
