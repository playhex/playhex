import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Graj w Hex online za darmo',
    metaDescription: 'Graj za darmo w grę planszową Hex online przeciwko graczom z całego świata lub przeciwko sztucznej inteligencji. Partie na żywo i korespondencyjne, turnieje, zadania i analiza partii przez AI.',

    nav: {
        play: 'Graj',
        tournaments: 'Turnieje',
        ladder: 'Król wzgórza',
        puzzles: 'Zadania',
        tutorial: 'Nauka',
        language: 'Język',
    },

    hero: {
        title: 'Graj w Hex online',
        subtitle: 'Graj za darmo w grę planszową Hex przeciwko graczom z całego świata lub przeciwko sztucznej inteligencji.',
        tagline: 'Łatwy do nauczenia, trudny do opanowania.',
        cta: 'Zagraj teraz',
        ctaSecondary: 'Poznaj zasady',
    },

    features: {
        live: {
            title: 'Partie w czasie rzeczywistym',
            text: 'Graj blitza albo nie spiesz się dzięki konfigurowalnemu tempu gry. Przedruchy pozwalają odpowiadać natychmiast, a podczas partii możesz rozmawiać z przeciwnikiem na czacie.',
            imageAlt: 'Partia Hex w czasie rzeczywistym na PlayHex',
            linkLabel: 'Znajdź przeciwnika',
            highlights: ['Przedruchy do natychmiastowej odpowiedzi', 'Wszystkie rozmiary planszy, do 19×19 i więcej'],
        },
        correspondence: {
            title: 'Partie korespondencyjne',
            text: 'Graj we własnym tempie, jeden ruch dziennie lub więcej. Ruchy warunkowe pozwalają zagrać drabinki i wymuszone sekwencje z wyprzedzeniem, bez czekania na przeciwnika.',
            imageAlt: 'Drzewo ruchów warunkowych w partii korespondencyjnej',
            linkLabel: 'Graj korespondencyjnie',
            highlights: ['Ruchy warunkowe', 'Powiadomienia, gdy jest Twój ruch'],
        },
        ai_analysis: {
            title: 'Analiza partii przez AI',
            text: 'Po partii sztuczna inteligencja analizuje każdy ruch: zobacz najlepsze ruchy, swoje błędy i kto wygrywał w każdym momencie partii.',
            imageAlt: 'Wykres szans na wygraną w partii przeanalizowanej przez AI',
            linkLabel: 'Zagraj partię',
            highlights: ['Znajdź swoje błędy i ruch, który by Cię uratował', 'Wykres szans na wygraną'],
        },
        ranked: {
            title: 'Partie rankingowe',
            text: 'Zdobądź ranking, graj z przeciwnikami na swoim poziomie i śledź swoje postępy na wykresie rankingu.',
            imageAlt: 'Wykres historii rankingu gracza',
            linkLabel: 'Zagraj partię rankingową',
            highlights: ['Rankingowe na żywo i korespondencyjnie', 'Statystyki z każdym przeciwnikiem'],
        },
        devices: {
            title: 'Telefon i komputer',
            text: 'PlayHex działa w przeglądarce na telefonie, tablecie i komputerze. Nic nie trzeba instalować, a twoje partie są synchronizowane między urządzeniami.',
            imageAlt: 'Partia Hex na telefonie',
            linkLabel: 'Graj w przeglądarce',
            highlights: ['Można zainstalować jako aplikację', 'Partie synchronizowane między urządzeniami'],
        },
        tournaments: {
            title: 'Turnieje',
            text: 'Dołącz do turniejów systemem szwajcarskim lub pucharowym, na żywo lub korespondencyjnie, oraz do cyklicznych serii, by co tydzień spotykać tych samych graczy.',
            imageAlt: 'Wyniki turnieju Hex',
            linkLabel: 'Zobacz turnieje',
            highlights: ['System szwajcarski, kołowy i pucharowy', 'Cykliczne serie turniejów'],
        },
        ladder: {
            title: 'Król wzgórza',
            text: 'Wyzywaj graczy sklasyfikowanych wyżej, wygrywaj i zajmuj ich miejsce. Wespnij się na szczyt i obroń swoją pozycję.',
            imageAlt: 'Ranking Króla wzgórza',
            linkLabel: 'Wespnij się na wzgórze',
            highlights: ['Na żywo i korespondencyjnie', 'Historia każdego panowania'],
        },
        puzzles: {
            title: 'Zadania',
            text: 'Ćwicz taktykę na zadaniach tworzonych przez społeczność, od początkujących po eksperckie, pogrupowanych w kolekcje.',
            imageAlt: 'Zadanie w Hex',
            linkLabel: 'Rozwiązuj zadania',
            highlights: ['Każdy może tworzyć i rozwiązywać zadania', 'Pełny edytor, który sprawdza zadanie pod kątem błędów'],
        },
        bots: {
            title: 'Graj przeciwko AI',
            text: 'Trenuj z botami o różnym poziomie siły, od początkującego po bardzo silnego, nawet offline.',
            imageAlt: 'Partia przeciwko AI w Hex',
            linkLabel: 'Graj przeciwko AI',
            highlights: ['Kilka poziomów siły', 'Działa nawet offline'],
        },
        tutorial: {
            title: 'Interaktywny samouczek',
            text: 'Hex ma tylko dwie zasady. Poznaj je w kilka minut dzięki interaktywnemu samouczkowi, a potem odkryj podstawowe strategie.',
            imageAlt: 'Interaktywny samouczek Hex',
            linkLabel: 'Rozpocznij samouczek',
            highlights: ['Zasady w kilka minut', 'Podstawowe strategie'],
        },
    },

    footer: {
        cta: 'Gotowy, by połączyć swoje brzegi?',
        free: 'PlayHex jest darmowy, open source i bez reklam.',
    },
} satisfies LandingContent;
