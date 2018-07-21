import * as fs from "fs";
import { load as CheerioLoad } from "cheerio";
import { SpeakerSession } from "./types";

const file: string = fs.readFileSync("./edui.xml", "utf-8");
const xml: CheerioStatic = CheerioLoad(file);

export function getSessionBySubject(subject: string): SpeakerSession {
    return <any>{ }
}

export function getSessionByLocation(subject: string, data?: SpeakerSession): SpeakerSession {
    return <any>{ }
}

export function getSessionByPerson(person: string, data?: SpeakerSession): SpeakerSession {
    return writeEvent(getEventNodes("speakers", person));
}

/*
function getData(e: any): Array<types.Event> {
    if(e != null) {
        if(e.type === "person") {
            return getPerson(e.entity);
        }
        if(e.type === "topic") {
            return getTopic(e.entity);
        }
    }
    return [];
}
*/

function getPerson(search: string): SpeakerSession[] {
    
}

function getTopic(search: string): Array<types.Event> {
    return writeEvent(getEventNodes("keywords", search).concat(getEventNodes("title", search)));
}

function getEventNodes(s: string, t: string): Array<CheerioElement> {
    var events: Array<CheerioElement> = [];
    xml(s).each((idx: number, elem: CheerioElement) => {
        if(xml(elem).text().toLowerCase().indexOf(t.toLowerCase()) > -1) {
            events.push(elem.parent);
        }
    });
    return events;
}

function writeEvent(events: Array<CheerioElement>): Array<types.Event> {
    var results: Array<types.Event> = [];
    for(let i = 0; i < events.length; i++) {
        let elem = xml(events[i]);
        let r: types.Event = {
              date: elem.parent().attr("date")
            , startTime: elem.attr("start-time")
            , endTime: elem.attr("end-time")
            , title: elem.find("title").text()
            , speakers: elem.find("speakers").text()
            , location: elem.find("location").text()
            , keywords: elem.find("keywords").text()
            , link: elem.find("page").text()
            , type: elem.attr("type")
        };
        if(elem.find("image").length > 0) {
            let imgs: Array<types.Image> = [];
            elem.find("image").each((idx: number, el: CheerioElement) => {
                imgs.push({
                      type: xml(el).attr("type")
                    , link: xml(el).text()
                });
            });
            r.images = imgs;
        }
        results.push(r);
    }
    return results;
}

export function parse(sess: builder.Session, intent: types.Intent, entities: any): builder.HeroCard | Array<string> {
    var r = getData(entities.person).concat(getData(entities.topic));
    if(r.length > 1) {
        return dialogs.createChoiceOptions(r);
    }
    return (r.length === 1) ? dialogs.createHeroCard(sess, r[0], intent) : null;
}

export function findExact(s: string, t: string): types.Event {
    var e = writeEvent(getEventNodes(s, t));
    return (e.length > 0) ? e[0] : null;
}
*/
