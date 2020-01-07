Example:

```typescript
import { mq } from "@hetacode/amqplib-wrapper";

const messageBusApp = mq("amqp://localhost", c => {
    c.addConsumer(null, "events-queue", false, async message => {
        console.log(message);
    });
    c.addConsumer("exchange", "items-queue", false, async message => {
        console.log(message);
    });

    c.addPublisher("invoices-events-exchange", null, false, async sender => {
        sender.send({ message: "TEST"});
    })
});
```
