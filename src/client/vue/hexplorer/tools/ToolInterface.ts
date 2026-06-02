import { Move } from '../../../../shared/move-notation/move-notation';

export interface ToolInterface
{
    apply(move: Move): void;
}
