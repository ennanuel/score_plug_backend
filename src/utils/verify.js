function verifyAuthToken(req, res, next) {
    try {
        const headers = req.headers;
        const authToken = headers['auth-token'];
        console.log(headers);

        if (authToken !== process.env.AUTH_TOKEN) throw new Error("You are not authorized!");
        
        next();
    } catch (error) {
        console.error(error);
        return res.status(403).json({ message: error.message });
    }
}

module.exports = {
    verifyAuthToken
}