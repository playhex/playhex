<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { useLadderFromUrl } from '../composables/ladderFromUrl.js';
import { defaultLadderRulesConfig as config } from '../../../../shared/app/ladder/ladderRules.js';
import { timeControlToString } from '../../../../shared/app/timeControlUtils.js';
import { IconCrown } from '../../icons.js';

useHead({
    title: `${t('ladder.rules')} · ${t('ladder.title')}`,
});

const { slug, ladderDto } = useLadderFromUrl();

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const days = (ms: number): number => Math.round(ms / DAY);
const hours = (ms: number): number => Math.round(ms / HOUR);
</script>

<template>
    <div class="container my-3">
        <p><router-link :to="{ name: 'ladder', params: { slug } }"><IconCrown class="text-warning" /> {{ $t('ladder.title') }}</router-link></p>

        <h1>King of the Hill: rules</h1>

        <p class="lead">One ordered list of seats. Challenge a player above you: win, and you take their seat. Climbing is fast. Staying on top is what's hard.</p>

        <h2 class="h4 mt-4">The ladder</h2>
        <ul>
            <li>Players hold seats from #1 to the last one. Seat #1 is the <strong>King of the Hill</strong>.</li>
            <li v-if="ladderDto">
                Games are played on board sizes from <strong>{{ ladderDto.ladder.boardsizeMin }}×{{ ladderDto.ladder.boardsizeMin }}</strong>
                to <strong>{{ ladderDto.ladder.boardsizeMax }}×{{ ladderDto.ladder.boardsizeMax }}</strong>,
                with time control <strong>{{ timeControlToString(ladderDto.ladder.timeControlType) }}</strong>.
            </li>
            <li>You can join at any time, and <strong>you enter at the bottom</strong>.</li>
            <li>You need a registered PlayHex account, and to have been on PlayHex for at least <strong>{{ days(config.minAccountAgeMs) }} days</strong>. Time spent as a guest before creating your account counts. Guests and bots cannot join.</li>
            <li>Ladder games are normal rated games. Your seat is not your rating: it is a place you hold.</li>
        </ul>

        <h2 class="h4 mt-4">Challenges</h2>
        <ul>
            <li>
                From seat P, you can challenge anyone from <strong>half your seat (P/2)</strong>, or <strong>{{ config.challengeRangeFlatSeats }} seats above you</strong> if that goes further,
                up to the seat just above you. Every win roughly halves your seat: with 256 players, 6 wins bring you from the bottom to the top.
                Anyone in the top {{ config.challengeRangeFlatSeats + 1 }} can challenge the King directly.
            </li>
            <li><strong>A challenge starts immediately.</strong> The challenge itself cannot be declined. The challenger chooses the board size.</li>
            <li>
                The challenger may propose to play live instead. The defender may only accept or decline this optional live format: if they accept, the live game starts, if they decline, the correspondence game starts.
                The defender has {{ hours(config.liveProposalAnswerMs) }} hours from when the challenge is sent to answer. Without an answer, the correspondence game starts.
                Once sent, neither the challenge nor the live proposal can be withdrawn. While waiting for the answer, the challenge already takes one slot on each side.
                Any live time control can be proposed. The board size stays the one chosen by the challenger, and the live game is rated with the same stakes.
            </li>
            <li>You can only have one running challenge against the same player, whoever challenged.</li>
            <li>The challenger plays first, the defender may swap.</li>
            <li>A King of the Hill game cannot be canceled.</li>
        </ul>

        <h3 class="h5">Outgoing challenges</h3>
        <p>How many challenges you can send at the same time:</p>
        <ul>
            <li>Top {{ config.topSeats }}: <strong>{{ config.outgoingSlotsTop }}</strong></li>
            <li>From seat {{ config.topSeats + 1 }} to the middle of the ladder: <strong>{{ config.outgoingSlotsUpperHalf }}</strong></li>
            <li>Bottom half: <strong>{{ config.outgoingSlotsLowerHalf }}</strong></li>
        </ul>
        <p>The middle is half the number of players, rounded up. With 41 players, seats {{ config.topSeats + 1 }} to 21 send {{ config.outgoingSlotsUpperHalf }} challenges, seats 22 to 41 send {{ config.outgoingSlotsLowerHalf }}.</p>

        <h3 class="h5">Incoming challenges</h3>
        <p>How many challenges you receive at the same time, at least:</p>
        <ul>
            <li>Top {{ config.summitSeats }}: <strong>{{ config.minIncomingSlotsSummit }}</strong></li>
            <li>Seats {{ config.summitSeats + 1 }} to {{ config.topSeats }}: <strong>{{ config.minIncomingSlotsTop }}</strong></li>
            <li>Seat {{ config.topSeats + 1 }} and below: <strong>{{ config.minIncomingSlotsOthers }}</strong></li>
        </ul>
        <p>You can raise it up to {{ config.maxIncomingSlots }}. When your incoming slots are full, nobody can challenge you. The higher you sit, the more you must defend.</p>
        <p>
            When you climb to a seat with a higher minimum, the new minimum applies automatically.
            If you have more running challenges than slots after your seat changed, they go on, you just cannot receive new ones until a slot is free.
        </p>

        <h3 class="h5">Cooldowns</h3>
        <ul>
            <li>For <strong>{{ hours(config.coolingDownMs) }} hours</strong> after one of your games ends, nobody can challenge you. You can still send challenges. This also applies after a canceled game.</li>
            <li>
                After a game against a player, you cannot challenge them again for <strong>{{ days(config.sameOpponentCooldownMs) }} days</strong>.
                Revenge: if you lost your last game against them, whoever challenged, you can challenge them again after <strong>{{ days(config.revengeCooldownMs) }} days</strong>.
                Canceled games don't count.
            </li>
            <li>
                Opponent diversity: among your last <strong>{{ config.diversityWindow }}</strong> ladder games, all opponents included, at most <strong>{{ config.diversityMaxSameOpponent }}</strong> can be against the same player.
                The new game and running games count, canceled games don't. This applies to both players: you cannot challenge someone if the new game would break this rule for you or for them.
            </li>
            <li>For these two rules, only games of the last <strong>{{ days(config.historyLookbackMs) }} days</strong> are taken into account.</li>
        </ul>

        <h2 class="h4 mt-4">Results</h2>
        <ul>
            <li>
                <strong>Challenger wins:</strong> they take the defender's seat. Everyone from the defender's seat down to the challenger's old seat moves down one seat to make room.
                Example: #8 beats #5. #8 takes seat #5, and the former #5, #6 and #7 become #6, #7 and #8.
            </li>
            <li><strong>Defender wins:</strong> nobody moves. Holding your seat is the reward, and it grows your defense streak.</li>
            <li>
                So losing a defense costs exactly one seat, however far below the challenger was: you only move down because the challenger takes your seat.
                Losing a challenge costs no seat.
            </li>
            <li>You can also move down one seat without playing, when a player below you beats a player above you.</li>
            <li>Results apply as soon as a game ends. With several challenges running, a win gives you the seat the defender holds when the game ends. If you already climbed above them, you keep the win but don't move.</li>
        </ul>

        <h2 class="h4 mt-4">Titles</h2>
        <ul>
            <li>
                <strong>Defense streak:</strong> successful defenses in a row, for any defender, not only the King. The current and the best streak are shown.
                Only a lost defense resets it: losing a challenge you sent doesn't.
            </li>
            <li>
                <strong>Reign:</strong> how long the King has held seat #1 without interruption, and how many times they defended it.
                A reign ends when the King loses a defense, leaves or is removed. If they take seat #1 back later, it is a new reign.
                The longest reigns and the most defended reigns go to the Hall of Fame.
            </li>
            <li><strong>Giant Slayer:</strong> dethrone a King who defended {{ config.giantSlayerMinKingDefenses }} times or more during their current reign.</li>
            <li>
                <strong>Climber:</strong> win {{ config.climberConsecutiveWins }} challenges in a row. You earn it again at each multiple ({{ config.climberConsecutiveWins }}, {{ config.climberConsecutiveWins * 2 }}, {{ config.climberConsecutiveWins * 3 }}...).
                Only losing a challenge you sent breaks the series. A win that doesn't move you up still counts, and a lost defense doesn't break it.
            </li>
            <li>Giant Slayer and Climber can be earned several times, their count is shown next to the title.</li>
        </ul>

        <h2 class="h4 mt-4">Timeouts</h2>
        <ul>
            <li>Losing on time is a loss and a <strong>strike</strong>. You get a warning after the first one.</li>
            <li>A game canceled because a player did not play their first move gives no result, but that player gets a strike.</li>
            <li>A game canceled by a moderator gives no result and no strike.</li>
            <li><strong>{{ config.strikesToRemove }} strikes in {{ days(config.strikesWindowMs) }} days</strong>: you are removed, and can rejoin at the bottom after {{ days(config.rejoinAfterStrikesMs) }} days.</li>
            <li>Resigning never gives a strike.</li>
        </ul>

        <h2 class="h4 mt-4">Leaving and removal</h2>
        <p>A player leaves the ladder in three cases:</p>
        <ul>
            <li><strong>Leaving:</strong> you can leave at any time, and rejoin at the bottom after {{ days(config.rejoinAfterLeaveMs) }} days.</li>
            <li><strong>{{ config.strikesToRemove }} strikes in {{ days(config.strikesWindowMs) }} days:</strong> you are removed, and can rejoin at the bottom after {{ days(config.rejoinAfterStrikesMs) }} days.</li>
            <li>
                <strong>No game for {{ days(config.inactivityMs) }} days:</strong> you are removed, and can rejoin at the bottom whenever you want.
                The {{ days(config.inactivityMs) }} days count from the end of your last game, even a canceled one, or from when you joined if you never played.
                You are never removed for inactivity while one of your challenges is running.
            </li>
        </ul>

        <h3 class="h5">What happens then</h3>
        <ul>
            <li>The seat is freed immediately: every player below moves up one seat. If the King leaves, #2 becomes the new King.</li>
            <li>
                Challenges already running are not canceled, including live proposals waiting for an answer. The games are played to the end.
            </li>
            <li>
                If a defender left and the challenger wins, the challenger still takes the seat the defender held when they left, if it is above theirs.
                Everyone from this seat down to the challenger's old seat moves down one seat, as for a normal win.
                If the King left, the challenger becomes the new King.
            </li>
            <li>If a challenger left, their result doesn't move anyone. If the defender wins, their defense streak still grows.</li>
            <li>When you rejoin, you start again at the bottom. Your best defense streak and your titles are kept, your current streaks start again from 0.</li>
            <li>Removals for inactivity and expired live proposals are processed every few minutes, not at the exact second.</li>
        </ul>
    </div>
</template>
