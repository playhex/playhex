import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: '免费在线玩六贯棋 Hex',
    metaDescription: '免费在线玩棋盘游戏六贯棋（Hex），与世界各地的玩家或 AI 对弈。实时对局、通信对局、锦标赛、谜题和 AI 对局分析。',

    nav: {
        play: '对弈',
        tournaments: '锦标赛',
        ladder: '山丘之王',
        puzzles: '谜题',
        tutorial: '学习',
        language: '语言',
    },

    hero: {
        title: '在线玩六贯棋 Hex',
        subtitle: '免费与世界各地的玩家或 AI 下棋盘游戏六贯棋（Hex）。',
        tagline: '易学难精。',
        cta: '立即开始',
        ctaSecondary: '学习规则',
    },

    features: {
        live: {
            title: '实时对局',
            text: '下快棋，或使用可自定义的用时慢慢思考。预走让你能立即应对，对局中还可以与对手聊天。',
            imageAlt: 'PlayHex 上的一盘实时六贯棋对局',
            linkLabel: '寻找对手',
            highlights: ['预走，即时应对', '各种棋盘尺寸，最大可超过19×19'],
        },
        correspondence: {
            title: '通信对局',
            text: '按自己的节奏下棋，每天一步或更多。条件着法让你无需等待对手，就能提前走完梯子和强制变化。',
            imageAlt: '通信对局中的条件着法树',
            linkLabel: '下通信对局',
            highlights: ['条件着法', '轮到你时发送通知'],
        },
        ai_analysis: {
            title: 'AI 对局分析',
            text: '对局结束后，AI 会分析每一步棋：查看最佳着法、你的失误，以及对局每个时刻谁占优势。',
            imageAlt: 'AI 分析对局的胜率图',
            linkLabel: '下一局',
            highlights: ['找出你的失误，以及本可挽救局面的一步', '胜率曲线'],
        },
        ranked: {
            title: '排名赛',
            text: '获得等级分，与水平相近的对手对弈，并通过等级分曲线跟踪自己的进步。',
            imageAlt: '玩家等级分历史曲线',
            linkLabel: '下一盘排名赛',
            highlights: ['实时和通信对局均计等级分', '与每位对手的对战统计'],
        },
        devices: {
            title: '手机和电脑',
            text: 'PlayHex 可在手机、平板和电脑的浏览器中运行。无需安装，对局在各设备间同步。',
            imageAlt: '手机上的六贯棋对局',
            linkLabel: '在浏览器中对弈',
            highlights: ['可安装为应用', '对局在设备间同步'],
        },
        tournaments: {
            title: '锦标赛',
            text: '参加瑞士制或淘汰制锦标赛，实时或通信形式均可，还有定期举行的系列赛，每周与同一批玩家交手。',
            imageAlt: '六贯棋锦标赛结果',
            linkLabel: '查看锦标赛',
            highlights: ['瑞士制、循环赛和淘汰赛', '定期举办的系列赛'],
        },
        ladder: {
            title: '山丘之王',
            text: '挑战排名在你之上的玩家，赢下对局并取代他们的位置。登上顶峰，守住你的排名。',
            imageAlt: '山丘之王排名',
            linkLabel: '登上山丘',
            highlights: ['实时和通信对局', '历任王者的记录'],
        },
        puzzles: {
            title: '谜题',
            text: '用社区创作的谜题训练战术，从入门到专家级别，按合集分类。',
            imageAlt: '一道六贯棋谜题',
            linkLabel: '解谜题',
            highlights: ['人人都能创建和解答谜题', '完整的谜题编辑器，可检查谜题是否有错误'],
        },
        bots: {
            title: '与 AI 对弈',
            text: '与多个强度等级的机器人练习，从入门到非常强，离线也可以。',
            imageAlt: '与六贯棋 AI 的对局',
            linkLabel: '与 AI 对弈',
            highlights: ['多个强度等级', '离线也能玩'],
        },
        tutorial: {
            title: '互动教程',
            text: '六贯棋只有两条规则。通过互动教程几分钟就能学会，然后了解基本策略。',
            imageAlt: '六贯棋互动教程',
            linkLabel: '开始教程',
            highlights: ['几分钟学会规则', '基本策略'],
        },
    },

    footer: {
        cta: '准备好连接你的两边了吗？',
        free: 'PlayHex 免费、开源、无广告。',
    },
} satisfies LandingContent;
