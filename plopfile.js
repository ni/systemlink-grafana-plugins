module.exports = function (plop) {
  plop.setGenerator('datasource', {
    description: 'Data source plugin',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Name: '
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'src/datasources/{{name}}',
        templateFiles: 'templates/datasource/**/*',
        //base: 'plop_templates/component',
      },
    ]
  });
};