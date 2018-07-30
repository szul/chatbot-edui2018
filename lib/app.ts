import { BotFrameworkAdapter, MemoryStorage, ConversationState } from "botbuilder";
import { QnAMaker, LuisRecognizer } from "botbuilder-ai";
import { DialogSet, FoundChoice } from "botbuilder-dialogs";
import * as restify from "restify";
import { ConfState, SpeakerSession } from "./types";
import { BotConfig } from "botbuilder-config";
import { config } from "dotenv";
import { getData } from "./parser";
import { createCarousel, createHeroCard } from "./cards";

config();

const botConfig = new BotConfig("./edui2018.bot", process.env.BOT_FILE_SECRET);

let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const adapter = new BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});

const conversationState = new ConversationState<ConfState>(new MemoryStorage());
adapter.use(conversationState);

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
        if (context.activity.text != null && context.activity.text === "help") {
            await dc.continue();
            if(!context.responded && context.activity.text.toLocaleLowerCase() === "help") {
                dc.begin("help");
            }
        }
        else if (context.activity.type === "message") {
            await luis.recognize(context).then(res => {
                let top = LuisRecognizer.topIntent(res);
                let data: SpeakerSession[] = getData(res.entities);
                if(top === "Time") {
                   dc.begin("time");
                }
                else if(data.length > 1) {
                    context.sendActivity(createCarousel(data, top));
                }
                else if (data.length === 1) {
                    context.sendActivity({ attachments: [createHeroCard(data[0], top)] });
                }
            });
        }
        else if (context.activity.type !== "message") {
            await context.sendActivity(`[${context.activity.type} event detected]`);
        }
    });
});

dialogs.add("help", [
    async (dialogContext) => {
        const choices = ["I want to know about a topic"
            ,"I want to know about a speaker"
            , "|I want to know about a venue"];
        await dialogContext.prompt("choicePrompt", "What would you like to know?", choices);
    },
    async (dialogContext, choice: FoundChoice) => {
        switch(choice.index) {
            case 0:
                await dialogContext.context.sendActivity(`You can ask:
                    * _Who is speaking about bots?_
                    * _Where is the Bot Framework talk?_
                    * _What time is the Bot Framework talk?_`);
                break;
            case 1:
                break;
            case 2:
                break;
            default:
                break;
        }
        dialogContext.end();
    }
]);

dialogs.add("time", [
    async (dialogContext) => {
        dialogContext.end();
    }
]);
