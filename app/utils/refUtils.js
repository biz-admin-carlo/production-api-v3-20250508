let cachedNanoid = null;

async function loadNanoid() {
  if (!cachedNanoid) {
    const { customAlphabet } = await import('nanoid');
    const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    cachedNanoid = customAlphabet(alphabet, 12);
  }
  return cachedNanoid;
}

async function generateTrackingReference({ userId, action }) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const nanoid = await loadNanoid();
  const shortId = nanoid();
  return `${date}${shortId}`;
}

async function generateTerminationReference({ userId }) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const nanoid = await loadNanoid();
  const shortId = nanoid();
  return `${date}${shortId}`;
}

module.exports = {
  generateTrackingReference,
  generateTerminationReference
};
