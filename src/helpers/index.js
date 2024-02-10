const {
    FIRST_HALF_MINUTES,
    HALF_TIME_BREAK_MINUTES,
    HALF_TIME_MINUTES,
    SECOND_HALF_MINUTES,
    EXTRA_TIME_FIRST_HALF_MINUTES,
    EXTRA_TIME_HALF_TIME_MINUTES,
    EXTRA_TIME_SECOND_HALF_MINUTES,
} = require("../constants");

const convertToNumber = (val) => /nan/i.test(Number(val)) ? 0 : Number(val);

function getRegularMatchMinutes(minutesPassed) {
    var inFirstHalf = minutesPassed < FIRST_HALF_MINUTES;
    var inFirstHalfPastMinute45 = minutesPassed >= FIRST_HALF_MINUTES && minutesPassed < HALF_TIME_MINUTES;
    var inSecondHalf = minutesPassed >= HALF_TIME_MINUTES && minutesPassed < SECOND_HALF_MINUTES;
    
    const matchMinutes = inFirstHalf ?
        minutesPassed :
        inFirstHalfPastMinute45 ?
            45 + '+' :
            inSecondHalf ?
                minutesPassed - HALF_TIME_BREAK_MINUTES :
                90 + '+';
    
    return matchMinutes;
};

function getExtraMatchTimeMinutes(minutesPassed) {
    var inFirstHalf = minutesPassed < EXTRA_TIME_FIRST_HALF_MINUTES;
    var inFirstHalfPastMinute15 = minutesPassed >= EXTRA_TIME_FIRST_HALF_MINUTES && minutesPassed < EXTRA_TIME_HALF_TIME_MINUTES;
    var inSecondHalf = minutesPassed > EXTRA_TIME_HALF_TIME_MINUTES && minutesPassed <= EXTRA_TIME_SECOND_HALF_MINUTES;
    
    const matchMinutes = inFirstHalf ?
        minutesPassed :
        inFirstHalfPastMinute15 ?
            15 + '+' :
            inSecondHalf ?
                minutesPassed - HALF_TIME_BREAK_MINUTES :
                30 + '+';
    
    return matchMinutes;

}

module.exports = {
    convertToNumber,
    getRegularMatchMinutes,
    getExtraMatchTimeMinutes
}