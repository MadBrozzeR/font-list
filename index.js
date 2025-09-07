#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const PARAM_RE = /^--([-\w]+)(?:=["']?(.+)['"]?)?$/;

const TEMPLATE = {
  KEY_RE: /\{\{(\w+)(?::(\w+))?\}\}/g,
  ROOT: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body {
  font-size: 50px;
}
.family_block {
  margin: 12px 0;
}
.family_block--title {
  font-size: 35px;
  opacity: .7;
}
</style>
</head>
<body>
{{fonts:FONT}}
</body>
</html>
`,
  FONT: `
<div style="font-family: {{family}}" class="family_block">
  <div class="family_block--title">{{family}}</div>
  {{text}}
</div>
`,
  use(substitutions, templateName = 'ROOT') {
    if (templateName in TEMPLATE) {
      return TEMPLATE[templateName].replace(TEMPLATE.KEY_RE, function (source, key, templateName) {
        if (templateName) {
          if (substitutions[key] instanceof Array) {
            return substitutions[key].map(function (substitution) {
              return TEMPLATE.use(substitution, templateName);
            }).join('');
          } else {
            return TEMPLATE.use(substitutions[key], templateName);
          }
        } else {
          return key in substitutions ? substitutions[key] : source;
        }
      });
    }

    return '';
  }
};

const PARAMS = process.argv.reduce(function (result, arg, index) {
  if (index > 1) {
    const match = PARAM_RE.exec(arg);
    if (match) {
      result[match[1]] = match[2] === undefined ? match[1] : match[2];
    }
  }
  return result;
}, {});

const TEXT = PARAMS['text'] || 'Съешь ещё этих мягких французских булок, да выпей же чаю!?';

const PORT = PARAMS['port'] || 8080;

http.createServer(function (request, response) {
  const fontProcess = spawn('fc-list', [':', 'family']);

  let fontList = '';

  fontProcess.stdout.on('data', function (chunk) {
    fontList += chunk.toString();
  });

  fontProcess.on('close', function () {
    const list = fontList.trim().split('\n').map(function (record) {
      return { family: record.split(',')[0], text: TEXT };
    });
    response.end(TEMPLATE.use({ fonts: list }));
  });
}).listen(PORT, function () {
  console.log('Server is listening on localhost:' + PORT);
});
