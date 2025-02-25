import Router from './router/router';
import User   from './models/User';

// Markdown stuff.
var hljs = require('highlight.js') // https://highlightjs.org/
var md = require('markdown-it')({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (__) {}
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch (__) {}

    return ''; // use external default escaping
  }
});

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');
var path = require('path');
var fs   = require('fs');

var router = new Router();
router.group('/api', () => {
    router.group('/v1', () => {
        router.get('/', (req, res) => {
            res.plain(fs.readFileSync(path.join(__dirname, 'readme.md'), 'utf8'));
        });

        router.group('/examples', () => {
            router.get('/', (req, res) => {
                fs.readdir(path.join(__dirname, '../'), (err, dir) => {

                    var folders = [];

                    var url = dir.filter((name) => {
                        return !name.includes('.');
                    });

                    var name = url.map((files) => {
                        var split = files.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
                        split = split.charAt(0).toUpperCase() + split.slice(1);
                        return split;
                    });

                    url.forEach((a,b) => {
                        folders.push({
                            url: a,
                            name: name[b]
                        });
                    });

                    res.json(folders, 200);
                });
            });

            router.get('/:exampleName', (req, res) => {
                var fileContent;
                var fileToLoad = path.join(__dirname, '../', req.params.exampleName, 'index.html');
                var description = path.join(__dirname, '../', req.params.exampleName, 'readme.md');
                try {
                    fileContent = fs.readFileSync(fileToLoad, 'utf-8');
                    description = fs.readFileSync(description, 'utf-8');
                    if (req.query.type === 'json') {
                        var styleSheets = fileContent.match(/<link.*type="text\/css".href=.+/g);
                        var style = fileContent.match(/<style.*>[\s\S][\s\S]*<\/style>/g);
                        var body  = fileContent.match(/<body.*>[\s\S][\s\S]*<\/body>/g);
                        body = body[0].replace(/<body>|<\/body>/g, '');
                        var scripts = fileContent.match(/<script.*><\/script>/g);

                        res.json({
                            code: 200,
                            body: body,
                            style: style,
                            styleSheets: styleSheets,
                            externJavascript: scripts,
                            description: md.render(description),
                        });
                    } else {
                        res.html(fileContent);
                    }
                } catch (e) {
                    res.json({
                        code: 500,
                        msg: e.message,
                    });
                }
            });
        });

        router.group('/views', () => {
            router.get('/', (req, res) => {
                fs.readdir(path.join(__dirname, 'views'), (err, dirs) => {
                    res.json(dirs, 200);
                });
            });

            router.get('/:filename', (req, res) => {
                var ext = path.extname(req.params.filename).replace('.', '');
                var fileContent;
                var fileToLoad = path.join(__dirname, 'views', req.params.filename);
                try {
                    fileContent = fs.readFileSync(fileToLoad, 'utf-8');
                    switch (ext) {
                        case 'html':
                        case 'mustache':
                            res.html(fileContent);
                            break;
                        case 'json':
                            res.json(fileContent);
                            break;
                        default:
                            res.json({
                                code: 500,
                                msg: 'Given extention is not yet supported.'
                            }, 500);
                    }
                } catch (e) {
                    res.json({
                        code: 500,
                        msg: e.message,
                    });
                }
            });
        });

        router.group('/users', () => {
            router.get('/', (req, res) => {
                User.find({}, (err, users) => {
                    if (err) {
                        res.json({
                            code: 500,
                            msg: err.message
                        }, 500);
                    } else {
                        res.json({
                            code: 200,
                            users: users
                        });
                    }
                });
            });

            router.get('/:name', (req, res) => {
                var name = req.params.name;
                User.find({ username: name }, (err, user) => {
                    if (err) {
                        res.json({
                            code: 500,
                            msg: err.message
                        }, 500);
                    } else {
                        res.json({
                            code: 200,
                            user: user
                        }, 200);
                    }
                });
            });

            router.post('/', (req, res) => {
                var newUser = new User({
                    username: req.body.username
                });

                newUser.save((err) => {
                    if (err) {
                        res.json({
                            code: 500,
                            msg: err.message
                        }, 500);
                    } else {
                        res.json({
                            code: 201,
                            msg: 'User created!',
                            user: newUser
                        }, 201);
                    }
                });
            });
        });
    });
});

require('http').createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    router.route(req, res);
}).listen(1337);
console.log('Listening on port 1337');
