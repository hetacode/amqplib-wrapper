import amqplib, { Connection } from "amqplib"

export type MqInitCallback = {
    addConsumer: (exchangeName: string | null, queueName: string | null, message: (message: object) => void) => void;
    addPublisher: (exchangeName: string | null, queueName: string | null, senderCalback: (sender: MqSender) => void) => void;
}

export type MqSender = {
    send: (input: object) => void;
}

export const mq = async (hostname: string, callback: (input: MqInitCallback) => void) => {
    let consumers: ((conn: Connection) => void)[] = [];
    let publishers: ((conn: Connection) => void)[] = [];

    callback({
        addConsumer: (exchangeName: string | null, queueName: string | null, message: (message: object) => void) => {
            consumers.push(async (conn: Connection) => {
                let channel = await conn.createChannel();
                if (exchangeName) {
                    await channel.assertExchange(exchangeName, "fanout", { durable: false });
                    let q = await channel.assertQueue(queueName ?? "", { exclusive: false });
                    await channel.bindQueue(q.queue, exchangeName, "");
                }
                else {
                    await channel.assertQueue(queueName ?? "");
                }
                channel.consume(queueName ?? "", async msg => {
                    message(JSON.parse(msg?.content.toString() ?? ""));
                    if (msg) {
                        channel.ack(msg)
                    }
                });
            });

        },
        addPublisher: (exchangeName: string | null, queueName: string | null, senderCalback: (sender: MqSender) => void) => {
            publishers.push(async (conn: Connection) => {
                if (exchangeName) {
                    let channel = await conn.createChannel();
                    await channel.assertExchange(exchangeName, "fanout", { durable: false });
                    senderCalback({
                        send: (input: object) => {
                            channel.publish(exchangeName, "", new Buffer(JSON.stringify(input)));
                        }
                    })
                } else {
                    let channel = await conn.createChannel();
                    await channel.assertQueue(queueName ?? "");
                    senderCalback({
                        send: (input: object) => {
                            channel.publish(exchangeName ?? "", "", new Buffer(JSON.stringify(input)));
                        }
                    })
                }
            })
         
        }
    })

    const connection = await amqplib.connect(hostname);

    consumers.forEach(f => f(connection));
    publishers.forEach(f => f(connection));
}
