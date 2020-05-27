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

const CN_DIALOG_ADMIN02 = 'CN_DIALOG_ADMIN02';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_CATEGORY = 'PROMPT_CHOICE_CATEGORY';


class CN_DialogAdmin02 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_ADMIN02);
        this.logger = logger;


        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_CATEGORY, this.categoryPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.categoryStep.bind(this),
            this.extractDBStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }


    async categoryStep(stepContext) {
        var adapter = new FileSync(
            path.resolve(__dirname, "../db/" + Database.Admin02.db));
        var lowdb = low(adapter);
        var category = lowdb.get('questions')
            .map('desc')
            .uniq()
            .value();

        if (_.size(category) === 0) {
            await stepContext.context.sendActivity(Hint.messageEmptyCategory);
            return await stepContext.endDialog({ index: 2 });
        }
        else {
            return await stepContext.prompt(PROMPT_CHOICE_CATEGORY, {
                prompt: Hint.promptQuestionCategory,
                retryPrompt: Hint.retryChoice,
                choices: category
            });
        }

    }

    async extractDBStep(stepContext) {
        var txtFile = stepContext.result;
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

        await stepContext.context.sendActivity(txt);
        await stepContext.context.sendActivity(Hint.messageExtractDBSuccess);
        return await stepContext.endDialog({ index: 2 });
    }

    async categoryPromptValidator(promptContext) {

        if (promptContext.recognized.succeeded) {
            var category = promptContext.recognized.value.value;
            var adapter = new FileSync(
                path.resolve(__dirname, "../db/" + Database.Admin02.db));
            var lowdb = low(adapter);
            var txtFile = Database.Admin02.attachment + category + ".txt";
            var txtData = 'id\tdesc\tuser\tdate\ttime\tquestion\n';
            _.forEach(lowdb.get('questions')
                .filter(function (o) {
                    return _.isEqual(o.desc, category);
                })
                .value(), function (value) {
                    txtData += `${value.id}\t${value.desc}\t${value.user}\t${value.date}\t${value.time}\t${value.question}\n`;
                });
            fs.writeFileSync(path.join(__dirname, '../attachment/' + txtFile), txtData);
            promptContext.recognized.value = txtFile;

            //Update DB to remove select
            var lastextractuser = promptContext.context.activity.from.name;
            var d = new Date();
            lowdb.set('lastExtract.user', lastextractuser)
                .write();
            lowdb.set('lastExtract.date', d.toLocaleDateString())
                .write();
            lowdb.set('lastExtract.time', d.toLocaleTimeString())
                .write();
            lowdb.update('countExtract', n => n + 1)
                .write();
            lowdb.get('questions')
                .remove(function (o) {
                    return _.isEqual(o.desc, category);
                })
                .write();
            return true;
        }

    }
}
module.exports.CN_DialogAdmin02 = CN_DialogAdmin02;
module.exports.CN_DIALOG_ADMIN02 = CN_DIALOG_ADMIN02;
