const refineResult = require('./refineResult')

const filterResult = (data, regex) => {
    const result = data
        .filter( elem => elem.matches.some( match => regex.test(match.status) ) )
        .map( elem => ({
            ...elem, 
            matches: elem.matches ?
                elem.matches
                    .filter( match => regex.test(match.status === 'PAUSED' ? 'IN_PLAY' : match.status) )
                    .map( match => refineResult(match) ) :
                null
        }) ) 

    return result
}

module.exports = filterResult