import { CurrentUser } from 'routing-controllers';

export function AuthenticatedPlayer()
{
    return CurrentUser({ required: true });
}
