require("dotenv").config();
const io = require('socket.io-client');
const { getVideo } = require('./videos')
const socketURL = `http://${process.env.YOUTUBE_SUB_SERVICE_HOST}:${process.env.YOUTUBE_SUB_SERVICE_PORT_SOCKETIO}`
const {sendMessage, startClient} = require('./mq')
let client;
startClient().then((c)=>{
    client = c;
}).catch(()=>process.exit(1));

const videoConstructor = item => {
    const { id, snippet } = item
    const { videoId } = id
    const {
      channelId,
      title,
      description,
      channelTitle,
      liveBroadcastContent,
      publishedAt,
      thumbnails
    } = snippet
    const { high } = thumbnails
    const youtubeVideoURLBase = "https://youtu.be/"
    const videoUrl = youtubeVideoURLBase + videoId
    const { url } = high
    const thumbnailUrl = url
  
    return {
      videoId,
      title,
      channelTitle,
      liveBroadcastContent,
      videoUrl,
      thumbnailUrl,
      publishedAt,
      description,
      channelId
    }
  }

function Socket(channel) {
    this.channel = channel;
    this.socket = io(socketURL)
    
    this.socket.on('connect', () => {
       this.requestChannel(channel)
    })

    this.socket.on('disconnect', (reason) => {
        console.log('disconnect:', reason);
        reason === 'io server disconnect' && this.socket.connect()
    })
}

Socket.prototype.close = function(message){
    console.log(message)
    this.socket && this.socket.close()
    this.channelSocket && this.channelSocket.close()
    process.exit(0)
}

Socket.prototype.requestChannel = function(){
    this.socket.emit(
        'channelRequest',
        this.channel,
        ({namespace}) => {
            console.log('subscribed:', namespace)
            this.channelSocket = io(`${socketURL}${namespace}`)
            this.channelSocket.on(
                'status',
                async (video) => {
                    const {error = null, items = []} = await getVideo(video.videoId);
                    if(error){
                        console.log(error)
                    }
                    if(items.length > 0){
                        const [video] = items
                        const videoData = videoConstructor(video)
                        await sendMessage({client, topic:'new_youtube_video', data:{...videoData}})
                        console.log('video:',videoData)
                    }
                }
            )
        }
    )
}

const sub = new Socket(process.env.CHANNEL_ID)
process.on('SIGTERM', (m)=>sub.close(m))
process.on('uncaughtException', (m)=>sub.close(m))
process.on('unhandledRejection', (m)=>sub.close(m))