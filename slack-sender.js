"use strict";

module.exports = { sendToSlack };

const request = require('request');
const os = require('os');

const redEvents = ['stop', 'exit', 'delete', 'error', 'kill', 'exception', 'restart overlimit', 'suppressed'];
const redColor = '#F44336';
const commonColor = '#2196F3';

function sendToSlack(messages, config) {

    if (!config.slack_url) {
        return console.error("There is no Slack URL set, please set the Slack URL: 'pm2 set pm2-slack:slack_url https://slack_url'");
    }

    let limitedCountOfMessages;
    if (config.queue_max > 0) {
        limitedCountOfMessages = messages.splice(0, Math.min(config.queue_max, messages.length));
    } else {
        limitedCountOfMessages = messages;
    }

    let payload = {
        username: config.username || config.servername || os.hostname(),
        attachments: []
    };

    payload.attachments = convertMessagesToSlackAttachments(mergeSimilarMessages(limitedCountOfMessages));

    if (payload.attachments.length > 1) {
        payload.text = payload.attachments
            .map(function(/*SlackAttachment*/ attachment) { return attachment.title; })
            .join(", ");
    }

    if (messages.length > 0) {
        let text = 'Next ' + messages.length + ' message' + (messages.length > 1 ? 's have ' : ' has ') + 'been suppressed.';
        payload.attachments.push({
            fallback: text,
            // color: redColor,
            title: 'message rate limitation',
            text: text,
            ts: Math.floor(Date.now() / 1000),
        });
    }

    const requestOptions = {
        method: 'post',
        body: payload,
        json: true,
        url: config.slack_url,
    };

    // Finally, make the post request to the Slack Incoming Webhook
    request(requestOptions, function(err, res, body) {
        if (err) return console.error(err);
        if (body !== 'ok') {
            console.error('Error sending notification to Slack, verify that the Slack URL for incoming webhooks is correct. ' + messages.length + ' unsended message(s) lost.');
        }
    });
}

function mergeSimilarMessages(messages) {
    return messages.reduce(function(/*Message[]*/ finalMessages, /*Message*/ currentMessage) {
        if (finalMessages.length > 0
            && finalMessages[finalMessages.length-1].name === currentMessage.name
            && finalMessages[finalMessages.length-1].event === currentMessage.event
        ) {
            // Current message has same title as previous one. Concate it.
            finalMessages[finalMessages.length-1].description += "\n" + currentMessage.description;
        } else {
            // Current message is different than previous one.
            finalMessages.push(currentMessage);
        }
        return finalMessages;
    }, []);
}

function convertMessagesToSlackAttachments(messages) {
    return messages.reduce(function(slackAttachments, message) {

        var color = commonColor;

        if (redEvents.indexOf(message.event) > -1) {
            color = redColor;
        }

        var title = `${message.name} ${message.event}`;
        var description = (message.description || '').trim();
        var fallbackText = title + (description ? ': ' + description.replace(/[\r\n]+/g, ', ') : '');
        slackAttachments.push({
            fallback: escapeSlackText(fallbackText),
            color: color,
            title: escapeSlackText(title),
            text: escapeSlackText(description),
            ts: message.timestamp,
            // footer: message.name,
        });

        return slackAttachments;
    }, []);
}


function escapeSlackText(text) {
    return (text || '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
}