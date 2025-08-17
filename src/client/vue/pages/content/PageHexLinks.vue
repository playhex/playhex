<template>
    <h1>Hex resources</h1>

    <p>
        Here is a list of external resources about Hex you may be interested in.
    </p>

    <div class="links">
        <div v-for="resource in resources" :key="resource.link" class="link">
            <div class="illustration">
                <component v-if="isIcon(resource.illustration)" :is="resource.illustration.icon" />
                <img v-else :src="resource.illustration.src" class="rounded" :alt="resource.illustration.alt" />
            </div>
            <div class="details">
                <h5 class="card-title">{{ resource.title }}</h5>
                <h6 class="card-subtitle mb-2 text-body-secondary">{{ resource.subTitle }}</h6>
                <p v-for="p in resource.paragraph" :key="p" class="card-text">
                    {{ p }}
                </p>
                <a
                    :href="resource.link"
                    class="stretched-link"
                    target="_blank"
                >{{ resource.link_show }}</a>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { IconFileEarmarkText, IconDiscord, IconHexagon } from '../../icons.js';
import { Component as ComponentType } from 'vue';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Useful Hex links',
});

type Icon = { icon: ComponentType };
type Image = { src: string, alt: string };
type Resource = {
    link: string;
    link_show: string;
    title: string;
    subTitle: string;
    illustration: Icon | Image;
    paragraph: string | string[];
};

const isIcon = (illustration: Icon | Image): illustration is Icon => !!(illustration as Icon).icon;

const resources: Resource[] = [
    {
        link: 'http://www.mseymour.ca/hex_puzzle/',
        link_show: 'mseymour.ca/hex_puzzle',
        title: '500 Hex puzzles',
        subTitle: 'Hex puzzles from beginner to expert',
        illustration: { src: '/images/links/500-puzzles.png', alt: '500 Hex puzzles by Matthew Seymour' },
        paragraph: [
            `
                A collection of 500 interactive puzzles made by hand by Matthew Seymour.
                Puzzles are designed to let you learn all essential tactics,
                beginning with the most well-known.
            `,
        ],
    },
    {
        link: 'http://www.mseymour.ca/hex_book/hexstrat.html',
        link_show: 'mseymour.ca/hex_book',
        title: 'Hex: A Strategy Guide',
        subTitle: 'Interactive book to learn Hex',
        illustration: { icon: IconFileEarmarkText },
        paragraph: [
            `
                By the same author of "500 Hex puzzles", a very exhaustive guide
                to learn Hex, starting from the basics.
            `,
            `
                All knowns strategies and tactics are segmented into 9 chapters,
                including "Basic concepts", "Advanced tactics", "The opening", "Commented games"…
            `,
            'The guide is illustrated with a lot of interactive examples.',
        ],
    },
    {
        link: 'https://discord.gg/59SJ9KwvVq',
        link_show: 'discord.gg/59SJ9KwvVq',
        title: 'Hex Discord Server',
        subTitle: 'Discord server with ~200 Hex players',
        illustration: { icon: IconDiscord },
        paragraph: [
            'To talk to other Hex players, see tournaments or events related to Hex.',
        ],
    },
    {
        link: 'https://www.hexwiki.net',
        link_show: 'hexwiki.net',
        title: 'HexWiki',
        subTitle: 'Wiki dedicated to Hex',
        illustration: { icon: IconHexagon },
        paragraph: [
            'Detailed wiki on Hex. See the main page to have a list of good pages to explore.',
        ],
    },
];
</script>

<style lang="stylus" scoped>
.links
    .link
        display flex
        margin-bottom 4em
        position relative

        .illustration
            margin-right 1em
            text-align right

            min-width 20%
            height 4em

            @media (min-width: 576px)
                width 8em
                height 8em

            img
                max-height 100%
                max-width 100%

            svg
                font-size 3em

        .details
            text-align left
</style>
