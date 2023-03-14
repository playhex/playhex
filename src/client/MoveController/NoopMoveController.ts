import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';

export default class NoopMoveController implements MoveControllerInterface
{
    move(): void
    {
        // noop
    }
}
