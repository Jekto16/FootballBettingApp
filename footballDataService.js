const LEAGUES = {
    PL: { code: 'E0', name: 'Premier League', country: 'Inglaterra' },
    PD: { code: 'SP1', name: 'La Liga', country: 'Espanha' },
    BL1: { code: 'D1', name: 'Bundesliga', country: 'Alemanha' },
    SA: { code: 'I1', name: 'Serie A', country: 'Itália' },
    FL1: { code: 'F1', name: 'Ligue 1', country: 'França' },
    PPL: { code: 'P1', name: 'Liga Portugal', country: 'Portugal' }
};

const cache = new Map();
const CACHE_MS = 15 * 60 * 1000;

function currentSeasonCode() {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 6 ? year : year - 1;

    return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
}

function previousSeasonCode() {
    const current = currentSeasonCode();
    const startYear = 2000 + Number(current.slice(0, 2));

    return `${String(startYear - 1).slice(-2)}${String(startYear).slice(-2)}`;
}

function parseCsvLine(line) {
    const result = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (quoted && line[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                quoted = !quoted;
            }

            continue;
        }

        if (char === ',' && !quoted) {
            result.push(value.trim());
            value = '';
            continue;
        }

        value += char;
    }

    result.push(value.trim());

    return result;
}

function parseCsv(csv) {
    const lines = csv
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter(Boolean);

    if (lines.length < 2) {
        return [];
    }

    const headers = parseCsvLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
        });

        return row;
    });
}

async function downloadSeason(leagueKey, season) {
    const league = LEAGUES[leagueKey];

    if (!league) {
        throw new Error(`Liga desconhecida: ${leagueKey}`);
    }

    const cacheKey = `${leagueKey}-${season}`;
    const cached = cache.get(cacheKey);

    if (
        cached &&
        Date.now() - cached.timestamp < CACHE_MS
    ) {
        return cached.matches;
    }

    const url =
        `https://www.football-data.co.uk/mmz4281/${season}/${league.code}.csv`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Dados indisponíveis para ${league.name} (${season}). HTTP ${response.status}`
        );
    }

    const csv = await response.text();
    const rows = parseCsv(csv);

    const matches = rows
        .filter(row => row.HomeTeam && row.AwayTeam)
        .map(row => ({
            date: row.Date || '',
            homeTeam: row.HomeTeam,
            awayTeam: row.AwayTeam,
            homeGoals: Number(row.FTHG),
            awayGoals: Number(row.FTAG),
            result: row.FTR,
            season
        }))
        .filter(match =>
            Number.isFinite(match.homeGoals) &&
            Number.isFinite(match.awayGoals)
        );

    cache.set(cacheKey, {
        timestamp: Date.now(),
        matches
    });

    return matches;
}

function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function findTeamName(input, names) {
    const target = normalizeName(input);

    if (!target) {
        return null;
    }

    const exact = names.find(
        name => normalizeName(name) === target
    );

    if (exact) {
        return exact;
    }

    const partial = names.filter(name => {
        const normalized = normalizeName(name);

        return (
            normalized.includes(target) ||
            target.includes(normalized)
        );
    });

    if (partial.length === 1) {
        return partial[0];
    }

    return null;
}

function calculateTeamStats(matches) {
    const teams = new Map();

    function get(name) {
        if (!teams.has(name)) {
            teams.set(name, {
                name,
                homePlayed: 0,
                homeGoalsFor: 0,
                homeGoalsAgainst: 0,
                awayPlayed: 0,
                awayGoalsFor: 0,
                awayGoalsAgainst: 0,
                played: 0,
                goalsFor: 0,
                goalsAgainst: 0
            });
        }

        return teams.get(name);
    }

    let totalHomeGoals = 0;
    let totalAwayGoals = 0;
    let matchesCount = 0;

    for (const match of matches) {
        const home = get(match.homeTeam);
        const away = get(match.awayTeam);

        home.homePlayed++;
        home.homeGoalsFor += match.homeGoals;
        home.homeGoalsAgainst += match.awayGoals;
        home.played++;
        home.goalsFor += match.homeGoals;
        home.goalsAgainst += match.awayGoals;

        away.awayPlayed++;
        away.awayGoalsFor += match.awayGoals;
        away.awayGoalsAgainst += match.homeGoals;
        away.played++;
        away.goalsFor += match.awayGoals;
        away.goalsAgainst += match.homeGoals;

        totalHomeGoals += match.homeGoals;
        totalAwayGoals += match.awayGoals;
        matchesCount++;
    }

    const league = {
        matches: matchesCount,

        homeGoalsPerMatch:
            matchesCount
                ? totalHomeGoals / matchesCount
                : 0,

        awayGoalsPerMatch:
            matchesCount
                ? totalAwayGoals / matchesCount
                : 0,

        totalGoalsPerMatch:
            matchesCount
                ? (totalHomeGoals + totalAwayGoals) / matchesCount
                : 0
    };

    return {
        teams,
        league
    };
}

function mergeMatches(previousMatches, currentMatches) {
    if (!currentMatches.length) {
        return previousMatches;
    }

    if (!previousMatches.length) {
        return currentMatches;
    }

    // Mantemos um limite de histórico para evitar que épocas muito antigas
    // dominem o modelo. A ponderação temporal é feita posteriormente no motor.
    const currentLimit = Math.min(currentMatches.length, 380);
    const previousLimit = Math.min(previousMatches.length, 380);

    const current = currentMatches.slice(-currentLimit);
    const previous = previousMatches.slice(-previousLimit);

    return [...previous, ...current];
}

async function getLeagueData(leagueKey) {
    const current = currentSeasonCode();
    const previous = previousSeasonCode();

    let currentMatches = [];

    try {
        currentMatches = await downloadSeason(
            leagueKey,
            current
        );
    } catch (_) {
        currentMatches = [];
    }

    let previousMatches = [];

    try {
        previousMatches = await downloadSeason(
            leagueKey,
            previous
        );
    } catch (_) {
        previousMatches = [];
    }

    const allMatches =
        mergeMatches(
            previousMatches,
            currentMatches
        );

    const currentStats =
        calculateTeamStats(
            currentMatches
        );

    const previousStats =
        calculateTeamStats(
            previousMatches
        );

    const allStats =
        calculateTeamStats(
            allMatches
        );

    return {
        leagueKey,
        league: LEAGUES[leagueKey],

        season: current,
        currentSeason: current,
        previousSeason: previous,

        currentAvailable:
            currentMatches.length > 0,

        currentMatches:
            currentMatches.length,

        previousMatches:
            previousMatches.length,

        modelMatches:
            allMatches.length,

        // Mantidos para compatibilidade.
        // O novo motor usa currentStats + previousStats
        // e calcula os pesos por equipa.
        usingCurrentSeason:
            currentMatches.length > 0,

        matches: allMatches,

        currentStats,
        previousStats,
        allStats,

        ...allStats
    };
}

async function getLeagueSummary(leagueKey) {
    const data =
        await getLeagueData(
            leagueKey
        );

    return {
        leagueKey,
        name: data.league.name,
        country: data.league.country,
        season: data.season,
        currentSeason: data.currentSeason,
        currentAvailable: data.currentAvailable,
        matches: data.matches.length,
        currentMatches: data.currentMatches,
        previousMatches: data.previousMatches,
        usingCurrentSeason: data.usingCurrentSeason,
        teams:
            Array.from(
                data.teams.keys()
            ).sort()
    };
}

module.exports = {
    LEAGUES,
    currentSeasonCode,
    previousSeasonCode,
    getLeagueData,
    getLeagueSummary,
    findTeamName
};
