import { Body, JsonController, Post } from 'routing-controllers';
import { Service } from 'typedi';

type AnalInput = {
    size: number;
    color: 'black' | 'white';
    black: string;
    white: string;
};

type AnalOutput = {
    whiteWin: number;
    policy: number[][];
};

@JsonController()
@Service()
export default class HexplorerController
{
    @Post('/api/hexplorer/analyze-position')
    async analyzePosition(
        @Body() body: AnalInput,
    ): Promise<AnalOutput> {
        const response = await fetch('http://localhost:8088/analyze-position', {
            method: 'post',
            body: JSON.stringify(body),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        return await response.json() as Promise<AnalOutput>;
    }
}
