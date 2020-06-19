// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    ChoicePrompt,
    ChoiceFactory,
    ConfirmPrompt,
    AttachmentPrompt
} = require('botbuilder-dialogs');
const { CardFactory, TurnContext, ActivityTypes, ActionTypes, MessageFactory } = require('botbuilder');
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');
const Database = require('../config/cn_database.json');
const path = require('path');
const request = require('request');
const csv = require('csv');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');
var _ = require('lodash');

const CN_DIALOG_ADMIN03 = 'CN_DIALOG_ADMIN03';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYAGAIN = "PROMPT_CHOICE_QUERYAGAIN";


class CN_DialogAdmin03 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_ADMIN03);
        this.logger = logger;

        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYAGAIN));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.extractDBStep.bind(this)

        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }




    async extractDBStep(stepContext) {
        var adapter = new FileSync(
            path.resolve(__dirname, "../db/" + Database.Admin03.db));
        var lowdb = low(adapter);
        var txtFile = Database.Admin03.attachment + new Date().toLocaleDateString() + ".txt";
        var txtData = 'year\tmonth\tdate\tmenu\tentry\tgood\tbad\r\n';
        _.forEach(lowdb.getState(), function (value1, key1) {
            var d = _.split(key1, '-');
            _.forEach(value1, function (value2, key2) {
                txtData += `${d[0]}\t${d[1]}\t${key1}\t${key2}\t${value2.entry}\t${value2.good}\t${value2.bad}\r\n`;
       
            })
        });
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

        await stepContext.context.sendActivity(txt);
        await stepContext.context.sendActivity(Hint.messageExtractDBOnly);
        return await stepContext.endDialog({ index: 2 });
    }
}
module.exports.CN_DialogAdmin03 = CN_DialogAdmin03;
module.exports.CN_DIALOG_ADMIN03 = CN_DIALOG_ADMIN03;
