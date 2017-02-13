'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var GMusicProxyAPI = require('./gmusicproxy-api');
var PlayMusic = require('playmusic');

function ControllerGPM(context) {
    var self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
    this.servicename = 'gpm';
    this.gpmApi = new GMusicProxyAPI();
    this.pm = new PlayMusic();
}

ControllerGPM.prototype.onVolumioStart = function() {
    var self = this;

    var configFile = self.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');

    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    self.commandRouter.pushConsoleMessage('onVolumioStart');
};

ControllerGPM.prototype.onStart = function() {
    var self = this;

    var defer = libQ.defer();

    this.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');

    self.startGMusicProxyDaemon()
        .then(self.addToBrowseSources.bind(self))
        .fail(function(e) {
            defer.reject(new Error(e));
        });

    self.commandRouter.sharedVars.registerCallback('alsa.outputdevice', self.rebuildGMusicProxyAndRestartDaemon.bind(this));

    return defer.promise;
};

ControllerGPM.prototype.onStop = function() {
    var self = this;

    var defer = libQ.defer();

    self.stopGMusicProxyDaemon()
        .then(function() {
            defer.resolve();
        });

    return defer.promise;
};

ControllerGPM.prototype.getConfigurationFiles = function() {
    return ['config.json'];
};

ControllerGPM.prototype.getUIConfig = function() {
    var self = this;

    var defer = libQ.defer();

    var lang_code = self.commandRouter.sharedVars.get('language_code');
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

ControllerGPM.prototype.startGMusicProxyDaemon = function() {
    var self = this;

    var defer = libQ.defer();

    exec('/usr/local/bin/GMusicProxy --daemon', function(error, stdout, stderr) {
        if (error !== null && error.length > 0) {
            self.commandRouter.pushConsoleMessage('Error while starting GMusicProxy daemon: ' + error);
            defer.reject();
        } else {
            self.commandRouter.pushConsoleMessage('--- Started GMusicProxy daemon:' + stdout);

            self.pm.init({
                email: self.config.get('username'),
                password: self.config.get('password')
            }, function (err) {
                if (err) {
                    self.commandRouter.pushConsoleMessage('Error while initializing Play Music: ' + err);
                    defer.reject(err);
                } else {
                    self.commandRouter.pushConsoleMessage('--- Initialized Play Music');
                    defer.resolve();
                }
            });
        }
    });

    return defer.promise;
};

ControllerGPM.prototype.stopGMusicProxyDaemon = function() {
    var self = this;

    var defer = libQ.defer();

    this.pm = new PlayMusic();

    exec('killall GMusicProxy', function(error, stdout, stderr) {
        self.commandRouter.pushConsoleMessage('--- Stopped GMusicProxy daemon\n' + (stdout ? stdout : stderr));

        if (error) self.commandRouter.pushConsoleMessage('--- Error while stopping GMusicProxy daemon - ' + error);

        defer.resolve();
    });

    return defer.promise;
};

ControllerGPM.prototype.rebuildGMusicProxyAndRestartDaemon = function() {
    var self = this;

    var defer = libQ.defer();

    self.createGmusicproxyFile()
        .then(self.stopGMusicProxyDaemon.bind(self))
        .then(self.startGMusicProxyDaemon.bind(self))
        .then(self.addToBrowseSources.bind(self));

    return defer.promise;
};

ControllerGPM.prototype.addToBrowseSources = function() {
    var defer = libQ.defer();

    this.commandRouter.volumioAddToBrowseSources({
        name: "Google Play Music",
        uri: "gpm",
        plugin_type: "music_service",
        plugin_name: "gpm"
    });

    defer.resolve();
    return defer.promise;
};

ControllerGPM.prototype.handleBrowseUri = function(uri) {
    var self = this;

    self.commandRouter.pushConsoleMessage('[gpm] handleBrowserUri: "' + uri + '"');

    var response;
    if (uri.startsWith('gpm')) {
        if (uri === 'gpm') {
            response = libQ.resolve({
                navigation: {
                    lists: [
                        {
                            "availableListView": [
                                "list"
                            ],
                            "items": [
                                {
                                    service: self.servicename,
                                    type: 'gpm-category',
                                    title: 'My Playlists',
                                    artist: '',
                                    album: '',
                                    icon: 'fa fa-folder-open-o',
                                    uri: 'gpm/playlists'
                                }
                            ]
                        }
                    ],
                    "prev": {
                        uri: 'gpm'
                    }
                }
            });
        }
        else if (uri.startsWith('gpm/playlists')) {
            if (uri === 'gpm/playlists') {
                response = self.listPlaylists();
            } else {
                response = self.listPlaylist(uri);
            }
        }
    }

    return response;
};

ControllerGPM.prototype.explodeUri = function(uri) {
    var self = this;

    self.commandRouter.pushConsoleMessage('[gpm] explodeUri: ' + uri);

    var defer = libQ.defer();

    var response;
    if (uri.startsWith('gpm/song/')) {
        var id = uri.split('/')[2];
        response = self.getTrack(id);
        defer.resolve(response);
    }

    return defer.promise;
};

ControllerGPM.prototype.saveAccount = function(data) {
    var self = this;

    var defer = libQ.defer();

    self.config.set('username', data['username']);
    self.config.set('password', data['password']);

    self.rebuildGMusicProxyAndRestartDaemon()
        .then(function(e) {
            self.commandRouter.pushToastMessage('success', "Configuration update", 'The configuration has been successfully updated');
            defer.resolve();
        })
        .fail(function(e) {
            defer.reject(new Error());
        });

    return defer.promise;
};

ControllerGPM.prototype.createGmusicproxyFile = function() {
    var self = this;

    var defer = libQ.defer();

    try {
        fs.readFile(__dirname + '/gmusicproxy.cfg.tmpl', 'utf8', function(err, data) {
            if (err) {
                defer.reject(new Error(err));
                return console.log(err);
            }
            data = data.replace('${username}', self.config.get('username'))
                .replace('${password}', self.config.get('password'));

            fs.writeFile('/home/volumio/.config/gmusicproxy.cfg', data, 'utf8', function(err) {
                if (err) defer.reject(new Error(err));
                else defer.resolve();
            });
        });
    } catch (err) {
        self.logger.warn("[gpm] Error reading gmusicproxy.cfg.tmpl - " + err);
    }

    return defer.promise;
};

ControllerGPM.prototype.clearAddPlayTrack = function(track) {
    return this.mpdPlugin.clearAddPlayTrack(track);
};

ControllerGPM.prototype.stop = function() {
    return this.mpdPlugin.stop();
};

ControllerGPM.prototype.pause = function() {
    return this.mpdPlugin.pause();
};

ControllerGPM.prototype.resume = function() {
    return this.mpdPlugin.resume();
};

ControllerGPM.prototype.getTracklist = function() {
    var tracklist =  this.mpdPlugin.getTracklist();
    self.commandRouter.pushConsoleMessage('[gpm] tracklist: ' + tracklist);
    return tracklist;
};

ControllerGPM.prototype.getState = function() {
    return this.mpdPlugin.getState();
};

ControllerGPM.prototype.pushState = function(state) {
    var self = this;
    self.commandRouter.pushConsoleMessage('[gpm] pushState(): ' + state);
    self.commandRouter.servicePushState(state, self.servicename);
};

ControllerGPM.prototype.listPlaylists = function() {
    var self = this;

    var defer = libQ.defer();

    this.pm.getPlayLists(function(err, playlists) {
        if (err) {
            defer.fail(err);
        } else if (!playlists || playlists.length === 0 || playlists.data.items.length === 0) {
            defer.fail(new Error('Error loading playlists'));
        } else {
            var listItems = [];

            playlists.data.items.forEach(function (playlist) {
                listItems.push({
                    service: 'gpm',
                    type: 'folder',
                    title: playlist.name,
                    icon: 'fa fa-list-ol',
                    uri: 'gpm/playlists/' + playlist.id
                });
            });

            var response = {
                navigation: {
                    "prev": {
                        uri: 'gpm'
                    },
                    "lists": [
                        {
                            "availableListViews": [
                                "list"
                            ],
                            "items": listItems
                        }
                    ]
                }
            };
            defer.resolve(response);
        }
    });

    return defer.promise;
};

ControllerGPM.prototype.listPlaylist = function(uri) {
    var self = this;

    var defer = libQ.defer();

    var id = uri.split('/')[2];

    this.gpmApi.getPlaylist(id)
        .then(function(tracks) {
            var listItems = [];

            for (var i in tracks) {
                listItems.push({
                    service: self.servicename,
                    type: 'song',
                    title: tracks[i].title,
                    artist: tracks[i].artist,
                    icon: 'fa fa-music',
                    uri: 'gpm/song/' + tracks[i].file
                });
            }

            var response = {
                navigation: {
                    prev: {
                        uri: 'gpm/playlists'
                    },
                    "lists": [
                        {
                            "availableListViews": [
                                "list"
                            ],
                            "items": listItems
                        }
                    ]
                }
            };

            defer.resolve(response);
        })
        .fail(function() {
            defer.fail(new Error("Error loading song"));
        });

    return defer.promise;
};

ControllerGPM.prototype.getTrack = function(id) {
    var self = this;

    var defer = libQ.defer();

    this.pm.getAllAccessTrack(id, function (err, track) {
        if (err || !track || track.length === 0) {
            defer.fail(err);
        } else if (!track || track.length === 0) {
            defer.fail(new Error('Error loading song'));
        } else {
            self.pm.getStreamUrl(id, function (err, uri) {
                if (err || !track || track.length === 0) {
                    defer.fail(err);
                } else {
                    defer.resolve([{
                        uri: uri,
                        service: 'gpm',
                        name: track.title,
                        artist: track.artist,
                        album: track.album,
                        type: 'song',
                        duration: parseInt(track.durationMillis / 1000),
                        tracknumber: track.trackNumber,
                        albumart: track.albumArtRef[0].url,
                        samplerate: '320kbits',
                        bitdepth: '16 bit',
                        trackType: 'mpd'
                    }]);
                }
            });
        }
    });

    return defer.promise;
};

module.exports = ControllerGPM;
