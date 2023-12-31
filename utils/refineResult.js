const { rearrangeScore, rearrangeTime, rearrangeGameTime } = require("./rearrange")

const refineResult = ( result ) => {
    const currentDate = new Date()
    const matchDate = new Date(result.utcDate)

    const score = rearrangeScore(result.score)

    result.score = score
    result.remTime = null
    result.liveTime = null

    if( result.status === 'TIMED' ) {
        result.remTime = rearrangeGameTime(currentDate, matchDate)
    } 
    else if( result.status === 'IN_PLAY' ) {
        result.liveTime = rearrangeTime( currentDate, matchDate )
    } else if( result.status === 'PAUSED' ) {
        result.liveTime = 'HT'
    } else {
        result.liveTime = 'FT'
    }

    return result;
}

module.exports = refineResult