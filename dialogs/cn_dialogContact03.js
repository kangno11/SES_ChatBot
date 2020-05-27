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
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');
const Card = require('../config/cn_card.json');
const Database = require('../config/cn_database.json');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var _ = require('lodash');
var ACData = require("adaptivecards-templating");


const CN_DIALOG_CONTACT03 = 'CN_DIALOG_CONTACT03';//特殊流程联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYMODE = 'PROMPT_CHOICE_QUERYMODE';
const PROMPT_TEXT_BRANCH = 'PROMPT_TEXT_BRANCH';
const PROMPT_CHOICE_REGION = 'PROMPT_CHOICE_REGION';
const PROMPT_TEXT_QUERY = 'PROMPT_TEXT_QUERY';
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class CN_DialogContact03 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_CONTACT03);
        this.logger = logger;

        this.addDialog(new TextPrompt(PROMPT_TEXT_QUERY, this.queryPromptValidator));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new TextPrompt(PROMPT_TEXT_QUESTION, this.questionPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryDatabaseStep.bind(this),
            this.queryDisplayStep.bind(this),
            this.queryConfirmationStep.bind(this),
            this.queryRecordStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }
    async queryDatabaseStep(stepContext) {
        return await stepContext.prompt(PROMPT_TEXT_QUERY, {
            prompt: Hint.Contact03_SelectQuestion
        });
    }
    async queryDisplayStep(stepContext) {
        /*
        switch (stepContext.values.queryMode.index) {
            case 0://查询区域主管
                var d = stepContext.result;
                var template  = new ACData.Template(Card.Contact02_AdaptiveRegion);
                var card = template.expand({$root:d});

                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(card)]
                    });
                break;
            case 1://查询分公司工程师
                var d = stepContext.result;
                var template  = new ACData.Template(Card.Contact02_AdaptiveBranch);
                var card = template.expand({$root:d});

                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(card)]
                    });
                break;
        }

        */
        if (stepContext.result) //显示结果
        {
            var d = stepContext.result;
            var template = new ACData.Template(Card.Contact03_AdaptiveQA);
            var card = template.expand({ $root: d });

            await stepContext.context.sendActivity(
                {
                    attachments: [CardFactory.adaptiveCard(card)]
                });
            return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
                {
                    prompt: Hint.promptFeedback,
                    choices: Menu.feedbackMenu
                }
            );
        }
        else {
            return await stepContext.next({ index: 1 });
        }

    }
    async queryConfirmationStep(stepContext) {
        //stepContext.values.queryConfirmationResult = stepContext.result
        //return await stepContext.endDialog(stepContext.result);
        if (stepContext.result.index === 0) {
            return await stepContext.endDialog({ index: 0 })
        }
        else {
            return await stepContext.prompt(PROMPT_TEXT_QUESTION, {
                prompt: Hint.promptQuestion,
                retryPrompt: Hint.retryQuestion,
            });
        }

    }

    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
    }


    async queryPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {

            var k = promptContext.recognized.value;
            k = _.trim(k);
            if (_.size(k) < 2) {
                await promptContext.context.sendActivity(Hint.Contact03_ValidQuestion);
                return false;
            }
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Contact03.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db')
                .filter(function (o) {
                    return (_.includes(_.toUpper(o.question), _.toUpper(k)));
                })
                .value();
            if (d.length > 0) {
                promptContext.recognized.value = { "qa": d };
                promptContext.recognized.value.keyword = k;
                promptContext.recognized.value.lastrefreshdate = lowdb.get("lastRefresh.date").value();
                promptContext.recognized.value.lastrefreshtime = lowdb.get("lastRefresh.time").value();

                return true;
            }
            else {
                if (promptContext.state.attemptCount >= 3) {
                    await promptContext.context.sendActivity(Hint.messageOverTry);
                    promptContext.recognized.value = false; //没有找到
                    return true;
                }
                else {
                    await promptContext.context.sendActivity(Hint.messageQueryFailure);
                }
            }
        }
    }

    async questionPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value;
            k = _.trim(k);
            if (_.size(k) >= 5) {
                //保存问题到问题数据库
                var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Admin02.db));
                var lowdb = low(adapter);
                var d = new Date();
                lowdb.defaults({ questions: [],lastExtract:{}, countExtract:0 })
                    .write();
                var question = {
                    "user":promptContext.context.activity.from.name,
                    "date":d.toLocaleDateString(),
                    "time":d.toLocaleTimeString(),
                    "question":k,
                    "id":"Contact03",
                    "desc":"特殊流程联系人"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogContact03 = CN_DialogContact03;
module.exports.CN_DIALOG_CONTACT03 = CN_DIALOG_CONTACT03;
