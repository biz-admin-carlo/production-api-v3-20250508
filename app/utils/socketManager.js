let io;

module.exports = {
  setIO: (ioInstance) => {
    io = ioInstance;

    io.on('connection', (socket) => {
      // console.log('🟢 Socket connected:', socket.id);

      socket.on('register', (userId) => {
        socket.join(userId);
        // console.log(`✅ User ${userId} joined their room`);
      });

      socket.on('disconnect', () => {
        // console.log('🔴 Socket disconnected:', socket.id);
      });
    });
  },

  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  }
};
