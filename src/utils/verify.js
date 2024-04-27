const liveUpdate = require("../controllers/liveUpdate");

function verifyAuthToken(req, res, next) {
    try {
        const headers = req.headers;
        const authToken = headers['auth-token'];

        if (authToken !== process.env.AUTH_TOKEN) throw new Error("You are not authorized!");
        
        next();
    } catch (error) {
        console.error(error);
        liveUpdate(req, res);
    }
}

module.exports = {
    verifyAuthToken
}