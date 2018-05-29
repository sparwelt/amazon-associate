// Generated by CoffeeScript 2.3.1
var _, crypto, digest, md5;

crypto = require('crypto');

_ = require('underscore');

md5 = function(string) {
  var hash;
  hash = crypto.createHash('md5');
  hash.update(string);
  return hash.digest('hex');
};

module.exports = digest = {
  parseChallenge: function(challengeString) {
    var obj;
    // header is something like this:
    // Digest realm="DataFeeds", qop="auth", nonce="69e3391d503ae9fd43e9b5202390d15a", opaque="0753652c1f86cb100ec28975b6a72fbf"
    obj = {};
    _.each(challengeString.substring(7).split(/,\s+/), function(part) {
      var key, valueInQuotes;
      [key, valueInQuotes] = part.split('=');
      return obj[key] = valueInQuotes.replace(/"/g, '');
    });
    return obj;
  },
  renderResponse: function(challenge, username, password, path) {
    var h1, h2;
    h1 = md5([username, challenge.realm, password].join(':'));
    h2 = md5(['GET', path].join(':'));
    return md5([h1, challenge.nonce, '000001', '', 'auth', h2].join(':'));
  },
  renderDigest: function(challenge, username, password, path) {
    var params, parts;
    params = {
      username: username,
      realm: challenge.realm,
      nonce: challenge.nonce,
      uri: path,
      qop: challenge.qop,
      response: digest.renderResponse(challenge, username, password, path),
      nc: '000001',
      cnonce: '',
      opaque: challenge.opaque
    };
    parts = _.map(_.keys(params), function(key) {
      return `${key}="${params[key]}"`;
    });
    return 'Digest ' + parts.join(', ');
  }
};
