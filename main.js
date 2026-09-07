const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const {
    LEAGUES,
    getLeagueData,
    getLeagueSummary,
    findTeamName
} = require('./footballDataService');


/* =========================
   POISSON
========================= */

function poissonProbability(lambda, goals) {
    if (
        lambda < 0 ||
        goals < 0
    ) {
        return 0;
    }

    let factorial = 1;

    for (
        let i = 2;
        i <= goals;
        i++
    ) {
        factorial *= i;
    }

    return (
        Math.exp(-lambda) *
        Math.pow(lambda, goals)
    ) / factorial;
}


function buildScoreMatrix(
    homeLambda,
    awayLambda,
    maxGoals = 8
) {
    const matrix = [];

    for (
        let homeGoals = 0;
        homeGoals <= maxGoals;
        homeGoals++
    ) {
        const row = [];

        for (
            let awayGoals = 0;
            awayGoals <= maxGoals;
            awayGoals++
        ) {
            row.push(
                poissonProbability(
                    homeLambda,
                    homeGoals
                ) *
                poissonProbability(
                    awayLambda,
                    awayGoals
                )
            );
        }

        matrix.push(row);
    }

    const total =
        matrix
            .flat()
            .reduce(
                (sum, value) =>
                    sum + value,
                0
            );

    if (total > 0) {
        return matrix.map(row =>
            row.map(
                value =>
                    value / total
            )
        );
    }

    return matrix;
}


function summarizeMatrix(matrix) {
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;
    let bttsYes = 0;

    const over = {
        0.5: 0,
        1.5: 0,
        2.5: 0,
        3.5: 0,
        4.5: 0
    };

    for (
        let homeGoals = 0;
        homeGoals < matrix.length;
        homeGoals++
    ) {
        for (
            let awayGoals = 0;
            awayGoals < matrix[homeGoals].length;
            awayGoals++
        ) {
            const probability =
                matrix[homeGoals][awayGoals];

            if (
                homeGoals > awayGoals
            ) {
                homeWin += probability;
            }

            if (
                homeGoals === awayGoals
            ) {
                draw += probability;
            }

            if (
                homeGoals < awayGoals
            ) {
                awayWin += probability;
            }

            if (
                homeGoals > 0 &&
                awayGoals > 0
            ) {
                bttsYes += probability;
            }

            const totalGoals =
                homeGoals +
                awayGoals;

            Object.keys(over)
                .forEach(line => {
                    if (
                        totalGoals >
                        Number(line)
                    ) {
                        over[line] +=
                            probability;
                    }
                });
        }
    }

    return {
        homeWin,
        draw,
        awayWin,

        bttsYes,

        bttsNo:
            1 - bttsYes,

        over,

        under:
            Object.fromEntries(
                Object.entries(over)
                    .map(
                        ([line, probability]) =>
                            [
                                line,
                                1 - probability
                            ]
                    )
            )
    };
}


/* =========================
   HELPERS
========================= */

function average(
    values,
    fallback = 0
) {
    const valid =
        values.filter(
            value =>
                Number.isFinite(value)
        );

    if (!valid.length) {
        return fallback;
    }

    return (
        valid.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / valid.length
    );
}


function clamp(
    value,
    min,
    max
) {
    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}


/* =========================
   PESO DA ÉPOCA ATUAL
========================= */

/*
 * A época atual começa a contar a partir
 * do segundo jogo da equipa.
 *
 * A quantidade de jogos da equipa,
 * e não a quantidade de jogos da liga,
 * determina a confiança que temos nos
 * dados atuais.
 */

function currentSeasonWeight(
    currentPlayed
) {
    const played =
        Math.max(
            0,
            Number(currentPlayed) || 0
        );

    if (played <= 0) {
        return 0;
    }

    if (played === 1) {
        return 0.10;
    }

    if (played === 2) {
        return 0.30;
    }

    if (played === 3) {
        return 0.40;
    }

    if (played <= 5) {
        return 0.50;
    }

    if (played <= 8) {
        return 0.60;
    }

    if (played <= 12) {
        return 0.70;
    }

    if (played <= 15) {
        return 0.75;
    }

    if (played <= 20) {
        return 0.80;
    }

    return 0.85;
}


/* =========================
   RECÊNCIA
========================= */

function parseMatchDate(
    value
) {
    if (!value) {
        return null;
    }

    const text =
        String(value).trim();

    // football-data.co.uk normalmente
    // usa dd/mm/yy.
    const match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
        );

    if (match) {
        let day =
            Number(match[1]);

        let month =
            Number(match[2]) - 1;

        let year =
            Number(match[3]);

        if (year < 100) {
            year +=
                year >= 70
                    ? 1900
                    : 2000;
        }

        return new Date(
            year,
            month,
            day
        );
    }

    const parsed =
        new Date(text);

    return Number.isNaN(
        parsed.getTime()
    )
        ? null
        : parsed;
}


function recencyWeight(
    match
) {
    const date =
        parseMatchDate(
            match?.date
        );

    if (!date) {
        return 1;
    }

    const ageMs =
        Date.now() -
        date.getTime();

    const ageDays =
        Math.max(
            0,
            ageMs /
            (1000 * 60 * 60 * 24)
        );

    /*
     * Meia-vida de 180 dias.
     * Um jogo com 180 dias vale metade.
     */
    return Math.pow(
        0.5,
        ageDays / 180
    );
}


/* =========================
   ESTATÍSTICAS PONDERADAS
========================= */

function weightedTeamStats(
    matches,
    teamName
) {
    const stats = {
        homePlayed: 0,
        awayPlayed: 0,
        played: 0,

        homeGoalsFor: 0,
        homeGoalsAgainst: 0,

        awayGoalsFor: 0,
        awayGoalsAgainst: 0,

        goalsFor: 0,
        goalsAgainst: 0,

        weightedMatches: 0
    };

    if (!teamName) {
        return stats;
    }

    for (
        const match of matches
    ) {
        const weight =
            recencyWeight(
                match
            );

        if (
            match.homeTeam ===
            teamName
        ) {
            stats.homePlayed += weight;
            stats.played += weight;

            stats.homeGoalsFor +=
                match.homeGoals *
                weight;

            stats.homeGoalsAgainst +=
                match.awayGoals *
                weight;

            stats.goalsFor +=
                match.homeGoals *
                weight;

            stats.goalsAgainst +=
                match.awayGoals *
                weight;

            stats.weightedMatches +=
                weight;
        }

        if (
            match.awayTeam ===
            teamName
        ) {
            stats.awayPlayed += weight;
            stats.played += weight;

            stats.awayGoalsFor +=
                match.awayGoals *
                weight;

            stats.awayGoalsAgainst +=
                match.homeGoals *
                weight;

            stats.goalsFor +=
                match.awayGoals *
                weight;

            stats.goalsAgainst +=
                match.homeGoals *
                weight;

            stats.weightedMatches +=
                weight;
        }
    }

    return stats;
}


function weightedLeagueStats(
    matches
) {
    let homeGoals = 0;
    let awayGoals = 0;
    let weightTotal = 0;

    for (
        const match of matches
    ) {
        const weight =
            recencyWeight(
                match
            );

        homeGoals +=
            match.homeGoals *
            weight;

        awayGoals +=
            match.awayGoals *
            weight;

        weightTotal += weight;
    }

    if (
        weightTotal <= 0
    ) {
        return {
            matches: 0,
            homeGoalsPerMatch: 1.45,
            awayGoalsPerMatch: 1.15,
            totalGoalsPerMatch: 2.60
        };
    }

    return {
        matches: weightTotal,

        homeGoalsPerMatch:
            homeGoals /
            weightTotal,

        awayGoalsPerMatch:
            awayGoals /
            weightTotal,

        totalGoalsPerMatch:
            (
                homeGoals +
                awayGoals
            ) /
            weightTotal
    };
}


/* =========================
   FORMA RECENTE
========================= */

function recentMatchesForTeam(
    matches,
    teamName,
    limit = 10
) {
    return matches
        .filter(
            match =>
                match.homeTeam ===
                    teamName ||
                match.awayTeam ===
                    teamName
        )
        .slice()
        .sort(
            (a, b) => {
                const da =
                    parseMatchDate(
                        a.date
                    )?.getTime() || 0;

                const db =
                    parseMatchDate(
                        b.date
                    )?.getTime() || 0;

                return db - da;
            }
        )
        .slice(0, limit);
}


function recentForm(
    matches,
    teamName
) {
    const recent =
        recentMatchesForTeam(
            matches,
            teamName,
            10
        );

    if (!recent.length) {
        return {
            matches: 0,
            pointsPerMatch: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0
        };
    }

    let points = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (
        const match of recent
    ) {
        const isHome =
            match.homeTeam ===
            teamName;

        const gf =
            isHome
                ? match.homeGoals
                : match.awayGoals;

        const ga =
            isHome
                ? match.awayGoals
                : match.homeGoals;

        goalsFor += gf;
        goalsAgainst += ga;

        if (gf > ga) {
            points += 3;
        } else if (
            gf === ga
        ) {
            points += 1;
        }
    }

    return {
        matches: recent.length,

        pointsPerMatch:
            points /
            recent.length,

        goalsFor:
            goalsFor /
            recent.length,

        goalsAgainst:
            goalsAgainst /
            recent.length,

        goalDifference:
            (
                goalsFor -
                goalsAgainst
            ) /
            recent.length
    };
}


/* =========================
   FORÇA DA EQUIPA
========================= */

function teamStrength(
    teamName,
    league,
    currentMatches,
    previousMatches,
    allMatches
) {
    const current =
        weightedTeamStats(
            currentMatches,
            teamName
        );

    const previous =
        weightedTeamStats(
            previousMatches,
            teamName
        );

    const all =
        weightedTeamStats(
            allMatches,
            teamName
        );

    const currentPlayed =
        currentMatches.filter(
            match =>
                match.homeTeam ===
                    teamName ||
                match.awayTeam ===
                    teamName
        ).length;

    const currentWeight =
        currentSeasonWeight(
            currentPlayed
        );

    const historicalWeight =
        1 - currentWeight;

    /*
     * Médias da liga com recência.
     */
    const leagueWeighted =
        weightedLeagueStats(
            allMatches
        );

    const leagueHome =
        Number(
            leagueWeighted.homeGoalsPerMatch
        ) || 1.45;

    const leagueAway =
        Number(
            leagueWeighted.awayGoalsPerMatch
        ) || 1.15;

    /*
     * Se a equipa ainda não apareceu
     * na época atual, usamos histórico.
     */
    const currentHomeAttack =
        current.homePlayed > 0
            ? current.homeGoalsFor /
              current.homePlayed
            : null;

    const currentHomeDefense =
        current.homePlayed > 0
            ? current.homeGoalsAgainst /
              current.homePlayed
            : null;

    const currentAwayAttack =
        current.awayPlayed > 0
            ? current.awayGoalsFor /
              current.awayPlayed
            : null;

    const currentAwayDefense =
        current.awayPlayed > 0
            ? current.awayGoalsAgainst /
              current.awayPlayed
            : null;

    const previousHomeAttack =
        previous.homePlayed > 0
            ? previous.homeGoalsFor /
              previous.homePlayed
            : null;

    const previousHomeDefense =
        previous.homePlayed > 0
            ? previous.homeGoalsAgainst /
              previous.homePlayed
            : null;

    const previousAwayAttack =
        previous.awayPlayed > 0
            ? previous.awayGoalsFor /
              previous.awayPlayed
            : null;

    const previousAwayDefense =
        previous.awayPlayed > 0
            ? previous.awayGoalsAgainst /
              previous.awayPlayed
            : null;

    function blend(
        currentValue,
        previousValue,
        leagueAverage
    ) {
        if (
            currentValue !== null &&
            previousValue !== null
        ) {
            return (
                currentValue *
                currentWeight
            ) + (
                previousValue *
                historicalWeight
            );
        }

        if (
            currentValue !== null
        ) {
            return (
                currentValue *
                currentWeight
            ) + (
                leagueAverage *
                historicalWeight
            );
        }

        if (
            previousValue !== null
        ) {
            return previousValue;
        }

        return leagueAverage;
    }

    let homeAttack =
        blend(
            currentHomeAttack,
            previousHomeAttack,
            leagueHome
        );

    let homeDefense =
        blend(
            currentHomeDefense,
            previousHomeDefense,
            leagueAway
        );

    let awayAttack =
        blend(
            currentAwayAttack,
            previousAwayAttack,
            leagueAway
        );

    let awayDefense =
        blend(
            currentAwayDefense,
            previousAwayDefense,
            leagueHome
        );

    /*
     * Forma recente.
     *
     * Tem influência moderada. Serve para
     * corrigir a força, não para substituí-la.
     */
    const form =
        recentForm(
            allMatches,
            teamName
        );

    if (
        form.matches >= 3
    ) {
        const formHomeFactor =
            clamp(
                form.goalsFor /
                    leagueHome,
                0.75,
                1.25
            );

        const formAwayFactor =
            clamp(
                form.goalsFor /
                    leagueAway,
                0.75,
                1.25
            );

        const formDefenseFactor =
            clamp(
                leagueAway /
                    Math.max(
                        0.40,
                        form.goalsAgainst
                    ),
                0.80,
                1.20
            );

        homeAttack =
            (
                homeAttack * 0.80
            ) + (
                homeAttack *
                formHomeFactor *
                0.20
            );

        awayAttack =
            (
                awayAttack * 0.80
            ) + (
                awayAttack *
                formAwayFactor *
                0.20
            );

        homeDefense =
            (
                homeDefense * 0.80
            ) + (
                homeDefense *
                formDefenseFactor *
                0.20
            );

        awayDefense =
            (
                awayDefense * 0.80
            ) + (
                awayDefense *
                formDefenseFactor *
                0.20
            );
    }

    return {
        name: teamName,

        homeAttack,
        homeDefense,

        awayAttack,
        awayDefense,

        played:
            all.played,

        currentPlayed,

        currentSeasonWeight:
            currentWeight,

        historicalWeight,

        form
    };
}


/* =========================
   H2H
========================= */

function getHeadToHead(
    matches,
    homeTeam,
    awayTeam
) {
    const h2h =
        matches
            .filter(match =>
                (
                    match.homeTeam ===
                        homeTeam &&
                    match.awayTeam ===
                        awayTeam
                ) ||
                (
                    match.homeTeam ===
                        awayTeam &&
                    match.awayTeam ===
                        homeTeam
                )
            )
            .slice()
            .sort(
                (a, b) => {
                    const da =
                        parseMatchDate(
                            a.date
                        )?.getTime() || 0;

                    const db =
                        parseMatchDate(
                            b.date
                        )?.getTime() || 0;

                    return db - da;
                }
            );

    if (!h2h.length) {
        return {
            matches: 0,
            homeWins: 0,
            draws: 0,
            awayWins: 0,
            homeGoals: 0,
            awayGoals: 0,
            bttsYes: 0,
            over25: 0,
            confidence: 0
        };
    }

    let totalWeight = 0;

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    let homeGoals = 0;
    let awayGoals = 0;

    let bttsYes = 0;
    let over25 = 0;

    h2h.forEach(
        match => {
            const weight =
                recencyWeight(
                    match
                );

            const sameHome =
                match.homeTeam ===
                homeTeam;

            const hg =
                sameHome
                    ? match.homeGoals
                    : match.awayGoals;

            const ag =
                sameHome
                    ? match.awayGoals
                    : match.homeGoals;

            homeGoals +=
                hg * weight;

            awayGoals +=
                ag * weight;

            if (hg > ag) {
                homeWins += weight;
            } else if (
                hg === ag
            ) {
                draws += weight;
            } else {
                awayWins += weight;
            }

            if (
                hg > 0 &&
                ag > 0
            ) {
                bttsYes += weight;
            }

            if (
                hg + ag > 2.5
            ) {
                over25 += weight;
            }

            totalWeight +=
                weight;
        }
    );

    if (
        totalWeight <= 0
    ) {
        return {
            matches: h2h.length,
            homeWins: 0,
            draws: 0,
            awayWins: 0,
            homeGoals: 0,
            awayGoals: 0,
            bttsYes: 0,
            over25: 0,
            confidence: 0
        };
    }

    /*
     * A confiança aumenta com o número
     * de confrontos, mas fica limitada.
     */
    const confidence =
        clamp(
            (
                1 -
                Math.exp(
                    -h2h.length / 4
                )
            ) * 0.20,
            0,
            0.20
        );

    return {
        matches: h2h.length,

        homeWins:
            homeWins /
            totalWeight,

        draws:
            draws /
            totalWeight,

        awayWins:
            awayWins /
            totalWeight,

        homeGoals:
            homeGoals /
            totalWeight,

        awayGoals:
            awayGoals /
            totalWeight,

        bttsYes:
            bttsYes /
            totalWeight,

        over25:
            over25 /
            totalWeight,

        confidence
    };
}


/* =========================
   EXPECTED GOALS
========================= */

function calculateExpectedGoals(
    homeTeam,
    awayTeam,
    league,
    currentMatches,
    previousMatches,
    allMatches
) {
    const home =
        teamStrength(
            homeTeam,
            league,
            currentMatches,
            previousMatches,
            allMatches
        );

    const away =
        teamStrength(
            awayTeam,
            league,
            currentMatches,
            previousMatches,
            allMatches
        );

    const leagueWeighted =
        weightedLeagueStats(
            allMatches
        );

    const leagueHome =
        Number(
            leagueWeighted.homeGoalsPerMatch
        ) || 1.45;

    const leagueAway =
        Number(
            leagueWeighted.awayGoalsPerMatch
        ) || 1.15;

    const homeAttackStrength =
        home.homeAttack /
        leagueHome;

    const awayDefenseStrength =
        away.awayDefense /
        leagueHome;

    const awayAttackStrength =
        away.awayAttack /
        leagueAway;

    const homeDefenseStrength =
        home.homeDefense /
        leagueAway;

    let homeXg =
        leagueHome *
        homeAttackStrength *
        awayDefenseStrength;

    let awayXg =
        leagueAway *
        awayAttackStrength *
        homeDefenseStrength;

    /*
     * H2H é uma correção pequena.
     * Não substitui a força atual.
     */
    const h2h =
        getHeadToHead(
            allMatches,
            homeTeam,
            awayTeam
        );

    if (
        h2h.matches >= 2 &&
        h2h.confidence > 0
    ) {
        const h2hTotalGoals =
            h2h.homeGoals +
            h2h.awayGoals;

        const baseTotalGoals =
            homeXg +
            awayXg;

        /*
         * Apenas parte do H2H é usada
         * para ajustar os golos esperados.
         */
        const h2hAdjustment =
            clamp(
                h2hTotalGoals /
                    Math.max(
                        0.5,
                        baseTotalGoals
                    ),
                0.85,
                1.15
            );

        homeXg =
            (
                homeXg * 0.90
            ) + (
                homeXg *
                h2hAdjustment *
                0.10
            );

        awayXg =
            (
                awayXg * 0.90
            ) + (
                awayXg *
                h2hAdjustment *
                0.10
            );
    }

    /*
     * Limites de segurança.
     */
    homeXg =
        clamp(
            homeXg,
            0.35,
            3.50
        );

    awayXg =
        clamp(
            awayXg,
            0.25,
            3.25
        );

    return {
        homeXg,
        awayXg,
        h2h
    };
}


/* =========================
   SELEÇÃO
========================= */

function selectionProbability(
    market,
    selection,
    summary
) {
    const normalizedMarket =
        String(
            market || ''
        )
            .trim()
            .toLowerCase();

    const normalizedSelection =
        String(
            selection || ''
        )
            .trim()
            .toLowerCase();

    if (
        normalizedMarket ===
        '1x2'
    ) {
        if (
            [
                '1',
                'casa',
                'home',
                'mandante'
            ].includes(
                normalizedSelection
            )
        ) {
            return summary.homeWin;
        }

        if (
            [
                'x',
                'empate',
                'draw'
            ].includes(
                normalizedSelection
            )
        ) {
            return summary.draw;
        }

        if (
            [
                '2',
                'fora',
                'away',
                'visitante'
            ].includes(
                normalizedSelection
            )
        ) {
            return summary.awayWin;
        }
    }

    if (
        normalizedMarket ===
        'dupla chance'
    ) {
        if (
            [
                '1x',
                'casa ou empate',
                'home or draw'
            ].includes(
                normalizedSelection
            )
        ) {
            return (
                summary.homeWin +
                summary.draw
            );
        }

        if (
            [
                'x2',
                'empate ou fora',
                'draw or away'
            ].includes(
                normalizedSelection
            )
        ) {
            return (
                summary.draw +
                summary.awayWin
            );
        }

        if (
            [
                '12',
                'casa ou fora',
                'home or away'
            ].includes(
                normalizedSelection
            )
        ) {
            return (
                summary.homeWin +
                summary.awayWin
            );
        }
    }

    if (
        normalizedMarket ===
        'ambas marcam'
    ) {
        if (
            [
                'sim',
                'yes'
            ].includes(
                normalizedSelection
            )
        ) {
            return summary.bttsYes;
        }

        if (
            [
                'nao',
                'não',
                'no'
            ].includes(
                normalizedSelection
            )
        ) {
            return summary.bttsNo;
        }
    }

    if (
        normalizedMarket ===
        'over/under'
    ) {
        const match =
            normalizedSelection.match(
                /^(over|under|mais de|menos de)\s*(0\.5|1\.5|2\.5|3\.5|4\.5)$/
            );

        if (match) {
            const direction =
                match[1];

            const line =
                match[2];

            const isOver =
                direction === 'over' ||
                direction === 'mais de';

            return isOver
                ? summary.over[line]
                : summary.under[line];
        }
    }

    return null;
}


/* =========================
   ESTIMAR JOGO
========================= */

async function estimateMatch(
    payload
) {
    const leagueKey =
        String(
            payload?.leagueKey ||
            ''
        ).trim();

    const homeInput =
        String(
            payload?.homeTeam ||
            ''
        ).trim();

    const awayInput =
        String(
            payload?.awayTeam ||
            ''
        ).trim();

    const market =
        String(
            payload?.market ||
            ''
        ).trim();

    const selection =
        String(
            payload?.selection ||
            ''
        ).trim();

    if (
        !LEAGUES[leagueKey]
    ) {
        throw new Error(
            'Seleciona uma liga válida.'
        );
    }

    if (
        !homeInput ||
        !awayInput
    ) {
        throw new Error(
            'Indica as duas equipas.'
        );
    }

    const data =
        await getLeagueData(
            leagueKey
        );

    const names =
        Array.from(
            data.teams.keys()
        );

    const homeName =
        findTeamName(
            homeInput,
            names
        );

    const awayName =
        findTeamName(
            awayInput,
            names
        );

    if (!homeName) {
        throw new Error(
            `Não encontrei a equipa da casa "${homeInput}" nos dados de ${data.league.name}.`
        );
    }

    if (!awayName) {
        throw new Error(
            `Não encontrei a equipa visitante "${awayInput}" nos dados de ${data.league.name}.`
        );
    }

    if (
        homeName === awayName
    ) {
        throw new Error(
            'A equipa da casa e a visitante têm de ser diferentes.'
        );
    }

    const expected =
        calculateExpectedGoals(
            homeName,
            awayName,
            data.league,
            data.currentMatches
                ? data.matches.filter(
                    match =>
                        match.season ===
                        data.currentSeason
                )
                : [],
            data.previousMatches
                ? data.matches.filter(
                    match =>
                        match.season ===
                        data.previousSeason
                )
                : [],
            data.matches
        );

    const matrix =
        buildScoreMatrix(
            expected.homeXg,
            expected.awayXg
        );

    const summary =
        summarizeMatrix(
            matrix
        );

    const probability =
        selectionProbability(
            market,
            selection,
            summary
        );

    if (
        probability === null
    ) {
        throw new Error(
            'O modelo ainda não reconhece esta seleção. Usa 1/X/2, 1X/X2/12, Over 2.5, Under 2.5 ou Ambas Marcam Sim/Não.'
        );
    }

    return {
        leagueKey,

        leagueName:
            data.league?.name ||
            data.league?.label ||
            LEAGUES[leagueKey]?.name ||
            leagueKey,

        season:
            data.season,

        currentSeason:
            data.currentSeason,

        previousSeason:
            data.previousSeason,

        currentSeasonAvailable:
            data.currentAvailable,

        usingCurrentSeason:
            data.currentAvailable,

        currentMatches:
            data.currentMatches,

        previousMatches:
            data.previousMatches,

        sampleMatches:
            data.matches.length,

        homeTeam:
            homeName,

        awayTeam:
            awayName,

        market,

        selection,

        estimatedProbability:
            probability,

        homeWinProbability:
            summary.homeWin,

        drawProbability:
            summary.draw,

        awayWinProbability:
            summary.awayWin,

        bttsYesProbability:
            summary.bttsYes,

        bttsNoProbability:
            summary.bttsNo,

        overProbabilities:
            summary.over,

        underProbabilities:
            summary.under,

        expectedGoals: {
            homeXg:
                expected.homeXg,

            awayXg:
                expected.awayXg
        },

        modelDetails: {
            home:
                teamStrength(
                    homeName,
                    data.league,
                    data.matches.filter(
                        match =>
                            match.season ===
                            data.currentSeason
                    ),
                    data.matches.filter(
                        match =>
                            match.season ===
                            data.previousSeason
                    ),
                    data.matches
                ),

            away:
                teamStrength(
                    awayName,
                    data.league,
                    data.matches.filter(
                        match =>
                            match.season ===
                            data.currentSeason
                    ),
                    data.matches.filter(
                        match =>
                            match.season ===
                            data.previousSeason
                    ),
                    data.matches
                ),

            h2h:
                expected.h2h
        },

        topScores:
            topScores(
                matrix,
                5
            )
    };
}


function topScores(
    matrix,
    limit
) {
    const scores = [];

    for (
        let homeGoals = 0;
        homeGoals < matrix.length;
        homeGoals++
    ) {
        for (
            let awayGoals = 0;
            awayGoals < matrix[homeGoals].length;
            awayGoals++
        ) {
            scores.push({
                score:
                    `${homeGoals}-${awayGoals}`,

                probability:
                    matrix[homeGoals][awayGoals]
            });
        }
    }

    return scores
        .sort(
            (a, b) =>
                b.probability -
                a.probability
        )
        .slice(
            0,
            limit
        );
}


/* =========================
   IPC
========================= */

ipcMain.handle(
    'football-model:estimate',
    async (_event, payload) => {
        try {
            return {
                ok: true,
                data:
                    await estimateMatch(
                        payload
                    )
            };
        } catch (error) {
            return {
                ok: false,
                message:
                    error.message ||
                    'Não foi possível calcular a probabilidade.'
            };
        }
    }
);


ipcMain.handle(
    'football-model:league-summary',
    async (_event, leagueKey) => {
        try {
            return {
                ok: true,
                data:
                    await getLeagueSummary(
                        leagueKey
                    )
            };
        } catch (error) {
            return {
                ok: false,
                message:
                    error.message ||
                    'Não foi possível carregar a liga.'
            };
        }
    }
);

ipcMain.handle(
    'football-model:league-teams',
    async (_event, leagueKey) => {
        try {
            if (!LEAGUES[leagueKey]) {
                return {
                    ok: false,
                    message: 'Liga inválida.'
                };
            }

            const data = await getLeagueData(leagueKey);

            const teams = Array.from(
                data.teams.keys()
            ).sort((a, b) =>
                a.localeCompare(
                    b,
                    'pt',
                    {
                        sensitivity: 'base'
                    }
                )
            );

            return {
                ok: true,
                data: teams
            };
        } catch (error) {
            return {
                ok: false,
                message:
                    error.message ||
                    'Não foi possível carregar as equipas.'
            };
        }
    }
);

ipcMain.handle(
    'football-model:leagues',
    () => {
        return Object.entries(
            LEAGUES
        ).map(
            ([key, value]) => ({
                key,
                ...value
            })
        );
    }
);


/* =========================
   WINDOW
========================= */

function createWindow() {
    const win =
        new BrowserWindow({
            width: 1280,
            height: 800,

            minWidth: 1000,
            minHeight: 650,

            backgroundColor:
                '#0f172a',

            webPreferences: {
                contextIsolation:
                    true,

                preload:
                    path.join(
                        __dirname,
                        'preload.js'
                    )
            }
        });

    win.loadFile(
        path.join(
            __dirname,
            'src',
            'index.html'
        )
    );
}


app.whenReady()
    .then(() => {
        createWindow();

        app.on(
            'activate',
            () => {
                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {
                    createWindow();
                }
            }
        );
    });


app.on(
    'window-all-closed',
    () => {
        if (
            process.platform !==
            'darwin'
        ) {
            app.quit();
        }
    }
);
