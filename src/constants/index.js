require('dotenv').config()

const headers = {
    'x-auth-token': process.env.API_KEY
}

const compRanking = [
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

module.exports = { headers, compRanking, THREE_DAYS_IN_MS, ONE_DAY_IN_MS, VALID_MATCH_STATUS_REGEX }