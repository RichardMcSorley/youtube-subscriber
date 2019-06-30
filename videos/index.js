const fetch = require('node-fetch')
const { YOUTUBE_API_KEY } = process.env

/**
 * @param {string} videoId
 */
module.exports.getVideo = function getVideo (videoId) {
  return fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`)
    .then(result => result.json())
}
