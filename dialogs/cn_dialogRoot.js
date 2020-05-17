// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
    ChoicePrompt,
    ChoiceFactory
} = require('botbuilder-dialogs');

const { CN_DialogContact01,
    CN_DIALOG_CONTACT01 } = require('./cn_dialogContact01');
const { CN_UserProfile } = require('../class/cn_userProfile');
const Hint = require('../resources/cn_hint.json');
const Menu = require('../resources/cn_menu.json');

const CN_DIALOG_ROOT = 'CN_DIALOG_ROOT';
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_LANGUAGE = 'PROMPT_CHOICE_LANGUAGE';
const PROMPT_CHOICE_MAINMENU = 'PROMPT_CHOICE_MAINMENU';
const PROMPT_CHOICE_SUBMENU = 'PROMPT_CHOICE_SUBMENU';

class CN_DialogRoot extends ComponentDialog {
    constructor(userState) {
        super(CN_DIALOG_ROOT);
        this.userState = userState;
        this.userProfileAccessor = userState.createProperty("UserProfile");
        this.userProfile = {}; //传入每一个二级dialog



        //this.addDialog(new ChoicePrompt(PROMPT_CHOICE_LANGUAGE));//中英文bot分开开发
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_MAINMENU));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_SUBMENU));
        this.addDialog(new CN_DialogContact01());
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            //this.languageStep.bind(this),
            this.mainMenuStep.bind(this),
            this.subMenuStep.bind(this),
            this.routeStep.bind(this),
            this.finalStep.bind(this)

        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        this.userProfile = await this.userProfileAccessor.get(turnContext, new CN_UserProfile());
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /*
    async languageStep(stepContext) {
        if (this.userProfile.language === "") {
            this.userProfile.save_language = true;
            return await stepContext.prompt(PROMPT_CHOICE_LANGUAGE, {
                prompt: Hint.promptLanguage.en + Hint.promptLanguage.cn,
                choices: ChoiceFactory.toChoices(['English', '中文'])
            });
        }
        else {
            this.userProfile.save_language = false;
            //await stepContext.context.sendActivity(this.userProfile.language);
            return await stepContext.next();
        }
    }
    */

    async mainMenuStep(stepContext) {
        /*
        if (this.userProfile.save_language) {
            if (stepContext.result.value === "English") {
                this.userProfile.language = "en";
            }
            if (stepContext.result.value === "中文") {
                this.userProfile.language = "cn";
            }
        }
        */
        return await stepContext.prompt(PROMPT_CHOICE_MAINMENU, {
            prompt: Hint.promptMainMenu,
            retryPrompt: Hint.retryChoice,
            choices: Menu.mainMenu
        });
    }

    async subMenuStep(stepContext) {
        stepContext.values.mainMenu = stepContext.result.index;
        switch (stepContext.values.mainMenu) {
            case 0: //1,联系人查询
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu,
                    retryPrompt: Hint.retryChoice,
                    choices: Menu.subMenu1
                });
            case 1: //2,项目状态查询
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu,
                    retryPrompt: Hint.retryChoice,
                    choices: Menu.subMenu2
                });
            default:

                return await stepContext.next();
        }


    }

    async routeStep(stepContext) {
        stepContext.values.subMenu = stepContext.result.index;
        switch (stepContext.values.mainMenu) {
            case 0: //1,联系人查询
                switch (stepContext.values.subMenu) {
                    case 0://1, Tender&VO业务客服联系人
                        return await stepContext.beginDialog(CN_DIALOG_CONTACT01);
                    case 1://2, 排产业务客服联系人
                        break;
                    case 2://3, 特殊流程联系人
                        break;
                    case 3://4.返回上一级菜单
                        return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;
            case 1://2,项目状态查询
                switch (stepContext.values.subMenu) {
                    case 0://1.国内询价项目
                        break;
                    case 1://2.国内排产项目
                        break;
                    case 2://3.出口询价项目
                        break;
                    case 3://4.出口排产项目
                        break;
                    case 4://5.VO项目
                        break;
                    case 5://6.返回上一级菜单
                    return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;


        }
        await stepContext.context.sendActivity(Hint.messageUnderConstruction);
        await stepContext.context.sendActivity(Hint.goodbye);
        return await stepContext.endDialog();//next();

    }
    async finalStep(stepContext) {
        if (stepContext.result.index === 0) {
            await stepContext.context.sendActivity(Hint.messageGoodFeedback);
        }
        else {
            await stepContext.context.sendActivity(Hint.messageBadFeedback);
        }

        await stepContext.context.sendActivity(Hint.goodbye);
        return await stepContext.endDialog();
    }
}

module.exports.CN_DialogRoot = CN_DialogRoot;
module.exports.CN_DIALOG_ROOT = CN_DIALOG_ROOT;
