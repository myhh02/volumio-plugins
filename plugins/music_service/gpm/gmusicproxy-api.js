var http = require('http');
var libQ = require('kew');
var m3uParser = require('playlist-parser').M3U;
var urlParser = require('url').parse;

const HOST = 'localhost';
const PORT = '9999';

function GMusicProxyAPI() {
    var self = this;

    this.baseUrl = 'http://' + HOST + ':' + PORT;
}

GMusicProxyAPI.prototype.request = function(url, parser) {
    var defer = libQ.defer();

    http
        .get(url, function(response) {
            var body = '';
            response.on('data', function(data) {
                body += data;
            });
            response.on('end', function() {
                if (parser) body = parser(body);
                defer.resolve(body);
            });
        })
        .on('error', function(error) {
            defer.reject(error);
        });

    return defer.promise;
};

GMusicProxyAPI.prototype.getCollection = function(shuffle) {
    var url = this.baseUrl + '/get_collection';
    url += '?shuffle=' + (shuffle ? 'yes' : 'no');
    return this.request(url);
};

GMusicProxyAPI.prototype.searchId = function(type, exact, title, artist) {
    const validTypes = [ "artist", "album", "song" ];
    if (!type || type.length === 0 || validTypes.indexOf(type) < 0) {
        return libQ.defer();
    }
    var url = this.baseUrl + '/search_id';
    url += '?type=' + type;
    url += '&exact=' + (exact ? 'yes' : 'no');
    if (title) url += '&title=' + encodeURIComponent(title);
    if (artist) url += '&artist=' + encodeURIComponent(artist);
    return this.request(url);
};

GMusicProxyAPI.prototype.getBySearch = function(type, exact, title, artist, num_tracks) {
    const validTypes = [ "artist", "album", "song", "matches" ];
    if (!type || type.length === 0 || validTypes.indexOf(type) < 0) {
        return libQ.defer();
    }
    var url = this.baseUrl + '/get_by_search';
    url += '?type=' + type;
    url += '&exact=' + (exact ? 'yes' : 'no');
    if (title) url += '&title=' + encodeURIComponent(title);
    if (artist) url += '&artist=' + encodeURIComponent(artist);
    if (num_tracks) url += '&num_tracks=' + encodeURIComponent(num_tracks);
    return this.request(url);
};

GMusicProxyAPI.prototype.getAllStations = function() {
    var defer = libQ.defer();
    defer.reject(new Error("Not implemented!"));
    return defer.promise;
};

GMusicProxyAPI.prototype.getAllPlaylists = function() {
    var url = this.baseUrl + '/get_all_playlists';
    return this.request(url, this.parse);
};

GMusicProxyAPI.prototype.getPlaylist = function(id, shuffle) {
    var url = this.baseUrl + '/get_playlist';
    url += '?id=' + encodeURIComponent(id);
    url += '&shuffle=' + (shuffle ? 'yes' : 'no');
    return this.request(url, this.parse);
};

GMusicProxyAPI.prototype.getAlbum = function(id) {
    var url = this.baseUrl + '/get_album?id=' + encodeURIComponent(id);
    return this.request(url);
};

GMusicProxyAPI.prototype.getSong = function(id) {
    var url = this.baseUrl + '/get_song?id=' + encodeURIComponent(id);
    return this.request(url);
};

GMusicProxyAPI.prototype.getTopTracksArtis = function(id, type, num_tracks) {
    const validTypes = [ "artist", "album", "song" ];
    if (!id || validTypes.indexOf(type) < 0) {
        return libQ.defer();
    }
    var url = this.baseUrl + '/get_top_tracks_artist';
    url += '?id=' + encodeURIComponent(id);
    url += '&type=' + encodeURIComponent(type);
    if (num_tracks) url += '&num_tracks=' + encodeURIComponent(num_tracks);
    return this.request(url);
};

GMusicProxyAPI.prototype.getDiscographyArtist = function(id) {
    var url = this.baseUrl + '/get_discography_artist?id=' + encodeURIComponent(id);
    return this.request(url);
};





GMusicProxyAPI.prototype.parse = function(data) {
    if (!data || data.length === 0) return data;
    var playlists = m3uParser.parse(data, { encoding: 'utf8 '});
    for (var i in playlists) {

        // the playlist-parser is confused by negative time (-1)
        // remove "-1," from titles
        if (playlists[i].length === 0 && playlists[i].title.startsWith('-1,')) {
            playlists[i].title = playlists[i].title.substr(3);
        }

        // instead of the filename, we only want the playlist id
        playlists[i].file = urlParser(playlists[i].file, true).query.id;
    }
    return playlists;
};

// new GMusicProxyAPI().getSong('Tpf2xaiwy44kg4zdqi4fc34u2ne')
//     .then(function(res) {
//         console.log(res);
//     })
//     .fail(function(e) {
//         console.error(e);
//     });

module.exports = GMusicProxyAPI;
