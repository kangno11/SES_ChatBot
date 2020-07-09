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
const { CardFactory, TurnContext } = require('botbuilder');
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');
const Card = require('../config/cn_card.json');
const Database = require('../config/cn_database.json');
const path = require('path');
const request = require('request');
const csv = require('csv');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var _ = require('lodash');
const fs = require('fs');
var ACData = require("adaptivecards-templating");

const CN_DIALOG_ADMIN04 = 'CN_DIALOG_ADMIN04';//技术文档上传
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_ATTACHMENT = 'PROMPT_ATTACHMENT';


class CN_DialogAdmin04 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_ADMIN04);
        this.logger = logger;


        this.addDialog(new AttachmentPrompt(PROMPT_ATTACHMENT, this.attachmentPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.attachmentUpload.bind(this),
            this.attachmentSave.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }


    async attachmentUpload(stepContext) {
        // Ask the user to enter their age.
        return await stepContext.prompt(PROMPT_ATTACHMENT, {
            prompt: Hint.promptAttachment,
            retryPrompt: Hint.retryAttachment
        });
    }

    async attachmentSave(stepContext) {
        _.forEach(stepContext.result, function (value) {
            var stream = fs.createWriteStream(path.resolve(__dirname, "../attachment/" + value.name));
            request(value.contentUrl)
                .pipe(stream)
                .on('close', function () {
                    try {
                        console.log(value.name + ' Attachment Saved Successfully');
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
        }
        );


        await stepContext.context.sendActivity(Hint.messageLoadAttachmentSuccess);
        return await stepContext.endDialog({ index: 2 });
    }

    async attachmentPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var message = "";
            var attachmentlist = ['default'];
            //获取有附件的数据库列表
            var dblist = _.filter(Database,{attachment:true});
            dblist = _.map(dblist,'db');
            //获取附件的文件名列表
            _.forEach(dblist,function(value){
                var adapter = new FileSync(path.resolve(__dirname, "../db/" + value));
                var lowdb = low(adapter);
                var al = lowdb.get('db')
                .map('attachment')
                .value();
                attachmentlist = _.concat(attachmentlist,al);
            });
            

            _.forEach(promptContext.recognized.value, function (value) {
                var attachmentinfo = _.find(attachmentlist, function(o){
                   // value.name
                   if(o==value.name)
                   {return true;}
                    
                });
                if (attachmentinfo) {
                    value.delete = false;
                    message += value.name + Hint.messageCorrectFileName;
                }
                else {
                    value.delete = true;
                    message += value.name + Hint.messageIncorrectFileName;
                }

            });

            await promptContext.context.sendActivity(message);

            _.remove(promptContext.recognized.value, function (o) {
                return o.delete;
            });
            if (_.size(promptContext.recognized.value) !== 0) {
                return true;
            }
            else {
                await promptContext.context.sendActivity(Hint.messageLoadAttachmentRetry);
            }
        }

    }






}

module.exports.CN_DialogAdmin04 = CN_DialogAdmin04;
module.exports.CN_DIALOG_ADMIN04 = CN_DIALOG_ADMIN04;
