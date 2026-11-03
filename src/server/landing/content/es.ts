import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Jugar a Hex online gratis',
    metaDescription: 'Juega gratis al juego de mesa Hex online contra jugadores de todo el mundo o contra una IA. Partidas en vivo y por correspondencia, torneos, puzles, análisis de partidas con IA.',

    nav: {
        play: 'Jugar',
        tournaments: 'Torneos',
        ladder: 'Rey de la colina',
        puzzles: 'Puzles',
        tutorial: 'Aprender',
        language: 'Idioma',
    },

    hero: {
        title: 'Juega a Hex online',
        subtitle: 'Juega gratis al juego de mesa Hex contra jugadores de todo el mundo, o contra una IA.',
        tagline: 'Fácil de aprender, difícil de dominar.',
        cta: 'Jugar ahora',
        ctaSecondary: 'Aprender las reglas',
    },

    features: {
        live: {
            title: 'Partidas en tiempo real',
            text: 'Juega blitz o tómate tu tiempo con controles de tiempo personalizables. Los premovimientos te permiten responder al instante, y puedes chatear con tu rival durante la partida.',
            imageAlt: 'Una partida de Hex en tiempo real en PlayHex',
            linkLabel: 'Buscar un rival',
            highlights: ['Premovimientos para responder al instante', 'Todos los tamaños de tablero, hasta 19×19 y más'],
        },
        correspondence: {
            title: 'Partidas por correspondencia',
            text: 'Juega a tu ritmo, una jugada al día o más. Los movimientos condicionales te permiten jugar por adelantado escaleras y secuencias forzadas, sin esperar a tu rival.',
            imageAlt: 'Árbol de movimientos condicionales en una partida por correspondencia',
            linkLabel: 'Jugar por correspondencia',
            highlights: ['Movimientos condicionales', 'Notificaciones cuando es tu turno'],
        },
        ai_analysis: {
            title: 'Análisis de partidas con IA',
            text: 'Después de la partida, una IA analiza cada jugada: descubre las mejores jugadas, tus errores y quién iba ganando en cada momento de la partida.',
            imageAlt: 'Gráfico de probabilidad de victoria de una partida analizada por IA',
            linkLabel: 'Jugar una partida',
            highlights: ['Detecta tus errores y la jugada que te habría salvado', 'Gráfico de probabilidad de victoria de la partida'],
        },
        ranked: {
            title: 'Partidas clasificatorias',
            text: 'Obtén una puntuación, enfréntate a rivales de tu nivel y sigue tu progreso en tu gráfico de puntuación.',
            imageAlt: 'Gráfico del historial de puntuación de un jugador',
            linkLabel: 'Jugar una partida clasificatoria',
            highlights: ['Clasificatorias tanto en vivo como por correspondencia', 'Estadísticas contra cada rival'],
        },
        devices: {
            title: 'Móvil y ordenador',
            text: 'PlayHex funciona en tu navegador, en móvil, tableta y ordenador. No hay nada que instalar, y tus partidas se sincronizan entre tus dispositivos.',
            imageAlt: 'Una partida de Hex en un móvil',
            linkLabel: 'Jugar desde el navegador',
            highlights: ['Instalable como una aplicación', 'Partidas sincronizadas entre dispositivos'],
        },
        tournaments: {
            title: 'Torneos',
            text: 'Participa en torneos suizos o de eliminación, en vivo o por correspondencia, y en series recurrentes para reencontrarte con los mismos jugadores cada semana.',
            imageAlt: 'Resultados de un torneo de Hex',
            linkLabel: 'Ver los torneos',
            highlights: ['Suizo, todos contra todos y eliminación', 'Series de torneos recurrentes'],
        },
        ladder: {
            title: 'Rey de la colina',
            text: 'Desafía a los jugadores clasificados por encima de ti, gana y ocupa su lugar. Sube hasta la cima y defiende tu puesto.',
            imageAlt: 'Clasificación del Rey de la colina',
            linkLabel: 'Subir la colina',
            highlights: ['Colinas en vivo y por correspondencia', 'Historial de cada reinado'],
        },
        puzzles: {
            title: 'Puzles',
            text: 'Entrena tu táctica con puzles creados por la comunidad, de principiante a experto, agrupados en colecciones.',
            imageAlt: 'Un puzle de Hex',
            linkLabel: 'Resolver puzles',
            highlights: ['Todos pueden crear y resolver puzles', 'Editor completo que comprueba que tu puzle no tenga errores'],
        },
        bots: {
            title: 'Jugar contra la IA',
            text: 'Practica contra bots de varios niveles, de principiante a muy fuerte, incluso sin conexión.',
            imageAlt: 'Una partida contra una IA de Hex',
            linkLabel: 'Jugar contra la IA',
            highlights: ['Varios niveles de fuerza', 'Se puede jugar incluso sin conexión'],
        },
        tutorial: {
            title: 'Tutorial interactivo',
            text: 'Hex solo tiene dos reglas. Apréndelas en unos minutos con un tutorial interactivo y luego descubre las estrategias básicas.',
            imageAlt: 'Tutorial interactivo de Hex',
            linkLabel: 'Empezar el tutorial',
            highlights: ['Las reglas en unos minutos', 'Las estrategias básicas'],
        },
    },

    footer: {
        cta: '¿Listo para conectar tus lados?',
        free: 'PlayHex es gratuito, de código abierto y sin anuncios.',
    },
} satisfies LandingContent;
