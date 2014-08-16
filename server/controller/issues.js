var q = require('q');

module.exports = function(router, container) {
    var callback = function(req, res, callback) {
            return function (err, resp, body) {
                if (err) {
                    res.error(err);

                    return;
                }

                if (resp.statusCode !== 200) {
                    res.error(body, resp.statusCode);

                    return;
                }

                return callback(body);
            };
        };

    router.authenticated.get('/projects/:ns/:name/issues',
        function(req, res) {
            var issues = [],
                page = 0,
                fetch = function(deferred) {
                    container.get('gitlab.issues').all(
                        req.user.private_token,
                        req.params.ns,
                        req.params.name,
                        function (err, resp, body) {
                            if (err) {
                                deferred.reject();
                            } else {
                                callback(
                                    req,
                                    res,
                                    function(body) {
                                        issues = issues.concat(body);

                                        if (resp.links.next) {
                                            fetch(deferred);
                                        } else {
                                            deferred.resolve(issues);
                                        }
                                    }
                                )(err, resp, body);
                            }
                        },
                        {
                            per_page: 100,
                            page: (++page)
                        }
                    );

                    return deferred.promise;
                };

            fetch(q.defer())
                .then(
                function(issues) {
                    res.response.ok(issues);
                }
            );
        }
    );

    router.authenticated.put('/projects/:ns/:name/issues/:id',
        function(req, res) {
            var issue = req.body;
            delete issue['access_token'];

            container.get('gitlab.issues').persist(
                req.user.private_token,
                req.params.ns,
                req.params.name,
                issue,
                callback(
                    req,
                    res,
                    function(body) {
                        container.get('socket').sockets.emit(
                            'issue.move',
                            {
                                namespace: req.params.ns,
                                project: req.params.name,
                                issue: body
                            }
                        );

                        res.response.ok(body);
                    }
                )
            );
        }
    );

    router.authenticated.put('/projects/:ns/:name/issues/:id/move',
        function(req, res) {
            var issue = req.body;
            delete issue['access_token'];

            if (!issue.from && !issue.to) {
                res.error.notAcceptable({
                    message: 'Not acceptable'
                });
            } else {
                var from = (issue.from || '').toLowerCase(),
                    to = (issue.to || '').toLowerCase(),
                    old = 'column:' + from,
                    nw = 'column:' + to;

                issue.labels.forEach(function(label, key) {
                    if ([old, nw].indexOf(label) > -1) {
                        issue.labels.splice(key, 1);
                    }
                });

                if (from !== to && to) {
                    issue.labels.push(nw);
                    issue.column = to;
                } else {
                    issue.column = null;
                }

                container.get('gitlab.issues').persist(
                    req.user.private_token,
                    req.params.ns,
                    req.params.name,
                    issue,
                    callback(
                        req,
                        res,
                        function(body) {
                            container.get('socket').sockets.emit(
                                'issue.move',
                                {
                                    namespace: req.params.ns,
                                    project: req.params.name,
                                    from: from,
                                    to: to,
                                    issue: body
                                }
                            );

                            res.response.ok(body);
                        }
                    )
                );
            }
        }
    );

    router.authenticated.put('/projects/:ns/:name/issues/:id/theme',
        function(req, res) {
            var issue = req.body;
            delete issue['access_token'];

            if (!issue.before && !issue.after) {
                res.error.notAcceptable({
                    message: 'Not acceptable'
                });
            } else {
                var before = (issue.before || '').toLowerCase(),
                    after = (issue.after || '').toLowerCase(),
                    old = 'theme:' + (before || 'default'),
                    nw = 'theme:' + (after || 'default');

                issue.labels.forEach(function(label, key) {
                    if ([old, nw].indexOf(label) > -1) {
                        issue.labels.splice(key, 1);
                    }
                });

                if (before !== after && after) {
                    issue.labels.push(nw);
                    issue.theme = after;
                } else {
                    issue.theme = null;
                }

                container.get('gitlab.issues').persist(
                    req.user.private_token,
                    req.params.ns,
                    req.params.name,
                    issue,
                    callback(
                        req,
                        res,
                        function(body) {
                            container.get('socket').sockets.emit(
                                'issue.theme',
                                {
                                    namespace: req.params.ns,
                                    project: req.params.name,
                                    issue: body,
                                    before: before,
                                    after: after
                                }
                            );

                            res.response.ok(body);
                        }
                    )
                );
            }
        }
    );

    router.authenticated.put('/projects/:ns/:name/issues/:id/close',
        function(req, res) {
            var issue = req.body;

            container.get('gitlab.issues').close(
                req.user.private_token,
                req.params.ns,
                req.params.name,
                issue,
                callback(
                    req,
                    res,
                    function(body) {
                        var issue = formatIssue(body);

                        container.get('socket').sockets.emit(
                            'issue.close',
                            {
                                namespace: req.params.ns,
                                project: req.params.name,
                                issue: issue
                            }
                        );

                        res.response.ok(issue);
                    }
                )
            );
        }
    );
};