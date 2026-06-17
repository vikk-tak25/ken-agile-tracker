const columns = {
    todo: document.getElementById("todo-column"),
    doing: document.getElementById("doing-column"),
    done: document.getElementById("done-column")
};

const pointTotals = {
    todo: document.getElementById("todo-points"),
    doing: document.getElementById("doing-points"),
    done: document.getElementById("done-points")
};

const storyForm = document.getElementById("story-form");
const formMessage = document.getElementById("form-message");

storyForm.addEventListener("submit", handleStorySubmit);

async function loadStories() {
    try {
        const response = await fetch("/api/stories");

        if (!response.ok) {
            throw new Error("Story'de laadimine ebaõnnestus.");
        }

        const stories = await response.json();
        renderStories(stories);
    } catch (error) {
        showError(error.message);
    }
}

async function handleStorySubmit(event) {
    event.preventDefault();

    const formData = new FormData(storyForm);

    const title = formData.get("title").trim();
    const description = formData.get("description").trim();
    const pointsValue = formData.get("points");
    const acceptanceCriteriaText = formData.get("acceptanceCriteria").trim();

    const acceptanceCriteria = acceptanceCriteriaText
        .split("\n")
        .map(criteria => criteria.trim())
        .filter(criteria => criteria !== "");

    const validationError = validateForm(title, description, pointsValue, acceptanceCriteria);

    if (validationError) {
        showFormMessage(validationError, "error");
        return;
    }

    const newStory = {
        title,
        description,
        points: Number(pointsValue),
        status: "todo",
        acceptanceCriteria
    };

    try {
        const response = await fetch("/api/stories", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newStory)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Story lisamine ebaõnnestus.");
        }

        storyForm.reset();
        showFormMessage("Story lisati edukalt.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

function validateForm(title, description, pointsValue, acceptanceCriteria) {
    if (title === "") {
        return "Pealkiri on kohustuslik.";
    }

    if (description === "") {
        return "Kirjeldus on kohustuslik.";
    }

    if (pointsValue === "") {
        return "Punktid on kohustuslikud.";
    }

    if (!Number.isInteger(Number(pointsValue))) {
        return "Punktid peavad olema täisarv.";
    }

    if (Number(pointsValue) < 0) {
        return "Punktid ei tohi olla negatiivsed.";
    }

    if (acceptanceCriteria.length === 0) {
        return "Lisa vähemalt üks vastuvõtutingimus.";
    }

    return null;
}

function renderStories(stories) {
    clearColumns();

    const totals = {
        todo: 0,
        doing: 0,
        done: 0
    };

    const sortedStories = [...stories].sort((a, b) => {
        if (a.status === "todo" && b.status === "todo") {
            return a.priority - b.priority;
        }

        return a.id - b.id;
    });

    sortedStories.forEach(story => {
        const card = createStoryCard(story);

        if (columns[story.status]) {
            columns[story.status].appendChild(card);
            totals[story.status] += Number(story.points);
        }
    });

    updatePointTotals(totals);
    showEmptyMessages();
}

function createStoryCard(story) {
    const card = document.createElement("article");
    card.className = "story-card";

    const criteriaItems = story.acceptanceCriteria
        .map(criteria => `<li>${escapeHtml(criteria)}</li>`)
        .join("");

    card.innerHTML = `
        <h3>${escapeHtml(story.title)}</h3>
        <p>${escapeHtml(story.description || "")}</p>
        <p class="story-meta">ID: ${story.id}</p>
        <p class="story-meta">Staatus: ${story.status}</p>
        <p class="story-meta">Punktid: ${story.points}</p>
        <p class="story-meta">Prioriteet: ${story.priority}</p>
        <strong>Vastuvõtutingimused:</strong>
        <ul class="criteria-list">
            ${criteriaItems}
        </ul>
    `;

    return card;
}

function clearColumns() {
    Object.values(columns).forEach(column => {
        column.innerHTML = "";
    });
}

function updatePointTotals(totals) {
    pointTotals.todo.textContent = `Punkte kokku: ${totals.todo}`;
    pointTotals.doing.textContent = `Punkte kokku: ${totals.doing}`;
    pointTotals.done.textContent = `Punkte kokku: ${totals.done}`;
}

function showEmptyMessages() {
    Object.values(columns).forEach(column => {
        if (column.children.length === 0) {
            const message = document.createElement("p");
            message.className = "empty-message";
            message.textContent = "Selles veerus story'sid ei ole.";
            column.appendChild(message);
        }
    });
}

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = type === "success" ? "message-success" : "message-error";
}

function showError(message) {
    document.querySelector("main").innerHTML = `
        <div class="error-message">
            ${escapeHtml(message)}
        </div>
    `;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadStories();