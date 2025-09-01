let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  if (!ioInstance) {
    throw new Error('Socket.io instance not initialized yet.');
  }
  return ioInstance;
}

module.exports = { setIo, getIo };
