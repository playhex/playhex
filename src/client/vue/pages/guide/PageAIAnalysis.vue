<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import AppGuideImage from './AppGuideImage.vue';

useSeoMeta({
    title: 'AI game analysis',
});
</script>

<template>
    <h1>AI game analysis</h1>

    <p>
        Once you finish a game, you can request an AI analysis.
        This tool helps you improve at Hex by reviewing your games,
        spotting your blunders, and revealing what was the best move.
    </p>

    <AppGuideImage src="ai-analysis/example.png" caption="fjan2ej57w (red) VS mason (blue) - Correspondence game - 15 March → 10 April 2024" />

    <p>
        It shows when you took or lost the advantage, and which move you
        could've played instead.
    </p>

    <h2>How to use it</h2>

    <p>When your game ends, a button appears in the game sidebar:</p>

    <button class="btn btn-sm btn-primary my-2">{{ $t('game_analysis.request_analysis') }}</button>

    <p>Click to start an AI analysis. It usually takes less than 20 seconds (or less than 400ms per move).</p>

    <p>Each bar represents a move. The higher red bar is, the greater the advantage for Red.</p>

    <p>The green dot represents the AI's best move win rate.</p>

    <p>Click on a bar to see the move details:</p>

    <code>move 45 - i8 (0.92) - best: e7 (0.05)</code>

    <ul>
        <li><code>move 45</code>: yeah, the move number</li>
        <li><code>i8 (0.92)</code>: i8 is the move played, and 0.92 is the win rate for Blue.</li>
        <li><code>best: e7 (0.05)</code>: The AI's best move, e7, would result in a 0.05 win rate for Blue, making it better for Red.</li>
    </ul>

    <p>Note that the win rate value is always from Blue's perspective.</p>

    <p>Clicking will also add marks on the board:</p>

    <AppGuideImage src="ai-analysis/board-marks.png" caption="Example of a blunder made by Red" />

    <p>You can see directly on the board which move was your blunder and where the AI recommends playing instead.</p>

    <p>A red mark means the win rate dropped significantly compared to the AI's best move.</p>

    <p>
        Once AI analysis is available, you can also rewind the game using the arrow buttons or arrow keys.
        The analysis marks will show the move's win rate and the best move for the current position.
    </p>

    <p>On mobile, you can collapse the AI analysis to make more space for chat.</p>

    <p>The analysis will be reduced to a summarized bar like this:</p>

    <AppGuideImage src="ai-analysis/summary.png" caption="AI analysis collapsed" />

    <p>Click again on it to expand.</p>

    <p>If you are curious about how AI analyses are generated, see <router-link :to="{ name: 'analysis-details' }">How AI analysis is done</router-link>.</p>

    <h2>Handling swap move</h2>

    <p>When you swap, the AI analysis can determine if it was a good decision or suggest a better move. Examples:</p>

    <ul>
        <li><code>move 2 - swap-pieces (best move)</code>: Blue swapped, and it was better than playing the AI's best non-swapping move.</li>
        <li><code>move 2 - swap-pieces (0.04) - best: d8 (0.95)</code>: Blue swapped, but not swapping and playing d8 would have been better</li>
    </ul>

    <p>
        But if you don't swap, the AI analysis will not determine whether swapping would have been better.
        However, you can check if your opponent's first move was too strong by looking at the first bar.
        If it's red, you should have swapped.
    </p>

    <AppGuideImage src="ai-analysis/not-swapped.png" caption="Blue didn't swap, but it would have been better—even better than playing the AI's best move (or maybe the swap rule was disabled for this game)." />

    <h2>Handling pass move</h2>

    <p>
        In the case of a pass move, the AI will always indicate that playing the best move would have been better.
        However, you can check whether passing caused you to lose or allowed you to maintain your advantage by looking at the bars.
        Here are some examples:
    </p>

    <AppGuideImage src="ai-analysis/pass-lose.png" caption="Blue was winning, but passing made him lose" />

    <AppGuideImage src="ai-analysis/pass-win.png" caption="Blue is winning, and is passing as a proof of strength" />
</template>
