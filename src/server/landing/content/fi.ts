import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Pelaa Hexiä verkossa ilmaiseksi',
    metaDescription: 'Pelaa Hex-lautapeliä verkossa ilmaiseksi pelaajia vastaan ympäri maailmaa tai tekoälyä vastaan. Reaaliaikaiset pelit ja kirjeenvaihtopelit, turnaukset, tehtävät, tekoälyn peli-analyysi.',

    nav: {
        play: 'Pelaa',
        tournaments: 'Turnaukset',
        ladder: 'Kukkulan kuningas',
        puzzles: 'Tehtävät',
        tutorial: 'Opettele',
        language: 'Kieli',
    },

    hero: {
        title: 'Pelaa Hexiä verkossa',
        subtitle: 'Pelaa Hex-lautapeliä ilmaiseksi pelaajia vastaan ympäri maailmaa tai tekoälyä vastaan.',
        tagline: 'Helppo oppia, vaikea hallita.',
        cta: 'Pelaa nyt',
        ctaSecondary: 'Opettele säännöt',
    },

    features: {
        live: {
            title: 'Reaaliaikaiset pelit',
            text: 'Pelaa salamapelejä tai rauhassa muokattavilla ajanhallinnoilla. Esisiirroilla vastaat heti, ja voit keskustella vastustajasi kanssa pelin aikana.',
            imageAlt: 'Reaaliaikainen Hex-peli PlayHexissä',
            linkLabel: 'Etsi vastustaja',
            highlights: ['Esisiirrot välittömään vastaamiseen', 'Kaikki laudan koot, 19×19 asti ja suuremmat'],
        },
        correspondence: {
            title: 'Kirjeenvaihtopelit',
            text: 'Pelaa omaan tahtiisi, siirto päivässä tai useampi. Ehdollisilla siirroilla voit pelata tikapuut ja pakkosiirtosarjat etukäteen odottamatta vastustajaasi.',
            imageAlt: 'Ehdollisten siirtojen puu kirjeenvaihtopelissä',
            linkLabel: 'Pelaa kirjeenvaihtona',
            highlights: ['Ehdolliset siirrot', 'Ilmoitukset, kun on sinun vuorosi'],
        },
        ai_analysis: {
            title: 'Tekoälyn peli-analyysi',
            text: 'Pelin jälkeen tekoäly analysoi jokaisen siirron: näe parhaat siirrot, virheesi ja kuka oli voitolla pelin kullakin hetkellä.',
            imageAlt: 'Tekoälyn analysoiman pelin voittotodennäköisyyskaavio',
            linkLabel: 'Pelaa peli',
            highlights: ['Löydä virheesi ja siirto, joka olisi pelastanut sinut', 'Pelin voittotodennäköisyyskaavio'],
        },
        ranked: {
            title: 'Rankatut pelit',
            text: 'Hanki rating, pelaa tasoisiasi vastustajia vastaan ja seuraa kehitystäsi ajan mittaan ratingkaaviostasi.',
            imageAlt: 'Pelaajan ratinghistorian kaavio',
            linkLabel: 'Pelaa rankattu peli',
            highlights: ['Rankattuja sekä reaaliajassa että kirjeenvaihtona', 'Keskinäiset tilastot jokaista vastustajaa vastaan'],
        },
        devices: {
            title: 'Mobiili ja tietokone',
            text: 'PlayHex toimii selaimessasi puhelimella, tabletilla ja tietokoneella. Ei mitään asennettavaa, ja pelisi synkronoituvat laitteidesi välillä.',
            imageAlt: 'Hex-peli puhelimella',
            linkLabel: 'Pelaa selaimessa',
            highlights: ['Asennettavissa sovellukseksi', 'Pelit synkronoituvat laitteiden välillä'],
        },
        tournaments: {
            title: 'Turnaukset',
            text: 'Osallistu sveitsiläisiin tai pudotuspeliturnauksiin, reaaliajassa tai kirjeenvaihtona, sekä toistuviin sarjoihin, joissa kohtaat samat pelaajat joka viikko.',
            imageAlt: 'Hex-turnauksen tulokset',
            linkLabel: 'Katso turnaukset',
            highlights: ['Sveitsiläinen, kaikki vastaan kaikki ja pudotuspelit', 'Toistuvat turnaussarjat'],
        },
        ladder: {
            title: 'Kukkulan kuningas',
            text: 'Haasta yläpuolellasi olevat pelaajat, voita ja ota heidän paikkansa. Kiipeä huipulle ja puolusta asemaasi.',
            imageAlt: 'Kukkulan kuninkaan ranking',
            linkLabel: 'Kiipeä kukkulalle',
            highlights: ['Kukkulat reaaliajassa ja kirjeenvaihtona', 'Jokaisen valtakauden historia'],
        },
        puzzles: {
            title: 'Tehtävät',
            text: 'Harjoittele taktiikkaa yhteisön luomilla tehtävillä aloittelijasta asiantuntijaan, kokoelmiin ryhmiteltyinä.',
            imageAlt: 'Hex-tehtävä',
            linkLabel: 'Ratkaise tehtäviä',
            highlights: ['Kaikki voivat luoda ja ratkaista tehtäviä', 'Täysi editori, joka tarkistaa tehtäväsi virheiden varalta'],
        },
        bots: {
            title: 'Pelaa tekoälyä vastaan',
            text: 'Harjoittele eritasoisia botteja vastaan aloittelijasta erittäin vahvaan, jopa ilman verkkoyhteyttä.',
            imageAlt: 'Peli Hex-tekoälyä vastaan',
            linkLabel: 'Pelaa tekoälyä vastaan',
            highlights: ['Useita vaikeustasoja', 'Pelattavissa jopa ilman verkkoyhteyttä'],
        },
        tutorial: {
            title: 'Interaktiivinen opetus',
            text: 'Hexissä on vain kaksi sääntöä. Opettele ne muutamassa minuutissa interaktiivisen opetuksen avulla ja tutustu sitten perusstrategioihin.',
            imageAlt: 'Interaktiivinen Hex-opetus',
            linkLabel: 'Aloita opetus',
            highlights: ['Säännöt muutamassa minuutissa', 'Perusstrategiat'],
        },
    },

    footer: {
        cta: 'Valmis yhdistämään reunasi?',
        free: 'PlayHex on ilmainen, avointa lähdekoodia ja mainokseton.',
    },
} satisfies LandingContent;
