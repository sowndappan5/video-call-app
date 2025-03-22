const myVideo = document.getElementById("myVideo");
const peerVideo = document.getElementById("peerVideo");
const callBtn = document.getElementById("callBtn");

// Initialize PeerJS (Using Free Cloud Server)
const peer = new Peer(undefined, {
    host: "0.peerjs.com",
    port: 443,
    secure: true
});

// Get User Media (Webcam & Mic)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        myVideo.srcObject = stream;

        // Answer Incoming Calls
        peer.on("call", (call) => {
            call.answer(stream);
            call.on("stream", (peerStream) => {
                peerVideo.srcObject = peerStream;
            });
        });

        // Start Call on Button Click
        callBtn.addEventListener("click", () => {
            const peerId = prompt("Enter the Peer ID of the other user:");
            if (peerId) {
                const call = peer.call(peerId, stream);
                call.on("stream", (peerStream) => {
                    peerVideo.srcObject = peerStream;
                });
            }
        });
    })
    .catch((err) => console.error("Error accessing media devices.", err));

// Show Peer ID
peer.on("open", (id) => {
    alert("Your Peer ID: " + id);
});
