import { BoardEntity, GameView, Hex } from '@playhex/pixi-board';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

class PolicyNumberMark extends BoardEntity
{
    private textObject: Text | null = null;

    constructor() {
        super();
        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 0.45,
            fill: 0xffffff,
            stroke: { color: 0x000000, width: 2 },
            fontWeight: 'bold',
        });

        this.textObject = new Text({ text: '', style, anchor: 0.5, resolution: window.devicePixelRatio * 2 });

        return this.textObject;
    }

    setText(text: string): void
    {
        if (this.textObject) {
            this.textObject.text = text;
        }
    }
}

class PolicyStarMark extends BoardEntity
{
    constructor() {
        super();
        this.alwaysTop = true;
        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();
        const r = Hex.INNER_RADIUS * 0.5;
        g.star(0, 0, 5, r, r * 0.45);
        g.fill({ color: this.theme.textColor });

        return g;
    }
}

/**
 * Displays policy marks (hexagon markers) on top of board cells,
 * showing where the analyzer suggests to play.
 */
export class PolicyOverlayFacade
{
    private showNumbers = false;
    private showBestMark = false;

    private overlays: Graphics[][];
    private numberMarks: PolicyNumberMark[][];
    private starMarks: PolicyStarMark[][];

    private lastPolicy: number[][] | null = null;
    private lastColor: 'black' | 'white' | null = null;

    private readonly starsGroup: string;
    private readonly numbersGroup: string;

    constructor(
        private gameView: GameView,
    ) {
        const id = Math.random().toString(36).slice(2);
        this.starsGroup = `_policy_overlay_stars_${id}`;
        this.numbersGroup = `_policy_overlay_numbers_${id}`;
        this.overlays = [];
        this.numberMarks = [];
        this.starMarks = [];
        this.init();
    }

    private init(): void
    {
        const size = this.gameView.getBoardsize();

        for (let row = 0; row < size; ++row) {
            this.overlays[row] = [];
            this.starMarks[row] = [];
            this.numberMarks[row] = [];

            for (let col = 0; col < size; ++col) {
                const g = new Graphics();
                this.overlays[row][col] = g;

                if (this.gameView.isOnBoard(row, col)) {
                    this.gameView.getHexByCoords({ row, col }).addChild(g);
                }
            }
        }

        // Stars added before numbers so they render behind text.
        for (let row = 0; row < size; ++row) {
            for (let col = 0; col < size; ++col) {
                const starMark = new PolicyStarMark();
                starMark.setCoords({ row, col }).hide();
                this.gameView.addEntity(starMark, this.starsGroup);
                this.starMarks[row][col] = starMark;
            }
        }

        for (let row = 0; row < size; ++row) {
            for (let col = 0; col < size; ++col) {
                const numMark = new PolicyNumberMark();
                numMark.setCoords({ row, col }).hide();
                this.gameView.addEntity(numMark, this.numbersGroup);
                this.numberMarks[row][col] = numMark;
            }
        }
    }

    getShowNumbers(): boolean
    {
        return this.showNumbers;
    }

    setShowNumbers(showNumbers: boolean): void
    {
        this.showNumbers = showNumbers;
    }

    getShowBestMark(): boolean
    {
        return this.showBestMark;
    }

    setShowBestMark(showBestMark: boolean): void
    {
        this.showBestMark = showBestMark;
    }

    reapply(): void
    {
        if (this.lastPolicy && this.lastColor) {
            this.apply(this.lastPolicy, this.lastColor);
        }
    }

    clear(): void
    {
        this.lastPolicy = null;
        this.lastColor = null;

        for (const row of this.overlays) {
            for (const g of row) {
                g.alpha = 0;
            }
        }

        for (const row of this.numberMarks) {
            for (const m of row) {
                m.hide();
            }
        }

        for (const row of this.starMarks) {
            for (const m of row) {
                m.hide();
            }
        }
    }

    apply(policy: number[][], color: 'black' | 'white'): void
    {
        this.lastPolicy = policy;
        this.lastColor = color;

        const markerColor = color === 'black' ? 0xee3333 : 0x3388ee;
        const max = Math.max(...policy.flat());

        let bestRow = 0;
        let bestCol = 0;
        let bestVal = -1;

        for (let row = 0; row < this.gameView.getBoardsize(); ++row) {
            for (let col = 0; col < this.gameView.getBoardsize(); ++col) {
                const val = policy[row][col];

                if (val > bestVal) {
                    bestVal = val;
                    bestRow = row;
                    bestCol = col;
                }

                const g = this.overlays[row][col];
                g.clear();
                g.regularPoly(0, 0, Hex.INNER_RADIUS * 0.6, 6);
                g.fill({ color: markerColor });
                g.alpha = max > 0 ? val / max : 0;

                const numMark = this.numberMarks[row][col];
                if (this.showNumbers && val >= max / 2) {
                    numMark.setText(`${Math.round(val * 100)}%`);
                    numMark.show();
                } else {
                    numMark.hide();
                }
            }
        }

        for (let row = 0; row < this.gameView.getBoardsize(); ++row) {
            for (let col = 0; col < this.gameView.getBoardsize(); ++col) {
                const starMark = this.starMarks[row][col];

                if (this.showBestMark && row === bestRow && col === bestCol && bestVal > 0) {
                    starMark.show();
                } else {
                    starMark.hide();
                }
            }
        }
    }
}
