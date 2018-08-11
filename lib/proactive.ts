import { ConversationReference, BotAdapter } from "botbuilder";
import { TableStorage } from "botbuilder-azure";
import { SpeakerSession } from "./types";
import { Globals } from "./globals";
import { getExact } from "./parser";
import * as moment from "moment";

export async function saveRef(ref: Partial<ConversationReference>, tableStorage: TableStorage): Promise<string> {
    const changes = {};
    changes[`reference/${ref.activityId}`] = ref;
    await tableStorage.write(changes);
    return ref.activityId;
}

export function subscribe(userId: string, tableStorage: TableStorage, adapter: BotAdapter): void {
    setInterval(async () => {
        const ref = await getRef(userId, tableStorage);
        if(ref) {
            await adapter.continueConversation(ref, async(context) => {
                for(let i = 0; i < Globals.SavedSessions.length; i++) {
                    let s: SpeakerSession = getExact(Globals.SavedSessions[i]);
                    let d = moment(`${s.date} ${s.startTime}`);
                    let d15 = d.subtract(15, "minutes")
                    if(moment(moment.now()).isBetween(d15, d)) {
                        await context.sendActivity(`Reminder: The session ${s.title} from ${s.speakers} is about to start at ${s.startTime} in ${s.location}`);
                        Globals.SavedSessions[i] = undefined;
                    }
                }
                Globals.SavedSessions = Globals.SavedSessions.filter(v => v);
            });
        }
    }, ((60 * 1000) * 5))
}

export async function getRef(userId: string, tableStorage: TableStorage): Promise<any> {
    const key = `reference/${userId}`;
    var r = await tableStorage.read([key]);
    return await r[key];
}
