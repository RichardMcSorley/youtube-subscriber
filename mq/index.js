const mqlight = require('mqlight');

function startClient(){
    return new Promise((resolve, reject) => {
        const service = `amqp://${process.env.MQLIGHT_SERVICE_HOST}:${process.env.MQLIGHT_SERVICE_PORT_AMQP}`
        console.log(`attempting to connect to mq service `)
        const client = mqlight.createClient({service}, (err)=>{
            console.log(err)
            reject(err)
        })
        client.on('started', function() {
            console.log('started mq');
            resolve(client)
        })
        client.on('stopped', function(){
            console.log('stopped mq');
            process.exit(1)
        })
        client.on('error', function (err) {
            console.error(err)
            process.exit(1)
        })
    })
}
function sendMessage({client, topic, data}){
    return new Promise((resolve, reject)=>{
        client.send(topic, data, function (err) {
            if(err){
                reject(err)
            }
            console.log('Sent mq:', topic, data);
            resolve()
        });
    });
}

module.exports ={
    sendMessage,
    startClient,
}