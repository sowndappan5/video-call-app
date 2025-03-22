const videoGrid = document.getElementById("videoGrid");
const startCallBtn = document.getElementById("startCall");
const stopCallBtn = document.getElementById("stopCall");
const myVideo = document.createElement("video");
const myIdDisplay = document.getElementById("myId");
const peerIdInput = document.getElementById("peerIdInput");

myVideo.muted = true; // ✅ Prevents audio echo

let myStream;
let peers = {};
let peer;

// 🎥 Get user media (camera & mic)
async function startCall() {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // ✅ Show own video immediately
        addVideoStream("myVideo", myStream, true);

        peer = new Peer(); // Create PeerJS connection

        peer.on("open", (id) => {
            myIdDisplay.innerText = `Your ID: ${id}`;
            peerIdInput.value = id;
        });

        // When someone calls, answer and send own video
        peer.on("call", (call) => {
            call.answer(myStream);
            call.on("stream", (userVideoStream) => {
                addVideoStream(call.peer, userVideoStream);
            });
        });

    } catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Please allow camera and microphone permissions.");
    }
}

// 📞 Join call using peer ID
function joinCall() {
    const peerId = peerIdInput.value.trim();
    if (!peerId) return alert("Enter a valid Peer ID!");

    const call = peer.call(peerId, myStream);

    call.on("stream", (userVideoStream) => {
        addVideoStream(peerId, userVideoStream);
    });

    call.on("close", () => {
        document.getElementById(peerId)?.remove();
    });

    peers[peerId] = call;
}

// ❌ Stop call
function stopCall() {
    myStream.getTracks().forEach(track => track.stop()); // Stop video & audio
    for (let peerId in peers) {
        peers[peerId].close();
        document.getElementById(peerId)?.remove();
    }
    myVideo.remove(); // Remove self video
}

// 🎥 Add video stream to the grid
function addVideoStream(peerId, stream, isSelf = false) {
    let video = document.getElementById(peerId);

    if (!video) {
        video = document.createElement("video");
        video.id = peerId;
        video.autoplay = true;
        videoGrid.appendChild(video);
    }

    video.srcObject = stream;

    if (isSelf) {
        video.muted = true; // ✅ Mute self to prevent echo
    }
}

// 🎯 Event Listeners
startCallBtn.addEventListener("click", startCall);
stopCallBtn.addEventListener("click", stopCall);
