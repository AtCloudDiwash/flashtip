const { YT_API_KEY } = require("../config");

const fetchVideoStats = async (videoIds) => {
    if (!videoIds || videoIds.length === 0) return [];

    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const batches = chunkArray(videoIds, 50);
    const results = [];

    for (const batch of batches) {
        const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}&key=${YT_API_KEY}`;
        const response = await fetch(ytUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                results.push(...data.items);
            }
        }
    }
    return results;
};

module.exports = { fetchVideoStats };
