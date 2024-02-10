require('dotenv').config()

const HEADERS = {
    'x-auth-token': process.env.API_KEY
}

const COMPETITION_RANKINGS = [
    {
        name: 'FIFA World Cup',
        code: 'WC'
    },
    {
        name: 'Euros',
        code: 'EC'
    },
    {
        name: 'UEFA Champions League',
        code: 'CL'
    },
    {
        name: 'England Premier League',
        code: 'PL'
    },
    {
        name: 'Bundesliga',
        code: 'BL1'
    },
    {
        name: 'La Liga',
        code: 'PD'
    },
    {
        name: 'Serie A',
        code: 'SA'
    },
    {
        name: 'Eredivisie',
        code: 'DED'
    },
    {
        name: 'Ligue 1',
        code: 'FL1'
    },
    {
        name: 'England Championship',
        code: 'ELC'
    },
    {
        name: 'Copa Libertadores',
        code: 'CLI'
    },
    {
        name: 'Primeira Liga',
        code: 'PPL'
    },
    {
        name: 'Brazil Serie A',
        code: 'BSA'
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
const SECOND_HALF_MINUTES = FIRST_HALF_MINUTES * 2;
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