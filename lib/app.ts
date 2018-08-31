import { BotFrameworkAdapter, ConversationState, UserState, BotStateSet, TurnContext } from "botbuilder";
import { QnAMaker, LuisRecognizer } from "botbuilder-ai";
import { DialogSet, FoundChoice, ChoicePrompt } from "botbuilder-dialogs";
import { TableStorage } from "botbuilder-azure";
import * as restify from "restify";
import { ConfState, SpeakerSession } from "./types";
import { BotConfig } from "botbuilder-config";
import { config } from "dotenv";
import { getData } from "./parser";
import { getTime } from "./dialogs";
import { createCarousel, createHeroCard } from "./cards";
import { saveRef, subscribe, getRef } from "./proactive";

config();

const botConfig = new BotConfig({ botFilePath: "./edui2018.bot", secret: process.env.BOT_FILE_SECRET });
var SavedSessions: string[] = [];

let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const adapter = new BotFrameworkAdapter({ 
    appId: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_ID  : ""
    , appPassword: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_PASSWORD : ""
});

const tableStorage = new TableStorage({ 
    tableName: process.env.TABLENAME
    , storageAccessKey: process.env.STORAGEKEY
    , storageAccountOrConnectionString: process.env.STORAGENAME
});
const conversationState = new ConversationState<ConfState>(tableStorage);
const userState = new UserState(tableStorage);

adapter.use(new BotStateSet(conversationState, userState));

const qnaMaker = new QnAMaker({
    knowledgeBaseId: botConfig.QnAMaker().kbId,
    endpointKey: botConfig.QnAMaker().endpointKey,
    host: botConfig.QnAMaker().hostname
},
{
    answerBeforeNext: true
});
adapter.use(qnaMaker);

const luis = new LuisRecognizer({
    appId: botConfig.LUIS().appId,
    subscriptionKey: botConfig.decrypt(botConfig.LUIS().subscriptionKey),
    serviceEndpoint: botConfig.LUIS().endpointBasePath
});

const dialogs = new DialogSet();

server.post("/api/messages", (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        const state = conversationState.get(context);
        const dc = dialogs.createContext(context, state);
        await dc.continue();
        if (context.activity.text != null && context.activity.text === "help") {
            await dc.begin("help");
        }
        else if (context.activity.type === "message") {
            const userId = await saveRef(TurnContext.getConversationReference(context.activity), tableStorage);
            subscribe(userId, tableStorage, adapter, SavedSessions);
            if(context.activity.text.indexOf("SAVE:") !== -1) {
                let title = context.activity.text.replace("SAVE:","");
                if(SavedSessions.indexOf(title) === -1) {
                    SavedSessions.push(title);
                }
                let ref = await getRef(userId, tableStorage, SavedSessions);
                ref["speakersessions"] = JSON.stringify(SavedSessions);
                await saveRef(ref, tableStorage);
                await context.sendActivity(`You've saved "${title}" to your speaker session list.`);
            }
            else {
                await luis.recognize(context).then(res => {
                    let top = LuisRecognizer.topIntent(res);
                    let data: SpeakerSession[] = getData(res.entities);
                    if(top === "Time") {
                    dc.begin("time", data);
                    }
                    else if(data.length > 1) {
                        context.sendActivity(createCarousel(data, top));
                    }
                    else if (data.length === 1) {
                        context.sendActivity({ attachments: [createHeroCard(data[0], top)] });
                    }
                });
            }
        }
    });
});

dialogs.add("help", [
    async (dialogContext) => {
        const choices = ["I want to know about a topic"
            ,"I want to know about a speaker"
            , "I want to know about a venue"];
        await dialogContext.prompt("choicePrompt", "What would you like to know?", choices).catch(e => console.log(e));
    },
    async (dialogContext, choice: FoundChoice) => {
        switch(choice.index) {
            case 0:
                await dialogContext.context.sendActivity(`You can ask:
                    * _Is there a chatbot presentation?_
                    * _What is Michael Szul speaking about?_
                    * _Are there any Xamarin talks?_`);
                break;
            case 1:
                await dialogContext.context.sendActivity(`You can ask:
                    * _Who is speaking about bots?_
                    * _Where is giving the Bot Framework talk?_
                    * _Who is speaking Rehearsal A?_`);
                break;
            case 2:
                await dialogContext.context.sendActivity(`You can ask:
                    * _Where is Michael Szul talking?_
                    * _Where is the Bot Framework talk?_
                    * _What time is the Bot Framework talk?_`);
                break;
            default:
                break;
        }
        await dialogContext.end();
    }
]);

dialogs.add("choicePrompt", new ChoicePrompt());

dialogs.add("time", [
    async (dialogContext, args: SpeakerSession[]) => {
        await dialogContext.context.sendActivities(getTime(args));
        await dialogContext.end();
    }
]);
