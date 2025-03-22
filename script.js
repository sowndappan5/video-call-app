const peer = new Peer();  // Initialize PeerJS
let peers = {}; // Store connected peers
let myStream;

// When PeerJS is ready, show the assigned ID
peer.on('open', id => {
    document.getElementById("myId").textContent = id;
    console.log("My Peer ID:", id);
});

// Start video and audio stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        myStream = stream;
        document.getElementById("myVideo").srcObject = stream;
    })
    .catch(error => console.error("Error accessing media devices:", error));

// Function to connect to another user
function connectToPeer(peerId) {
    const call = peer.call(peerId, myStream);
    call.on('stream', userStream => addVideoStream(userStream)); // Show other user's video
    peers[peerId] = call; // Store connection
}

// Handle incoming calls
peer.on('call', call => {
    call.answer(myStream); // Answer the call with our stream
    call.on('stream', userStream => addVideoStream(userStream)); // Show other user's video
});

// Function to add video stream
function addVideoStream(stream) {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    document.getElementById("videoGrid").appendChild(video);
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
    document.querySelectorAll("video").forEach(video => video.remove()); // Remove videos
});
