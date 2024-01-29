const mongoose = require("mongoose");

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