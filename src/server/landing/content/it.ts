import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Gioca a Hex online gratis',
    metaDescription: 'Gioca gratis al gioco da tavolo Hex online contro giocatori di tutto il mondo o contro un\'IA. Partite dal vivo e per corrispondenza, tornei, puzzle, analisi delle partite con IA.',

    nav: {
        play: 'Gioca',
        tournaments: 'Tornei',
        ladder: 'Re della collina',
        puzzles: 'Puzzle',
        tutorial: 'Impara',
        language: 'Lingua',
    },

    hero: {
        title: 'Gioca a Hex online',
        subtitle: 'Gioca gratis al gioco da tavolo Hex contro giocatori di tutto il mondo, o contro un\'IA.',
        tagline: 'Facile da imparare, difficile da padroneggiare.',
        cta: 'Gioca ora',
        ctaSecondary: 'Impara le regole',
    },

    features: {
        live: {
            title: 'Partite in tempo reale',
            text: 'Gioca a blitz o prenditi il tuo tempo con cadenze personalizzabili. Le pre-mosse ti permettono di rispondere all\'istante, e puoi chattare con l\'avversario durante la partita.',
            imageAlt: 'Una partita di Hex in tempo reale su PlayHex',
            linkLabel: 'Trova un avversario',
            highlights: ['Pre-mosse per rispondere all\'istante', 'Tutte le dimensioni di tavoliere, fino a 19×19 e oltre'],
        },
        correspondence: {
            title: 'Partite per corrispondenza',
            text: 'Gioca al tuo ritmo, una mossa al giorno o più. Le mosse condizionali ti permettono di giocare in anticipo scale e sequenze forzate, senza aspettare l\'avversario.',
            imageAlt: 'Albero di mosse condizionali in una partita per corrispondenza',
            linkLabel: 'Gioca per corrispondenza',
            highlights: ['Mosse condizionali', 'Notifiche quando tocca a te'],
        },
        ai_analysis: {
            title: 'Analisi delle partite con IA',
            text: 'Dopo la partita, un\'IA analizza ogni mossa: scopri le mosse migliori, i tuoi errori e chi stava vincendo in ogni momento della partita.',
            imageAlt: 'Grafico delle probabilità di vittoria di una partita analizzata dall\'IA',
            linkLabel: 'Gioca una partita',
            highlights: ['Individua i tuoi errori e la mossa che ti avrebbe salvato', 'Grafico delle probabilità di vittoria'],
        },
        ranked: {
            title: 'Partite classificate',
            text: 'Ottieni un punteggio, affronta avversari del tuo livello e segui i tuoi progressi nel tempo sul tuo grafico del punteggio.',
            imageAlt: 'Grafico dello storico del punteggio di un giocatore',
            linkLabel: 'Gioca una partita classificata',
            highlights: ['Classificate sia dal vivo sia per corrispondenza', 'Statistiche contro ogni avversario'],
        },
        devices: {
            title: 'Mobile e computer',
            text: 'PlayHex funziona nel tuo browser, su telefono, tablet e computer. Niente da installare, e le tue partite sono sincronizzate tra i tuoi dispositivi.',
            imageAlt: 'Una partita di Hex su un telefono',
            linkLabel: 'Gioca dal browser',
            highlights: ['Installabile come un\'app', 'Partite sincronizzate tra dispositivi'],
        },
        tournaments: {
            title: 'Tornei',
            text: 'Partecipa a tornei a sistema svizzero o a eliminazione, dal vivo o per corrispondenza, e a serie ricorrenti per ritrovare gli stessi giocatori ogni settimana.',
            imageAlt: 'Risultati di un torneo di Hex',
            linkLabel: 'Vedi i tornei',
            highlights: ['Svizzero, girone all\'italiana ed eliminazione', 'Serie di tornei ricorrenti'],
        },
        ladder: {
            title: 'Re della collina',
            text: 'Sfida i giocatori classificati sopra di te, vinci e prendi il loro posto. Sali fino in cima e difendi la tua posizione.',
            imageAlt: 'Classifica del Re della collina',
            linkLabel: 'Scala la collina',
            highlights: ['Colline dal vivo e per corrispondenza', 'Storico di ogni regno'],
        },
        puzzles: {
            title: 'Puzzle',
            text: 'Allena la tua tattica con puzzle creati dalla comunità, dal principiante all\'esperto, raggruppati in raccolte.',
            imageAlt: 'Un puzzle di Hex',
            linkLabel: 'Risolvi puzzle',
            highlights: ['Tutti possono creare e risolvere puzzle', 'Editor completo che verifica che il tuo puzzle non abbia errori'],
        },
        bots: {
            title: 'Gioca contro l\'IA',
            text: 'Allenati contro bot di diversi livelli, dal principiante al fortissimo, anche offline.',
            imageAlt: 'Una partita contro un\'IA di Hex',
            linkLabel: 'Gioca contro l\'IA',
            highlights: ['Diversi livelli di forza', 'Giocabile anche offline'],
        },
        tutorial: {
            title: 'Tutorial interattivo',
            text: 'Hex ha solo due regole. Imparale in pochi minuti con un tutorial interattivo, poi scopri le strategie di base.',
            imageAlt: 'Tutorial interattivo di Hex',
            linkLabel: 'Inizia il tutorial',
            highlights: ['Le regole in pochi minuti', 'Le strategie di base'],
        },
    },

    footer: {
        cta: 'Pronto a collegare i tuoi lati?',
        free: 'PlayHex è gratuito, open source e senza pubblicità.',
    },
} satisfies LandingContent;
