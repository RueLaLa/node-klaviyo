'use strict';

var
    fetch = require('node-fetch'),
    {
        KlaviyoApiError,
        KlaviyoAuthenticationError,
        KlaviyoRateLimitError,
        KlaviyoServerError
    } = require('./errors.js');

const
    KLAVIYO_API_HOSTNAME = 'a.klaviyo.com',
    HTTPS_PORT = 443,
    DEFAULT_HTTP_VERB = 'GET',
    PACKAGE_VERSION = require('../package.json').version;


class Request {
    /**
     * Perform an HTTP request
     * @param {string} path Path to the API resource.
     * @param {string} method HTTP method.
     * @param {object} headers HTTP headers.
     * @param {string} body JSON encoded string.
     * @returns {Promise.<object|KlaviyoApiError>} Parsed JSON response from the API | Non-200 response received.
     * @throws {KlaviyoAuthenticationError} Invalid private API token.
     * @throws {KlaviyoRateLimitError} API rate limit encountered.
     * @throws {KlaviyoServerError} 50X error from Klaviyo.
     * @throws {KlaviyoApiError} Other non-200 status code encountered.
     */
    static async _request({
        path,
        method = DEFAULT_HTTP_VERB,
        headers = {},
        body
    } = {}) {

        headers['User-Agent'] = `Klaviyo-Node.js/${PACKAGE_VERSION}`;

        const fullPath = `https://${KLAVIYO_API_HOSTNAME}/${path}`;
        const options = {
            port: HTTPS_PORT,
            method: method,
            headers: headers,
            timeout: 10000 //maybe make this a configurable value?
        };
        if (method !== DEFAULT_HTTP_VERB && body) {
          options.body = body;
        }

        return new Promise((resolve, reject) => {
            fetch(fullPath, options)
                .then((response) => handleResponse(response))
                .then((data) => resolve(data))
                .catch((error) => reject(error));
        });
    }

    //utility method to remove unused/empty keys from payloads
    static clean(obj) {
        for (var propName in obj) {
            if (obj[propName] === null || obj[propName] === undefined) {
                delete obj[propName];
            }
        }
    }
}

function handleResponse(response) {
    const statusCode = response.status;
    if (response.ok) {
        return response.json();
    } else if (statusCode == 403) {
        throw new KlaviyoAuthenticationError(statusCode, response.json());
    } else if (statusCode == 429) {
        throw new KlaviyoRateLimitError(statusCode, response.json(), Number(response.headers['retry-after']));
    } else if (statusCode == 500 || statusCode == 503) {
        throw new KlaviyoServerError(statusCode, response.json());
    } else {
        throw new KlaviyoApiError(statusCode, response.json());
    }
}

module.exports = Request;
