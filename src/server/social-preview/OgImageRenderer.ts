import sharp from 'sharp';
import { boardSvgColors, renderBoardSvg, type BoardSvgStones } from '../../shared/app/boardSvg.js';
import type { Move } from '@playhex/move-notation';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './SocialMeta.js';

const W = OG_IMAGE_WIDTH;
const H = OG_IMAGE_HEIGHT;

/**
 * Fonts installed on server, with CJK and accents support for player pseudos.
 */
const FONT_FAMILY = `'Noto Sans', 'Noto Sans CJK JP', 'Noto Sans CJK SC', 'DejaVu Sans', sans-serif`;

export const greyText = '#adb5bd';

export type OgIcon = 'crown' | 'trophy' | 'hexagon' | 'person';

export type OgText = {
    text: string;
    color?: string;
    size?: number;
    bold?: boolean;

    /**
     * Displayed before text, only for left aligned texts.
     */
    icon?: OgIcon;
};

export type OgBoard = {
    boardsize: number;
    stones: BoardSvgStones;
    lastMove?: null | Move;
    highlighted?: Move[];
    disabledCells?: Move[];
    hiddenCells?: Move[];
};

export type OgBoardImage = OgBoard & {
    /**
     * Texts displayed in the empty corners around the diamond board.
     */
    corners: {
        topLeft?: OgText[];
        topRight?: OgText[];
        bottomLeft?: OgText[];
        bottomRight?: OgText[];
    };
};

export type OgCardImage = {
    title: string;
    lines: OgText[];

    /**
     * Jpeg or png image, displayed in a hexagon.
     * Null to display a person icon instead.
     * Undefined for no avatar at all.
     */
    avatar?: null | Buffer;

    /**
     * Avatar hexagon width.
     */
    avatarSize?: number;

    /**
     * Small boards displayed on the right, e.g first puzzles of a collection.
     */
    boards?: OgBoard[];

    /**
     * Small icon above title.
     */
    icon?: OgIcon;

    /**
     * Big translucent icon behind texts.
     */
    backgroundIcon?: OgIcon;

    /**
     * Image (data uri, white on transparent) with a label, displayed below lines,
     * e.g tournament format.
     */
    badge?: {
        image: string;
        text: string;
    };
};

export const escapeXml = (text: string): string => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
;

/**
 * Approximates how many characters fit in given width, from font size.
 */
const maxCharsIn = (maxWidth: number, fontSize: number): number => Math.max(4, Math.floor(maxWidth / (fontSize * 0.56)));

/**
 * Cuts text that would not fit.
 */
export const fitText = (text: string, maxWidth: number, fontSize: number): string => {
    const maxChars = maxCharsIn(maxWidth, fontSize);
    const chars = [...text];

    return chars.length > maxChars
        ? chars.slice(0, maxChars - 1).join('').trimEnd() + '…'
        : text
    ;
};

/**
 * Splits text in lines of given max width, at most maxLines.
 */
export const wrapText = (text: string, maxWidth: number, fontSize: number, maxLines: number): string[] => {
    const maxChars = maxCharsIn(maxWidth, fontSize);
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        if ([...current].length + [...word].length + 1 > maxChars && current !== '') {
            lines.push(current);
            current = word;
        } else {
            current = current ? `${current} ${word}` : word;
        }
    }

    if (current) {
        lines.push(current);
    }

    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);

        // Slightly bigger font size to keep room for the ellipsis
        kept[maxLines - 1] = fitText(lines.slice(maxLines - 1).join(' '), maxWidth, fontSize * 1.02);

        return kept;
    }

    return lines.map(line => fitText(line, maxWidth, fontSize));
};

const textElement = (x: number, y: number, ogText: OgText, anchor: 'start' | 'end', maxWidth: number): string => {
    const size = ogText.size ?? 32;

    if (ogText.icon && anchor === 'start') {
        const iconSize = size * 1.1;

        return icons[ogText.icon](x, y - size * 0.95, iconSize)
            + textElement(x + iconSize + size * 0.35, y, { ...ogText, icon: undefined }, anchor, maxWidth - iconSize - size * 0.35)
        ;
    }

    const text = fitText(ogText.text, maxWidth, size);

    return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="${ogText.bold ? 700 : 400}" fill="${ogText.color ?? boardSvgColors.text}" text-anchor="${anchor}">${escapeXml(text)}</text>`;
};

/**
 * Stacks texts from top (y = first baseline), or from bottom when growing upward.
 */
const textBlock = (texts: OgText[], x: number, y: number, anchor: 'start' | 'end', direction: 'down' | 'up', maxWidth: number): string => {
    const ordered = direction === 'down' ? texts : [...texts].reverse();
    let cursor = y;

    return ordered.map(ogText => {
        const size = ogText.size ?? 32;
        const element = textElement(x, cursor, ogText, anchor, maxWidth);

        cursor += (direction === 'down' ? 1 : -1) * size * 1.3;

        return element;
    }).join('');
};

const svgRoot = (content: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${boardSvgColors.background}"/>${content}</svg>`;

export const brandText = (): OgText => ({ text: 'PlayHex', size: 38, bold: true, color: '#ffffff' });

export const renderBoardImageSvg = (image: OgBoardImage): string => {
    const margin = 40;

    // Top corners have more room than bottom ones, above the diamond board
    const topCornerWidth = 470;
    const bottomCornerWidth = 420;

    return svgRoot([
        renderBoardSvg({
            boardsize: image.boardsize,
            stones: image.stones,
            lastMove: image.lastMove,
            highlighted: image.highlighted,
            disabledCells: image.disabledCells,
            hiddenCells: image.hiddenCells,
            x: 20,
            y: 20,
            width: W - 40,
            height: H - 40,
        }),
        textBlock(image.corners.topLeft ?? [], margin, margin + 30, 'start', 'down', topCornerWidth),
        textBlock(image.corners.topRight ?? [], W - margin, margin + 30, 'end', 'down', topCornerWidth),
        textBlock(image.corners.bottomLeft ?? [], margin, H - margin, 'start', 'up', bottomCornerWidth),
        textBlock(image.corners.bottomRight ?? [], W - margin, H - margin, 'end', 'up', bottomCornerWidth),
    ].join(''));
};

const hexagonPath = (cx: number, cy: number, radius: number, pointy = true): string => {
    const points: string[] = [];

    for (let i = 0; i < 6; ++i) {
        const angle = Math.PI / 3 * i + (pointy ? Math.PI / 6 : 0);
        points.push(`${Math.round(cx + radius * Math.cos(angle))},${Math.round(cy + radius * Math.sin(angle))}`);
    }

    return points.join(' ');
};

/**
 * Big red and blue hexagons outlines in background, to look like Hex.
 */
const decoration = (): string => [
    `<polygon points="${hexagonPath(1080, 90, 150)}" fill="none" stroke="${boardSvgColors.red}" stroke-opacity="0.25" stroke-width="18"/>`,
    `<polygon points="${hexagonPath(1150, 560, 200)}" fill="none" stroke="${boardSvgColors.blue}" stroke-opacity="0.25" stroke-width="18"/>`,
].join('');

/**
 * Icons drawn in a 100×100 box, at (x, y).
 * Trophy and person from Bootstrap Icons, drawn in a 16×16 box.
 */
const icons: { [icon in OgIcon]: (x: number, y: number, size: number, color?: string) => string } = {
    crown: (x, y, size, color = '#ffc107') => {
        const s = size / 100;

        return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}"><path d="M5 80 L15 25 L35 55 L50 10 L65 55 L85 25 L95 80 Z"/><rect x="5" y="85" width="90" height="12"/></g>`;
    },
    trophy: (x, y, size, color = '#ffc107') => {
        return `<path transform="translate(${x} ${y}) scale(${size / 16})" fill="${color}" d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935"/>`;
    },
    hexagon: (x, y, size, color = boardSvgColors.red) => {
        return `<polygon points="${hexagonPath(x + size / 2, y + size / 2, size / 2)}" fill="${color}"/>`;
    },
    person: (x, y, size, color = greyText) => {
        return `<path transform="translate(${x} ${y}) scale(${size / 16})" fill="${color}" d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>`;
    },
};

export const renderCardImageSvg = (card: OgCardImage): string => {
    const hasBoards = (card.boards?.length ?? 0) > 0;
    const parts: string[] = hasBoards ? [] : [decoration()];
    let textX = 80;

    if (card.avatar !== undefined) {
        const size = card.avatarSize ?? 300;
        const cx = 70 + size / 2;
        const cy = H / 2;
        const points = hexagonPath(cx, cy, size / 2);

        if (card.avatar === null) {
            parts.push(`<polygon points="${points}" fill="${boardSvgColors.emptyCell}"/>`);
            parts.push(icons.person(cx - size * 0.3, cy - size * 0.32, size * 0.6));
        } else {
            const dataUri = `data:image/png;base64,${card.avatar.toString('base64')}`;

            parts.push(`<defs><clipPath id="avatar"><polygon points="${points}"/></clipPath></defs>`);
            parts.push(`<image href="${dataUri}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>`);
        }

        parts.push(`<polygon points="${points}" fill="none" stroke="${boardSvgColors.text}" stroke-width="6"/>`);
        textX = 70 + size + 50;
    }

    if (card.backgroundIcon) {
        parts.push(`<g opacity="0.08">${icons[card.backgroundIcon](textX - 40, 60, 500, '#ffffff')}</g>`);
    }

    const textWidth = (hasBoards ? 620 : W - 80) - textX;
    let y = 150;

    if (card.icon) {
        parts.push(icons[card.icon](textX, y - 100, 80));
        y += 30;
    }

    const titleSize = 64;
    const titleLines = wrapText(card.title, textWidth, titleSize, 2);

    for (const line of titleLines) {
        y += titleSize * 1.1;
        parts.push(textElement(textX, y, { text: line, size: titleSize, bold: true, color: '#ffffff' }, 'start', textWidth));
    }

    y += 20;

    for (const line of card.lines.slice(0, 5)) {
        const size = line.size ?? 34;
        y += size * 1.45;
        parts.push(textElement(textX, y, { color: greyText, ...line, size }, 'start', textWidth));
    }

    if (card.badge) {
        const height = 80;

        y += 30;
        parts.push(`<image href="${card.badge.image}" x="${textX}" y="${y}" width="${height * 1.06}" height="${height}" opacity="0.6"/>`);
        parts.push(textElement(textX + height * 1.06 + 24, y + height / 2 + 12, { text: card.badge.text, size: 34, color: greyText }, 'start', textWidth - height - 24));
    }

    if (hasBoards) {
        const boards = card.boards!.slice(0, 4);
        const cellWidth = 260;
        const cellHeight = 170;

        boards.forEach((board, index) => {
            parts.push(renderBoardSvg({
                ...board,
                id: `board-${index}`,
                x: 650 + (index % 2) * (cellWidth + 10),
                y: 110 + Math.floor(index / 2) * (cellHeight + 30),
                width: cellWidth,
                height: cellHeight,
            }));
        });
    }

    parts.push(textElement(W - 40, H - 40, brandText(), 'end', 400));

    return svgRoot(parts.join(''));
};

export const svgToPng = async (svg: string): Promise<Buffer> => {
    return await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9 })
        .toBuffer()
    ;
};
