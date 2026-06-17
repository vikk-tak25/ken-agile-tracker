const express = require("express");
const path = require("path");
const {
    getStories,
    saveStories,
    getNextStoryId
} = require("./storyStorage");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getCurrentDateTime() {
    const now = new Date();

    return now.toLocaleString("et-EE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function validateStoryInput(story) {
    if (!story.title || story.title.trim() === "") {
        return "Pealkiri on kohustuslik.";
    }

    if (!story.description || story.description.trim() === "") {
        return "Kirjeldus on kohustuslik.";
    }

    if (story.points === undefined || story.points === null || story.points === "") {
        return "Punktid on kohustuslikud.";
    }

    if (!Number.isInteger(Number(story.points))) {
        return "Punktid peavad olema täisarv.";
    }

    if (Number(story.points) < 0) {
        return "Punktid ei tohi olla negatiivsed.";
    }

    if (
        !story.acceptanceCriteria ||
        !Array.isArray(story.acceptanceCriteria) ||
        story.acceptanceCriteria.length === 0 ||
        story.acceptanceCriteria.every(criteria => criteria.trim() === "")
    ) {
        return "Vähemalt üks vastuvõtutingimus on kohustuslik.";
    }

    if (story.status && !["todo", "doing", "done"].includes(story.status)) {
        return "Staatus peab olema todo, doing või done.";
    }

    return null;
}

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Agile Tracker API töötab"
    });
});

app.get("/api/stories", (req, res) => {
    const stories = getStories();

    const sortedStories = stories.sort((a, b) => {
        if (a.status === "todo" && b.status === "todo") {
            return a.priority - b.priority;
        }

        return a.id - b.id;
    });

    res.json(sortedStories);
});

app.get("/api/stories/:id", (req, res) => {
    const stories = getStories();
    const storyId = Number(req.params.id);

    const story = stories.find(item => item.id === storyId);

    if (!story) {
        return res.status(404).json({
            error: "Storyt ei leitud."
        });
    }

    res.json(story);
});

app.post("/api/stories", (req, res) => {
    const stories = getStories();
    const validationError = validateStoryInput(req.body);

    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    const todoStories = stories.filter(story => story.status === "todo");
    const nextPriority = todoStories.length > 0
        ? Math.max(...todoStories.map(story => story.priority || 0)) + 1
        : 1;

    const newStory = {
        id: getNextStoryId(stories),
        title: req.body.title.trim(),
        description: req.body.description ? req.body.description.trim() : "",
        status: req.body.status || "todo",
        points: Number(req.body.points),
        priority: req.body.priority || nextPriority,
        acceptanceCriteria: req.body.acceptanceCriteria
            .map(criteria => criteria.trim())
            .filter(criteria => criteria !== ""),
        comments: [],
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime()
    };

    stories.push(newStory);
    saveStories(stories);

    res.status(201).json(newStory);
});

app.put("/api/stories/:id", (req, res) => {
    const stories = getStories();
    const storyId = Number(req.params.id);
    const storyIndex = stories.findIndex(story => story.id === storyId);

    if (storyIndex === -1) {
        return res.status(404).json({
            error: "Storyt ei leitud."
        });
    }

    const validationError = validateStoryInput(req.body);

    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    const oldStory = stories[storyIndex];

    const updatedStory = {
        ...oldStory,
        title: req.body.title.trim(),
        description: req.body.description ? req.body.description.trim() : "",
        status: req.body.status || oldStory.status,
        points: Number(req.body.points),
        priority: req.body.priority || oldStory.priority,
        acceptanceCriteria: req.body.acceptanceCriteria
            .map(criteria => criteria.trim())
            .filter(criteria => criteria !== ""),
        updatedAt: getCurrentDateTime()
    };

    stories[storyIndex] = updatedStory;
    saveStories(stories);

    res.json(updatedStory);
});

app.delete("/api/stories/:id", (req, res) => {
    const stories = getStories();
    const storyId = Number(req.params.id);

    const storyExists = stories.some(story => story.id === storyId);

    if (!storyExists) {
        return res.status(404).json({
            error: "Storyt ei leitud."
        });
    }

    const updatedStories = stories.filter(story => story.id !== storyId);
    saveStories(updatedStories);

    res.json({
        message: "Story kustutati."
    });
});

app.patch("/api/stories/:id/status", (req, res) => {
    const stories = getStories();
    const storyId = Number(req.params.id);
    const story = stories.find(item => item.id === storyId);

    if (!story) {
        return res.status(404).json({
            error: "Storyt ei leitud."
        });
    }

    const newStatus = req.body.status;

    if (!["todo", "doing", "done"].includes(newStatus)) {
        return res.status(400).json({
            error: "Staatus peab olema todo, doing või done."
        });
    }

    story.status = newStatus;
    story.updatedAt = getCurrentDateTime();

    saveStories(stories);

    res.json(story);
});

app.patch("/api/stories/reorder", (req, res) => {
    const stories = getStories();
    const storyIds = req.body.storyIds;

    if (!Array.isArray(storyIds)) {
        return res.status(400).json({
            error: "Story ID-de nimekiri peab olema massiiv."
        });
    }

    storyIds.forEach((id, index) => {
        const story = stories.find(item => item.id === Number(id));

        if (story && story.status === "todo") {
            story.priority = index + 1;
            story.updatedAt = getCurrentDateTime();
        }
    });

    saveStories(stories);

    res.json({
        message: "Backlogi järjekord salvestati."
    });
});

app.listen(PORT, () => {
    console.log(`Server töötab aadressil http://localhost:${PORT}`);
});