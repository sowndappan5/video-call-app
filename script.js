const peer = new Peer(); // Initialize PeerJS
let peers = {}; // Store connected peers
let myStream;

// Display our PeerJS ID
peer.on('open', id => {
    document.getElementById("myId").textContent = id;
    console.log("My Peer ID:", id);
});

// Get user media (video + audio)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        myStream = stream;
        addVideoStream("myVideo", myStream); // Display my own video
    })
    .catch(error => console.error("Error accessing media devices:", error));

// Function to connect to another peer
function connectToPeer(peerId) {
    if (peers[peerId]) return; // Prevent duplicate connections

    const call = peer.call(peerId, myStream);
    call.on('stream', userStream => addVideoStream(peerId, userStream)); // Show other user's video
    call.on('close', () => removeVideo(peerId)); // Remove video on disconnect
    peers[peerId] = call; // Store the connection
}

// Handle incoming calls
peer.on('call', call => {
    if (peers[call.peer]) return; // Prevent duplicate calls

    call.answer(myStream); // Answer the call with my stream
    call.on('stream', userStream => addVideoStream(call.peer, userStream)); // Show other user's video
    call.on('close', () => removeVideo(call.peer)); // Remove video on disconnect
    peers[call.peer] = call; // Store connection
});

// Function to add video stream (Prevents duplicates)
function addVideoStream(peerId, stream) {
    if (document.getElementById(peerId)) return; // Prevent duplicate video elements

    const video = document.createElement("video");
    video.id = peerId;
    video.srcObject = stream;
    video.autoplay = true;
    document.getElementById("videoGrid").appendChild(video);
}

// Function to remove video when a peer disconnects
function removeVideo(peerId) {
    const video = document.getElementById(peerId);
    if (video) video.remove();
}

// Start Call button
document.getElementById("startCall").addEventListener("click", () => {
    const peerId = document.getElementById("connectId").value;
    if (peerId) {
        connectToPeer(peerId);
    } else {
        alert("Enter a Peer ID to connect!");
    }
});

// Stop Call button
document.getElementById("stopCall").addEventListener("click", () => {
    Object.values(peers).forEach(call => call.close()); // Close all connections
    myStream.getTracks().forEach(track => track.stop()); // Stop camera/mic
    document.getElementById("videoGrid").innerHTML = ""; // Clear videos
});
