const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Agile Tracker API töötab"
    });
});

app.listen(PORT, () => {
    console.log(`Server töötab aadressil http://localhost:${PORT}`);
});