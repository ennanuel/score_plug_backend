require('dotenv').config()

const HEADERS = {
    'x-auth-token': process.env.API_KEY
}

const COMPETITION_RANKINGS = [
    {
        name: 'UEFA Champions League',
        code: 'CL',
        emblem: `${process.env.LIVE_URL}/assets/competitions/ucl-logo.png`
    },
    {
        name: 'England Premier League',
        code: 'PL',
        emblem: `${process.env.LIVE_URL}/assets/competitions/premier-league-logo.png`
    },
    {
        name: 'La Liga',
        code: 'PD',
        emblem: `${process.env.LIVE_URL}/assets/competitions/laliga-logo.png`
    },
    {
        name: 'Bundesliga',
        code: 'BL1',
        emblem: `${process.env.LIVE_URL}/assets/competitions/bundesliga-logo.png`
    },
    {
        name: 'Serie A',
        code: 'SA',
        emblem: `${process.env.LIVE_URL}/assets/competitions/serie-a-logo.png`
    },
    {
        name: 'Eredivisie',
        code: 'DED',
        emblem: `${process.env.LIVE_URL}/assets/competitions/eredivisie-logo.png`
    },
    {
        name: 'FIFA World Cup',
        code: 'WC',
        emblem: `${process.env.LIVE_URL}/assets/competitions/fifa-world-cup-logo.png`
    },
    {
        name: 'Euros',
        code: 'EC',
        emblem: `${process.env.LIVE_URL}/assets/competitions/euros-logo.png`
    },
    {
        name: 'England Championship',
        code: 'ELC',
        emblem: `${process.env.LIVE_URL}/assets/competitions/championship-logo.png`
    },
    {
        name: 'Ligue 1',
        code: 'FL1',
        emblem: `${process.env.LIVE_URL}/assets/competitions/ligue-1-logo.png`
    },
    {
        name: 'Copa Libertadores',
        code: 'CLI',
        emblem: `${process.env.LIVE_URL}/assets/competitions/copa-libertadores-logo.png`
    },
    {
        name: 'Liga Portugal',
        code: 'PPL',
        emblem: `${process.env.LIVE_URL}/assets/competitions/liga-portugal-logo.png`
    },
    {
        name: 'Brazil Serie A',
        code: 'BSA',
        emblem: `${process.env.LIVE_URL}/assets/competitions/brasil-serie-a-logo.png`
    },
];

const VALID_MATCH_STATUS_REGEX = /(in_play|timed|finished)/i;

const THREE_DAYS_IN_MS = 259200000;
const ONE_DAY_IN_MS = 86400000;
const ONE_HOUR_IN_MS = 3600000;
const ONE_MINUTE_IN_MS = 60000;
const ONE_SECOND_IN_MS = 1000;

const FIRST_HALF_MINUTES = 45;
const HALF_TIME_BREAK_MINUTES = 17;
const HALF_TIME_MINUTES = FIRST_HALF_MINUTES + HALF_TIME_BREAK_MINUTES;
const SECOND_HALF_MINUTES = (FIRST_HALF_MINUTES * 2) + HALF_TIME_BREAK_MINUTES;
const EXTRA_TIME_FIRST_HALF_MINUTES = SECOND_HALF_MINUTES + HALF_TIME_BREAK_MINUTES + 25;
const EXTRA_TIME_HALF_TIME_MINUTES = EXTRA_TIME_FIRST_HALF_MINUTES + 5;
const EXTRA_TIME_SECOND_HALF_MINUTES = EXTRA_TIME_HALF_TIME_MINUTES + 15;

module.exports = {
    HEADERS,
    COMPETITION_RANKINGS,
    THREE_DAYS_IN_MS,
    ONE_DAY_IN_MS,
    ONE_HOUR_IN_MS,
    ONE_MINUTE_IN_MS,
    ONE_SECOND_IN_MS,
    VALID_MATCH_STATUS_REGEX,
    FIRST_HALF_MINUTES,
    HALF_TIME_BREAK_MINUTES,
    HALF_TIME_MINUTES,
    SECOND_HALF_MINUTES,
    EXTRA_TIME_FIRST_HALF_MINUTES,
    EXTRA_TIME_HALF_TIME_MINUTES,
    EXTRA_TIME_SECOND_HALF_MINUTES
}