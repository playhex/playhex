import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: '무료로 온라인 헥스 게임하기',
    metaDescription: '보드게임 헥스(Hex)를 전 세계 플레이어나 AI를 상대로 무료로 온라인에서 즐기세요. 실시간 대국과 통신 대국, 토너먼트, 퍼즐, AI 대국 분석을 제공합니다.',

    nav: {
        play: '플레이',
        tournaments: '토너먼트',
        ladder: '킹 오브 더 힐',
        puzzles: '퍼즐',
        tutorial: '배우기',
        language: '언어',
    },

    hero: {
        title: '온라인으로 헥스 플레이',
        subtitle: '보드게임 헥스(Hex)를 전 세계 플레이어나 AI를 상대로 무료로 즐기세요.',
        tagline: '배우기는 쉽고, 마스터하기는 어렵습니다.',
        cta: '지금 플레이',
        ctaSecondary: '규칙 배우기',
    },

    features: {
        live: {
            title: '실시간 대국',
            text: '블리츠로 빠르게 두거나, 원하는 시간 설정으로 여유 있게 두세요. 프리무브로 즉시 응수할 수 있고, 대국 중 상대와 채팅도 할 수 있습니다.',
            imageAlt: 'PlayHex의 실시간 헥스 대국',
            linkLabel: '상대 찾기',
            highlights: ['즉시 응수하는 프리무브', '19×19 이상까지 모든 판 크기'],
        },
        correspondence: {
            title: '통신 대국',
            text: '하루에 한 수 이상, 자신의 속도에 맞춰 두세요. 조건부 수를 사용하면 상대를 기다리지 않고 사다리와 강제 수순을 미리 둘 수 있습니다.',
            imageAlt: '통신 대국의 조건부 수 트리',
            linkLabel: '통신 대국 두기',
            highlights: ['조건부 수', '내 차례가 되면 알림'],
        },
        ai_analysis: {
            title: 'AI 대국 분석',
            text: '대국이 끝나면 AI가 모든 수를 분석합니다. 최선의 수, 자신의 실수, 그리고 대국의 매 순간 누가 이기고 있었는지 확인하세요.',
            imageAlt: 'AI가 분석한 대국의 승률 그래프',
            linkLabel: '대국하기',
            highlights: ['실수와 나를 구했을 한 수를 찾아보세요', '승률 그래프'],
        },
        ranked: {
            title: '랭크 대국',
            text: '레이팅을 얻고, 비슷한 실력의 상대와 대국하며, 레이팅 그래프로 실력 향상을 확인하세요.',
            imageAlt: '플레이어의 레이팅 기록 그래프',
            linkLabel: '랭크 대국 하기',
            highlights: ['실시간과 통신 대국 모두 레이팅 반영', '상대별 전적 통계'],
        },
        devices: {
            title: '모바일과 컴퓨터',
            text: 'PlayHex는 휴대폰, 태블릿, 컴퓨터의 브라우저에서 작동합니다. 설치할 필요가 없고, 대국은 기기 간에 동기화됩니다.',
            imageAlt: '휴대폰에서의 헥스 대국',
            linkLabel: '브라우저에서 플레이',
            highlights: ['앱으로 설치 가능', '기기 간 대국 동기화'],
        },
        tournaments: {
            title: '토너먼트',
            text: '스위스 방식이나 녹아웃 방식의 토너먼트에 실시간 또는 통신 대국으로 참가하고, 정기 시리즈에서 매주 같은 플레이어들과 만나세요.',
            imageAlt: '헥스 토너먼트 결과',
            linkLabel: '토너먼트 보기',
            highlights: ['스위스, 리그전, 녹아웃', '정기 토너먼트 시리즈'],
        },
        ladder: {
            title: '킹 오브 더 힐',
            text: '자신보다 순위가 높은 플레이어에게 도전하고, 이겨서 그 자리를 차지하세요. 정상에 올라 자리를 지켜내세요.',
            imageAlt: '킹 오브 더 힐 순위표',
            linkLabel: '언덕 오르기',
            highlights: ['실시간 및 통신 대국', '역대 왕의 기록'],
        },
        puzzles: {
            title: '퍼즐',
            text: '커뮤니티가 만든 초급부터 고급까지의 퍼즐로 전술을 훈련하세요. 퍼즐은 컬렉션으로 정리되어 있습니다.',
            imageAlt: '헥스 퍼즐',
            linkLabel: '퍼즐 풀기',
            highlights: ['누구나 퍼즐을 만들고 풀 수 있음', '실수가 없는지 검증해 주는 완전한 퍼즐 편집기'],
        },
        bots: {
            title: 'AI와 대국',
            text: '초급부터 매우 강한 수준까지 여러 단계의 봇과 연습하세요. 오프라인에서도 가능합니다.',
            imageAlt: '헥스 AI와의 대국',
            linkLabel: 'AI와 대국하기',
            highlights: ['여러 강도 단계', '오프라인에서도 플레이 가능'],
        },
        tutorial: {
            title: '인터랙티브 튜토리얼',
            text: '헥스의 규칙은 단 두 가지입니다. 인터랙티브 튜토리얼로 몇 분 만에 배우고, 기본 전략을 알아보세요.',
            imageAlt: '헥스 인터랙티브 튜토리얼',
            linkLabel: '튜토리얼 시작하기',
            highlights: ['몇 분 만에 배우는 규칙', '기본 전략'],
        },
    },

    footer: {
        cta: '양쪽 변을 연결할 준비가 되셨나요?',
        free: 'PlayHex는 무료이며, 오픈 소스이고, 광고가 없습니다.',
    },
} satisfies LandingContent;
