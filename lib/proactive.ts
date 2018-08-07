import { ConversationReference, BotAdapter } from "botbuilder";
import { TableStorage } from "botbuilder-azure";
import { AsyncResource } from "async_hooks";

export async function saveRef(ref: Partial<ConversationReference>, tableStorage: TableStorage): Promise<string> {
    const changes = {};
    changes[`reference/${ref.activityId}`] = ref;
    await tableStorage.write(changes);
    return ref.activityId;
}

export async function subscribe(userId: string, tableStorage: TableStorage, adapter: BotAdapter): Promise<any> {
    setTimeout(async () => {
        const ref = await getRef(userId, tableStorage);
        if(ref) {
            await adapter.continueConversation(ref, async(context) => {
                await context.sendActivity("Proactive message sent");
            });
        }
    });
}

async function getRef(userId: string, tableStorage: TableStorage): Promise<any> {
    const key = `reference/${userId}`;
    var r = await tableStorage.read([key]);
    return await r[key];
}
