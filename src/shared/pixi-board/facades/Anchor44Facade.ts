import Anchor44Mark from '../entities/Anchor44Mark.js';
import GameView from '../GameView.js';

/**
 * Name of entity group used to show anchors on 4-4
 */
const ANCHORS_44_ENTITY_GROUP = 'anchors_44';

export class Anchor44Facade
{
    private initialized = false;

    constructor(
        private gameView: GameView,
        show = true,
    ) {
        if (show) {
            this.show44Anchors();
        }
    }

    private init(): void
    {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        this.gameView.setGroupZIndexBehindStones(ANCHORS_44_ENTITY_GROUP);

        const size = this.gameView.getBoardsize();

        this.gameView.addEntity(new Anchor44Mark().setCoords({ row: 3, col: 3 }), ANCHORS_44_ENTITY_GROUP);
        this.gameView.addEntity(new Anchor44Mark().setCoords({ row: 3, col: size - 4 }), ANCHORS_44_ENTITY_GROUP);
        this.gameView.addEntity(new Anchor44Mark().setCoords({ row: size - 4, col: size - 4 }), ANCHORS_44_ENTITY_GROUP);
        this.gameView.addEntity(new Anchor44Mark().setCoords({ row: size - 4, col: 3 }), ANCHORS_44_ENTITY_GROUP);
    }

    show44Anchors(show = true): void
    {
        if (show) {
            this.init();
            this.gameView.getGroup(ANCHORS_44_ENTITY_GROUP).visible = true;
        } else {
            this.hide44Anchors();
        }
    }

    hide44Anchors(): void
    {
        this.gameView.getGroup(ANCHORS_44_ENTITY_GROUP).visible = false;
    }
}
