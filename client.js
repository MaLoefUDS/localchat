
// ---------- Constants ---------- //

// Set up WebSocket connection
const socket = new WebSocket(HOST);

// Array of all messages received from the server
const messages = [];

// Whether the page has just been refreshed
let refreshed = true;

// Define press to select functionality for mobile devices
let timer;
let threshold = 700;

// The current selection of messages
let selection = [-1, -1];
let selecting = false;

// Whether the user has scrolled up and the messages are not up to date
let upToDate = true;

// The author info of the last message (necessary to group messages)
let lastAuthorInfo = "";

// ---------- Helpers ---------- //

// Clear all messages from the message list
function clearMessages() {
    let messageList = document.getElementById('message-list');
    messageList.innerHTML = '';
}

// Set opacity of send button based on message and author input
function setOpacityOfSendButton() {
    if (document.getElementById('author').value && (
        document.getElementById('message').value || document.getElementById('image').value)) {
        document.getElementById('send-btn').style.opacity = 1;
    } else {
        document.getElementById('send-btn').style.opacity = 0.5;
    }
}

// Set opacity of file button based on image input
function setOpacityOfFileButton() {
    setOpacityOfSendButton();
    if (document.getElementById('image').value) {
        document.getElementById('file-btn').style.opacity = 1;
    } else {
        document.getElementById('file-btn').style.opacity = 0.5;
    }
}

// Set opacity of cancel button based on selection
function setOpacityOfCancelButton() {
    if (!selection.includes(-1)) {
        document.getElementById('cancel-btn').style.opacity = 1;
    } else {
        document.getElementById('cancel-btn').style.opacity = 0;
    }
}

// Message highlighting

// Highlight messages in 'selection'
function highlightMessages() {
    const allMessages = document.querySelectorAll("li");
    const highlightColor = "rgba(226, 135, 67, 0.3)";
    for (let i = selection[0]; i <= selection[1]; i++) {
        if (i < 0) continue;
        if (i >= messages.length) break;
        allMessages[i].style.backgroundColor = highlightColor;
    }
}

// Remove all highlights
function clearHighlights() {
    document.querySelectorAll("li").forEach((message) => {
        message.style.backgroundColor = "transparent";
    });
}

// Widen the selection to include 'index'
function extendSelection(index) {
    if (selection[0] === -1) {
        selection = [index, index];
    } else {
        if (index < selection[0]) {
            selection = [index, selection[1]];
        } else if (index > selection[1]) {
            selection = [selection[0], index];
        }
    }
}

// Clip the selection to exclude 'index'
function clipSelection(index) {
    if (Math.abs(index - selection[0]) < Math.abs(selection[1] - index)) {
        selection = [index + 1, selection[1]];
    } else {
        selection = [selection[0], index - 1];
    }
}

// Check if the new messages indicator should be shown
function checkIndicator() {
    if ((window.innerHeight + Math.round(window.scrollY)) < document.body.offsetHeight && !upToDate) {
        document.getElementById('indicator-container').style.opacity = 1;
    } else {
        document.getElementById('indicator-container').style.opacity = 0;
        upToDate = true;
    }
}

// Scrolling

// Scroll to message with index 'index' with optional delay 'time'
function scrollToMessage(index, time = 0) {
    setTimeout(() => {
        scrollToTarget(document.querySelectorAll("li")[index - 1]);
    }, time);
}

// Scroll to 'target' DOM element
function scrollToTarget(target, top = true) {
    var targetPosition = top ?
        target.getBoundingClientRect().top :
        target.getBoundingClientRect().bottom;
    var offset = window.pageYOffset || document.documentElement.scrollTop;
    var position = targetPosition + offset - (window.innerHeight * 0.3);
    window.scrollTo({ top: position, behavior: "smooth" });
}

// Scroll all the way to the bottom of the page
function scrollDown(time) {
    let lastMessage = document.querySelector("li:last-child");
    setTimeout(() => {
        scrollToTarget(lastMessage, false);
    }, time);
}


// ---------- Event handlers ---------- //

// Start of hold event
function selectPhoneWrapperStart(event) {
    timer = setTimeout(() => {
        selectHandler(event);
    }, threshold);
}

// Release of hold event
function selectPhoneWrapperEnd(event) {
    clearTimeout(timer);
}

// Common select handler for both desktop and mobile
function selectHandler(event) {

    // Obtain selected message
    let elem = event.target;
    while (elem.tagName !== "LI") {
        elem = elem.parentElement;
    }
    let index = Array.from(elem.parentElement.children).indexOf(elem);

    // Start a new selection
    if (!selecting) {
        clearHighlights();
        selection = [-1, -1];
        selecting = true;
    }

    // Index already in selection
    if (index >= selection[0] && index <= selection[1]) {

        // If only one message was selected, deselect it and stop selecting
        if (selection[0] === selection[1]) {
            deselect();
        }

        // Otherwise, clip the selection
        else {
            clipSelection(index);
            clearHighlights();
        }

    } else {

        // Extend the selection
        extendSelection(index);
    }

    // Highlight the selected messages
    selection = selection.sort((a, b) => a - b);
    highlightMessages();
    setOpacityOfCancelButton();
}

// Click handler for both desktop and mobile
function clickHandler(event, message) {

    // If selecting, continue selecting
    if (selecting) {
        selectHandler(event);
    }

    // If not selecting, view the replied-to content
    else if (message.selection) {
        clearHighlights();
        selection = message.selection.split("-").map(Number);
        selecting = true;
        scrollToMessage(selection[0]);
        highlightMessages();
    }
}

// Stop selecting
function deselect() {
    clearHighlights();
    selection = [-1, -1];
    selecting = false;
}

// Form submission
function sendForm(event) {

    // Prevent page reload
    event.preventDefault();

    // Construct form data
    let formData = new FormData();
    formData.append('author', document.getElementById('author').value);
    formData.append('message', document.getElementById('message').value);
    formData.append('selection', !selection.includes(-1) ? selection.join("-") : "");
    if (document.getElementById('image').value !== "") {
        formData.append('image', document.getElementById('image').files[0]);
    }

    // Make POST request
    fetch('', { method: 'POST', body: formData });

    // Reset all form fields
    document.getElementById("message").value = "";
    document.getElementById("image").value = "";
    document.getElementById("file-btn").style.opacity = 0.5;
    document.getElementById('message').focus();
    setOpacityOfFileButton();

    // Reset selection
    deselect();
}

// Set up event listeners
window.onload = function() {

    // Default input is author
    document.getElementById('author').focus();

    // Update send button opacity when input changes
    document.getElementById("message").oninput = setOpacityOfSendButton;
    document.getElementById("author").oninput = setOpacityOfSendButton;

    // Connect send button to form submission
    document.getElementById('send-btn').onclick = sendForm;
    document.getElementById("message-form").addEventListener("keypress", function(event) {
        if (event.keyCode === 13) {
            document.getElementById('send-btn').click();
        }
    });

    // Connect file button to image input
    document.getElementById('file-btn').onclick = () => document.getElementById('image').click();
    document.getElementById('image').onchange = setOpacityOfFileButton;

    // Connect 'cancel' button to deselect
    document.getElementById('cancel-btn').onclick = () => {
        deselect();
        setOpacityOfCancelButton();
    };

    // Connect scroll event to indicator
    window.onscroll = checkIndicator;
};


// ---------- Message Construction ---------- //

// Receiving messages from the server
socket.onmessage = function(event) {

    // Decode messages
    let recvMessages = JSON.parse(event.data);
    if (recvMessages.length > 1) {
        clearMessages();
    }

    // Append messages to message list
    recvMessages.forEach(appendMessage);
    checkIndicator();

    // If page refreshed: scroll down to the last message after 1 second
    if (refreshed) {
        scrollDown(700);
        refreshed = false;
    }

    // If the last message is a self message, scroll down immediately
    // Otherwise, show new messages indicator
    else {
        if (recvMessages.length === 1 && recvMessages[0].self === true) {
            scrollDown(0);
        } else {
            upToDate = false;
            checkIndicator();
        }
    }
};

// Construct message and append it to the message list
function appendMessage(message) {

    // Reject empty messages
    if (!message.author || (!message.content && !message.fileId)) {
        return;
    }

    const messageList = document.getElementById('message-list');
    const listItem = document.createElement('li');

    // Construct author field
    const authorInfo = document.createElement('div');
    authorInfo.id = "message-author";
    authorInfo.style.textAlign = message.self ? "right" : "left";
    authorInfo.innerHTML = `${message.author} - ${message.date}`;
    listItem.appendChild(authorInfo);

    // Group messages by the same author at the same time
    listItem.style.paddingTop = authorInfo.innerText === lastAuthorInfo ? "0.5vh" : "2vh";
    lastAuthorInfo = authorInfo.innerText;

    // Construct message content
    const messageContent = document.createElement('div');
    const image = message.fileId ? `<img src="/files/${message.fileId}" class="attachment">` : "";
    const separator = message.content && image ? '<br>' : '';
    messageContent.id = "message-content";
    messageContent.innerHTML = `${message.content}${separator}${image}`;

    // Construct message
    const messageContainer = document.createElement('div');
    messageContainer.id = "message-div";
    messageContainer.className = message.self ? "self-message" : "external-message";
    messageContainer.appendChild(messageContent);
    listItem.appendChild(messageContainer);

    // Add reply indicator
    if (message.selection !== "") {
        let replyIndicator = document.createElement('div');
        let image = message.self ? "/assets/self-reply.png" : "/assets/external-reply.png";
        replyIndicator.innerHTML = `<img src="${image}" id="reply-arrow">`;
        replyIndicator.style.float = message.self ? "right" : "left";
        listItem.appendChild(replyIndicator);
    }

    // add event listeners
    listItem.oncontextmenu = selectHandler;
    listItem.ontouchstart = selectPhoneWrapperStart;
    listItem.ontouchend = selectPhoneWrapperEnd;
    listItem.onclick = (event) => { clickHandler(event, message) };

    // Append message to message list
    messageList.appendChild(listItem);
    messages.push(message);
}
