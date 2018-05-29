// Generated by CoffeeScript 2.3.1
var Digest, UnzippingResponseDecorator, _, http, https, url;

https = require('https');

http = require('http');

url = require('url');

_ = require('underscore');

Digest = require('./digest');

UnzippingResponseDecorator = require('./unzipping-response-decorator');

// simplified request handling
// decorates http api for digest auth, following redirects and unzipping
// just adds functionality
module.exports = class {
  constructor(options1) {
    this.options = options1;
    this.digests = {};
  }

  debug(...args) {
    if (this.options.debug) {
      return console.error('DEBUG: request', ...args);
    }
  }

  request(options, cb) {
    var clonedOptions, currentDigest, httpOrHttps, req;
    if (options.unzip == null) {
      options.unzip = false;
    }
    this.debug('options', options);
    currentDigest = this.digests[options.host];
    clonedOptions = _.extend({}, options);
    if (currentDigest != null) {
      if (clonedOptions.headers == null) {
        clonedOptions.headers = {};
      }
      _.extend(clonedOptions.headers, {
        Authorization: currentDigest
      });
    }
    httpOrHttps = options.https ? https : http;
    req = httpOrHttps.request(clonedOptions, (res) => {
      var handler, handlers, msg;
      this.debug('response status code', res.statusCode);
      this.debug('response headers', res.headers);
      res.on('close', (err) => {
        return this.debug('response error', err);
      });
      handlers = {};
      handlers[200] = () => {
        if (options.unzip) {
          return cb(null, new UnzippingResponseDecorator(res));
        }
        res.setEncoding('utf-8');
        return cb(null, res);
      };
      handlers[301] = handlers[302] = () => {
        var location, parsedUrl;
        this.debug('moved', res.headers);
        location = res.headers.location;
        this.debug('moved to', location);
        parsedUrl = url.parse(location);
        this.debug('redirect location', parsedUrl);
        return this.request(_.extend({}, parsedUrl, {
          https: parsedUrl.protocol === 'https' || parsedUrl.protocol.includes('https'),
          state: options.state,
          unzip: options.unzip
        }), cb);
      };
      handlers[401] = () => {
        var challenge, credentials, digest, msg1, msg2, ref, ref1;
        msg1 = 'wrong credentials';
        if (currentDigest != null) {
          return cb(new Error(msg1));
        }
        msg2 = 'authentication required, but `digest` option is not set';
        credentials = (ref = this.options) != null ? (ref1 = ref.credentials) != null ? ref1[options.host] : void 0 : void 0;
        if (credentials == null) {
          return cb(new Error(msg2));
        }
        this.debug('not authorized: authorizing');
        challenge = Digest.parseChallenge(res.headers['www-authenticate']);
        this.debug('challenge:', challenge);
        digest = Digest.renderDigest(challenge, credentials.username, credentials.password, options.path);
        this.digests[options.host] = digest;
        this.debug('digest:', digest);
        // retry with the digest
        return this.request(_.extend({}, options), cb);
      };
      handler = handlers[res.statusCode];
      msg = `failed to get ${options.path}. server status ${res.statusCode}`;
      if (handler == null) {
        return cb(new Error(msg));
      }
      return handler();
    });
    return req.end();
  }

};
