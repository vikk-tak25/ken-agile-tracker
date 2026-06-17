const fs = require("fs");
const path = require("path");

const storiesFilePath = path.join(__dirname, "data", "stories.json");

function getStories() {
    const data = fs.readFileSync(storiesFilePath, "utf-8");
    return JSON.parse(data);
}

function saveStories(stories) {
    fs.writeFileSync(storiesFilePath, JSON.stringify(stories, null, 2));
}

function getNextStoryId(stories) {
    if (stories.length === 0) {
        return 1;
    }

    return Math.max(...stories.map(story => story.id)) + 1;
}

function getNextCommentId(comments) {
    if (comments.length === 0) {
        return 1;
    }

    return Math.max(...comments.map(comment => comment.id)) + 1;
}

module.exports = {
    getStories,
    saveStories,
    getNextStoryId,
    getNextCommentId
};