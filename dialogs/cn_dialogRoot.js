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
var _ = require('lodash');
const Database = require('../config/cn_database.json');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const { CN_DialogContact01,
    CN_DIALOG_CONTACT01 } = require('./cn_dialogContact01');
const { CN_DialogContact02,
    CN_DIALOG_CONTACT02 } = require('./cn_dialogContact02');
const { CN_DialogContact03,
    CN_DIALOG_CONTACT03 } = require('./cn_dialogContact03');
const { CN_DialogProject01,
    CN_DIALOG_PROJECT01 } = require('./cn_dialogProject01');
const { CN_DialogProject02,
    CN_DIALOG_PROJECT02 } = require('./cn_dialogProject02');
const { CN_DialogProject03,
    CN_DIALOG_PROJECT03 } = require('./cn_dialogProject03');
const { CN_DialogPrice01,
    CN_DIALOG_PRICE01 } = require('./cn_dialogPrice01');
const { CN_DialogAdmin01,
    CN_DIALOG_ADMIN01 } = require('./cn_dialogAdmin01');
const { CN_DialogAdmin02,
    CN_DIALOG_ADMIN02 } = require('./cn_dialogAdmin02');
const { CN_DialogAdmin03,
    CN_DIALOG_ADMIN03 } = require('./cn_dialogAdmin03');
const { CN_UserProfile } = require('../class/cn_userProfile');
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');

const CN_DIALOG_ROOT = 'CN_DIALOG_ROOT';
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_MAINMENU = 'PROMPT_CHOICE_MAINMENU';
const PROMPT_CHOICE_SUBMENU = 'PROMPT_CHOICE_SUBMENU';

class CN_DialogRoot extends ComponentDialog {
    constructor(userState, logger) {
        super(CN_DIALOG_ROOT);
        this.userState = userState;
        this.userProfileAccessor = userState.createProperty("UserProfile");
        this.userProfile = {}; //传入每一个二级dialog
        this.logger = logger;



        //this.addDialog(new ChoicePrompt(PROMPT_CHOICE_LANGUAGE));//中英文bot分开开发
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_MAINMENU));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_SUBMENU));
        this.addDialog(new CN_DialogContact01(this.logger));
        this.addDialog(new CN_DialogContact02(this.logger));
        this.addDialog(new CN_DialogContact03(this.logger));
        this.addDialog(new CN_DialogProject01(this.logger));
        this.addDialog(new CN_DialogProject02(this.logger));
        this.addDialog(new CN_DialogProject03(this.logger));
        this.addDialog(new CN_DialogPrice01(this.logger));
        this.addDialog(new CN_DialogAdmin01(this.logger));
        this.addDialog(new CN_DialogAdmin02(this.logger));
        this.addDialog(new CN_DialogAdmin03(this.logger));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            //this.languageStep.bind(this),
            this.mainMenuStep.bind(this),
            this.subMenuStep.bind(this),
            this.routeStep.bind(this),
            this.finalStep.bind(this)

        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }

    /** statistics for menu entry */
    async countFeedback(menu, satisfied) {
        var adapter = new FileSync(
            path.resolve(__dirname, "../db/" + Database.Admin03.db));
        var lowdb = low(adapter);
        var d = new Date();
        var mth = d.toLocaleDateString();
        if (satisfied) {
            lowdb.get(mth)
                .get(menu)
                .update('good', n => n + 1)
                .write();
        }
        else {
            lowdb.get(mth)
                .get(menu)
                .update('bad', n => n + 1)
                .write();
        }
    }
    async countMenuEntry(menu) {
        var adapter = new FileSync(
            path.resolve(__dirname, "../db/" + Database.Admin03.db));
        var lowdb = low(adapter);
        var d = new Date();
        var mth = d.toLocaleDateString();



        var mth_check = lowdb.get(mth).value();
        if (mth_check) {
            var menu_check = lowdb.get(mth).get(menu).value();
            if (menu_check) {
                lowdb.get(mth)
                    .get(menu)
                    .update('entry', n => n + 1)
                    .write();
            }
            else {
                lowdb.get(mth)
                    .set(menu, { entry: 1, good: 0, bad: 0 })
                    .write();

            }
        }
        else {
            var body = {};
            _.set(body, menu, { entry: 1, good: 0, bad: 0 });
            lowdb.set(mth, body)
                .write();
        }

        //lowdb.update(menu+'_entry', n => n + 1)
        //    .write();
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


    async mainMenuStep(stepContext) {

        return await stepContext.prompt(PROMPT_CHOICE_MAINMENU, {
            prompt: Hint.promptMainMenu,
            retryPrompt: Hint.retryChoice,
            choices: stepContext.context.activity.channelId === "msteams"
                ? Menu.mainMenu
                : _.union(Menu.mainMenu, ["管理员入口"])

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
            case 2: //3,价格查询
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu,
                    retryPrompt: Hint.retryChoice,
                    choices: Menu.subMenu3
                });
            case 3: //X,管理员入口
                return await stepContext.prompt(PROMPT_CHOICE_SUBMENU, {
                    prompt: Hint.promptSubMenu,
                    retryPrompt: Hint.retryChoice,
                    choices: Menu.subMenuX
                });
            default:

                return await stepContext.endDialog();
        }


    }

    async routeStep(stepContext) {
        stepContext.values.subMenu = stepContext.result.index;
        switch (stepContext.values.mainMenu) {
            case 0: //1,联系人查询
                switch (stepContext.values.subMenu) {
                    case 0://1, Tender&VO业务客服联系人
                        stepContext.values.idMenu = "Contact01";
                        await this.countMenuEntry('Contact01');
                        return await stepContext.beginDialog(CN_DIALOG_CONTACT01);
                    case 1://2, 排产业务客服联系人
                        stepContext.values.idMenu = "Contact02";
                        await this.countMenuEntry('Contact02');
                        return await stepContext.beginDialog(CN_DIALOG_CONTACT02);
                    case 2://3, 特殊流程联系人
                        stepContext.values.idMenu = "Contact03";
                        await this.countMenuEntry('Contact03');
                        return await stepContext.beginDialog(CN_DIALOG_CONTACT03);

                    case 3://4.返回上一级菜单
                        return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;
            case 1://2,项目状态查询
                switch (stepContext.values.subMenu) {
                    case 0://1.国内询价项目
                        stepContext.values.idMenu = "Project01";
                        await this.countMenuEntry('Project01');
                        return await stepContext.beginDialog(CN_DIALOG_PROJECT01);
                    case 1://2.国内排产项目
                        stepContext.values.idMenu = "Project02";
                        await this.countMenuEntry('Project02');
                        return await stepContext.beginDialog(CN_DIALOG_PROJECT02);
                    case 2://5.VO项目
                        stepContext.values.idMenu = "Project03";
                        await this.countMenuEntry('Project03');
                        return await stepContext.beginDialog(CN_DIALOG_PROJECT03);
                    case 3://6.返回上一级菜单
                        return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;
            case 2://3，价格查询
                switch (stepContext.values.subMenu) {
                    case 0://1.Open Offer 价格查询
                        stepContext.values.idMenu = "Price01";
                        await this.countMenuEntry('Price01');
                        return await stepContext.beginDialog(CN_DIALOG_PRICE01);
                    case 1://6.返回上一级菜单
                        return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;
            case 3://X,管理员入口
                switch (stepContext.values.subMenu) {
                    case 0://1.数据库更新
                        return await stepContext.beginDialog(CN_DIALOG_ADMIN01);
                    case 1://2.用户提问反馈
                        return await stepContext.beginDialog(CN_DIALOG_ADMIN02);
                    case 2://2.用户提问反馈
                        return await stepContext.beginDialog(CN_DIALOG_ADMIN03);
                    case 3://3.返回上一级菜单
                        return await stepContext.replaceDialog(CN_DIALOG_ROOT);
                }
                break;


        }
        await stepContext.context.sendActivity(Hint.messageUnderConstruction);
        await stepContext.context.sendActivity(Hint.goodbye);
        return await stepContext.endDialog();//next();

    }
    async finalStep(stepContext) {
        switch (stepContext.result.index) {
            case 0: //满足期望
                await this.countFeedback(stepContext.values.idMenu, true);
                await stepContext.context.sendActivity(Hint.messageGoodFeedback);
                break;
            case 1://不满足期望
                await this.countFeedback(stepContext.values.idMenu, false);
                await stepContext.context.sendActivity(Hint.messageBadFeedback);
                break;
            case 2://管理员菜单，不做处理
                break;

        }

        await stepContext.context.sendActivity(Hint.goodbye);


        return await stepContext.endDialog();
    }
}

module.exports.CN_DialogRoot = CN_DialogRoot;
module.exports.CN_DIALOG_ROOT = CN_DIALOG_ROOT;
