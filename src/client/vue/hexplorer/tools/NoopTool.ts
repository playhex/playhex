import { Move } from '../../../../shared/move-notation/move-notation';
import { ToolInterface } from './ToolInterface';

export class NoopTool implements ToolInterface
{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    apply(move: Move): void
    {
        // noop
    }
}
