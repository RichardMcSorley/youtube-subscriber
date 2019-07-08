const EventEmitter = require('events')
const PubSubHubbub = require('pubsubhubbub')
const FormData = require('form-data')
const fetch = require('node-fetch')
const parseString = require('xml-js').xml2js
const { getUrl, getHub, getTopic } = require('../utilities')
const port = process.env.HUB_PORT || 8080
const { DEV } = process.env
let pubsub

function launchPubSub () {
  pubsub = PubSubHubbub.createServer({
    callbackUrl: getUrl()
  })

  pubsub.on('feed', feedHandler)

  pubsub.on('denied', data => {
    DEV && console.log('denied:', data)
  })

  pubsub.on('error', data => {
    DEV && console.log('error:', data)
  })

  pubsub.on('subscribe', data => DEV && console.log('subscribed:', data.topic))

  pubsub.on('unsubscribe', data => DEV && console.log('unsubscribed:', data.topic))

  pubsub.on('listen', () => console.log('listening'))

  pubsub.listen(port)

  const serverEvents = new EventEmitter()
  const subEvents = new EventEmitter()

  serverEvents.on('close', exit => {
    return Promise.all(Object.keys(channels).map(key => channels[key].unsubscribe()))
      .then(() => exit ? process.exit(0) : serverEvents.emit('finished'))
  })

  subEvents.on('new', id => {
    if (!channels.hasOwnProperty(id)) {
      channels[id] = new Channel(id)
      channels[id].subscribe()
    }
  })

  process.on('exit', () => {
    DEV && console.log('safe to close')
  })

  process.once('SIGUSR2', () => {
    require('ngrok').kill().then(() => {
      serverEvents.emit('close')

      serverEvents.on('finished', () => {
        process.kill(process.pid, 'SIGUSR2')
      })
    })
  })

  process.stdin.on('data', data => {
    if (data.toString().trim() === `.exit`) {
      serverEvents.emit('close', 'exit')
    } else {
      subEvents.emit('new', data.toString().trim())
    }
  })

  return Promise.resolve()
}

/**
   * @type {Object.<string, channel>}
   */
const channels = {}

/**
 * @typedef channel
 * @property {string} id channel ID
 * @property {string} topic Topic URL
 * @property {EventEmitter} events
 * @property {function} unsubscribe unsubscribes from all external notifications and internal events and deletes `this` channel
 * @property {function} subscribe create external and internal subscriptions for this channel
 *
 * @constructs channel
 * @param {string} id youtube channel ID
 *
 * @returns {channel}
 */
const Channel = function Channel (id) {
  this.id = id

  this.topic = getTopic(id)

  this.events = new EventEmitter()

  this.unsubscribe = () => {
    const formdata = new FormData()
    console.log(getUrl())
    formdata.append('hub.callback', getUrl())
    formdata.append('hub.topic', getTopic(id))
    formdata.append('hub.verify', 'async')
    formdata.append('hub.mode', 'unsubscribe')
    formdata.append('hub.verify_token', '')
    formdata.append('hub.secret', '')
    formdata.append('hub.lease_seconds', '')

    return fetch(`https://pubsubhubbub.appspot.com/subscribe`, { method: 'POST', body: formdata })
      .then(res => new Promise((resolve, reject) => pubsub.unsubscribe(getTopic(id), getHub(), () => resolve())))
      .then(() => {
        this.events.removeAllListeners()

        DEV && console.log('unsubscribed', id)

        delete channels[id]
      })
  }

  this.subscribe = () => {
    const formdata = new FormData()
    console.log(getUrl())
    formdata.append('hub.callback', getUrl())
    formdata.append('hub.topic', getTopic(id))
    formdata.append('hub.verify', 'async')
    formdata.append('hub.mode', 'subscribe')
    formdata.append('hub.verify_token', '')
    formdata.append('hub.secret', '')
    formdata.append('hub.lease_seconds', '')

    return fetch(`https://pubsubhubbub.appspot.com/subscribe`, { method: 'POST', body: formdata })
      .then(res => new Promise((resolve, reject) => pubsub.subscribe(getTopic(id), getHub(), () => resolve())))
  }

  this.broadcast = video => {
    this.events.emit('status', video)
  }

  this.events.on('incoming', this.broadcast)

  this.events.on('status', payload => console.log('video:', payload))
}

function feedHandler (data) {
  const { feed = null } = parseString(data.feed.toString(), { compact: true })
  if(feed && feed.entry ){
    const entry = feed.entry;
    const videoId = entry['yt:videoId'] && entry['yt:videoId']._text
    const channelId = entry['yt:channelId'] && entry['yt:channelId']._text
    channels[channelId].events.emit('incoming', videoId)
  }
}

module.exports = {
  launchPubSub,
  channels,
  Channel
}
