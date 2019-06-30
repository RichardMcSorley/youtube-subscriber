const ngrok = require('ngrok')
const { Url } = require('../utilities')
const port = process.env.HUB_PORT || 8000

module.exports = async function doNgrok () {
  const url = await ngrok.connect(port).catch(err => console.error(err))
  if (url instanceof Error || !url) {
    ngrok.kill()
    console.error('Error connecting to ngrok')
    return process.exit(0)
  }
  console.log(url)
  Url.url = url
  return url
}
