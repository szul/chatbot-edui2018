import { BotFrameworkAdapter, ConversationState, TurnContext } from "botbuilder";
import { QnAMaker, LuisRecognizer } from "botbuilder-ai";
import { DialogSet, WaterfallDialog, ChoicePrompt, WaterfallStepContext, PromptOptions } from "botbuilder-dialogs";
import { TableStorage } from "botbuilder-azuretablestorage";
import * as restify from "restify";
import { SpeakerSession } from "./types";
import { BotConfig } from "botbuilder-config";
import { config } from "dotenv";
import { getData } from "./parser";
import { getTime } from "./dialogs";
import { createCarousel, createHeroCard } from "./cards";
import { saveRef, subscribe, getRef } from "./proactive";

config();

const botConfig = new BotConfig({ botFilePath: "./edui2018.bot", secret: process.env.BOT_FILE_SECRET });
const SavedSessions: string[] = [];

const server = restify.createServer();
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
const conversationState = new ConversationState(tableStorage);

const qnaMaker = new QnAMaker({
    knowledgeBaseId: botConfig.QnAMaker().kbId,
    endpointKey: botConfig.QnAMaker().endpointKey,
    host: botConfig.QnAMaker().hostname
});

const luis = new LuisRecognizer({
    applicationId: botConfig.LUIS().appId,
    endpointKey: botConfig.decrypt(botConfig.LUIS().subscriptionKey),
    endpoint: botConfig.LUIS().endpointBasePath
});

const dialogs = new DialogSet(conversationState.createProperty("dialogState"));

server.post("/api/messages", (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        const dc = await dialogs.createContext(context);
        await dc.continueDialog();
        if (context.activity.text != null && context.activity.text === "help") {
            await dc.beginDialog("help");
        }
        else if (context.activity.type === "message") {
            const userId = await saveRef(TurnContext.getConversationReference(context.activity), tableStorage);
            subscribe(userId, tableStorage, adapter, SavedSessions);
            if(context.activity.text.indexOf("SAVE:") !== -1) {
                const title = context.activity.text.replace("SAVE:","");
                if(SavedSessions.indexOf(title) === -1) {
                    SavedSessions.push(title);
                }
                const ref = await getRef(userId, tableStorage, SavedSessions);
                ref["speakersessions"] = JSON.stringify(SavedSessions);
                await saveRef(ref, tableStorage);
                await context.sendActivity(`You've saved "${title}" to your speaker session list.`);
            }
            else {
                const qnaResults = await qnaMaker.generateAnswer(context.activity.text);
                if(qnaResults.length > 0) {
                    await context.sendActivity(qnaResults[0].answer);
                }
                else {
                    await luis.recognize(context).then(res => {
                        const top = LuisRecognizer.topIntent(res);
                        const data: SpeakerSession[] = getData(res.entities);
                        if(top === "Time") {
                        dc.beginDialog("time", data);
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
        }
        await conversationState.saveChanges(context);
    });
});

dialogs.add(new WaterfallDialog("help", [
    async (step: WaterfallStepContext) => {
        const choices = ["I want to know about a topic"
            ,"I want to know about a speaker"
            , "I want to know about a venue"];
        const options: PromptOptions = {
            prompt: "What would you like to know?"
            , choices: choices
        };
        return await step.prompt("choicePrompt", options);
    },
    async (step: WaterfallStepContext) => {
        switch(step.result.index) {
            case 0:
                await step.context.sendActivity(`You can ask:
                    * _Is there a chatbot presentation?_
                    * _What is Michael Szul speaking about?_
                    * _Are there any Xamarin talks?_`);
                break;
            case 1:
                await step.context.sendActivity(`You can ask:
                    * _Who is speaking about bots?_
                    * _Where is giving the Bot Framework talk?_
                    * _Who is speaking Rehearsal A?_`);
                break;
            case 2:
                await step.context.sendActivity(`You can ask:
                    * _Where is Michael Szul talking?_
                    * _Where is the Bot Framework talk?_
                    * _What time is the Bot Framework talk?_`);
                break;
            default:
                break;
        }
        return await step.endDialog();
    }
]));

dialogs.add(new ChoicePrompt("choicePrompt"));

dialogs.add(new WaterfallDialog("time", [
    async (step: WaterfallStepContext) => {
        await step.context.sendActivities(getTime(step.activeDialog.state.options));
        return await step.endDialog();
    }
]));
