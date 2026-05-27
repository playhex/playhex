// Core
export { default as GameView } from './GameView.js';
export type { GameViewSize } from './GameView.js';
export { default as Hex } from './Hex.js';
export { BoardEntity } from './BoardEntity.js';
export { colorAverage, lighten, darken } from './colorUtils.js';
export type { Theme } from './BoardTheme.js';
export { themes } from './BoardTheme.js';

// Entities
export { default as Anchor44Mark } from './entities/Anchor44Mark.js';
export { default as HexagonMark } from './entities/HexagonMark.js';
export { default as LastMoveMark } from './entities/LastMoveMark.js';
export { default as Stone } from './entities/Stone.js';
export { default as SwappableMark } from './entities/SwappableMark.js';
export { default as SwappedMark } from './entities/SwappedMark.js';
export { default as TextMark } from './entities/TextMark.js';
export { default as TriangleMark } from './entities/TriangleMark.js';

// Facades
export { Anchor44Facade } from './facades/Anchor44Facade.js';
export { AnimatorFacade } from './facades/AnimatorFacade.js';
export { AutoOrientationFacade } from './facades/AutoOrientationFacade.js';
export type { OrientationMode, PreferredOrientations } from './facades/AutoOrientationFacade.js';
export { GameMarksFacade } from './facades/GameMarksFacade.js';
export { PlayingGameFacade } from './facades/PlayingGameFacade.js';
export { PreviewMoveFacade } from './facades/PreviewMoveFacade.js';
export { ShadingPatternFacade } from './facades/ShadingPatternFacade.js';
export { SimulatePlayingGameFacade } from './facades/SimulatePlayingGameFacade.js';

// Conditional moves
export { default as ConditionalMovesEditor } from './conditional-moves/ConditionalMovesEditor.js';
export { ConditionalMovesFacade } from './conditional-moves/ConditionalMovesFacade.js';
export type { ConditionalMovesState } from './conditional-moves/ConditionalMovesState.js';
export { createConditionalMovesState } from './conditional-moves/ConditionalMovesState.js';
export { conditionalMovesShift, getNextMovesAfterLine } from './conditional-moves/conditionalMovesUtils.js';
export type { ConditionalMovesLine, ConditionalMovesTree, ConditionalMovesStruct } from './conditional-moves/types.js';

// Shading patterns
export { allShadingPatterns, createShadingPattern } from './shading-patterns/shading-patterns.js';
export type { ShadingPatternType } from './shading-patterns/shading-patterns.js';
export type { ShadingPatternInterface } from './shading-patterns/ShadingPatternInterface.js';
