import { Container, Text, TextStyle } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

/**
 * Show a 'S' on second player stone if she swapped.
 */
export default class SwappedMark extends BoardEntity
{
    constructor()
    {
        super();

        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 1.4,
            fontWeight: 'bold',
            fill: 0xffffff,
        });

        const S = new Text({ text: 'S', style: coordsTextStyle });

        S.anchor.set(0.5, 0.5);
        S.alpha = 0.4;

        return S;
    }
}
