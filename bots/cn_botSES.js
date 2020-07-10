// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, TeamsActivityHandler,ActivityTypes } = require('botbuilder');
const Hint = require('../config/cn_hint.json');
const fs = require('fs');
const path = require('path');

//class BotSES extends ActivityHandler {
class CN_BotSES extends TeamsActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog, logger) {
        super();
        if (!conversationState) throw new Error('[cn_botSES]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[cn_botSES]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[cn_botSES]: Missing parameter. dialog is required');
        if (!logger) throw new Error('[cn_botSES]: Missing parameter. logger is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.conversationDialogAccessor = this.conversationState.createProperty('ConversationDialog');
        this.logger = logger;

        this.onMessage(async (context, next) => {
            if (context.activity.attachments) {
                this.logger.debug(context.activity.from.name + '\t' + context.activity.attachments[0].contentType + '\t' + context.activity.attachments[0].name);
            }
            else if (context.activity.value) {
                this.logger.debug(context.activity.from.name + '\t' + context.activity.value.attachment);
            }
            else {
                this.logger.debug(context.activity.from.name + '\t' + context.activity.type + '\t' + context.activity.text);
            }

            if (context.activity.type === "message" && context.activity.text === Hint.shortcutMainMenu) {
                await this.conversationState.clear(context);
                await this.dialog.run(context, this.conversationDialogAccessor);
            }
            if (context.activity.type === "message" && context.activity.text === Hint.shortcutLog && context.activity.channelId !== "msteams") {
                await this.conversationState.clear(context);
                const txtFile = "cnBotSES.log";
                const txtData = fs.readFileSync(path.join(__dirname, '../log/' + txtFile));
                const base64TXT = Buffer.from(txtData).toString('base64');
                var txt = {
                    type: ActivityTypes.Message,
                    text: Hint.messageDownloadAttachment,
                    attachments: [{
                        name: txtFile,
                        contentType: 'text/csv',
                        contentUrl: `data:text/csv;base64,${base64TXT}`,
                    }]

                };
                await context.sendActivity(txt);
                await context.sendActivity(Hint.goodbye);
            }
            else if (context.activity.value) {
                await this.conversationState.clear(context);
                const txtFile = context.activity.value.attachment;
                const txtData = fs.readFileSync(path.join(__dirname, '../attachment/' + txtFile));
                const base64TXT = Buffer.from(txtData).toString('base64');
                var txt = {
                    type: ActivityTypes.Message,
                    text: Hint.messageDownloadAttachment,
                    attachments: [{
                        name: txtFile,
                        contentType: 'text/csv',
                        contentUrl: `data:text/csv;base64,${base64TXT}`,
                    }]

                };
                await context.sendActivity(txt);
                await context.sendActivity(Hint.goodbye);
            }
            else {
                await this.dialog.run(context, this.conversationDialogAccessor);
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onTeamsMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {

                    await context.sendActivity(`你好 ${membersAdded[cnt].name}。` + Hint.welcome);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {

                    await context.sendActivity(`你好 ${membersAdded[cnt].name}。` + Hint.welcome);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.CN_BotSES = CN_BotSES;
