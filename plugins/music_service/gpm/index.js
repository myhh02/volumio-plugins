'use strict';

var libQ = require('kew');

module.exports = ControllerGPM;
function ControllerGPM(context) {
    var self = this;

    this.context = context;
    this.commandRouter = this.context.commandRouter;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
}

ControllerGPM.prototype.onVolumioStart = function() {
    this.config = new (require('v-conf'))();

    var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config.loadFile(configFile);
};

ControllerGPM.prototype.onStart = function() {
    var self = this;

    self.commandRouter.pushConsoleMessage('onStart');

    var defer = libQ.defer();

    //TODO

    // this.commandRouter.sharedVars.registerCallback('alsa.outputdevice', this.rebuildGPMAndRestartDaemon.bind(this));

    return defer.promise;
};

ControllerGPM.prototype.onStop = function() {
    var self = this;

    self.commandRouter.pushConsoleMessage('onStop');

    return libQ.resolve();
};

ControllerGPM.prototype.getConfigurationFiles = function() {
    return ['config.json'];
};

ControllerGPM.prototype.getUIConfig = function() {
    var self = this;

    var defer = libQ.defer();

    var lang_code = this.commandRouter.sharedVars.get('language_code');
    self.commandRouter.pushConsoleMessage('Got language code: ' + lang_code);

    self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
                                __dirname + '/i18n/strings_en.json',
                                __dirname + '/UIConfig.json')
        .then(function(uiconf) {
            uiconf.sections[0].content[0].value = self.config.get('username');
            uiconf.sections[0].content[1].value = self.config.get('password');

            defer.resolve(uiconf);
        })
        .fail(function() {
            defer.reject(new Error());
        });

    return defer.promise;
};

ControllerGPM.prototype.onRestart = function() {
    var self = this;

    self.commandRouter.pushConsoleMessage('[gpm] onRestart');
};

ControllerGPM.prototype.addToBrowseSources = function() {
    this.commandRouter.volumioAddToBrowseSources({
        name: "Google Play Music",
        uri: "gpm",
        plugin_type: "music_service",
        plugin_name: "gpm"
    });
};

ControllerGPM.prototype.handleBrowseUri = function(uri) {
    var self = this;

    self.commandRouter.pushConsoleMessage('[gpm] handleBrowserUri: ' + uri);

    var response;
    if (uri.startsWith('gpm')) {
        //TODO
    }

    return response;
};

ControllerGPM.prototype.explodeUri = function(uri) {
    var self = this;

    self.commandRouter.pushConsoleMessage('[gpm] explodeUri: ' + uri);

    var defer = libQ.defer();

    var response;

    return defer.promise;
};
