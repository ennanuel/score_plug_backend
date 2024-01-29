const mongoose = require("mongoose");

// The express is declared in a different file to fix jest exit error when testing.

const app = require("./app");

mongoose.set('strictQuery', false);

mongoose
    .connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => app.listen(process.env.PORT, () => {
        console.log("Server is running...")
    }))
    .catch((err) => console.log(err));