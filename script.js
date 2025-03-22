/* Global variables */
const videoGrid = document.getElementById("videoGrid");
const myIdDisplay = document.getElementById("myId");
const peerIdInput = document.getElementById("peerIdInput");
const startCallBtn = document.getElementById("startCall");
const joinCallBtn = document.getElementById("joinCall");
const stopCallBtn = document.getElementById("stopCall");

let peer;                   // PeerJS instance
let myStream;               // Local media stream
let peers = {};             // Active call objects {peerId: call}
let dataConnections = {};   // Data connections (for broadcasting room updates)
let isHost = false;         // Will be true if you are the host
let roomMembers = [];       // For host: list of all participant peer IDs

// --- Helper functions ---

// Add a video element for a given stream
function addVideoStream(peerId, stream, isSelf = false) {
  let videoEl = document.getElementById(peerId);
  if (!videoEl) {
    videoEl = document.createElement("video");
    videoEl.id = peerId;
    videoEl.autoplay = true;
    videoGrid.appendChild(videoEl);
  }
  videoEl.srcObject = stream;
  if (isSelf) videoEl.muted = true;
}

// Remove video element
function removeVideo(peerId) {
  const videoEl = document.getElementById(peerId);
  if (videoEl) videoEl.remove();
}

// If you are host, broadcast the current roomMembers list to all participants via data connection.
function broadcastRoomMembers() {
  for (let dc in dataConnections) {
    dataConnections[dc].send({
      type: "roomUpdate",
      roomMembers: roomMembers
    });
  }
  console.log("Broadcast room update:", roomMembers);
}

// --- Start Call (Initialize local stream and PeerJS) ---
startCallBtn.addEventListener("click", async () => {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    addVideoStream("myVideo", myStream, true);
  } catch (err) {
    console.error("Error accessing media devices:", err);
    alert("Please allow camera and microphone permissions.");
    return;
  }
  
  // Create the PeerJS connection
  peer = new Peer();

  peer.on("open", (id) => {
    myIdDisplay.textContent = `Your ID: ${id}`;
    console.log("My Peer ID:", id);
    
    /* Decide role:
       If you did not input a remote ID to join (via joinCall), assume you are the host.
       (In a real app you might have an explicit host/participant toggle.)
    */
    if (!peerIdInput.value.trim()) {
      isHost = true;
      roomMembers.push(id); // Host adds self to the room
      console.log("You are the host.");
    }
  });
  
  // --- Data connection: for both host and participants, set up a listener
  peer.on('connection', (conn) => {
    conn.on('open', () => {
      console.log("Data connection opened with", conn.peer);
      // If you're host, store the data connection so you can broadcast updates.
      if (isHost) {
        dataConnections[conn.peer] = conn;
        // Add new peer to roomMembers if not present.
        if (!roomMembers.includes(conn.peer)) {
          roomMembers.push(conn.peer);
          broadcastRoomMembers();
        }
      }
    });
    
    // On receiving data, handle room updates.
    conn.on('data', (data) => {
      if (data.type === "roomUpdate") {
        // Participant receives updated room list from host.
        console.log("Received room update:", data.roomMembers);
        // For every peer in the room list, if not self and not connected, initiate a call.
        data.roomMembers.forEach((peerId) => {
          if (peerId === peer.id) return; // skip self
          if (!peers[peerId]) {
            console.log("Auto-calling missing peer:", peerId);
            const call = peer.call(peerId, myStream);
            call.on("stream", (remoteStream) => {
              addVideoStream(peerId, remoteStream);
            });
            call.on("close", () => {
              removeVideo(peerId);
            });
            peers[peerId] = call;
          }
        });
      }
    });
  });
  
  // --- Handling incoming calls (for both host and participants) ---
  peer.on('call', (call) => {
    if (peers[call.peer]) {
      console.warn("Duplicate call from", call.peer);
      return;
    }
    call.answer(myStream);
    call.on("stream", (remoteStream) => {
      addVideoStream(call.peer, remoteStream);
    });
    call.on("close", () => {
      removeVideo(call.peer);
    });
    peers[call.peer] = call;
  });
});

// --- Join Call ---
// (For participants: you call the host and open a data connection.)
joinCallBtn.addEventListener("click", () => {
  if (!peer) {
    alert("Click 'Start Call' first to initialize your camera and PeerJS connection.");
    return;
  }
  
  const hostId = peerIdInput.value.trim();
  if (!hostId) {
    alert("Enter a valid host Peer ID to join!");
    return;
  }
  
  // As a participant, connect to the host’s data channel.
  const dc = peer.connect(hostId);
  dc.on("open", () => {
    console.log("Connected to host's data channel.");
    // (Optional) You could send a message to the host if needed.
  });
  
  // Place a call to the host.
  if (!peers[hostId]) {
    const call = peer.call(hostId, myStream);
    call.on("stream", (remoteStream) => {
      addVideoStream(hostId, remoteStream);
    });
    call.on("close", () => {
      removeVideo(hostId);
    });
    peers[hostId] = call;
  }
});

// --- Stop Call ---
// Closes all calls, stops local media, and destroys PeerJS connection.
stopCallBtn.addEventListener("click", () => {
  for (const remoteId in peers) {
    peers[remoteId].close();
    removeVideo(remoteId);
  }
  peers = {};

  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
  }
  removeVideo("myVideo");

  if (peer && !peer.destroyed) {
    peer.destroy();
  }
  myIdDisplay.textContent = "Your ID: (Stopped)";
  console.log("Call stopped.");
});
