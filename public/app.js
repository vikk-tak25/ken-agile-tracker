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
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

let editingStoryId = null;
let draggedStoryId = null;

storyForm.addEventListener("submit", handleStorySubmit);
cancelEditButton.addEventListener("click", cancelEditMode);
columns.todo.addEventListener("dragover", handleDragOver);
columns.todo.addEventListener("drop", handleDrop);

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

    const storyData = {
        title,
        description,
        points: Number(pointsValue),
        status: "todo",
        acceptanceCriteria
    };

    if (editingStoryId) {
        await updateStory(editingStoryId, storyData);
    } else {
        await createStory(storyData);
    }
}

async function createStory(storyData) {
    try {
        const response = await fetch("/api/stories", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(storyData)
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

async function updateStory(storyId, storyData) {
    try {
        const oldResponse = await fetch(`/api/stories/${storyId}`);
        const oldStory = await oldResponse.json();

        if (!oldResponse.ok) {
            throw new Error(oldStory.error || "Story andmete laadimine ebaõnnestus.");
        }

        const updatedStory = {
            ...storyData,
            status: oldStory.status,
            priority: oldStory.priority
        };

        const response = await fetch(`/api/stories/${storyId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedStory)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Story muutmine ebaõnnestus.");
        }

        cancelEditMode();
        showFormMessage("Story muudeti edukalt.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

async function deleteStory(storyId) {
    const confirmed = confirm("Kas oled kindel, et soovid selle story kustutada?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/stories/${storyId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Story kustutamine ebaõnnestus.");
        }

        showFormMessage("Story kustutati.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

async function changeStoryStatus(storyId, newStatus) {
    try {
        const response = await fetch(`/api/stories/${storyId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Staatuse muutmine ebaõnnestus.");
        }

        showFormMessage("Story staatus muudeti.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

async function addComment(storyId) {
    const commentInput = document.getElementById(`comment-${storyId}`);
    const text = commentInput.value.trim();

    if (text === "") {
        showFormMessage("Kommentaar ei tohi olla tühi.", "error");
        return;
    }

    try {
        const response = await fetch(`/api/stories/${storyId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Kommentaari lisamine ebaõnnestus.");
        }

        showFormMessage("Kommentaar lisati.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

async function deleteComment(storyId, commentId) {
    const confirmed = confirm("Kas oled kindel, et soovid selle kommentaari kustutada?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/stories/${storyId}/comments/${commentId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Kommentaari kustutamine ebaõnnestus.");
        }

        showFormMessage("Kommentaar kustutati.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

function handleDragStart(event) {
    const card = event.currentTarget;

    if (card.dataset.status !== "todo") {
        return;
    }

    draggedStoryId = Number(card.dataset.id);
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(event) {
    event.currentTarget.classList.remove("dragging");
    draggedStoryId = null;
}

function handleDragOver(event) {
    event.preventDefault();

    const draggingCard = document.querySelector(".dragging");

    if (!draggingCard) {
        return;
    }

    const afterElement = getDragAfterElement(columns.todo, event.clientY);

    if (afterElement === null) {
        columns.todo.appendChild(draggingCard);
    } else {
        columns.todo.insertBefore(draggingCard, afterElement);
    }
}

async function handleDrop(event) {
    event.preventDefault();

    const orderedStoryIds = Array.from(columns.todo.querySelectorAll(".story-card"))
        .map(card => Number(card.dataset.id));

    await saveBacklogOrder(orderedStoryIds);
}

function getDragAfterElement(container, mouseY) {
    const draggableCards = Array.from(
        container.querySelectorAll(".story-card:not(.dragging)")
    );

    return draggableCards.reduce((closest, card) => {
        const box = card.getBoundingClientRect();
        const offset = mouseY - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return {
                offset,
                element: card
            };
        }

        return closest;
    }, {
        offset: Number.NEGATIVE_INFINITY,
        element: null
    }).element;
}

async function saveBacklogOrder(storyIds) {
    try {
        const response = await fetch("/api/stories/reorder", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                storyIds
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Backlogi järjekorra salvestamine ebaõnnestus.");
        }

        showFormMessage("Backlogi järjekord salvestati.", "success");
        loadStories();
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

async function startEditMode(storyId) {
    try {
        const response = await fetch(`/api/stories/${storyId}`);
        const story = await response.json();

        if (!response.ok) {
            throw new Error(story.error || "Story andmete laadimine ebaõnnestus.");
        }

        editingStoryId = story.id;

        storyForm.elements.title.value = story.title;
        storyForm.elements.description.value = story.description;
        storyForm.elements.points.value = story.points;
        storyForm.elements.acceptanceCriteria.value = story.acceptanceCriteria.join("\n");

        submitButton.textContent = "Salvesta muudatused";
        cancelEditButton.classList.remove("hidden");

        showFormMessage(`Muudad storyt ID-ga ${story.id}.`, "success");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        showFormMessage(error.message, "error");
    }
}

function cancelEditMode() {
    editingStoryId = null;
    storyForm.reset();
    submitButton.textContent = "Lisa story";
    cancelEditButton.classList.add("hidden");
    formMessage.textContent = "";
    formMessage.className = "";
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
    card.dataset.id = story.id;
card.dataset.status = story.status;

if (story.status === "todo") {
    card.draggable = true;
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
}

    const criteriaItems = story.acceptanceCriteria
        .map(criteria => `<li>${escapeHtml(criteria)}</li>`)
        .join("");

        const comments = Array.isArray(story.comments) ? story.comments : [];

const commentItems = comments.length > 0
    ? comments.map(comment => `
        <li>
            ${escapeHtml(comment.text)}
            <br>
            <small>${escapeHtml(comment.createdAt)}</small>
            <br>
            <button
                type="button"
                class="small-danger-button"
                onclick="deleteComment(${story.id}, ${comment.id})"
            >
                Kustuta kommentaar
            </button>
        </li>
    `).join("")
    : "<li>Kommentaare ei ole.</li>";

    card.innerHTML = `
        <h3>${escapeHtml(story.title)}</h3>
        <p>${escapeHtml(story.description || "")}</p>
        <p class="story-meta">ID: ${story.id}</p>
        <div class="status-control">
    <label for="status-${story.id}">Staatus:</label>
    <select id="status-${story.id}" onchange="changeStoryStatus(${story.id}, this.value)">
        <option value="todo" ${story.status === "todo" ? "selected" : ""}>Todo</option>
        <option value="doing" ${story.status === "doing" ? "selected" : ""}>Doing</option>
        <option value="done" ${story.status === "done" ? "selected" : ""}>Done</option>
    </select>
</div>
        <p class="story-meta">Punktid: ${story.points}</p>
        <p class="story-meta">Prioriteet: ${story.priority}</p>
        <strong>Vastuvõtutingimused:</strong>
        <ul class="criteria-list">
            ${criteriaItems}
        </ul>
        <strong>Kommentaarid:</strong>
        <ul class="comment-list">
            ${commentItems}
        </ul>

<div class="comment-form">
    <textarea id="comment-${story.id}" rows="2" placeholder="Lisa kommentaar"></textarea>
    <button type="button" onclick="addComment(${story.id})">Lisa kommentaar</button>
</div>
        <div class="story-actions">
            <button type="button" onclick="startEditMode(${story.id})">Muuda</button>
            <button type="button" class="danger-button" onclick="deleteStory(${story.id})">Kustuta</button>
        </div>
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