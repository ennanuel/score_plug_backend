const convertToNumber = (val) => /nan/i.test(Number(val)) ? 0 : Number(val);

module.exports = {
    convertToNumber
}