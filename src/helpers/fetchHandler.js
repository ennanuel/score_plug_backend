const axios = require("axios");
const { HEADERS } = require("../constants");

const fetchHandler = (url) => new Promise(
    async function (resolve, reject) {
        try {
            const result = await axios.get(url, { headers: HEADERS });
            resolve(result.data);
        } catch (error) {
            reject(error);
        }
    }
);

// There is a limit to how many times I can the API I use, so this is like a cool down - I'm using a Free Tier 😂;

const delay = (delayInMs = 10000) => new Promise(resolve => setTimeout(resolve, delayInMs));

module.exports = {
    fetchHandler,
    delay
};