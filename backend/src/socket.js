const { Server } = require("socket.io");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // En dev local
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Rejoindre une room associée à un board spécifique
    socket.on("join_board", (boardId) => {
      socket.join(`board_${boardId}`);
      console.log(`[Socket.io] Client ${socket.id} joined board_${boardId}`);
    });

    // Quitter une room
    socket.on("leave_board", (boardId) => {
      socket.leave(`board_${boardId}`);
      console.log(`[Socket.io] Client ${socket.id} left board_${boardId}`);
    });

    socket.on("join_user_room", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`[Socket.io] Client ${socket.id} joined user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { initSocket };
