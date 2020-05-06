// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog,
    ChoicePrompt, ChoiceFactory } = require('botbuilder-dialogs');
const { DialogContactTenderVO, DIALOG_CONTACT_TENDERVO } = require('./dialogContactTenderVO');
const { UserProfile } = require('../class/userProfile');
const Hint = require('../resources/hint.json');
const Menu = require('../resources/menu.json');

const DIALOG_ROOT = 'DIALOG_ROOT';
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_LANGUAGE = 'PROMPT_CHOICE_LANGUAGE';
const PROMPT_CHOICE_MAINMENU = 'PROMPT_CHOICE_MAINMENU';
const PROMPT_CHOICE_SUBMENU = 'PROMPT_CHOICE_SUBMENU';

class DialogRoot extends ComponentDialog {
    constructor(userState) {
        super(DIALOG_ROOT);
        this.userState = userState;
        this.userProfileAccessor = userState.createProperty("UserProfile");
        this.userProfile = {}; //传入每一个二级dialog


        //this.addDialog(new TopLevelDialog());//this.userProfile一定要传入
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_LANGUAGE));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_MAINMENU));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_SUBMENU));
        this.addDialog(new DialogContactTenderVO());
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.languageStep.bind(this),
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
        this.userProfile = await this.userProfileAccessor.get(turnContext, new UserProfile());
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

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
    async mainMenuStep(stepContext) {

        if (this.userProfile.save_language) {
            if (stepContext.result.value === "English") {
                this.userProfile.language = "en";
            }
            if (stepContext.result.value === "中文") {
                this.userProfile.language = "cn";
            }
        }

       

        return await stepContext.prompt(PROMPT_CHOICE_MAINMENU, {
            prompt: Hint.promptMainMenu[this.userProfile.language],
            retryPrompt:Hint.retryChoice[this.userProfile.language],
            choices: Menu.mainMenu[this.userProfile.language]
        });
    }

    async subMenuStep(stepContext) {
        stepContext.values.mainMenu = stepContext.result.index;
        switch (stepContext.values.mainMenu) {
            case 0: //Contact
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu[this.userProfile.language],
                    retryPrompt:Hint.retryChoice[this.userProfile.language],
                    choices: Menu.subMenu1[this.userProfile.language]
                });
            case 1: //Project
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu[this.userProfile.language],
                    retryPrompt:Hint.retryChoice[this.userProfile.language],
                    choices: Menu.subMenu2[this.userProfile.language]
                });
            default:
                
                return await stepContext.next();
        }

       
    }

    async routeStep(stepContext) {
        stepContext.values.subMenu = stepContext.result.index;
        switch (stepContext.values.mainMenu) {
            case 0: //Contact
                switch (stepContext.values.subMenu) {
                    case 0://Tender &VO Business
                    return await stepContext.beginDialog(DIALOG_CONTACT_TENDERVO,this.userProfile.language);
                    case 1://Order Business
                        break;
                    case 2://Special Process Contact
                        break;
                }
 

        }
        await stepContext.context.sendActivity(Hint.messageUnderConstruction[this.userProfile.language]);
        return await stepContext.next();

    }
    async finalStep(stepContext) {
        if(stepContext.result.index===0)
        {
            await stepContext.context.sendActivity(Hint.messageGoodFeedback[this.userProfile.language]);
        }
        else{
            await stepContext.context.sendActivity(Hint.messageBadFeedback[this.userProfile.language]);
        }
        
        await stepContext.context.sendActivity(Hint.goodbye[this.userProfile.language]);
        return await stepContext.endDialog();

        const userInfo = stepContext.result;
        const status = 'You are signed up to review ' +
            (userInfo.companiesToReview.length === 0 ? 'no companies' : userInfo.companiesToReview.join(' and ')) + '.';
        await stepContext.context.sendActivity(status);
        await this.userProfileAccessor.set(stepContext.context, userInfo);
        return await stepContext.endDialog();
    }
}

module.exports.DialogRoot = DialogRoot;
module.exports.DIALOG_ROOT = DIALOG_ROOT;
