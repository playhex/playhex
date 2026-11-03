import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Jogue Hex online de graça',
    metaDescription: 'Jogue de graça o jogo de tabuleiro Hex online contra jogadores do mundo todo ou contra uma IA. Partidas ao vivo e por correspondência, torneios, puzzles, análise de partidas por IA.',

    nav: {
        play: 'Jogar',
        tournaments: 'Torneios',
        ladder: 'Rei da colina',
        puzzles: 'Puzzles',
        tutorial: 'Aprender',
        language: 'Idioma',
    },

    hero: {
        title: 'Jogue Hex online',
        subtitle: 'Jogue de graça o jogo de tabuleiro Hex contra jogadores do mundo todo, ou contra uma IA.',
        tagline: 'Fácil de aprender, difícil de dominar.',
        cta: 'Jogar agora',
        ctaSecondary: 'Aprender as regras',
    },

    features: {
        live: {
            title: 'Partidas em tempo real',
            text: 'Jogue blitz ou com calma, com controles de tempo personalizáveis. As pré-jogadas permitem responder instantaneamente, e você pode conversar com o adversário durante a partida.',
            imageAlt: 'Uma partida de Hex em tempo real no PlayHex',
            linkLabel: 'Encontrar um adversário',
            highlights: ['Pré-jogadas para responder instantaneamente', 'Todos os tamanhos de tabuleiro, até 19×19 e além'],
        },
        correspondence: {
            title: 'Partidas por correspondência',
            text: 'Jogue no seu ritmo, uma jogada por dia ou mais. As jogadas condicionais permitem jogar escadas e sequências forçadas com antecedência, sem esperar pelo adversário.',
            imageAlt: 'Árvore de jogadas condicionais em uma partida por correspondência',
            linkLabel: 'Jogar por correspondência',
            highlights: ['Jogadas condicionais', 'Notificações quando é a sua vez'],
        },
        ai_analysis: {
            title: 'Análise de partidas por IA',
            text: 'Depois da partida, uma IA analisa cada jogada: veja as melhores jogadas, seus erros e quem estava ganhando em cada momento da partida.',
            imageAlt: 'Gráfico de chances de vitória de uma partida analisada por IA',
            linkLabel: 'Jogar uma partida',
            highlights: ['Encontre seus erros e a jogada que teria te salvado', 'Gráfico de chances de vitória da partida'],
        },
        ranked: {
            title: 'Partidas ranqueadas',
            text: 'Ganhe uma pontuação, enfrente adversários do seu nível e acompanhe sua evolução no seu gráfico de pontuação.',
            imageAlt: 'Gráfico do histórico de pontuação de um jogador',
            linkLabel: 'Jogar uma partida ranqueada',
            highlights: ['Ranqueadas tanto ao vivo quanto por correspondência', 'Estatísticas contra cada adversário'],
        },
        devices: {
            title: 'Celular e computador',
            text: 'O PlayHex funciona no seu navegador, no celular, tablet e computador. Nada para instalar, e suas partidas ficam sincronizadas entre seus dispositivos.',
            imageAlt: 'Uma partida de Hex em um celular',
            linkLabel: 'Jogar pelo navegador',
            highlights: ['Instalável como um aplicativo', 'Partidas sincronizadas entre dispositivos'],
        },
        tournaments: {
            title: 'Torneios',
            text: 'Participe de torneios suíços ou eliminatórios, ao vivo ou por correspondência, e de séries recorrentes para reencontrar os mesmos jogadores toda semana.',
            imageAlt: 'Resultados de um torneio de Hex',
            linkLabel: 'Ver os torneios',
            highlights: ['Suíço, todos contra todos e eliminatório', 'Séries de torneios recorrentes'],
        },
        ladder: {
            title: 'Rei da colina',
            text: 'Desafie os jogadores classificados acima de você, vença e tome o lugar deles. Suba até o topo e defenda sua posição.',
            imageAlt: 'Classificação do Rei da colina',
            linkLabel: 'Subir a colina',
            highlights: ['Colinas ao vivo e por correspondência', 'Histórico de cada reinado'],
        },
        puzzles: {
            title: 'Puzzles',
            text: 'Treine sua tática com puzzles criados pela comunidade, do iniciante ao especialista, agrupados em coleções.',
            imageAlt: 'Um puzzle de Hex',
            linkLabel: 'Resolver puzzles',
            highlights: ['Todos podem criar e resolver puzzles', 'Editor completo que verifica se o seu puzzle não tem erros'],
        },
        bots: {
            title: 'Jogar contra a IA',
            text: 'Treine contra bots de vários níveis, do iniciante ao muito forte, até mesmo offline.',
            imageAlt: 'Uma partida contra uma IA de Hex',
            linkLabel: 'Jogar contra a IA',
            highlights: ['Vários níveis de força', 'Jogável até mesmo offline'],
        },
        tutorial: {
            title: 'Tutorial interativo',
            text: 'O Hex tem apenas duas regras. Aprenda-as em poucos minutos com um tutorial interativo e depois descubra as estratégias básicas.',
            imageAlt: 'Tutorial interativo de Hex',
            linkLabel: 'Começar o tutorial',
            highlights: ['As regras em poucos minutos', 'As estratégias básicas'],
        },
    },

    footer: {
        cta: 'Pronto para conectar seus lados?',
        free: 'O PlayHex é gratuito, de código aberto e sem anúncios.',
    },
} satisfies LandingContent;
