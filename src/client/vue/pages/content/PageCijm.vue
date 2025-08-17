<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { IconYoutube } from '../../icons.js';
import { autoLocale } from '../../../../shared/app/i18n';

useHead({
    title: 'Tournoi de Hex à Paris 2025',
});

const locale = autoLocale();
</script>

<template>
    <!--
        French
    -->
    <div v-if="'fr' === locale" class="container my-3">
        <div class="text-center">
            <a href="https://salon-math.fr/cijm/#:~:text=Tournoi de Hex" target="_blank">
                <img
                    src="https://salon-math.fr/wp-content/uploads/2025/02/Affiche-Maths-Hors-les-murs_A4_logos1_page-0001-scaled.jpg"
                    alt="26e salon Culture et jeux mathématiques"
                    class="affiche"
                />
            </a>
        </div>

        <h1>Tournoi de Hex – Paris 2025</h1>

        <p class="lead">Le <strong>CIJM</strong> organise 2 <strong>tournois de Hex</strong> lors du Salon Culture & Jeux Mathématiques.</p>

        <h3>📅 Quand ?</h3>

        <p>
            <strong>Samedi 14 juin 2025</strong>, 14h,
            <br>
            et <strong>dimanche 15 juin 2025</strong>, 14h.
            <br>
            Lors du <strong>Salon Culture &amp; Jeux Mathématiques</strong>,
            qui se tient du <strong>12 au 15 juin 2025</strong>
        </p>

        <h3>📍 Où ?</h3>

        <p>
            <strong>Place Saint-Sulpice</strong>, Paris 6ᵉ
            <br>
            Stand du <strong>CIJM</strong> (Comité International des Jeux Mathématiques)
            <br>

            (voir sur
            <a href="https://www.openstreetmap.org/relation/976401#map=17/48.850752/2.333683" target="_blank">
                OpenStreetMap</a>,
            ou
            <a href="https://www.google.fr/maps/place/Pl.+Saint-Sulpice,+75006+Paris/@48.8507007,2.3334919,18.46z" target="_blank">
                Google Maps</a>)
        </p>

        <h3>📝 Comment participer ?</h3>

        <ul>
            <li><strong>Inscription gratuite, sur place au stand du CIJM</strong>, tous les jours de l'événement, du jeudi 12 juin jusqu'au dimanche 15 matin, avant le tournoi</li>
            <li><strong>Tous niveaux bienvenus</strong>, dès 8 ans</li>
        </ul>

        <h3>🧠 Format du tournoi</h3>

        <ul>
            <li>Tournoi amical ou compétitif selon le nombre de participants</li>
            <li>Parties sur plateaux physiques, organisées dans l’après-midi</li>
            <li>Durée variable en fonction du nombre d&#39;inscrits</li>
            <li>Voir la vidéo du tournoi de Hex d'une précédente édition :
                <a href="https://www.youtube.com/watch?v=BvJ1tBPqr2U" target="_blank"><IconYoutube /> Youtube</a>
            </li>
        </ul>

        <h3>🏆 Récompenses</h3>

        <p>Des <strong>lots à gagner</strong>, notamment des jeux de Hex<br>Classement établi en fin de tournoi</p>

        <h3>ℹ️ Plus d'infos</h3>

        <ul>
            <li><strong>Entrée gratuite</strong> au salon</li>
            <li>Autres activités proposées sur place : jeux logiques, ateliers de maths, défis, animations pour enfants et adultes</li>
            <li>Infos générales sur le salon : <a href="https://salon-math.fr">https://salon-math.fr</a>  </li>
            <li>Infos sur le CIJM : <a href="https://salon-math.fr/cijm/">https://salon-math.fr/cijm/</a></li>
        </ul>
    </div>

    <!--
        Polish
    -->
    <div v-else-if="'pl' === locale" class="container my-3">
        <div class="text-center">
            <a href="https://salon-math.fr/cijm/#:~:text=Tournoi de Hex" target="_blank">
                <img
                    src="https://salon-math.fr/wp-content/uploads/2025/02/Affiche-Maths-Hors-les-murs_A4_logos1_page-0001-scaled.jpg"
                    alt="26e salon Culture et jeux mathématiques"
                    class="affiche"
                />
            </a>
        </div>

        <h1>Turniej Hex – Paryż 2025</h1>

        <p class="lead"><strong>CIJM</strong> organizuje 2 <strong>turnieje Hex</strong> podczas Salon Culture & Jeux Mathématiques.</p>

        <h3>📅 Kiedy?</h3>

        <p>
            <strong>Sobota, 14 czerwca 2025</strong>, godz. 14:00,
            <br>
            oraz <strong>niedziela, 15 czerwca 2025</strong>, godz. 14:00.
            <br>
            Podczas <strong>Salon Culture &amp; Jeux Mathématiques</strong>,
            który odbywa się w dniach <strong>12–15 czerwca 2025</strong>
        </p>

        <h3>📍 Gdzie?</h3>

        <p>
            <strong>Place Saint-Sulpice</strong>, 6. dzielnica Paryża
            <br>
            Stoisko <strong>CIJM</strong> (Międzynarodowy Komitet Gier Matematycznych)
            <br>

            (zobacz na
            <a href="https://www.openstreetmap.org/relation/976401#map=17/48.850752/2.333683" target="_blank">
                OpenStreetMap</a>,
            lub
            <a href="https://www.google.fr/maps/place/Pl.+Saint-Sulpice,+75006+Paris/@48.8507007,2.3334919,18.46z" target="_blank">
                Google Maps</a>)
        </p>

        <h3>📝 Jak wziąć udział?</h3>

        <ul>
            <li><strong>Bezpłatna rejestracja na miejscu, przy stoisku CIJM</strong>, codziennie podczas wydarzenia – od czwartku 12 czerwca do niedzieli 15 czerwca rano, przed turniejem</li>
            <li><strong>Wszyscy mile widziani</strong>, od 8. roku życia</li>
        </ul>

        <h3>🧠 Format turnieju</h3>

        <ul>
            <li>Turniej towarzyski lub rywalizacyjny, w zależności od liczby uczestników</li>
            <li>Partie rozgrywane na fizycznych planszach, zorganizowane po południu</li>
            <li>Czas trwania zależny od liczby zgłoszeń</li>
            <li>Zobacz wideo z turnieju Hex z poprzedniej edycji:
                <a href="https://www.youtube.com/watch?v=BvJ1tBPqr2U" target="_blank"><IconYoutube /> Youtube</a>
            </li>
        </ul>

        <h3>🏆 Nagrody</h3>

        <p><strong>Do wygrania nagrody</strong>, w tym gry Hex<br>Klasyfikacja końcowa ustalana na zakończenie turnieju</p>

        <h3>ℹ️ Więcej informacji</h3>

        <ul>
            <li><strong>Wstęp wolny</strong> na salon</li>
            <li>Inne atrakcje na miejscu: gry logiczne, warsztaty matematyczne, wyzwania, animacje dla dzieci i dorosłych</li>
            <li>Informacje ogólne o salonie: <a href="https://salon-math.fr">https://salon-math.fr</a></li>
            <li>Informacje o CIJM: <a href="https://salon-math.fr/cijm/">https://salon-math.fr/cijm/</a></li>
        </ul>
    </div>

    <!--
        Spanish
    -->
    <div v-else-if="'es' === locale" class="container my-3">
        <div class="text-center">
            <a href="https://salon-math.fr/cijm/#:~:text=Tournoi de Hex" target="_blank">
                <img
                    src="https://salon-math.fr/wp-content/uploads/2025/02/Affiche-Maths-Hors-les-murs_A4_logos1_page-0001-scaled.jpg"
                    alt="26e salon Culture et jeux mathématiques"
                    class="affiche"
                />
            </a>
        </div>

        <h1>Torneo de Hex – París 2025</h1>

        <p class="lead">El <strong>CIJM</strong> organiza 2 <strong>torneos de Hex</strong> durante el Salon Culture & Jeux Mathématiques.</p>

        <h3>📅 ¿Cuándo?</h3>

        <p>
            <strong>Sábado 14 de junio de 2025</strong>, 14:00 h,
            <br>
            y <strong>domingo 15 de junio de 2025</strong>, 14:00 h.
            <br>
            Durante el <strong>Salon Culture &amp; Jeux Mathématiques</strong>,
            que se celebra del <strong>12 al 15 de junio de 2025</strong>
        </p>

        <h3>📍 ¿Dónde?</h3>

        <p>
            <strong>Place Saint-Sulpice</strong>, distrito 6 de París
            <br>
            Stand del <strong>CIJM</strong> (Comité Internacional de Juegos Matemáticos)
            <br>

            (ver en
            <a href="https://www.openstreetmap.org/relation/976401#map=17/48.850752/2.333683" target="_blank">
                OpenStreetMap</a>,
            o
            <a href="https://www.google.fr/maps/place/Pl.+Saint-Sulpice,+75006+Paris/@48.8507007,2.3334919,18.46z" target="_blank">
                Google Maps</a>)
        </p>

        <h3>📝 ¿Cómo participar?</h3>

        <ul>
            <li><strong>Inscripción gratuita, en el stand del CIJM</strong>, todos los días del evento, desde el jueves 12 hasta el domingo 15 por la mañana, antes del torneo</li>
            <li><strong>Todos los niveles son bienvenidos</strong>, a partir de 8 años</li>
        </ul>

        <h3>🧠 Formato del torneo</h3>

        <ul>
            <li>Torneo amistoso o competitivo según el número de participantes</li>
            <li>Partidas en tableros físicos, organizadas por la tarde</li>
            <li>Duración variable en función del número de inscritos</li>
            <li>Mira el video del torneo de Hex de una edición anterior:
                <a href="https://www.youtube.com/watch?v=BvJ1tBPqr2U" target="_blank"><IconYoutube /> Youtube</a>
            </li>
        </ul>

        <h3>🏆 Premios</h3>

        <p><strong>Premios para ganar</strong>, incluidos juegos de Hex<br>Clasificación final al cierre del torneo</p>

        <h3>ℹ️ Más información</h3>

        <ul>
            <li><strong>Entrada gratuita</strong> al salón</li>
            <li>Otras actividades en el lugar: juegos de lógica, talleres de matemáticas, desafíos, animaciones para niños y adultos</li>
            <li>Información general sobre el salón: <a href="https://salon-math.fr">https://salon-math.fr</a></li>
            <li>Información sobre el CIJM: <a href="https://salon-math.fr/cijm/">https://salon-math.fr/cijm/</a></li>
        </ul>
    </div>

    <!--
        English (default)
    -->
    <div v-else class="container my-3">
        <div class="text-center">
            <a href="https://salon-math.fr/cijm/#:~:text=Tournoi de Hex" target="_blank">
                <img
                    src="https://salon-math.fr/wp-content/uploads/2025/02/Affiche-Maths-Hors-les-murs_A4_logos1_page-0001-scaled.jpg"
                    alt="26th Culture and Mathematical Games Fair"
                    class="affiche"
                />
            </a>
        </div>

        <h1>Hex Tournament – Paris 2025</h1>

        <p class="lead"><strong>CIJM</strong> is organizing 2 <strong>Hex tournaments</strong> during the Salon Culture & Jeux Mathématiques.</p>

        <h3>📅 When?</h3>

        <p>
            <strong>Saturday, June 14, 2025</strong>, 2:00 PM,
            <br>
            and <strong>Sunday, June 15, 2025</strong>, 2:00 PM.
            <br>
            During the <strong>Salon Culture & Jeux Mathématiques</strong>,<br>
            which takes place from <strong>June 12 to 15, 2025</strong>
        </p>

        <h3>📍 Where?</h3>

        <p>
            <strong>Place Saint-Sulpice</strong>, Paris 6th arrondissement<br>
            At the <strong>CIJM</strong> stand (International Committee for Mathematical Games)<br>

            (see on
            <a href="https://www.openstreetmap.org/relation/976401#map=17/48.850752/2.333683" target="_blank">
                OpenStreetMap</a>,
            or
            <a href="https://www.google.fr/maps/place/Pl.+Saint-Sulpice,+75006+Paris/@48.8507007,2.3334919,18.46z" target="_blank">
                Google Maps</a>)
        </p>

        <h3>📝 How to participate?</h3>

        <ul>
            <li><strong>Free registration, on-site at the CIJM stand</strong>, every day of the event, from Thursday, June 12 to Sunday morning, June 15, before the tournament</li>
            <li><strong>All skill levels welcome</strong>, ages 8 and up</li>
        </ul>

        <h3>🧠 Tournament Format</h3>

        <ul>
            <li>Friendly or competitive tournament depending on the number of participants</li>
            <li>Games on physical boards, organized in the afternoon</li>
            <li>Duration varies based on the number of participants</li>
            <li>Watch the video of a previous Hex tournament:
                <a href="https://www.youtube.com/watch?v=BvJ1tBPqr2U" target="_blank"><IconYoutube /> YouTube</a>
            </li>
        </ul>

        <h3>🏆 Prizes</h3>

        <p><strong>Prizes to win</strong>, including Hex board games<br>Ranking announced at the end of the tournament</p>

        <h3>ℹ️ More Info</h3>

        <ul>
            <li><strong>Free entry</strong> to the fair</li>
            <li>Other on-site activities: logic games, math workshops, challenges, entertainment for kids and adults</li>
            <li>General info about the fair: <a href="https://salon-math.fr">https://salon-math.fr</a></li>
            <li>Info about CIJM: <a href="https://salon-math.fr/cijm/">https://salon-math.fr/cijm/</a></li>
        </ul>
    </div>
</template>

<style lang="stylus" scoped>
.affiche
    aspect-ratio 1842 / 2560

    @media (max-width: 575.5px)
        max-width 100%
        max-height 70vh
        text-align center
        margin-bottom 1em

    @media (min-width: 576px)
        max-width 280px
        max-height 80vh
        float right
        margin 0 0 1em 1em

    @media (min-width: 992px)
        max-width 60vw
        max-height 80vh
        float right
        margin 0 0 1em 1em
</style>
