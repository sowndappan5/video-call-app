const videoGrid = document.getElementById("videoGrid");
const myIdDisplay = document.getElementById("myId");
const peerIdInput = document.getElementById("peerIdInput");
const startCallBtn = document.getElementById("startCall");
const joinCallBtn = document.getElementById("joinCall");
const stopCallBtn = document.getElementById("stopCall");

let peer;              // PeerJS instance
let myStream;          // Local camera/mic stream
let peers = {};        // Dictionary of active calls (key: peerId, value: call)

// 🔸 Step 1: Start Call - Initialize local stream + PeerJS
startCallBtn.addEventListener("click", async () => {
  try {
    // Get camera and microphone
    myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    // Create PeerJS instance
    peer = new Peer();

    // When PeerJS is ready, display your assigned ID
    peer.on("open", (id) => {
      myIdDisplay.textContent = `Your ID: ${id}`;
      console.log("My Peer ID:", id);
    });

    // Show your own video immediately
    addVideoStream("myVideo", myStream, true);

    // Handle incoming calls
    peer.on("call", (call) => {
      // If we already have a call with this peer, ignore or handle duplicates
      if (peers[call.peer]) {
        console.warn("Duplicate call from:", call.peer);
        return;
      }

      // Answer with our local stream
      call.answer(myStream);

      // When we receive their stream, display it
      call.on("stream", (remoteStream) => {
        addVideoStream(call.peer, remoteStream);
      });

      // If the call closes, remove that peer's video
      call.on("close", () => {
        removeVideo(call.peer);
      });

      // Store the call
      peers[call.peer] = call;
    });
  } catch (err) {
    console.error("Error accessing camera/microphone:", err);
    alert("Please allow camera and microphone permissions.");
  }
});

// 🔸 Step 2: Join Call - Call another user’s Peer ID
joinCallBtn.addEventListener("click", () => {
  if (!peer) {
    alert("You must click 'Start Call' first to initialize your camera & PeerJS!");
    return;
  }

  const remoteId = peerIdInput.value.trim();
  if (!remoteId) {
    alert("Enter a valid Peer ID!");
    return;
  }

  // Prevent calling the same peer multiple times
  if (peers[remoteId]) {
    alert("Already connected to this Peer ID!");
    return;
  }

  // Place a call to the remote peer
  const call = peer.call(remoteId, myStream);

  // When remote peer's stream arrives, display it
  call.on("stream", (remoteStream) => {
    addVideoStream(remoteId, remoteStream);
  });

  // If the call closes, remove that peer's video
  call.on("close", () => {
    removeVideo(remoteId);
  });

  // Store the call object so we can close it later
  peers[remoteId] = call;
});

// 🔸 Step 3: Stop Call - Hang up & close everything
stopCallBtn.addEventListener("click", () => {
  // 1) Close all peer connections
  for (const remoteId in peers) {
    peers[remoteId].close();
    removeVideo(remoteId);
  }
  peers = {};

  // 2) Stop local camera/mic
  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
  }

  // 3) Remove self video
  removeVideo("myVideo");

  // 4) Destroy the PeerJS instance (optional)
  if (peer && !peer.destroyed) {
    peer.destroy();
  }

  // 5) Reset UI
  myIdDisplay.textContent = "Your ID: (Stopped)";
  console.log("Call stopped.");
});

// 🔸 Helper: Add video stream to the DOM
function addVideoStream(peerId, stream, isSelf = false) {
  // If a video element for this peer already exists, reuse it
  let videoEl = document.getElementById(peerId);
  if (!videoEl) {
    videoEl = document.createElement("video");
    videoEl.id = peerId;
    videoEl.autoplay = true;
    videoGrid.appendChild(videoEl);
  }

  videoEl.srcObject = stream;

  // Mute self-view to prevent echo
  if (isSelf) {
    videoEl.muted = true;
  }
}

// 🔸 Helper: Remove video element from the DOM
function removeVideo(peerId) {
  const videoEl = document.getElementById(peerId);
  if (videoEl) {
    videoEl.remove();
  }
}
