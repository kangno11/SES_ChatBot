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
const { CardFactory } = require('botbuilder');
const Hint = require('../resources/cn_hint.json');
const Menu = require('../resources/cn_menu.json');

const CN_DIALOG_ADMIN01 = 'CN_DIALOG_ADMIN01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_ATTACHMENT_DATABASE = 'PROMPT_ATTACHMENT_DATABASE';


class CN_DialogAdmin01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_ADMIN01);
        this.logger = logger;


        this.addDialog(new AttachmentPrompt(PROMPT_ATTACHMENT_DATABASE));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.attachmentStep.bind(this),
            this.loadDBStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }


    async attachmentStep(stepContext) {


        // Ask the user to enter their age.
        return await stepContext.prompt(PROMPT_ATTACHMENT_DATABASE, {
            prompt: Hint.promptDatabase,
            retryPrompt: Hint.retryDatabase
        });
    }
    async loadDBStep(stepContext) {
        //await stepContext.context.sendActivity(
        //    {
        //        attachments: [CardFactory.adaptiveCard(CN_AdaptiveCard1_1)]
        //    });
        if (stepContext.result[0].contentType !== "text/csv") {
            await stepContext.context.sendActivity(stepContext.result[0].contentType + Hint.messageIncorrectContentType);
            return await stepContext.replaceDialog(CN_DIALOG_ADMIN01);
        }
        switch (stepContext.result[0].name) {
            case "1.csv":
                stepContext.result[0].contentUrl

                var fs = require('fs');
                var parse = require('csv-parse');
                var async = require('async');

                var inputFile = 'myfile.csv';

                var parser = parse({ delimiter: ',' }, function (err, data) {
                    async.eachSeries(data, function (line, callback) {
                        // do something with the line
                        doSomething(line).then(function () {
                            // when processing finishes invoke the callback to move to the next one
                            callback();
                        });
                    })
                });
                fs.createReadStream(inputFile).pipe(parser);


                request(url)
                    .pipe(fs.createWriteStream(fpath))
                    .on('close', function () {
                        var bu = fs.createReadStream(fpath, { start: 0, end: 262 });
                        bu.on('data', function (chunk) {
                            console.log(chunk.toString());//这是结果
                        });
                    });

                await stepContext.context.sendActivity(Hint.messageLoadDBSuccess);
                break;
            default:
                await stepContext.context.sendActivity(stepContext.result[0].name + Hint.messageIncorrectFileName);
                return await stepContext.replaceDialog(CN_DIALOG_ADMIN01);

        }
        return await stepContext.endDialog({ index: 0 });

    }






}

module.exports.CN_DialogAdmin01 = CN_DialogAdmin01;
module.exports.CN_DIALOG_ADMIN01 = CN_DIALOG_ADMIN01;
