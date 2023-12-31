const rearrangeComps = ( data ) => {
    let result = []
    
    data.forEach( (match) => {
        const leagueIndex = result.findIndex( elem => elem?.competition?.code === match.competition.code )
        const { area, competition, season, odds, ...others } = match

        if(result.length < 1 || leagueIndex === -1) {
            result.push({
                competition: { ...competition, area, season },
                matches: [others]
            })
        }
        else {
            result[leagueIndex].matches.push(others)
        }
    })

    return result
}

const rearrangeScore = ( oldScore ) => {
    const newScore = {
        winner: oldScore.winner,
        duration: oldScore.duration,
        firstHalf: {
            home: (oldScore.halfTime.home === null && oldScore.fullTime.home !== null) ? oldScore.fullTime.home : oldScore.halfTime.home,
            away: (oldScore.halfTime.away === null && oldScore.fullTime.away !== null) ? oldScore.fullTime.away : oldScore.halfTime.away
        },
        secondHalf: {
            home: (oldScore.halfTime.home !== null && oldScore.fullTime.home !== null) ? oldScore.fullTime.home - oldScore.halfTime.home : null,
            away: (oldScore.halfTime.away !== null && oldScore.fullTime.away !== null) ? oldScore.fullTime.away - oldScore.halfTime.away : null
        },
        fullTime: {
            home: oldScore.fullTime.home || null,
            away: oldScore.fullTime.away || null
        }
    }

    return newScore
}

const rearrangeGameTime = ( currTime, matchTime ) => {
    const timeLeft = matchTime.getTime() - currTime.getTime();
    const days = parseInt(timeLeft / (1000 * 60 * 60 * 24))
    const hours = parseInt(timeLeft / (1000 * 60 * 60))
    const minutes = parseInt(timeLeft / (1000 * 60))
    
    const remTimeToMatch = {
        days: days > 0 ? days : null,
        hours: hours > 0 ? hours : null,
        minute: minutes > 0 ? minutes : null
    }

    return remTimeToMatch;
}

const rearrangeTime = ( currTime, matchTime ) => {
    const minsPassed = Math.floor((currTime.getTime() - matchTime.getTime()) / (1000 * 60))

    const newMinsPassed = (minsPassed < 45) ?
    minsPassed : 
    (minsPassed >= 45 && minsPassed < 60) ?
    45 + '+' : 
    (minsPassed >= 60 && minsPassed < 90) ?
    minsPassed - 15 :
    90 + '+'

    return newMinsPassed
}

module.exports = { rearrangeComps, rearrangeScore, rearrangeTime, rearrangeGameTime }