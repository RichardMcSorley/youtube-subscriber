#youtube-subscriber
Pubsub callback server and subscription server

index.js will handle subscriptions and callback server then broadcast changes to clients(sub.js)

sub.js will subscribe to youtube channel via server(index.js) then fetch video info and finally send results to a message queue