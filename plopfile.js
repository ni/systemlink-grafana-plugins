module.exports = function (plop) {
  plop.setGenerator('datasource', {
    description: 'Data source plugin',
    prompts: [
      {
        type: 'input',
        name: 'Name',
        message: 'Enter the plugin\'s name in PascalCase (Foo, FooBar):'
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'src/datasources/{{kebab Name}}',
        templateFiles: 'templates/datasource/**/*',
        base: 'templates/datasource',
      },
    ]
  });

  plop.setHelper('kebab', text => text.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase());
  plop.setHelper('space', text => text.replace(/([a-z])([A-Z])/g, "$1 $2"));
  plop.setHelper('lower', text => text.toLowerCase());
};
