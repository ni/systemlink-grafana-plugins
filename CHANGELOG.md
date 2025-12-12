## [4.106.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.105.0...v4.106.0) (2025-12-12)

### Features

* **dataframe:** Sort columns options by label ([#622](https://github.com/ni/systemlink-grafana-plugins/issues/622)) ([8a4efe0](https://github.com/ni/systemlink-grafana-plugins/commit/8a4efe04d509a5974a4e7f1b76a1311065aae5fa))

### Bug Fixes

* **dataframe:** Handle null values when transforming values for grafana fields ([#621](https://github.com/ni/systemlink-grafana-plugins/issues/621)) ([29a5c7c](https://github.com/ni/systemlink-grafana-plugins/commit/29a5c7ce173ab3c9c64d79f964afc62ddef00e50))

## [4.105.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.104.3...v4.105.0) (2025-12-12)

### Features

* **dataframes:** Add order by and order by descending in query tables request ([#613](https://github.com/ni/systemlink-grafana-plugins/issues/613)) ([c020edd](https://github.com/ni/systemlink-grafana-plugins/commit/c020edd3a2aabc035172e96077749761da849452))

### Bug Fixes

* **dataframe:** Fix datasource initialize on datasource switch ([#620](https://github.com/ni/systemlink-grafana-plugins/issues/620)) ([0f4cb05](https://github.com/ni/systemlink-grafana-plugins/commit/0f4cb05ca373f40269aadc95cec8f934d2530d14))

## [4.104.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.104.2...v4.104.3) (2025-12-12)

### Bug Fixes

* **alarms,products,results,workorders,testplans:** Open links in help documentation as a new tab ([#616](https://github.com/ni/systemlink-grafana-plugins/issues/616)) ([125ca5c](https://github.com/ni/systemlink-grafana-plugins/commit/125ca5c98885fce27a62c8834433e34606a96fab))

## [4.104.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.104.1...v4.104.2) (2025-12-12)

### Bug Fixes

* **dataframe:** Exclude xColumn from yColumns  ([#611](https://github.com/ni/systemlink-grafana-plugins/issues/611)) ([1ee8586](https://github.com/ni/systemlink-grafana-plugins/commit/1ee8586b23b3cd4aa7a477729e51be836e02d650))
* **dataframe:** Include table ID in the display name for  variable options ([#614](https://github.com/ni/systemlink-grafana-plugins/issues/614)) ([08bfc28](https://github.com/ni/systemlink-grafana-plugins/commit/08bfc28f67dfbd8a538ae8c5a27482407e0cd95c))
* **dataframe:** Open link in a new tab  ([#612](https://github.com/ni/systemlink-grafana-plugins/issues/612)) ([88fc5c6](https://github.com/ni/systemlink-grafana-plugins/commit/88fc5c6adb89263a6d9caffa69314da7ea877ef7))

## [4.104.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.104.0...v4.104.1) (2025-12-12)

### Bug Fixes

* **dataframe:** Restrict string columns in x-column selection ([#617](https://github.com/ni/systemlink-grafana-plugins/issues/617)) ([be9f975](https://github.com/ni/systemlink-grafana-plugins/commit/be9f975f17535b92ba9dd3ea3753656961369c0b))

## [4.104.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.103.1...v4.104.0) (2025-12-12)

### Features

* **dataframe:** Update Query builder tooltip ([#615](https://github.com/ni/systemlink-grafana-plugins/issues/615)) ([5e36923](https://github.com/ni/systemlink-grafana-plugins/commit/5e36923ddec48a3b65e227c7c4cead72f5bccc43))

## [4.103.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.103.0...v4.103.1) (2025-12-11)

### Bug Fixes

* **dataframe:** Prevent validation error messages from appearing before column options have been fetched from the server ([#609](https://github.com/ni/systemlink-grafana-plugins/issues/609)) ([075bd87](https://github.com/ni/systemlink-grafana-plugins/commit/075bd87621953f6b171de8a884c62e6616ace018))

## [4.103.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.102.4...v4.103.0) (2025-12-11)

### Features

* **dataframe:** Add column selection limit  ([#607](https://github.com/ni/systemlink-grafana-plugins/issues/607)) ([c147ebf](https://github.com/ni/systemlink-grafana-plugins/commit/c147ebf6b81a9bb985a82595fb0df0ef8e65d138))
* **dataframe:** Add info banner for query optimization  ([#606](https://github.com/ni/systemlink-grafana-plugins/issues/606)) ([9419f74](https://github.com/ni/systemlink-grafana-plugins/commit/9419f74edd0ee0294cee6613292774f99c21fee8))

## [4.102.4](https://github.com/ni/systemlink-grafana-plugins/compare/v4.102.3...v4.102.4) (2025-12-11)

### Bug Fixes

* **dataframe:** Unknown datatype appending with variables when migrating columns from v1 to v2 ([#608](https://github.com/ni/systemlink-grafana-plugins/issues/608)) ([f7f76aa](https://github.com/ni/systemlink-grafana-plugins/commit/f7f76aa896e3c487b58d660e00c2cd8a43d4f795))

## [4.102.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.102.2...v4.102.3) (2025-12-10)

### Bug Fixes

* **dataframe:** Update time filter implementation to apply only when the x column is of type timestamp ([#605](https://github.com/ni/systemlink-grafana-plugins/issues/605)) ([59f935b](https://github.com/ni/systemlink-grafana-plugins/commit/59f935bf9ba0c997c98bef8d7f2cc5b3ab47db52))

## [4.102.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.102.1...v4.102.2) (2025-12-10)

### Bug Fixes

* **dataframe:** Add unknown as datatype when the migration failed ([#604](https://github.com/ni/systemlink-grafana-plugins/issues/604)) ([3cc84ff](https://github.com/ni/systemlink-grafana-plugins/commit/3cc84ff7b9fb160b9fc27ced27b8d6ac3aeca307))

## [4.102.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.102.0...v4.102.1) (2025-12-10)

### Bug Fixes

* **dataframe:** Block query execution when filters are empty ([#596](https://github.com/ni/systemlink-grafana-plugins/issues/596)) ([2db5efb](https://github.com/ni/systemlink-grafana-plugins/commit/2db5efbe15d756ff2ed6fc06628b9790e279f452))

## [4.102.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.101.0...v4.102.0) (2025-12-10)

### Features

* **dataframe:** Handle 404 errors and provide a user friendly message ([#603](https://github.com/ni/systemlink-grafana-plugins/issues/603)) ([01a282e](https://github.com/ni/systemlink-grafana-plugins/commit/01a282e58813e664cad06054c06a2f068acf6148))

## [4.101.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.100.1...v4.101.0) (2025-12-10)

### Features

* **dataframe:** Update take error message and query type tooltip ([#599](https://github.com/ni/systemlink-grafana-plugins/issues/599)) ([b61a965](https://github.com/ni/systemlink-grafana-plugins/commit/b61a9652c4cd6e39adc55d1ca6aa21d5fb5e84b9))

## [4.100.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.100.0...v4.100.1) (2025-12-10)

### Bug Fixes

* **dataframe:** Replace variable with value when calling getTable API during migration ([#598](https://github.com/ni/systemlink-grafana-plugins/issues/598)) ([dc3eb22](https://github.com/ni/systemlink-grafana-plugins/commit/dc3eb2208563b43b9919642e3ce0a7ad2e8cad85))

## [4.100.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.99.0...v4.100.0) (2025-12-10)

### Features

* **dataframe:** Call onRunQuery when decimation method, filter nulls or use time range changes ([#597](https://github.com/ni/systemlink-grafana-plugins/issues/597)) ([42380d6](https://github.com/ni/systemlink-grafana-plugins/commit/42380d6a12332947b99e7d729aea212e40f57682))

## [4.99.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.98.3...v4.99.0) (2025-12-09)

### Features

* **dataframe:** merge and get decimated data for selected columns ([#571](https://github.com/ni/systemlink-grafana-plugins/issues/571)) ([2a11bea](https://github.com/ni/systemlink-grafana-plugins/commit/2a11bea5fb10b55097e9a195b6ef52fef11d86cd))

### Bug Fixes

* **dataframes:** Fix column filter with single-value variable ([#594](https://github.com/ni/systemlink-grafana-plugins/issues/594)) ([aabad36](https://github.com/ni/systemlink-grafana-plugins/commit/aabad36c7f49374a3469a272bbe27e03aae8ce6c))

## [4.98.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.98.2...v4.98.3) (2025-12-09)

### Bug Fixes

* **alarms:** Update transformation logic for critical severity levels ([#592](https://github.com/ni/systemlink-grafana-plugins/issues/592)) ([a2388b8](https://github.com/ni/systemlink-grafana-plugins/commit/a2388b81721126b1ad73b9a25df476ab1e7aa627))

## [4.98.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.98.1...v4.98.2) (2025-12-09)

### Bug Fixes

* **alarms:** Trigger take input changes on blur instead of onChange ([#593](https://github.com/ni/systemlink-grafana-plugins/issues/593)) ([0926549](https://github.com/ni/systemlink-grafana-plugins/commit/092654990f535b2b51f873f888c9ee9ef5941b8b))

## [4.98.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.98.0...v4.98.1) (2025-12-09)

### Bug Fixes

* **alarms:** Enhance property field typing ([#570](https://github.com/ni/systemlink-grafana-plugins/issues/570)) ([ad00464](https://github.com/ni/systemlink-grafana-plugins/commit/ad00464b4561879ade98de81b916ae7f458c06be))

## [4.98.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.97.0...v4.98.0) (2025-12-09)

### Features

* **dataframe:** Provide label for invalid x-column selection ([#589](https://github.com/ni/systemlink-grafana-plugins/issues/589)) ([da11a7d](https://github.com/ni/systemlink-grafana-plugins/commit/da11a7da634f63bb58cfbfed5df7525b996dcd09))

## [4.97.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.96.0...v4.97.0) (2025-12-09)

### Features

* **dataframes:** Remove whitespace from filter string ([#590](https://github.com/ni/systemlink-grafana-plugins/issues/590)) ([3a60a3f](https://github.com/ni/systemlink-grafana-plugins/commit/3a60a3fa739bd9205806e060e38611cf2799af79))

## [4.96.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.95.0...v4.96.0) (2025-12-08)

### Features

* **dataframe:** Add support for include index column ([#583](https://github.com/ni/systemlink-grafana-plugins/issues/583)) ([3743b18](https://github.com/ni/systemlink-grafana-plugins/commit/3743b18fa47136f6709be811ab4a758a9adf89af))

## [4.95.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.94.0...v4.95.0) (2025-12-08)

### Features

* **dataframes:** Wrap the text in inline error field ([#591](https://github.com/ni/systemlink-grafana-plugins/issues/591)) ([3906148](https://github.com/ni/systemlink-grafana-plugins/commit/3906148eaf1ff2bbf0eb7eabd8b7efd7f97bba58))

## [4.94.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.93.0...v4.94.0) (2025-12-05)

### Features

* **dataframes:** Parse column name from variable ([#586](https://github.com/ni/systemlink-grafana-plugins/issues/586)) ([c2ef703](https://github.com/ni/systemlink-grafana-plugins/commit/c2ef703972a42be679729eeb6b02e8cebd0b1281))

## [4.93.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.92.0...v4.93.0) (2025-12-05)

### Features

* **dataframes:** Add result and column filter in query tables call from column selection ([#585](https://github.com/ni/systemlink-grafana-plugins/issues/585)) ([40970b4](https://github.com/ni/systemlink-grafana-plugins/commit/40970b4aac390ff0a3410d71eb0f989f4b621e9c))

## [4.92.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.91.0...v4.92.0) (2025-12-05)

### Features

* **dataframes:** Add support to query with column filter ([#576](https://github.com/ni/systemlink-grafana-plugins/issues/576)) ([9de0e4e](https://github.com/ni/systemlink-grafana-plugins/commit/9de0e4ee5ae9250db1938cc0c88caa7c113658f0))
* **dataframes:** Transform column filter ([#575](https://github.com/ni/systemlink-grafana-plugins/issues/575)) ([9488094](https://github.com/ni/systemlink-grafana-plugins/commit/94880947f9350c006313ee1d21dfe89f64268311))

## [4.91.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.90.1...v4.91.0) (2025-12-05)

### Features

* **dataframe:** Add variable support for columns and x column ([#582](https://github.com/ni/systemlink-grafana-plugins/issues/582)) ([a7049bf](https://github.com/ni/systemlink-grafana-plugins/commit/a7049bf5344c8f4992c0d32f793d3dbaeb7d5867))

## [4.90.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.90.0...v4.90.1) (2025-12-05)

### Bug Fixes

* **alarms:** Add support for template variable workflow in alarm trend ([#581](https://github.com/ni/systemlink-grafana-plugins/issues/581)) ([50f1a68](https://github.com/ni/systemlink-grafana-plugins/commit/50f1a689c1291799c687e63971e97df810d3e386))

## [4.90.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.89.0...v4.90.0) (2025-12-04)

### Features

* **data-frame:** validate selected columns against available options ([#561](https://github.com/ni/systemlink-grafana-plugins/issues/561)) ([ef589a7](https://github.com/ni/systemlink-grafana-plugins/commit/ef589a723e1c704c07f83c62e7d57d122701461b))

## [4.89.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.88.0...v4.89.0) (2025-12-04)

### Features

* **dataframe:** Add validation for xColumn selection ([#577](https://github.com/ni/systemlink-grafana-plugins/issues/577)) ([0fee9a0](https://github.com/ni/systemlink-grafana-plugins/commit/0fee9a021243bfa9d011960b36b1a72d1b56eef3))
* **dataframe:** Reset column limit exceeded error when the column options fetching failed with an error ([#578](https://github.com/ni/systemlink-grafana-plugins/issues/578)) ([1dcc816](https://github.com/ni/systemlink-grafana-plugins/commit/1dcc816f6065da8c99340ace9fa7147377c189ab))

## [4.88.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.87.0...v4.88.0) (2025-12-03)

### Features

* **alarms:** Introduce error message for 401 unauthorized access ([#565](https://github.com/ni/systemlink-grafana-plugins/issues/565)) ([3c583e6](https://github.com/ni/systemlink-grafana-plugins/commit/3c583e668ab4317bf8834a0255be0e2dd61065da))

## [4.87.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.86.0...v4.87.0) (2025-12-03)

### Features

* **dataframe:** Show error when x column selection becomes invalid ([#567](https://github.com/ni/systemlink-grafana-plugins/issues/567)) ([65011ef](https://github.com/ni/systemlink-grafana-plugins/commit/65011ef4800df6b19faf80ae9cc4fe6efb06534c))

## [4.86.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.85.0...v4.86.0) (2025-12-03)

### Features

* **dataframe:** Populate options for xColumn control ([#562](https://github.com/ni/systemlink-grafana-plugins/issues/562)) ([8e0f3dd](https://github.com/ni/systemlink-grafana-plugins/commit/8e0f3dde74d99d19ecff8eada9cf4b9d5cff749c))

## [4.85.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.84.0...v4.85.0) (2025-12-02)

### Features

* **dataframe:** Decode selected columns and create tableColumn map ([#552](https://github.com/ni/systemlink-grafana-plugins/issues/552)) ([8d9e0da](https://github.com/ni/systemlink-grafana-plugins/commit/8d9e0da9d17f938fcaf14667cd900ac0f117f416))
* **dataframes:** Add method to transform results query ([#564](https://github.com/ni/systemlink-grafana-plugins/issues/564)) ([9bab2a1](https://github.com/ni/systemlink-grafana-plugins/commit/9bab2a1ea3085a9e66920faa567b8f9fc09156b7))
* **dataframes:** Integrate result filter in editor and callback ([#559](https://github.com/ni/systemlink-grafana-plugins/issues/559)) ([51ed470](https://github.com/ni/systemlink-grafana-plugins/commit/51ed4707b6b0df8621dea8e39fb4958da6f04f01))
* **dataframes:** Update datasource to use transformed result query ([#566](https://github.com/ni/systemlink-grafana-plugins/issues/566)) ([9654c80](https://github.com/ni/systemlink-grafana-plugins/commit/9654c80a4ac5c7e625491b8aee097a0ce032daf2))

## [4.84.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.83.0...v4.84.0) (2025-12-01)

### Features

* **dataframes:** Update queryTables$ to support result filter using substitution ([#557](https://github.com/ni/systemlink-grafana-plugins/issues/557)) ([83efdb6](https://github.com/ni/systemlink-grafana-plugins/commit/83efdb6de201451d6a013202d82afeca5c5a2e90))

### Bug Fixes

* **dataframe:** Handle query table errors when looking for data table name options in query builder ([#556](https://github.com/ni/systemlink-grafana-plugins/issues/556)) ([d788c58](https://github.com/ni/systemlink-grafana-plugins/commit/d788c586f17a065f29bf7196f8b889d1b1e23598))

## [4.83.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.82.2...v4.83.0) (2025-11-27)

### Features

* **dataframe:** Handle API errors during column migration ([#555](https://github.com/ni/systemlink-grafana-plugins/issues/555)) ([229076b](https://github.com/ni/systemlink-grafana-plugins/commit/229076b6b69731de9ca73b59edec72d824b60459))

## [4.82.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.82.1...v4.82.2) (2025-11-27)

### Bug Fixes

* **results:** Use inclusive time range filters for accurate results/ steps counts ([#558](https://github.com/ni/systemlink-grafana-plugins/issues/558)) ([c7f0815](https://github.com/ni/systemlink-grafana-plugins/commit/c7f081559f33758f20b844c4919cde5026b556e3))

## [4.82.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.82.0...v4.82.1) (2025-11-26)

### Bug Fixes

* **dataframe:** Restrict query editor re-render with stale query when the query changed ([#554](https://github.com/ni/systemlink-grafana-plugins/issues/554)) ([9b5f453](https://github.com/ni/systemlink-grafana-plugins/commit/9b5f453cf4e95dba3c74176a7c0ec7f42c964293))

## [4.82.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.81.0...v4.82.0) (2025-11-25)

### Features

* **dataframes:** Update the datasource infrastructure to support results filter ([#528](https://github.com/ni/systemlink-grafana-plugins/issues/528)) ([07898eb](https://github.com/ni/systemlink-grafana-plugins/commit/07898eb9e4f13381a2a1a509d43b8d4765e2f54e))

## [4.81.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.80.0...v4.81.0) (2025-11-25)

### Features

* **dataframes:** Disable columns query builder based on results filter ([#544](https://github.com/ni/systemlink-grafana-plugins/issues/544)) ([f1d8b01](https://github.com/ni/systemlink-grafana-plugins/commit/f1d8b018a48f8e299a41904c8f870182cd786335))

## [4.80.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.79.2...v4.80.0) (2025-11-25)

### Features

* **dataframe:** Reduce component re-renders due to state updates ([#549](https://github.com/ni/systemlink-grafana-plugins/issues/549)) ([81fd7c7](https://github.com/ni/systemlink-grafana-plugins/commit/81fd7c73a188d74416d6b6227af6885ad19650cb))

## [4.79.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.79.1...v4.79.2) (2025-11-25)

### Bug Fixes

* **dataframe:** Query reset when the query type is data ([#548](https://github.com/ni/systemlink-grafana-plugins/issues/548)) ([64cdf89](https://github.com/ni/systemlink-grafana-plugins/commit/64cdf8917cfc8da85857ff645561e30b67cd9372))

## [4.79.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.79.0...v4.79.1) (2025-11-24)

### Bug Fixes

* **alarms:** Remove Alarms Count query type and related code ([#533](https://github.com/ni/systemlink-grafana-plugins/issues/533)) ([30e3fe3](https://github.com/ni/systemlink-grafana-plugins/commit/30e3fe3d1536a796e06dfa4c25a07445130c61f3))

## [4.79.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.78.1...v4.79.0) (2025-11-24)

### Features

* **alarms:** Introduce output type and its logic ([#530](https://github.com/ni/systemlink-grafana-plugins/issues/530)) ([5f2353a](https://github.com/ni/systemlink-grafana-plugins/commit/5f2353a9f7715d2016e193a0df5e72a8660b729f))

### Bug Fixes

* **dataframe:** Remove unnecessary async  ([#547](https://github.com/ni/systemlink-grafana-plugins/issues/547)) ([08eab96](https://github.com/ni/systemlink-grafana-plugins/commit/08eab96c663f51401813678dbb82f982e56a8e62))

## [4.78.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.78.0...v4.78.1) (2025-11-21)

### Bug Fixes

* **dataframe:** Query reset when filter is applied ([#546](https://github.com/ni/systemlink-grafana-plugins/issues/546)) ([f7199e8](https://github.com/ni/systemlink-grafana-plugins/commit/f7199e83630612d5b8b35a85c6dd30491bd9f1ed))

## [4.78.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.77.0...v4.78.0) (2025-11-21)

### Features

* **dataframes:** Limit the number of rows when the query type is properties ([#545](https://github.com/ni/systemlink-grafana-plugins/issues/545)) ([8ce5cc8](https://github.com/ni/systemlink-grafana-plugins/commit/8ce5cc8b84214571da58f480bad2f9712aa95572))

### Bug Fixes

* **dataframe:** Populate columns when values of the variable change in the filter ([#540](https://github.com/ni/systemlink-grafana-plugins/issues/540)) ([8f4ab51](https://github.com/ni/systemlink-grafana-plugins/commit/8f4ab51ebbb2e98ca1f6adeefcdb5869b54eec9a))

## [4.77.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.76.0...v4.77.0) (2025-11-21)

### Features

* **dataframe:** Migrate columns in v1 to v2 ([#541](https://github.com/ni/systemlink-grafana-plugins/issues/541)) ([a1db28e](https://github.com/ni/systemlink-grafana-plugins/commit/a1db28eef828b5ef170226677956206fa86b8703))

## [4.76.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.75.1...v4.76.0) (2025-11-20)

### Features

* **dataframe:** Handle v1 query to v2 query migration ([#536](https://github.com/ni/systemlink-grafana-plugins/issues/536)) ([577ade9](https://github.com/ni/systemlink-grafana-plugins/commit/577ade9b9dd70ae1e18e7902d5cfd74d60482d69))
* **dataframe:** Move properties select below query builders ([#538](https://github.com/ni/systemlink-grafana-plugins/issues/538)) ([38d4e25](https://github.com/ni/systemlink-grafana-plugins/commit/38d4e255bf95a433ec5870be70cd9340c5ea30f5))

### Bug Fixes

* **dataframe:** Remove variable options from list columns variable query ([#537](https://github.com/ni/systemlink-grafana-plugins/issues/537)) ([8b9b31e](https://github.com/ni/systemlink-grafana-plugins/commit/8b9b31e619ec2c73421b9c034d8f4a244c828981))

## [4.75.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.75.0...v4.75.1) (2025-11-19)

### Bug Fixes

* **query-builder:** Support multi-value variable for starts with, ends with and list operations ([#509](https://github.com/ni/systemlink-grafana-plugins/issues/509)) ([a45da94](https://github.com/ni/systemlink-grafana-plugins/commit/a45da942d17656c187e2f56f91dccc4a6a28d7c9))

## [4.75.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.74.2...v4.75.0) (2025-11-19)

### Features

* **dataframes:** Pass results filter and onchange callback to the query builder ([#534](https://github.com/ni/systemlink-grafana-plugins/issues/534)) ([50e90d0](https://github.com/ni/systemlink-grafana-plugins/commit/50e90d0fc65b42855ed98a4675e51011178a5547))

## [4.74.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.74.1...v4.74.2) (2025-11-19)

### Bug Fixes

* **dataframe:** Fix column population when query type changes ([#523](https://github.com/ni/systemlink-grafana-plugins/issues/523)) ([e10f754](https://github.com/ni/systemlink-grafana-plugins/commit/e10f754c46c95010ed2dba303ed453054d2ec980))

## [4.74.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.74.0...v4.74.1) (2025-11-19)

### Bug Fixes

* **results:** Convert string-based numeric values to numbers for proper plotting ([#539](https://github.com/ni/systemlink-grafana-plugins/issues/539)) ([9025938](https://github.com/ni/systemlink-grafana-plugins/commit/9025938329edf98d819b1628289efa146b44bf5b))

## [4.74.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.73.0...v4.74.0) (2025-11-18)

### Features

* **asset:** Update filter by scan code to work with multi-select ([#535](https://github.com/ni/systemlink-grafana-plugins/issues/535)) ([892d8b0](https://github.com/ni/systemlink-grafana-plugins/commit/892d8b08a07c465a57c978bacfd83f25a575c642))
* **systems:** add minion ID and scan code return types for system variables ([#505](https://github.com/ni/systemlink-grafana-plugins/issues/505)) ([b71ae24](https://github.com/ni/systemlink-grafana-plugins/commit/b71ae247a97a446e16f0e4cd76aff1c19ceb681e))

## [4.73.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.72.0...v4.73.0) (2025-11-18)

### Features

* **notebook:** Cancel the current request before progressing refresh ([#532](https://github.com/ni/systemlink-grafana-plugins/issues/532)) ([4496746](https://github.com/ni/systemlink-grafana-plugins/commit/44967466c399cd1862b99ad3d56ef1d5f5826764))

## [4.72.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.71.0...v4.72.0) (2025-11-18)

### Features

* **dataframes:** Pass column filter and onchange callback to the query builder ([#531](https://github.com/ni/systemlink-grafana-plugins/issues/531)) ([f246275](https://github.com/ni/systemlink-grafana-plugins/commit/f2462755b554c1cf59e371a6dd7c0b0576ba0d2b))

## [4.71.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.70.0...v4.71.0) (2025-11-17)

### Features

* **dataframe:** Add and transform variables in query and columns ([#518](https://github.com/ni/systemlink-grafana-plugins/issues/518)) ([1491a5b](https://github.com/ni/systemlink-grafana-plugins/commit/1491a5b897b0a661f1d203e1b3d97bcfacb9ecd9))

## [4.70.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.69.0...v4.70.0) (2025-11-17)

### Features

* **notebook:**  refactor the base code ([#527](https://github.com/ni/systemlink-grafana-plugins/issues/527)) ([3022391](https://github.com/ni/systemlink-grafana-plugins/commit/302239100ad29c08faa73715605596fe22efb90a))

## [4.69.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.68.0...v4.69.0) (2025-11-17)

### Features

* **alarms:** Update take input validation based on transition option ([#506](https://github.com/ni/systemlink-grafana-plugins/issues/506)) ([b9c0dd4](https://github.com/ni/systemlink-grafana-plugins/commit/b9c0dd4542798a3f429414a7c63d74ef525323ca))

## [4.68.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.67.0...v4.68.0) (2025-11-17)

### Features

* **alarms:** Implement transition-related property mapping ([#496](https://github.com/ni/systemlink-grafana-plugins/issues/496)) ([f053e4e](https://github.com/ni/systemlink-grafana-plugins/commit/f053e4e197c3775b5401ef704af83db73255dc93))

## [4.67.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.66.1...v4.67.0) (2025-11-17)

### Features

* **tags:** Cancel the current request before progressing refresh  ([#517](https://github.com/ni/systemlink-grafana-plugins/issues/517)) ([32a3f4e](https://github.com/ni/systemlink-grafana-plugins/commit/32a3f4edf7fbf4eb0ef410781af70e00a5984753))

## [4.66.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.66.0...v4.66.1) (2025-11-17)

### Bug Fixes

* **dataframe:** Cancel ongoing queries when refresh ([#521](https://github.com/ni/systemlink-grafana-plugins/issues/521)) ([50a9315](https://github.com/ni/systemlink-grafana-plugins/commit/50a9315b74557db8e95d5e297b282f5ea13ec2a3))

## [4.66.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.65.0...v4.66.0) (2025-11-15)

### Features

* **asset:** add filter by Scan Code ([#525](https://github.com/ni/systemlink-grafana-plugins/issues/525)) ([2a6e1b5](https://github.com/ni/systemlink-grafana-plugins/commit/2a6e1b5fc44f13cd4ed8cf8b6df8a1397e4b3d14))

## [4.65.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.64.0...v4.65.0) (2025-11-14)

### Features

* **dataframes:** add dummy results query builder ([#514](https://github.com/ni/systemlink-grafana-plugins/issues/514)) ([9563e7a](https://github.com/ni/systemlink-grafana-plugins/commit/9563e7add71b9f61fbebcdc0f0ebaf76c0cc4d2d))

## [4.64.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.63.0...v4.64.0) (2025-11-13)

### Features

* **dataframe:** Show error when no properties are selected ([#522](https://github.com/ni/systemlink-grafana-plugins/issues/522)) ([c5ce731](https://github.com/ni/systemlink-grafana-plugins/commit/c5ce73179dcba9b5a55aff2ba308c9c006a52698))

## [4.63.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.62.0...v4.63.0) (2025-11-13)

### Features

* **alarms:** alarms trend groupby severity ([#503](https://github.com/ni/systemlink-grafana-plugins/issues/503)) ([140faa8](https://github.com/ni/systemlink-grafana-plugins/commit/140faa81074cd67c796de9aa904c0d466da0f9a0))

## [4.62.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.61.0...v4.62.0) (2025-11-12)

### Features

* **dataframe:** Integrate query builder wrapper to variable query editor ([#516](https://github.com/ni/systemlink-grafana-plugins/issues/516)) ([f92b087](https://github.com/ni/systemlink-grafana-plugins/commit/f92b087f441a3481ec5e013690ce485669f25721))

## [4.61.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.60.0...v4.61.0) (2025-11-12)

### Features

* **dataframe:** Add support for list columns variable query ([#515](https://github.com/ni/systemlink-grafana-plugins/issues/515)) ([9babdc0](https://github.com/ni/systemlink-grafana-plugins/commit/9babdc06630e79060f6523b3f41e9da782f2404d))

## [4.60.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.59.0...v4.60.0) (2025-11-12)

### Features

* **alarms:** Implement logics for trends ([#499](https://github.com/ni/systemlink-grafana-plugins/issues/499)) ([c559f09](https://github.com/ni/systemlink-grafana-plugins/commit/c559f0940c0f9f9ed336433bc39d56b844c949c2))

## [4.59.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.58.0...v4.59.0) (2025-11-12)

### Features

* **dataframes:** Add dummy columns query builder ([#510](https://github.com/ni/systemlink-grafana-plugins/issues/510)) ([3822622](https://github.com/ni/systemlink-grafana-plugins/commit/38226221a53431da951e41ebcfb0664859f96192))

## [4.58.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.57.0...v4.58.0) (2025-11-12)

### Features

* **assets:** Cancel the current request before progressing refresh ([#513](https://github.com/ni/systemlink-grafana-plugins/issues/513)) ([f631933](https://github.com/ni/systemlink-grafana-plugins/commit/f631933b83430daafa621763c495ce342ca95219))

## [4.57.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.56.0...v4.57.0) (2025-11-12)

### Features

* **dataframe:** Limit and handle too many columns  ([#508](https://github.com/ni/systemlink-grafana-plugins/issues/508)) ([12ec72f](https://github.com/ni/systemlink-grafana-plugins/commit/12ec72f17ed1642b7294c91a7d8359157368fa52))

## [4.56.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.55.0...v4.56.0) (2025-11-11)

### Features

* **dataframe:** Show unique column name formatted by type ([#498](https://github.com/ni/systemlink-grafana-plugins/issues/498)) ([d7de433](https://github.com/ni/systemlink-grafana-plugins/commit/d7de4335c156f3730bcb0731b3b39a2f81539cf4))

## [4.55.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.54.0...v4.55.0) (2025-11-11)

### Features

* **dataframe:** Add query type control and enable pulling list of data tables for variable query ([#511](https://github.com/ni/systemlink-grafana-plugins/issues/511)) ([e0500ec](https://github.com/ni/systemlink-grafana-plugins/commit/e0500ec6b2d4b4242825af3d3d8b7b15020536a4))

## [4.54.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.53.0...v4.54.0) (2025-11-11)

### Features

* **dataframe:** Replace multi select component with multi combobox ([#512](https://github.com/ni/systemlink-grafana-plugins/issues/512)) ([aff72e2](https://github.com/ni/systemlink-grafana-plugins/commit/aff72e26f43b7359ed458fa4e55861c6d6446a53))

## [4.53.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.52.0...v4.53.0) (2025-11-10)

### Features

* **dataframes:** Add columns query builder component ([#497](https://github.com/ni/systemlink-grafana-plugins/issues/497)) ([cbb226f](https://github.com/ni/systemlink-grafana-plugins/commit/cbb226f9c330f44f197d05cce6580a099e4c02d3))

## [4.52.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.51.1...v4.52.0) (2025-11-10)

### Features

* **alarms:** support contains and doesn't contain filter for source in QB ([#500](https://github.com/ni/systemlink-grafana-plugins/issues/500)) ([d4709ca](https://github.com/ni/systemlink-grafana-plugins/commit/d4709ca81588324c7cf1fd45d6a67e91c4ee5f51))

## [4.51.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.51.0...v4.51.1) (2025-11-06)

### Bug Fixes

* support hidden queries consistently ([#456](https://github.com/ni/systemlink-grafana-plugins/issues/456)) ([3efe18b](https://github.com/ni/systemlink-grafana-plugins/commit/3efe18ba573672c56144db52b57b0ddc4edc29da))

## [4.51.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.50.1...v4.51.0) (2025-11-06)

### Features

* **qr-code:** add code owners for qr-code panel plugin ([#501](https://github.com/ni/systemlink-grafana-plugins/issues/501)) ([d2246f7](https://github.com/ni/systemlink-grafana-plugins/commit/d2246f70050038c3e55187333dc4fa3af45e92d4))

## [4.50.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.50.0...v4.50.1) (2025-11-06)

### Bug Fixes

* **ProductsDataSources:** Cancel the current request before progressing refresh ([#430](https://github.com/ni/systemlink-grafana-plugins/issues/430)) ([4ff76a3](https://github.com/ni/systemlink-grafana-plugins/commit/4ff76a3b47859a12e629ec67f2619c4d33a8e1bc))

## [4.50.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.49.0...v4.50.0) (2025-11-06)

### Features

* add QR code panel plugin ([#474](https://github.com/ni/systemlink-grafana-plugins/issues/474)) ([40f352f](https://github.com/ni/systemlink-grafana-plugins/commit/40f352f307e00e7f668923b1ae2e5f7685ead3e7))

## [4.49.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.48.0...v4.49.0) (2025-11-06)

### Features

* **alarms:** Add support for Include transition control ([#493](https://github.com/ni/systemlink-grafana-plugins/issues/493)) ([a342193](https://github.com/ni/systemlink-grafana-plugins/commit/a34219375cf9069964ba981a612324d3023f0813))

## [4.48.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.47.0...v4.48.0) (2025-11-06)

### Features

* **alarms:** Support take and descending in list alarms ([#487](https://github.com/ni/systemlink-grafana-plugins/issues/487)) ([788d1da](https://github.com/ni/systemlink-grafana-plugins/commit/788d1da60bda21354c96082713739758fcc9aa80))

## [4.47.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.46.0...v4.47.0) (2025-11-06)

### Features

* **dataframe:** Pull data for properties query type ([#489](https://github.com/ni/systemlink-grafana-plugins/issues/489)) ([8243823](https://github.com/ni/systemlink-grafana-plugins/commit/824382379a4c3486201a66361b1c419ae2fb5b4f))

## [4.46.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.45.0...v4.46.0) (2025-11-05)

### Features

* **dataframe:** Populate column options from filtered data tables ([#494](https://github.com/ni/systemlink-grafana-plugins/issues/494)) ([6c0db11](https://github.com/ni/systemlink-grafana-plugins/commit/6c0db111073e6077d719bce1169995fda61c1380))

## [4.45.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.44.0...v4.45.0) (2025-11-05)

### Features

* add missing code owners ([#488](https://github.com/ni/systemlink-grafana-plugins/issues/488)) ([e8491d5](https://github.com/ni/systemlink-grafana-plugins/commit/e8491d5b298f5bb2220fbf0ee0de42df6fa6e454))

## [4.44.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.43.0...v4.44.0) (2025-11-05)

### Features

* **alarms:** Implement property mapping ([#477](https://github.com/ni/systemlink-grafana-plugins/issues/477)) ([335ce7a](https://github.com/ni/systemlink-grafana-plugins/commit/335ce7a3515d8ba0488e5f119cad54ee0632992b))

## [4.43.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.42.0...v4.43.0) (2025-11-03)

### Features

* **SlQueryBuilder:** Add disabled functionality and set fields mode to static ([#476](https://github.com/ni/systemlink-grafana-plugins/issues/476)) ([c0b6a36](https://github.com/ni/systemlink-grafana-plugins/commit/c0b6a366dd9656c99c8eb7c988f47460bf70541b))

## [4.42.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.41.0...v4.42.0) (2025-11-03)

### Features

* **system:** add scan code field to System datasource properties ([#482](https://github.com/ni/systemlink-grafana-plugins/issues/482)) ([a340c64](https://github.com/ni/systemlink-grafana-plugins/commit/a340c64c0e634c44d38d92372ee335d5d1823340))

## [4.41.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.40.0...v4.41.0) (2025-11-03)

### Features

* **asset:** contains filter to properties ([#483](https://github.com/ni/systemlink-grafana-plugins/issues/483)) ([06f9e67](https://github.com/ni/systemlink-grafana-plugins/commit/06f9e6756c576d12b3ee8d398f1f56bce2755cd0))

## [4.40.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.39.1...v4.40.0) (2025-11-03)

### Features

* **dataframe:** Add default values and change handler to the fields ([#478](https://github.com/ni/systemlink-grafana-plugins/issues/478)) ([e777ad2](https://github.com/ni/systemlink-grafana-plugins/commit/e777ad28375a9e0bd6e39ed28618d92352924131))

## [4.39.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.39.0...v4.39.1) (2025-10-31)

### Bug Fixes

* **alarms:** prepareVariableQuery for Alarms Variable Query Editor ([#486](https://github.com/ni/systemlink-grafana-plugins/issues/486)) ([abb666b](https://github.com/ni/systemlink-grafana-plugins/commit/abb666b52c3b794778aeeb526e9e9d6a29855145))

## [4.39.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.38.1...v4.39.0) (2025-10-31)

### Features

* **alarms:** Add UI support for properties ([#468](https://github.com/ni/systemlink-grafana-plugins/issues/468)) ([58da9a3](https://github.com/ni/systemlink-grafana-plugins/commit/58da9a354728c759666c32bf6da2ce469245878a))

## [4.38.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.38.0...v4.38.1) (2025-10-31)

### Bug Fixes

* **tags:** fix repeat values for tags datasource ([#484](https://github.com/ni/systemlink-grafana-plugins/issues/484)) ([118bc8f](https://github.com/ni/systemlink-grafana-plugins/commit/118bc8f24a8d005d96d93acf8d1cef2745faffce))

## [4.38.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.37.0...v4.38.0) (2025-10-30)

### Features

* **alarms:** Introduce list alarms editor and integrate query builder ([#457](https://github.com/ni/systemlink-grafana-plugins/issues/457)) ([5ff4878](https://github.com/ni/systemlink-grafana-plugins/commit/5ff48785521ef37918fa8a3b13c43766a3a1ac88))

## [4.37.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.36.0...v4.37.0) (2025-10-30)

### Features

* **alarms:** Add query type control and its functionality ([#446](https://github.com/ni/systemlink-grafana-plugins/issues/446)) ([35d9e48](https://github.com/ni/systemlink-grafana-plugins/commit/35d9e48127e360ec4c99d489325d26d19be8ccc1))

## [4.36.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.35.0...v4.36.0) (2025-10-30)

### Features

* **alarms:** Introduce `take` and `descending` in the alarms variable query editor ([#471](https://github.com/ni/systemlink-grafana-plugins/issues/471)) ([a99d294](https://github.com/ni/systemlink-grafana-plugins/commit/a99d294320929f8c7bd8ef11018ead500589aef4))

## [4.35.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.34.0...v4.35.0) (2025-10-30)

### Features

* **dataframe:** populate data table name options in query builder ([#469](https://github.com/ni/systemlink-grafana-plugins/issues/469)) ([94a3d86](https://github.com/ni/systemlink-grafana-plugins/commit/94a3d86b7a2f434f847ed14e5418db10696b9f6a))

## [4.34.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.33.0...v4.34.0) (2025-10-30)

### Features

* **core:** Add support for horizontal scrollbar in query-builder ([#455](https://github.com/ni/systemlink-grafana-plugins/issues/455)) ([1c32cdb](https://github.com/ni/systemlink-grafana-plugins/commit/1c32cdbec798e502441f7579b3219f5912ad5905))

## [4.33.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.32.0...v4.33.0) (2025-10-29)

### Features

* **alarms:** Add batching for query alarms API ([#466](https://github.com/ni/systemlink-grafana-plugins/issues/466)) ([2a90f21](https://github.com/ni/systemlink-grafana-plugins/commit/2a90f21f0dad1eec305a74fc3851eac32f8061ea))

## [4.32.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.31.0...v4.32.0) (2025-10-29)

### Features

* **assets:** added scanCode return type ([#467](https://github.com/ni/systemlink-grafana-plugins/issues/467)) ([a5f619d](https://github.com/ni/systemlink-grafana-plugins/commit/a5f619d5ca771bf65002c14e8fc7f70e587a0f1f))

## [4.31.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.30.0...v4.31.0) (2025-10-28)

### Features

* **alarms:** Add support for users with error handling ([#465](https://github.com/ni/systemlink-grafana-plugins/issues/465)) ([ca26460](https://github.com/ni/systemlink-grafana-plugins/commit/ca264601cf53d3bc042aa9bf11231aa0244a43be))

## [4.30.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.29.0...v4.30.0) (2025-10-28)

### Features

* **dataframe:** Update data table Id field to show an input instead of dropdown ([#470](https://github.com/ni/systemlink-grafana-plugins/issues/470)) ([438ad3e](https://github.com/ni/systemlink-grafana-plugins/commit/438ad3e0d8929defcb2459fde8509ac94504e355))

## [4.29.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.28.0...v4.29.0) (2025-10-28)

### Features

* **core:** Implement ApiSession and ApiSessionUtils with session management ([#434](https://github.com/ni/systemlink-grafana-plugins/issues/434)) ([3e5a2f4](https://github.com/ni/systemlink-grafana-plugins/commit/3e5a2f4ea6f67475f423cfd6004590612ebd4cba))

## [4.28.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.27.2...v4.28.0) (2025-10-26)

### Features

* **Alarms:** Variable Query Editor ([#453](https://github.com/ni/systemlink-grafana-plugins/issues/453)) ([981a517](https://github.com/ni/systemlink-grafana-plugins/commit/981a5175b3f61b3d0c63d2eef63e98a830ec033d))

## [4.27.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.27.1...v4.27.2) (2025-10-23)

### Bug Fixes

* **dataframe:** Update properties labels ([#458](https://github.com/ni/systemlink-grafana-plugins/issues/458)) ([e24e117](https://github.com/ni/systemlink-grafana-plugins/commit/e24e1175a4075aa08d10955d62769346c67b8c5d))

## [4.27.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.27.0...v4.27.1) (2025-10-22)

### Bug Fixes

* **dataframe:** Query type not set by default ([#451](https://github.com/ni/systemlink-grafana-plugins/issues/451)) ([bbb202a](https://github.com/ni/systemlink-grafana-plugins/commit/bbb202a0d7101bc0de54acfa060c3764a9e06feb))

## [4.27.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.26.0...v4.27.0) (2025-10-22)

### Features

* **dataframe:** Provide global variable options to query builder ([#449](https://github.com/ni/systemlink-grafana-plugins/issues/449)) ([2d1ba6d](https://github.com/ni/systemlink-grafana-plugins/commit/2d1ba6dcdd277dcfe4a4275cd79b28b72592d54e))

## [4.26.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.25.0...v4.26.0) (2025-10-22)

### Features

* **dataframe:** Add lookup options for workspace ([#448](https://github.com/ni/systemlink-grafana-plugins/issues/448)) ([30d088e](https://github.com/ni/systemlink-grafana-plugins/commit/30d088e09e912ab7dd087825244b1f8dcfee3740))

## [4.25.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.24.0...v4.25.0) (2025-10-17)

### Features

* **dataframe:** Add decimation settings controls ([#445](https://github.com/ni/systemlink-grafana-plugins/issues/445)) ([ac1fb32](https://github.com/ni/systemlink-grafana-plugins/commit/ac1fb32fbe95d6924fb47b915f203e1e0389e17a))

## [4.24.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.23.0...v4.24.0) (2025-10-17)

### Features

* **dataframe:** Add column configuration controls ([#435](https://github.com/ni/systemlink-grafana-plugins/issues/435)) ([b3e18b0](https://github.com/ni/systemlink-grafana-plugins/commit/b3e18b086d8e666a4d9e5409f76ac5362b886495))

## [4.23.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.22.0...v4.23.0) (2025-10-17)

### Features

* **dataframe:** Add properties options ([#443](https://github.com/ni/systemlink-grafana-plugins/issues/443)) ([72a62aa](https://github.com/ni/systemlink-grafana-plugins/commit/72a62aaa53f51fdb49de1ad45b024c9f0cd06d0b))

## [4.22.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.21.3...v4.22.0) (2025-10-17)

### Features

* **dataframe:** Introduce top level DataFrameDataSource ([#427](https://github.com/ni/systemlink-grafana-plugins/issues/427)) ([dd20a0a](https://github.com/ni/systemlink-grafana-plugins/commit/dd20a0a4e87b4213fe0cfd593431ec52af29fb6d))

## [4.21.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.21.2...v4.21.3) (2025-10-17)

### Bug Fixes

* **alarms:** Set plugin state to beta in plugin.json ([#444](https://github.com/ni/systemlink-grafana-plugins/issues/444)) ([70e2144](https://github.com/ni/systemlink-grafana-plugins/commit/70e2144035b7e5cc461dd0b3108c8a87ad9e3e1f))

## [4.21.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.21.1...v4.21.2) (2025-10-16)

### Bug Fixes

* **assets:** fix field ordering ([#442](https://github.com/ni/systemlink-grafana-plugins/issues/442)) ([39b8715](https://github.com/ni/systemlink-grafana-plugins/commit/39b8715b7c9b5abe2c0abf490e9d9a668a1fcf96))

## [4.21.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.21.0...v4.21.1) (2025-10-16)

### Bug Fixes

* **asset:** update returnType management for Asset Variable Query ([#437](https://github.com/ni/systemlink-grafana-plugins/issues/437)) ([3208260](https://github.com/ni/systemlink-grafana-plugins/commit/3208260b694b48562cb06f50828a680b65031c68))

## [4.21.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.20.0...v4.21.0) (2025-10-16)

### Features

* **alarms:** Support filtering alarms by source ([#432](https://github.com/ni/systemlink-grafana-plugins/issues/432)) ([3754c6f](https://github.com/ni/systemlink-grafana-plugins/commit/3754c6f8b0c5b55fb115295f199e06019a854377))

## [4.20.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.19.2...v4.20.0) (2025-10-15)

### Features

* **alarms:** Error handling for workspace dependency ([#428](https://github.com/ni/systemlink-grafana-plugins/issues/428)) ([81aa8c4](https://github.com/ni/systemlink-grafana-plugins/commit/81aa8c4a06b98ce206d0942c7826d878f9951308))

## [4.19.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.19.1...v4.19.2) (2025-10-15)

### Bug Fixes

* **assets:** Add Asset Identifier to filters ([#438](https://github.com/ni/systemlink-grafana-plugins/issues/438)) ([c229b4c](https://github.com/ni/systemlink-grafana-plugins/commit/c229b4cf4dfd494be787b0c084303393a478f044))

## [4.19.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.19.0...v4.19.1) (2025-10-15)

### Bug Fixes

* **utils-tests:** fix random unit test failure ([#426](https://github.com/ni/systemlink-grafana-plugins/issues/426)) ([b2bb44a](https://github.com/ni/systemlink-grafana-plugins/commit/b2bb44a6eb6815edb404655e1353b5c957431783))

## [4.19.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.18.1...v4.19.0) (2025-10-13)

### Features

* **dataframes:** Add query type control ([#422](https://github.com/ni/systemlink-grafana-plugins/issues/422)) ([e6c17ce](https://github.com/ni/systemlink-grafana-plugins/commit/e6c17ce08bb1430a2707eb19fb8a4e3ca63247b4))

## [4.18.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.18.0...v4.18.1) (2025-10-13)

### Bug Fixes

* **results-datasource:** Show only step paths based on results query builder ([#424](https://github.com/ni/systemlink-grafana-plugins/issues/424)) ([1a6ca95](https://github.com/ni/systemlink-grafana-plugins/commit/1a6ca95a4acb0747c43ecb8d9532aaca82cccacc))

## [4.18.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.17.0...v4.18.0) (2025-10-10)

### Features

* **dataframe:** Add query builder component ([#411](https://github.com/ni/systemlink-grafana-plugins/issues/411)) ([2936910](https://github.com/ni/systemlink-grafana-plugins/commit/293691047d1c1b3478a2efeca148a838e862ef52))

## [4.17.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.16.0...v4.17.0) (2025-10-09)

### Features

* **alarms:** Support filtering alarms by workspace ([#419](https://github.com/ni/systemlink-grafana-plugins/issues/419)) ([fdf26ea](https://github.com/ni/systemlink-grafana-plugins/commit/fdf26ea8a1396b4e362ddd54ced8011561dcf9d6))

## [4.16.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.15.0...v4.16.0) (2025-10-09)

### Features

* **alarms:** Add support for global variable workflow ([#415](https://github.com/ni/systemlink-grafana-plugins/issues/415)) ([0e48872](https://github.com/ni/systemlink-grafana-plugins/commit/0e488720098364cb32cdd140509d7d62a19d0b19))

### Bug Fixes

* **testplans, workorders, products, results:** Fix isblank and is not blank operation not working  ([#429](https://github.com/ni/systemlink-grafana-plugins/issues/429)) ([bdacd13](https://github.com/ni/systemlink-grafana-plugins/commit/bdacd1323c4d169159ff97c92577fbfc09ce8058))

## [4.15.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.14.0...v4.15.0) (2025-10-06)

### Features

* **dataframe:** add V2 variable query editor under feature toggle ([#420](https://github.com/ni/systemlink-grafana-plugins/issues/420)) ([a211ca7](https://github.com/ni/systemlink-grafana-plugins/commit/a211ca70aa746fa9db3c4a3327311f300f387fc1))

## [4.14.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.13.0...v4.14.0) (2025-09-30)

### Features

* **Dataframe:** Add v2 Query Editor under feature toggle ([#408](https://github.com/ni/systemlink-grafana-plugins/issues/408)) ([8f2399a](https://github.com/ni/systemlink-grafana-plugins/commit/8f2399a589ca4a65cc9fc329bae89e18c42f1cf7))

## [4.13.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.12.0...v4.13.0) (2025-09-26)

### Features

* **Assets:** Remove locations feature flag ([#417](https://github.com/ni/systemlink-grafana-plugins/issues/417)) ([0a0db9d](https://github.com/ni/systemlink-grafana-plugins/commit/0a0db9d237e22f25419263125863880452f7641b))

## [4.12.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.11.0...v4.12.0) (2025-09-25)

### Features

* **alarms:** Add transformation logic for date time filters ([#413](https://github.com/ni/systemlink-grafana-plugins/issues/413)) ([1360560](https://github.com/ni/systemlink-grafana-plugins/commit/1360560ac71bfbffbc35d1fc9907d852c5f22007))
* **Assets:** Add "is blank" and "is not blank" supported operation for Locations filter ([#406](https://github.com/ni/systemlink-grafana-plugins/issues/406)) ([f604c6e](https://github.com/ni/systemlink-grafana-plugins/commit/f604c6e8205bb911f8509693d8f6cd7898e2b01c))

## [4.11.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.10.0...v4.11.0) (2025-09-18)

### Features

* **alarms:** Implement filtering logic for Query Alarms API ([#404](https://github.com/ni/systemlink-grafana-plugins/issues/404)) ([7762e78](https://github.com/ni/systemlink-grafana-plugins/commit/7762e7849783cb08929fdcc57fdbd30ce6a4ec7c))

## [4.10.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.9.0...v4.10.0) (2025-09-17)

### Features

* **alarms:** Add support for querying alarms with default values ([#401](https://github.com/ni/systemlink-grafana-plugins/issues/401)) ([bc57f77](https://github.com/ni/systemlink-grafana-plugins/commit/bc57f77e96fef06c79b98a7788085308ebb3bb5b))
* **alarms:** support datetime filters, keywords and properties ([#403](https://github.com/ni/systemlink-grafana-plugins/issues/403)) ([3121cc2](https://github.com/ni/systemlink-grafana-plugins/commit/3121cc2d9c607e3c10c6ba2b79124bc33402739c))

## [4.9.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.8.0...v4.9.0) (2025-09-16)

### Features

* **alarms:** Add alarms query builder ([#399](https://github.com/ni/systemlink-grafana-plugins/issues/399)) ([2ec0dff](https://github.com/ni/systemlink-grafana-plugins/commit/2ec0dffe7d87318eae7ca29abe5d5f319dd9dd9a))

### Bug Fixes

* **core:** sort fields in query builder by label ([#405](https://github.com/ni/systemlink-grafana-plugins/issues/405)) ([6982703](https://github.com/ni/systemlink-grafana-plugins/commit/6982703b0795c4b944d7576592a9a830b30cb4a4))

## [4.8.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.7.1...v4.8.0) (2025-09-10)

### Features

* **Assets:** Get locations in assets query builder ([#402](https://github.com/ni/systemlink-grafana-plugins/issues/402)) ([8668651](https://github.com/ni/systemlink-grafana-plugins/commit/86686510cdb3d9fea37861722ab4674b87745698))

## [4.7.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.7.0...v4.7.1) (2025-09-05)

### Bug Fixes

* **asset:** Update projection for Asset Variable Query  ([#400](https://github.com/ni/systemlink-grafana-plugins/issues/400)) ([b4ccdde](https://github.com/ni/systemlink-grafana-plugins/commit/b4ccdde1876a987fa2906b81c83af96b0b7725c0))

## [4.7.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.6.3...v4.7.0) (2025-09-05)

### Features

* **alarms:** Set up base class for Alarms DataSource ([#394](https://github.com/ni/systemlink-grafana-plugins/issues/394)) ([f765dac](https://github.com/ni/systemlink-grafana-plugins/commit/f765dac82d0807a130d9f8314da5e96b4fb828ef))

## [4.6.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.6.2...v4.6.3) (2025-09-04)

### Bug Fixes

* **products:** Label not persisting in Query Builder after selection from dropdown ([#389](https://github.com/ni/systemlink-grafana-plugins/issues/389)) ([56f944f](https://github.com/ni/systemlink-grafana-plugins/commit/56f944f40743e7fd25c59bfd1ca0704b2a83664a))

## [4.6.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.6.1...v4.6.2) (2025-09-04)

### Bug Fixes

* **asset:** Update projection for ListAssetsDataSource ([#398](https://github.com/ni/systemlink-grafana-plugins/issues/398)) ([62b2fe8](https://github.com/ni/systemlink-grafana-plugins/commit/62b2fe8c21f5598960422e52f229acc23e460002))

## [4.6.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.6.0...v4.6.1) (2025-09-03)

### Performance Improvements

* **asset:** Update processTotalCountAssetsQuery so only one asset with one property is returned ([#396](https://github.com/ni/systemlink-grafana-plugins/issues/396)) ([3ad016b](https://github.com/ni/systemlink-grafana-plugins/commit/3ad016bd4dac787764dab1c4bfc1db8092537404))

## [4.6.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.5.1...v4.6.0) (2025-09-03)

### Features

* **alarms:** Add initial structure for SystemLink Alarms datasource ([#392](https://github.com/ni/systemlink-grafana-plugins/issues/392)) ([b768c1e](https://github.com/ni/systemlink-grafana-plugins/commit/b768c1e06baefa2752233a0253de7261d515e7bd))

## [4.5.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.5.0...v4.5.1) (2025-09-02)

### Bug Fixes

* **asset:** Update the request body and include projection in Query Assets Variable ([#395](https://github.com/ni/systemlink-grafana-plugins/issues/395)) ([d9e1d58](https://github.com/ni/systemlink-grafana-plugins/commit/d9e1d587288b2924965399f26ff39b36d7cf9048))

## [4.5.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.4.3...v4.5.0) (2025-08-22)

### Features

* **asset:** Implement Properties multiselect options for ListAssets data source ([#390](https://github.com/ni/systemlink-grafana-plugins/issues/390)) ([6baff46](https://github.com/ni/systemlink-grafana-plugins/commit/6baff46c0312fbc1bbf9c788d4f74027bf79a505))

## [4.4.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.4.2...v4.4.3) (2025-08-21)

### Bug Fixes

* **shared:** use common fetch method for get and post API calls ([#388](https://github.com/ni/systemlink-grafana-plugins/issues/388)) ([12fc053](https://github.com/ni/systemlink-grafana-plugins/commit/12fc053cbf0a87827b12d97310b32c48d18bb080))

## [4.4.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.4.1...v4.4.2) (2025-08-19)

### Bug Fixes

* **core:** Use ref-based options for query builder callbacks ([#368](https://github.com/ni/systemlink-grafana-plugins/issues/368)) ([a52c05e](https://github.com/ni/systemlink-grafana-plugins/commit/a52c05eba4f376267a5a89a2cc6718ba00645c81))

## [4.4.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.4.0...v4.4.1) (2025-08-14)

### Bug Fixes

* **results:** Update tooltip description for use time range control ([#379](https://github.com/ni/systemlink-grafana-plugins/issues/379)) ([6e0af9b](https://github.com/ni/systemlink-grafana-plugins/commit/6e0af9b8660ede490f02d3bdde71879339733bb4))

## [4.4.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.3.4...v4.4.0) (2025-08-13)

### Features

* **asset:**  add take support for query variables for ListAssets data source ([#387](https://github.com/ni/systemlink-grafana-plugins/issues/387)) ([8035061](https://github.com/ni/systemlink-grafana-plugins/commit/80350610a99bd0fa35b5721b802bf688bac99210))

## [4.3.4](https://github.com/ni/systemlink-grafana-plugins/compare/v4.3.3...v4.3.4) (2025-08-08)

### Bug Fixes

* **prototype:** Revert call export-data API for taking metrics ([#386](https://github.com/ni/systemlink-grafana-plugins/issues/386)) ([1ed8233](https://github.com/ni/systemlink-grafana-plugins/commit/1ed82330b0b4cc4d834ac53278dc4ee5d54722df))

## [4.3.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.3.2...v4.3.3) (2025-08-08)

### Bug Fixes

* **prototype:** Revert use backend server to call the export-url ([#385](https://github.com/ni/systemlink-grafana-plugins/issues/385)) ([0287590](https://github.com/ni/systemlink-grafana-plugins/commit/028759072fc2a3388c59add461ecc57cb4e2ac4d))

## [4.3.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.3.1...v4.3.2) (2025-08-07)

### Bug Fixes

* **prototype:** use backend server to call the export-url ([#384](https://github.com/ni/systemlink-grafana-plugins/issues/384)) ([a1125e3](https://github.com/ni/systemlink-grafana-plugins/commit/a1125e388b4790da967cd3b12beae3226d5aa8eb))

## [4.3.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.3.0...v4.3.1) (2025-08-07)

### Bug Fixes

* **prototype:** Call export-data API for taking metrics ([#383](https://github.com/ni/systemlink-grafana-plugins/issues/383)) ([8e77c70](https://github.com/ni/systemlink-grafana-plugins/commit/8e77c70af46e29b2f03ada05c1c76716877ca1cf))

## [4.3.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.2.2...v4.3.0) (2025-08-07)

### Features

* **asset:** add editable take field with validation and default fallback for legacy panels ([#381](https://github.com/ni/systemlink-grafana-plugins/issues/381)) ([cb24797](https://github.com/ni/systemlink-grafana-plugins/commit/cb24797f716cd31c1c0208b9d07fbf1d62471a9b))

## [4.2.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.2.1...v4.2.2) (2025-08-06)

### Bug Fixes

* **results:** Fix step path lookup label in dropdown ([#358](https://github.com/ni/systemlink-grafana-plugins/issues/358)) ([22c8752](https://github.com/ni/systemlink-grafana-plugins/commit/22c8752a29e4863bfd16bdd33cdd385839cca2b9))

## [4.2.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.2.0...v4.2.1) (2025-08-05)

### Bug Fixes

* **prototype:** Revert changes from all PRs ([#380](https://github.com/ni/systemlink-grafana-plugins/issues/380)) ([4a40a65](https://github.com/ni/systemlink-grafana-plugins/commit/4a40a658dbf3e0dcc8903df808f27dee1323cb3d))

## [4.2.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.1.4...v4.2.0) (2025-08-05)

### Features

* **asset:** Implement Properties and Total Count output options for ListAssets data source ([#370](https://github.com/ni/systemlink-grafana-plugins/issues/370)) ([b918a4f](https://github.com/ni/systemlink-grafana-plugins/commit/b918a4fe47b3424f56a60032510314ae84326134))

## [4.1.4](https://github.com/ni/systemlink-grafana-plugins/compare/v4.1.3...v4.1.4) (2025-08-04)

### Bug Fixes

* **prototype:** Call non-cors-api with session key ([#378](https://github.com/ni/systemlink-grafana-plugins/issues/378)) ([be8c34e](https://github.com/ni/systemlink-grafana-plugins/commit/be8c34e0617944cd4f38ffd485c90595808a0a10))

## [4.1.3](https://github.com/ni/systemlink-grafana-plugins/compare/v4.1.2...v4.1.3) (2025-08-04)

### Bug Fixes

* **prototype:** fix headers dev-api endpoint ([#377](https://github.com/ni/systemlink-grafana-plugins/issues/377)) ([caf8168](https://github.com/ni/systemlink-grafana-plugins/commit/caf8168d8ac53aca09cd2ee08f61f0c023093523))

## [4.1.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.1.1...v4.1.2) (2025-08-04)

### Bug Fixes

* fix headers dev-api endpoint ([#376](https://github.com/ni/systemlink-grafana-plugins/issues/376)) ([8204575](https://github.com/ni/systemlink-grafana-plugins/commit/8204575ad572d0ae8041b35d1361ab3552e03975))

## [4.1.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.1.0...v4.1.1) (2025-08-04)

### Bug Fixes

* **prototype:** Update create-api-session url ([#375](https://github.com/ni/systemlink-grafana-plugins/issues/375)) ([6c0cb5c](https://github.com/ni/systemlink-grafana-plugins/commit/6c0cb5cfd36e077460c2affcf4203faabe8cf050))

## [4.1.0](https://github.com/ni/systemlink-grafana-plugins/compare/v4.0.2...v4.1.0) (2025-08-04)

### Features

* **prototype:** call user/create-api-session api from webserver ([#374](https://github.com/ni/systemlink-grafana-plugins/issues/374)) ([e3a90cc](https://github.com/ni/systemlink-grafana-plugins/commit/e3a90cc0b67938eafdbdb67e0fdad0eae8f06c62))

## [4.0.2](https://github.com/ni/systemlink-grafana-plugins/compare/v4.0.1...v4.0.2) (2025-08-01)

### Bug Fixes

* **core,results,testplans,workorders:** Update operator label casing for consistency ([#366](https://github.com/ni/systemlink-grafana-plugins/issues/366)) ([c63fb6c](https://github.com/ni/systemlink-grafana-plugins/commit/c63fb6ceec8daafb6f648cd7d622a44e0304fa27))

## [4.0.1](https://github.com/ni/systemlink-grafana-plugins/compare/v4.0.0...v4.0.1) (2025-07-30)

### Bug Fixes

* **products:** Display empty cell for properties when API returns empty object ([#365](https://github.com/ni/systemlink-grafana-plugins/issues/365)) ([5268e25](https://github.com/ni/systemlink-grafana-plugins/commit/5268e25ede639198b28d0dc345ceafc27c1927cb))

## [4.0.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.147.3...v4.0.0) (2025-07-28)

### ⚠ BREAKING CHANGES

* clients must upgrade to Grafana v11.6.4+

### Documentation

* Update README and force major release ([#367](https://github.com/ni/systemlink-grafana-plugins/issues/367)) ([7b7c945](https://github.com/ni/systemlink-grafana-plugins/commit/7b7c945d73f6478ba10c30ea56727b1882e76c3e))

## [3.147.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.147.2...v3.147.3) (2025-07-21)

### Bug Fixes

* **workorders,testplans:** Sort variable options by their label ([#361](https://github.com/ni/systemlink-grafana-plugins/issues/361)) ([cc446b9](https://github.com/ni/systemlink-grafana-plugins/commit/cc446b91720ca29d03f64f7e573ef52dbe427519))

## [3.147.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.147.1...v3.147.2) (2025-07-18)

### Bug Fixes

* **products, results:** Sort variable options in dropdown ([#360](https://github.com/ni/systemlink-grafana-plugins/issues/360)) ([4a5a6a8](https://github.com/ni/systemlink-grafana-plugins/commit/4a5a6a83e5ee05f7d55771f58789ad0f29eeb26d))

## [3.147.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.147.0...v3.147.1) (2025-07-17)

### Bug Fixes

* **system:** prevent hidden system queries to run ([#350](https://github.com/ni/systemlink-grafana-plugins/issues/350)) ([bc02654](https://github.com/ni/systemlink-grafana-plugins/commit/bc026545cad7c30d561f57ef5d1ff7e77c61ffc1))

## [3.147.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.146.0...v3.147.0) (2025-07-16)

### Features

* **asset:** add missing fields from asset model ([#359](https://github.com/ni/systemlink-grafana-plugins/issues/359)) ([ea320a4](https://github.com/ni/systemlink-grafana-plugins/commit/ea320a47e3e34d2c4a29635ea0c4651a8fb45121))

## [3.146.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.145.1...v3.146.0) (2025-07-14)

### Features

* **products:** update field labels and refactor projection mapping  ([#349](https://github.com/ni/systemlink-grafana-plugins/issues/349)) ([3ee42f4](https://github.com/ni/systemlink-grafana-plugins/commit/3ee42f4b1de73afbc55f823e802a798c418ac900))

## [3.145.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.145.0...v3.145.1) (2025-07-09)

### Bug Fixes

* **asset,tags,notebook:** hide query options from table combo box when query is hidden ([#351](https://github.com/ni/systemlink-grafana-plugins/issues/351)) ([71bf387](https://github.com/ni/systemlink-grafana-plugins/commit/71bf387a4a020556a592b7f314e17c9546a31ad3))

## [3.145.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.144.1...v3.145.0) (2025-07-08)

### Features

* **tags:** update tag datasource with new endpoint to fetch tag data ([#352](https://github.com/ni/systemlink-grafana-plugins/issues/352)) ([dfa4fb0](https://github.com/ni/systemlink-grafana-plugins/commit/dfa4fb0fe87bbdf2b1f7d2088c7435ba4c81cfa4))

## [3.144.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.144.0...v3.144.1) (2025-06-30)

### Bug Fixes

* **products:** Add query name as the refIds for queries  ([#348](https://github.com/ni/systemlink-grafana-plugins/issues/348)) ([2ac712d](https://github.com/ni/systemlink-grafana-plugins/commit/2ac712d5a4e93a903228c768a4e78995c2bba172))

## [3.144.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.143.0...v3.144.0) (2025-06-30)

### Features

* **products:** handle invalid queries in Products Query Editor ([#347](https://github.com/ni/systemlink-grafana-plugins/issues/347)) ([bb92537](https://github.com/ni/systemlink-grafana-plugins/commit/bb9253701da5af78c1cf48777d9fa5a0c3dd24c1))

## [3.143.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.142.1...v3.143.0) (2025-06-27)

### Features

* **products:** run query on initialization when switching to product datasource ([#307](https://github.com/ni/systemlink-grafana-plugins/issues/307)) ([38ca464](https://github.com/ni/systemlink-grafana-plugins/commit/38ca4645aa875818089d881c68422c511c6f530d))

## [3.142.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.142.0...v3.142.1) (2025-06-27)

### Bug Fixes

* **products:** Clicking on info toggling descending ([#345](https://github.com/ni/systemlink-grafana-plugins/issues/345)) ([054d8f9](https://github.com/ni/systemlink-grafana-plugins/commit/054d8f9f6ebe2af153c981f31313bc4d3550e62e))

## [3.142.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.17...v3.142.0) (2025-06-27)

### Features

* **results:** add custom theme support for horizontal scrollbar in query-builder ([#344](https://github.com/ni/systemlink-grafana-plugins/issues/344)) ([4edab21](https://github.com/ni/systemlink-grafana-plugins/commit/4edab217d0e028e14522a5f203bffae024e4ffd1))

## [3.141.17](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.16...v3.141.17) (2025-06-27)

### Bug Fixes

* **results:** Remove showIcons from query builder ([#343](https://github.com/ni/systemlink-grafana-plugins/issues/343)) ([6ac1a56](https://github.com/ni/systemlink-grafana-plugins/commit/6ac1a56b2f095fa43df05dd9ffc7b6128f00128e))
* **testplans:** Restrict numeric input to only numeric ([#342](https://github.com/ni/systemlink-grafana-plugins/issues/342)) ([07ea69a](https://github.com/ni/systemlink-grafana-plugins/commit/07ea69a4ec70f05e223b0575b0352e0185775e25))

## [3.141.16](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.15...v3.141.16) (2025-06-27)

### Bug Fixes

* **workorders,testplans:** Fix take limit ([#341](https://github.com/ni/systemlink-grafana-plugins/issues/341)) ([0dbc9df](https://github.com/ni/systemlink-grafana-plugins/commit/0dbc9df15cd590da12e7963bc5f4bf9796f2ebd8))

## [3.141.15](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.14...v3.141.15) (2025-06-26)

### Bug Fixes

* **workorders:** Fix typo in state 'Canceled' ([#340](https://github.com/ni/systemlink-grafana-plugins/issues/340)) ([3141b41](https://github.com/ni/systemlink-grafana-plugins/commit/3141b4193e32b095c16bb14b1c4229f0cdcf9178))

## [3.141.14](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.13...v3.141.14) (2025-06-26)

### Bug Fixes

* **DataSourceBase:** ensure URL is preserved during fetch retries ([#336](https://github.com/ni/systemlink-grafana-plugins/issues/336)) ([01240ca](https://github.com/ni/systemlink-grafana-plugins/commit/01240caaf5d9d67a6242a914eea5c033d677319e))

## [3.141.13](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.12...v3.141.13) (2025-06-26)

### Bug Fixes

* Duplicate error toasts when Fetch fails ([#334](https://github.com/ni/systemlink-grafana-plugins/issues/334)) ([a2dea3f](https://github.com/ni/systemlink-grafana-plugins/commit/a2dea3f801d6f3034a61dd770422fd94f7fc511e))

## [3.141.12](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.11...v3.141.12) (2025-06-26)

### Bug Fixes

* **products,results,workorders,testplans:** Expand properties dropdown height on adding property ([#339](https://github.com/ni/systemlink-grafana-plugins/issues/339)) ([a36d956](https://github.com/ni/systemlink-grafana-plugins/commit/a36d95605399f0736f3b1f3bd28e6f09faaddffc))

## [3.141.11](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.10...v3.141.11) (2025-06-26)

### Bug Fixes

* **workorders,testplans:** Don't clear take in variable editor when take is invalid ([#337](https://github.com/ni/systemlink-grafana-plugins/issues/337)) ([ac5c2c9](https://github.com/ni/systemlink-grafana-plugins/commit/ac5c2c9ab292527e9c49493d498f4b1bbe7dc5d3))

## [3.141.10](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.9...v3.141.10) (2025-06-26)

### Bug Fixes

* **results:** Remove feature flag configuration ([#331](https://github.com/ni/systemlink-grafana-plugins/issues/331)) ([8b92722](https://github.com/ni/systemlink-grafana-plugins/commit/8b927222a435a29dec8ccb123c3e31ba5d37d61d))

## [3.141.9](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.8...v3.141.9) (2025-06-26)

### Bug Fixes

* **workorders,testplans:** rename fields and update value mappings ([#323](https://github.com/ni/systemlink-grafana-plugins/issues/323)) ([0bbb632](https://github.com/ni/systemlink-grafana-plugins/commit/0bbb632037494bb73bd413fac8f75ccb980c2c99))

## [3.141.8](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.7...v3.141.8) (2025-06-26)

### Bug Fixes

* **results:** Revert changes to fix duplicate error in steps ([#335](https://github.com/ni/systemlink-grafana-plugins/issues/335)) ([814813b](https://github.com/ni/systemlink-grafana-plugins/commit/814813b54d023ce87d35ba05b49d13c924ef21f2))
* **workorders,testplans:** enhance error handling for 429 and 404 API responses ([#332](https://github.com/ni/systemlink-grafana-plugins/issues/332)) ([eaadbd8](https://github.com/ni/systemlink-grafana-plugins/commit/eaadbd885c90918c3744bb5767a166bb83f45984))

## [3.141.7](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.6...v3.141.7) (2025-06-25)

### Bug Fixes

* **results:** Fix duplicate error toasts in steps ([#333](https://github.com/ni/systemlink-grafana-plugins/issues/333)) ([6307093](https://github.com/ni/systemlink-grafana-plugins/commit/63070938b29731f9f57a117c48b589928b4f5d31))

## [3.141.6](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.5...v3.141.6) (2025-06-24)

### Bug Fixes

* **results:** do not fallback to default 'take' when input is invalid - ResultsVariableEditor ([#329](https://github.com/ni/systemlink-grafana-plugins/issues/329)) ([ac0324f](https://github.com/ni/systemlink-grafana-plugins/commit/ac0324f9a8a16deb723cdfa7ae0d42e280187545))

## [3.141.5](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.4...v3.141.5) (2025-06-24)

### Bug Fixes

* **results:** enhance error handling for 429 and 404 API responses  ([#330](https://github.com/ni/systemlink-grafana-plugins/issues/330)) ([83b0dc9](https://github.com/ni/systemlink-grafana-plugins/commit/83b0dc94aa68bdb33a6803a0711a0e08c7f46175))

## [3.141.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.3...v3.141.4) (2025-06-24)

### Bug Fixes

* **results:** fix ResultsQueryEditor to handle undefined queryType in Explore mode ([#328](https://github.com/ni/systemlink-grafana-plugins/issues/328)) ([8330560](https://github.com/ni/systemlink-grafana-plugins/commit/8330560251d0bad257f26814615c6166a37d6004))

## [3.141.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.2...v3.141.3) (2025-06-23)

### Bug Fixes

* **core:** remove error message on 504 status code ([#319](https://github.com/ni/systemlink-grafana-plugins/issues/319)) ([7f753b6](https://github.com/ni/systemlink-grafana-plugins/commit/7f753b6b9964371a73be06a1a9fd3a738cd310a9))

## [3.141.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.1...v3.141.2) (2025-06-23)

### Bug Fixes

* **results:** Display empty cell for properties of type object in the table ([#325](https://github.com/ni/systemlink-grafana-plugins/issues/325)) ([99a166b](https://github.com/ni/systemlink-grafana-plugins/commit/99a166b45bcad60ede26585cfd7eb8e638a68385))

## [3.141.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.141.0...v3.141.1) (2025-06-23)

### Bug Fixes

* **workorders,testplans:** Display empty cell for empty properties ([#326](https://github.com/ni/systemlink-grafana-plugins/issues/326)) ([b6b0754](https://github.com/ni/systemlink-grafana-plugins/commit/b6b07542bd8e7a36f550450bb2052d994a0948e8))

## [3.141.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.140.3...v3.141.0) (2025-06-23)

### Features

* **results:** extend the take from 500 to 1000 when number of measurements < 25 ([#324](https://github.com/ni/systemlink-grafana-plugins/issues/324)) ([2446ec8](https://github.com/ni/systemlink-grafana-plugins/commit/2446ec89648292d6827bd02f5395e167f26ffea7))

## [3.140.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.140.2...v3.140.3) (2025-06-23)

### Bug Fixes

* removed dependency on returnCount to query in batches ([#321](https://github.com/ni/systemlink-grafana-plugins/issues/321)) ([183cc74](https://github.com/ni/systemlink-grafana-plugins/commit/183cc7490b6f297dfc54858aa1ee927de0fb5179))

## [3.140.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.140.1...v3.140.2) (2025-06-23)

### Bug Fixes

* **core:** remove filtering of variable with datasource ([#322](https://github.com/ni/systemlink-grafana-plugins/issues/322)) ([77f3477](https://github.com/ni/systemlink-grafana-plugins/commit/77f3477d754fe386e48730cc7f333f6e309465e0))

## [3.140.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.140.0...v3.140.1) (2025-06-20)

### Bug Fixes

* **results:** Display workspace name instead of ID in visualization table ([#318](https://github.com/ni/systemlink-grafana-plugins/issues/318)) ([f49b651](https://github.com/ni/systemlink-grafana-plugins/commit/f49b65199edc6b5d07d93550fa4dbbffd4d70557))

## [3.140.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.9...v3.140.0) (2025-06-20)

### Features

* **results:** show inputs and outputs of steps as new columns ([#320](https://github.com/ni/systemlink-grafana-plugins/issues/320)) ([48b68cd](https://github.com/ni/systemlink-grafana-plugins/commit/48b68cd40013dbdd6d70a28653eee06e6bc212a9))

## [3.139.9](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.8...v3.139.9) (2025-06-20)

### Bug Fixes

* **workorders,testplans:** Run query on initialization ([#271](https://github.com/ni/systemlink-grafana-plugins/issues/271)) ([95dbc5a](https://github.com/ni/systemlink-grafana-plugins/commit/95dbc5aaa3ff311c013f27b676744e3c3561bc89))

## [3.139.8](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.7...v3.139.8) (2025-06-19)

### Bug Fixes

* **core:** Rethow error in queryUsingSkip ([#312](https://github.com/ni/systemlink-grafana-plugins/issues/312)) ([58bbb76](https://github.com/ni/systemlink-grafana-plugins/commit/58bbb76c6ed4681002c0d5c30f7c2c506db0a6a6))

## [3.139.7](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.6...v3.139.7) (2025-06-18)

### Bug Fixes

* **results:** fix column headers to sentence case ([#317](https://github.com/ni/systemlink-grafana-plugins/issues/317)) ([a4c39e1](https://github.com/ni/systemlink-grafana-plugins/commit/a4c39e17273ca4f4bd84cd9a02f3efd1b0d8817d))

## [3.139.6](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.5...v3.139.6) (2025-06-18)

### Bug Fixes

* **results:** load step path lookup in the query builder ([#315](https://github.com/ni/systemlink-grafana-plugins/issues/315)) ([5813008](https://github.com/ni/systemlink-grafana-plugins/commit/58130086a25783ad81691921931083f962cda27d))

## [3.139.5](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.4...v3.139.5) (2025-06-18)

### Bug Fixes

* **results:** fix steps query not disabled by default in variable editor ([#316](https://github.com/ni/systemlink-grafana-plugins/issues/316)) ([a659eee](https://github.com/ni/systemlink-grafana-plugins/commit/a659eeefac705ddba51a470fd63bebae68cbe093))

## [3.139.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.3...v3.139.4) (2025-06-18)

### Bug Fixes

* **results:** preserve stepsQuery only when switching query types ([#313](https://github.com/ni/systemlink-grafana-plugins/issues/313)) ([9c48eab](https://github.com/ni/systemlink-grafana-plugins/commit/9c48eab2e107eba28670cd6e381f6b38f7169bce))

## [3.139.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.2...v3.139.3) (2025-06-18)

### Bug Fixes

* **results:** allow empty results query to trigger update ([#314](https://github.com/ni/systemlink-grafana-plugins/issues/314)) ([6c045b9](https://github.com/ni/systemlink-grafana-plugins/commit/6c045b9c25da3876d5fe52946c44ebbae6f4313c))

## [3.139.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.1...v3.139.2) (2025-06-18)

### Bug Fixes

* **testplans:** Handle invalid queries to return empty data ([#311](https://github.com/ni/systemlink-grafana-plugins/issues/311)) ([0bcbaa0](https://github.com/ni/systemlink-grafana-plugins/commit/0bcbaa0271eb5ed493bbada87f633299c1f4025d))

## [3.139.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.139.0...v3.139.1) (2025-06-18)

### Bug Fixes

* **workorders:** Handle invalid queries to return empty data ([#310](https://github.com/ni/systemlink-grafana-plugins/issues/310)) ([a3bb4ae](https://github.com/ni/systemlink-grafana-plugins/commit/a3bb4ae816fea99b3b462135c6c50b262088b1b1))

## [3.139.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.138.4...v3.139.0) (2025-06-18)

### Features

* **results:** Update dependencies to load on initialization ([#309](https://github.com/ni/systemlink-grafana-plugins/issues/309)) ([dfa8fe5](https://github.com/ni/systemlink-grafana-plugins/commit/dfa8fe5662d80d8e21d454652f209a1c070bede8))

## [3.138.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.138.3...v3.138.4) (2025-06-18)

### Bug Fixes

* **results:** run query on initialization when switching datasources ([#304](https://github.com/ni/systemlink-grafana-plugins/issues/304)) ([6d867c3](https://github.com/ni/systemlink-grafana-plugins/commit/6d867c35ce0f00bd498b88c81b4d61ee9f292f99))

## [3.138.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.138.2...v3.138.3) (2025-06-18)

### Bug Fixes

* **core:** Update text color in query builder ([#308](https://github.com/ni/systemlink-grafana-plugins/issues/308)) ([2a505bd](https://github.com/ni/systemlink-grafana-plugins/commit/2a505bd9464c0beeff2553e6e45d661655139fac))

## [3.138.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.138.1...v3.138.2) (2025-06-17)

### Bug Fixes

* **workorders,testplans:** Fix field names ([#306](https://github.com/ni/systemlink-grafana-plugins/issues/306)) ([eb30508](https://github.com/ni/systemlink-grafana-plugins/commit/eb3050881c5865bf68cf524368d4d8e4a7bc6708))

## [3.138.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.138.0...v3.138.1) (2025-06-17)

### Bug Fixes

* **workorders,testplans:** Return field type as string for all fields from datasource ([#305](https://github.com/ni/systemlink-grafana-plugins/issues/305)) ([3f1dd24](https://github.com/ni/systemlink-grafana-plugins/commit/3f1dd24489afbbec462f171091a3f02236baf954))

## [3.138.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.137.0...v3.138.0) (2025-06-17)

### Features

* **workorders:** Error handling of workorders ([#301](https://github.com/ni/systemlink-grafana-plugins/issues/301)) ([61a3c6a](https://github.com/ni/systemlink-grafana-plugins/commit/61a3c6ae50aac78a49cbafb37f638158837a1829))

## [3.137.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.136.2...v3.137.0) (2025-06-17)

### Features

* **testplans:** Add error handling ([#300](https://github.com/ni/systemlink-grafana-plugins/issues/300)) ([c76b82e](https://github.com/ni/systemlink-grafana-plugins/commit/c76b82e178a5296098deed3ec47c93e78abf2d1c))

## [3.136.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.136.1...v3.136.2) (2025-06-17)

### Bug Fixes

* **test-plans:** update test plans data source properties ([#299](https://github.com/ni/systemlink-grafana-plugins/issues/299)) ([7b822a6](https://github.com/ni/systemlink-grafana-plugins/commit/7b822a63b195e3775bcaa5fb2ca0cb1751c697ec))

## [3.136.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.136.0...v3.136.1) (2025-06-16)

### Bug Fixes

* **products, results:** Show columns headers on empty response ([#298](https://github.com/ni/systemlink-grafana-plugins/issues/298)) ([20556b2](https://github.com/ni/systemlink-grafana-plugins/commit/20556b27b9d93afcff25f1dd020b9f2443d34565))
* **results:** Handle invalid queries to return empty data ([#297](https://github.com/ni/systemlink-grafana-plugins/issues/297)) ([36aee43](https://github.com/ni/systemlink-grafana-plugins/commit/36aee4351d7f2943815eeb5bb4834cfd53902a40))

## [3.136.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.5...v3.136.0) (2025-06-16)

### Features

* **products, results:** handle 504 timeout errors in product and result queries ([#287](https://github.com/ni/systemlink-grafana-plugins/issues/287)) ([7e3b39f](https://github.com/ni/systemlink-grafana-plugins/commit/7e3b39fa288528f3036cd4106468a8c10a553fe9))
* **results:** Add validation to the Results query builder in Steps query ([#292](https://github.com/ni/systemlink-grafana-plugins/issues/292)) ([53f1bf7](https://github.com/ni/systemlink-grafana-plugins/commit/53f1bf722aaa7194d56c2d6d2be232f5feec1c6d))

## [3.135.5](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.4...v3.135.5) (2025-06-16)

### Bug Fixes

* **products, results:** Update Properties options to Sentence Case ([#295](https://github.com/ni/systemlink-grafana-plugins/issues/295)) ([8c0680c](https://github.com/ni/systemlink-grafana-plugins/commit/8c0680c7e319b36997904c12229749a7543ef886))

## [3.135.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.3...v3.135.4) (2025-06-14)

### Bug Fixes

* **core:** infinite api calls with `queryInBatch` method ([#296](https://github.com/ni/systemlink-grafana-plugins/issues/296)) ([76beff6](https://github.com/ni/systemlink-grafana-plugins/commit/76beff6b67a082f509b451b9ffa029f9ac80db32))

## [3.135.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.2...v3.135.3) (2025-06-13)

### Bug Fixes

* **testplans, workorders:** Update field name and operators ([#294](https://github.com/ni/systemlink-grafana-plugins/issues/294)) ([9f0e170](https://github.com/ni/systemlink-grafana-plugins/commit/9f0e170a7ca9a657c7b8a5596b0a959c2bfd4381))

## [3.135.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.1...v3.135.2) (2025-06-13)

### Bug Fixes

* **results:** Persist query changes between query type switches ([#290](https://github.com/ni/systemlink-grafana-plugins/issues/290)) ([8c8b58c](https://github.com/ni/systemlink-grafana-plugins/commit/8c8b58c7421cbcddf0a080ffbda70168d5f3ab95))

## [3.135.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.135.0...v3.135.1) (2025-06-13)

### Bug Fixes

* **results:** change Take field layout in Query Editor ([#293](https://github.com/ni/systemlink-grafana-plugins/issues/293)) ([2338458](https://github.com/ni/systemlink-grafana-plugins/commit/233845869c713502a678c0c317b65268b48cfd20))

## [3.135.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.134.0...v3.135.0) (2025-06-13)

### Features

* **results:** update labels to sentence case ([#289](https://github.com/ni/systemlink-grafana-plugins/issues/289)) ([ba0f8b7](https://github.com/ni/systemlink-grafana-plugins/commit/ba0f8b7d5e4e88b103024e630f7ac9693c557f0d))

## [3.134.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.133.1...v3.134.0) (2025-06-13)

### Features

* **results:** update measurement columns to include units ([#291](https://github.com/ni/systemlink-grafana-plugins/issues/291)) ([b2a4983](https://github.com/ni/systemlink-grafana-plugins/commit/b2a498303ffe313a118a783ea23126156dec2a0e))

## [3.133.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.133.0...v3.133.1) (2025-06-13)

### Bug Fixes

* **workorders,testplans:** Show column names when there is no data and show refID in output's column name ([#288](https://github.com/ni/systemlink-grafana-plugins/issues/288)) ([ac4c973](https://github.com/ni/systemlink-grafana-plugins/commit/ac4c973a03a6725c6716283c4b1d9e7a2e90bd91))

## [3.133.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.132.2...v3.133.0) (2025-06-13)

### Features

* **results:** add Result ID field to Results Query Builder ([#286](https://github.com/ni/systemlink-grafana-plugins/issues/286)) ([5b3ad7f](https://github.com/ni/systemlink-grafana-plugins/commit/5b3ad7f015ecc2e950fc96112fe178ab2d7d4aa6))

## [3.132.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.132.1...v3.132.2) (2025-06-13)

### Bug Fixes

* **core:** Stylings of shared query builder ([#276](https://github.com/ni/systemlink-grafana-plugins/issues/276)) ([02e85bf](https://github.com/ni/systemlink-grafana-plugins/commit/02e85bfa87d968c25a39cd1cabcd443a7a7a7427))
* **results:** Remove orderby and descending properties from Query Types interfaces ([#279](https://github.com/ni/systemlink-grafana-plugins/issues/279)) ([e10f8fc](https://github.com/ni/systemlink-grafana-plugins/commit/e10f8fcb7d6d2db484b53662d4a0dafdbd8bc3c5))

## [3.132.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.132.0...v3.132.1) (2025-06-13)

### Bug Fixes

* **results:** Set "STARTED_AT" as the default option for the useTimeRange field ([#273](https://github.com/ni/systemlink-grafana-plugins/issues/273)) ([acaf696](https://github.com/ni/systemlink-grafana-plugins/commit/acaf69640d10582b570d4c10c7b2a2a8e3274b26))

## [3.132.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.131.0...v3.132.0) (2025-06-12)

### Features

* **results:** revert Partnumber field from Steps Query ([#283](https://github.com/ni/systemlink-grafana-plugins/issues/283)) ([efbf378](https://github.com/ni/systemlink-grafana-plugins/commit/efbf3789180ef30969f946472403b88ca5d79e89))

## [3.131.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.130.0...v3.131.0) (2025-06-12)

### Features

* **results:** revert partNumber field for results query ([#280](https://github.com/ni/systemlink-grafana-plugins/issues/280)) ([fa2638d](https://github.com/ni/systemlink-grafana-plugins/commit/fa2638d7df83092255b71a27201e53458e85a220))

### Bug Fixes

* **results:** update default limit of take to 1000 ([#282](https://github.com/ni/systemlink-grafana-plugins/issues/282)) ([404b630](https://github.com/ni/systemlink-grafana-plugins/commit/404b6309b50898cc4f251ea771f0008e84561ccf))

## [3.130.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.129.1...v3.130.0) (2025-06-12)

### Features

* **results:** update measurements to be listed as separate columns ([#281](https://github.com/ni/systemlink-grafana-plugins/issues/281)) ([3da8a68](https://github.com/ni/systemlink-grafana-plugins/commit/3da8a68db244ab8890f775066ea97f18f88f11bb))

## [3.129.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.129.0...v3.129.1) (2025-06-12)

### Bug Fixes

* **results:** outputs are not shown as query name ([#275](https://github.com/ni/systemlink-grafana-plugins/issues/275)) ([9925329](https://github.com/ni/systemlink-grafana-plugins/commit/9925329e1079949510648d64615d84f09b2dace7))

## [3.129.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.128.1...v3.129.0) (2025-06-12)

### Features

* **core:** Add support for custom date time operations ([#267](https://github.com/ni/systemlink-grafana-plugins/issues/267)) ([0873fb2](https://github.com/ni/systemlink-grafana-plugins/commit/0873fb2dd98dab31a72b1c5b208a894ecece05b4))

## [3.128.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.128.0...v3.128.1) (2025-06-12)

### Bug Fixes

* **workorders:** multiple API calls when editing panels ([#277](https://github.com/ni/systemlink-grafana-plugins/issues/277)) ([b6c2afe](https://github.com/ni/systemlink-grafana-plugins/commit/b6c2afe1813b7e113f1eb9c6b964e7bcddf93b05))

## [3.128.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.127.4...v3.128.0) (2025-06-12)

### Features

* **results:** Add "has children" property in steps query builder ([#278](https://github.com/ni/systemlink-grafana-plugins/issues/278)) ([beefaee](https://github.com/ni/systemlink-grafana-plugins/commit/beefaee162d5bdd4a1d0f1eb863d46b9b2904037))

## [3.127.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.127.3...v3.127.4) (2025-06-12)

### Bug Fixes

* **results,products:** multiple API calls when editing panels ([#274](https://github.com/ni/systemlink-grafana-plugins/issues/274)) ([64b1145](https://github.com/ni/systemlink-grafana-plugins/commit/64b1145cf03b53536aed2b42036c08255a0c76e3))

## [3.127.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.127.2...v3.127.3) (2025-06-11)

### Bug Fixes

* **results:** Set "STARTED_AT" as the default option for the order by field ([#270](https://github.com/ni/systemlink-grafana-plugins/issues/270)) ([291f74e](https://github.com/ni/systemlink-grafana-plugins/commit/291f74e73d510c5a8d90d8ec87868e3dfea3baca))

## [3.127.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.127.1...v3.127.2) (2025-06-11)

### Bug Fixes

* **workorders:** Remove user fields from WorkOrdersQueryBuilderStaticFields ([#272](https://github.com/ni/systemlink-grafana-plugins/issues/272)) ([30b6e0b](https://github.com/ni/systemlink-grafana-plugins/commit/30b6e0b877e325f27c4852c6382a17b71993b8d5))

## [3.127.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.127.0...v3.127.1) (2025-06-11)

### Bug Fixes

* **results:** Align orderby and take controls in query editor ([#269](https://github.com/ni/systemlink-grafana-plugins/issues/269)) ([66ecc6b](https://github.com/ni/systemlink-grafana-plugins/commit/66ecc6b3e8e2e122fae4aca94a4efc37743800f6))

## [3.127.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.126.0...v3.127.0) (2025-06-11)

### Features

* **test-plans:** Use product part number and name in the query builder & response ([#261](https://github.com/ni/systemlink-grafana-plugins/issues/261)) ([48d31ab](https://github.com/ni/systemlink-grafana-plugins/commit/48d31ab1c4d2370bc56435befe4bc7fb77e3399d))

## [3.126.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.125.1...v3.126.0) (2025-06-11)

### Features

* **products-util:** create product reusable to remove duplicate method of query part number & name ([#238](https://github.com/ni/systemlink-grafana-plugins/issues/238)) ([2b9880d](https://github.com/ni/systemlink-grafana-plugins/commit/2b9880dafe122f39057b7146c48ef9550ba33977))

### Bug Fixes

* **test-plans:** transform duration filters in the request body ([#268](https://github.com/ni/systemlink-grafana-plugins/issues/268)) ([7397d58](https://github.com/ni/systemlink-grafana-plugins/commit/7397d580a986bb2151a664e91a2cff0ad95884e1))

## [3.125.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.125.0...v3.125.1) (2025-06-10)

### Bug Fixes

* **results:** `totalCount` is not returned when there are no results matching the query ([#266](https://github.com/ni/systemlink-grafana-plugins/issues/266)) ([f7095ec](https://github.com/ni/systemlink-grafana-plugins/commit/f7095ec51091ebc01e4dc1c51cf95b49216afce2))

## [3.125.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.124.1...v3.125.0) (2025-06-10)

### Features

* **results:** rename resultsFilter to resultFilter ([#264](https://github.com/ni/systemlink-grafana-plugins/issues/264)) ([782025f](https://github.com/ni/systemlink-grafana-plugins/commit/782025f8c0cf2dc36a50fa8e85f63f532f3bc5f8))
* **test-plans:** Add state property lookup in the query builder ([#263](https://github.com/ni/systemlink-grafana-plugins/issues/263)) ([c7dacd8](https://github.com/ni/systemlink-grafana-plugins/commit/c7dacd822159775a91f4517e1750cf230d364789))

## [3.124.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.124.0...v3.124.1) (2025-06-10)

### Bug Fixes

* **testplans:** Update filter fields in test plans ([#260](https://github.com/ni/systemlink-grafana-plugins/issues/260)) ([d73b005](https://github.com/ni/systemlink-grafana-plugins/commit/d73b005e5c774e75152309d21de13f0530cb4a39))

## [3.124.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.123.0...v3.124.0) (2025-06-10)

### Features

* **workorders:** Add users lookup and map users in workorders data ([#256](https://github.com/ni/systemlink-grafana-plugins/issues/256)) ([1d74091](https://github.com/ni/systemlink-grafana-plugins/commit/1d74091fb3b7d9631d13a2529a8679fba94d8fdf))

## [3.123.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.122.0...v3.123.0) (2025-06-10)

### Features

* **workorders:** Map workspace name in workorders QB and datasource ([#255](https://github.com/ni/systemlink-grafana-plugins/issues/255)) ([f76916b](https://github.com/ni/systemlink-grafana-plugins/commit/f76916b9647adf19eecb7426b1d2a194a92bef57))

## [3.122.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.121.0...v3.122.0) (2025-06-10)

### Features

* **results:** Handle null values for product names ([#262](https://github.com/ni/systemlink-grafana-plugins/issues/262)) ([a397fc3](https://github.com/ni/systemlink-grafana-plugins/commit/a397fc37e115b2dfead0ffe12a586425921784df))

## [3.121.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.120.0...v3.121.0) (2025-06-10)

### Features

* **results:** prevent duplicate API call  ([#259](https://github.com/ni/systemlink-grafana-plugins/issues/259)) ([373da70](https://github.com/ni/systemlink-grafana-plugins/commit/373da70efa07aa8bc0e903b27e6b51bfbc1c62b1))

## [3.120.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.119.0...v3.120.0) (2025-06-10)

### Features

* **test-plans:** Add users lookup and map users in test plans data source & query builder ([#257](https://github.com/ni/systemlink-grafana-plugins/issues/257)) ([4eb5e3e](https://github.com/ni/systemlink-grafana-plugins/commit/4eb5e3e8756e5a7efaba1b2f813ffc0077f91033))
* **test-plans:** Show Dut serial number in the properties ([#258](https://github.com/ni/systemlink-grafana-plugins/issues/258)) ([8934fe5](https://github.com/ni/systemlink-grafana-plugins/commit/8934fe5faec9350d293e787745c8de92c2410bb0))

## [3.119.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.118.0...v3.119.0) (2025-06-09)

### Features

* **testplans:** Add support for time fields & global variables ([#250](https://github.com/ni/systemlink-grafana-plugins/issues/250)) ([2294f1a](https://github.com/ni/systemlink-grafana-plugins/commit/2294f1a3a3aead8bc0245bfea8be0435388e9a45))

## [3.118.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.117.1...v3.118.0) (2025-06-09)

### Features

* **shared:** Add users class with utility methods to load users ([#227](https://github.com/ni/systemlink-grafana-plugins/issues/227)) ([9e2326d](https://github.com/ni/systemlink-grafana-plugins/commit/9e2326d020a355909f60add097d389c659618507))

## [3.117.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.117.0...v3.117.1) (2025-06-09)

### Bug Fixes

* **utils:** set take value to 0 when it is defined in `queryInBatches` method ([#251](https://github.com/ni/systemlink-grafana-plugins/issues/251)) ([a01b80f](https://github.com/ni/systemlink-grafana-plugins/commit/a01b80f05dd77fefd385b937c2351a87dd677a06))

## [3.117.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.116.0...v3.117.0) (2025-06-09)

### Features

* **system-utils:** create system reusable to remove duplicate methods of loading system alias in data sources ([#234](https://github.com/ni/systemlink-grafana-plugins/issues/234)) ([11c0562](https://github.com/ni/systemlink-grafana-plugins/commit/11c05627628fab15cf8612b02aea99694c17de63))

## [3.116.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.115.0...v3.116.0) (2025-06-09)

### Features

* **results:** Error handling for query-paths ([#253](https://github.com/ni/systemlink-grafana-plugins/issues/253)) ([3ea6867](https://github.com/ni/systemlink-grafana-plugins/commit/3ea686722af89bc1451ef5cfee497ee94ac33ab9))

## [3.115.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.114.0...v3.115.0) (2025-06-09)

### Features

* **testplans:** Stringify properties dispayed ([#254](https://github.com/ni/systemlink-grafana-plugins/issues/254)) ([4e64263](https://github.com/ni/systemlink-grafana-plugins/commit/4e642637e7cc78184bbb85724340b589ca51dd3b))

## [3.114.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.113.0...v3.114.0) (2025-06-09)

### Features

* **workspace-util:** create workspace reusable to remove duplicate methods of loading workspace in data sources ([#226](https://github.com/ni/systemlink-grafana-plugins/issues/226)) ([3afdaff](https://github.com/ni/systemlink-grafana-plugins/commit/3afdaff27c0b50e62702b7992d2d38f1e740483e))

## [3.113.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.112.0...v3.113.0) (2025-06-09)

### Features

* **products, results:** add validation for property selection ([#252](https://github.com/ni/systemlink-grafana-plugins/issues/252)) ([8d321ef](https://github.com/ni/systemlink-grafana-plugins/commit/8d321eff0d78153cc7ee65b39e9dcc3189723233))

## [3.112.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.111.0...v3.112.0) (2025-06-09)

### Features

* **query-editor:** add validation and error handling for product selection  ([#247](https://github.com/ni/systemlink-grafana-plugins/issues/247)) ([d2b3083](https://github.com/ni/systemlink-grafana-plugins/commit/d2b3083906a41d7548652b0a5c6dd30c1f464dde))

## [3.111.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.110.0...v3.111.0) (2025-06-09)

### Features

* **products, results:** add validation for record count input with error ([#244](https://github.com/ni/systemlink-grafana-plugins/issues/244)) ([15260d4](https://github.com/ni/systemlink-grafana-plugins/commit/15260d4c7c5f05b18a3917b0b987d73298582477))

## [3.110.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.109.0...v3.110.0) (2025-06-09)

### Features

* **results:** update error handling for steps  query ([#243](https://github.com/ni/systemlink-grafana-plugins/issues/243)) ([e2905aa](https://github.com/ni/systemlink-grafana-plugins/commit/e2905aa832830c303d404593b8dc0d33b073ec94))

## [3.109.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.108.0...v3.109.0) (2025-06-06)

### Features

* **results:** Add step path lookup in steps variable editor ([#248](https://github.com/ni/systemlink-grafana-plugins/issues/248)) ([1349bca](https://github.com/ni/systemlink-grafana-plugins/commit/1349bcab5ab7e690dc3fb325a3e77caa1f00547f))

## [3.108.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.107.0...v3.108.0) (2025-06-06)

### Features

* **test-plans:** show workorder name, template name and estimated duration ([#249](https://github.com/ni/systemlink-grafana-plugins/issues/249)) ([4404b0e](https://github.com/ni/systemlink-grafana-plugins/commit/4404b0e67846392c6e37d9cfaceef6d5bc55f43f))

## [3.107.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.106.0...v3.107.0) (2025-06-06)

### Features

* **test-plan:** show fixture and dut name for ids ([#242](https://github.com/ni/systemlink-grafana-plugins/issues/242)) ([960f954](https://github.com/ni/systemlink-grafana-plugins/commit/960f954f5656351d9ab1ead136001331939fa113))

## [3.106.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.105.1...v3.106.0) (2025-06-06)

### Features

* **results:** Integrate result values and path methods to load lookups for steps path ([#241](https://github.com/ni/systemlink-grafana-plugins/issues/241)) ([3446140](https://github.com/ni/systemlink-grafana-plugins/commit/3446140161a8657095a9281b2f6a43ceb5c39a11))

## [3.105.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.105.0...v3.105.1) (2025-06-05)

### Bug Fixes

* **results:** Enable steps query builder when product name field has value ([#246](https://github.com/ni/systemlink-grafana-plugins/issues/246)) ([4179e6e](https://github.com/ni/systemlink-grafana-plugins/commit/4179e6e924bc7ea5da063b5250f4a1bb417c4054))

## [3.105.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.104.1...v3.105.0) (2025-06-05)

### Features

* **workorders:** Add support for time fields & Transform the values of global variables ([#232](https://github.com/ni/systemlink-grafana-plugins/issues/232)) ([45c48fb](https://github.com/ni/systemlink-grafana-plugins/commit/45c48fbc611a2473459e53a8f4efcdc3d000d42f))

## [3.104.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.104.0...v3.104.1) (2025-06-05)

### Bug Fixes

* **results:** update error handling for Results query  ([#240](https://github.com/ni/systemlink-grafana-plugins/issues/240)) ([94eff1a](https://github.com/ni/systemlink-grafana-plugins/commit/94eff1a0816aed6bb784c8f38dc5e646519945db))

## [3.104.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.103.1...v3.104.0) (2025-06-05)

### Features

* **products:** Update error handling for products datasource ([#237](https://github.com/ni/systemlink-grafana-plugins/issues/237)) ([fed043d](https://github.com/ni/systemlink-grafana-plugins/commit/fed043def7090f749ac44eab498a87523e597433))

## [3.103.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.103.0...v3.103.1) (2025-06-04)

### Bug Fixes

* **testplans:** record count error message when it is undefined ([#239](https://github.com/ni/systemlink-grafana-plugins/issues/239)) ([d046dbc](https://github.com/ni/systemlink-grafana-plugins/commit/d046dbc371fa9983348fe8de0638bbdbc47d74dd))

## [3.103.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.102.0...v3.103.0) (2025-06-04)

### Features

* **results:** Remove partnumber field from results query builder ([#236](https://github.com/ni/systemlink-grafana-plugins/issues/236)) ([f729e48](https://github.com/ni/systemlink-grafana-plugins/commit/f729e48b32a6fb59d0c4818828c6eb4d184d1a88))

## [3.102.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.101.0...v3.102.0) (2025-06-04)

### Features

* **results:** Add product multiselect field in steps variable query editor ([#235](https://github.com/ni/systemlink-grafana-plugins/issues/235)) ([8d36d0d](https://github.com/ni/systemlink-grafana-plugins/commit/8d36d0d24f527ce40fc3d209d78dec25861160ad))

## [3.101.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.100.0...v3.101.0) (2025-06-04)

### Features

* **results:** Add product multiselect field in steps query editor ([#225](https://github.com/ni/systemlink-grafana-plugins/issues/225)) ([971c1bc](https://github.com/ni/systemlink-grafana-plugins/commit/971c1bca663dfb993f05cadced140ae1e4a13fd3))

## [3.100.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.99.0...v3.100.0) (2025-06-04)

### Features

* **results:** Add product multiselect field in results variable query editor ([#233](https://github.com/ni/systemlink-grafana-plugins/issues/233)) ([cc9e706](https://github.com/ni/systemlink-grafana-plugins/commit/cc9e706636652c81af6f52059a983097d34d8e74))

## [3.99.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.98.0...v3.99.0) (2025-06-04)

### Features

* **results:** Add product multiselect field in results query editor ([#230](https://github.com/ni/systemlink-grafana-plugins/issues/230)) ([d63e4cc](https://github.com/ni/systemlink-grafana-plugins/commit/d63e4cca57b6ae561f93c36246da62f5bae85810))

## [3.98.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.97.0...v3.98.0) (2025-06-03)

### Features

* **workorders:** Add support for take ([#212](https://github.com/ni/systemlink-grafana-plugins/issues/212)) ([77a077c](https://github.com/ni/systemlink-grafana-plugins/commit/77a077c5e51e93db6623875d721bdab3f2021668))

## [3.97.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.96.0...v3.97.0) (2025-06-02)

### Features

* **workorders:** Add workorders variable query editor ([#231](https://github.com/ni/systemlink-grafana-plugins/issues/231)) ([302c2b9](https://github.com/ni/systemlink-grafana-plugins/commit/302c2b92d1631a41a41b20e621ac8b33ddfdfb66))

## [3.96.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.95.0...v3.96.0) (2025-06-02)

### Features

* **workorders:** Add support for key value operations and global variables ([#229](https://github.com/ni/systemlink-grafana-plugins/issues/229)) ([165f62a](https://github.com/ni/systemlink-grafana-plugins/commit/165f62ab6fd112ff292f58e7da4f986c04c7f373))

## [3.95.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.94.0...v3.95.0) (2025-05-30)

### Features

* **test-plan:** add dummy query builder in test plans editors ([#223](https://github.com/ni/systemlink-grafana-plugins/issues/223)) ([b1553d2](https://github.com/ni/systemlink-grafana-plugins/commit/b1553d2a067a1a215f997cf2ccf04fbd11e3714c))

## [3.94.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.93.1...v3.94.0) (2025-05-30)

### Features

* **results:** Add batching for step path ([#222](https://github.com/ni/systemlink-grafana-plugins/issues/222)) ([413bfde](https://github.com/ni/systemlink-grafana-plugins/commit/413bfde3686505b0027d17e0b91d0b82344e2562))

## [3.93.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.93.0...v3.93.1) (2025-05-29)

### Bug Fixes

* **results:** Share Workspace and Part Number Cache Across Results and Steps Query Types ([#213](https://github.com/ni/systemlink-grafana-plugins/issues/213)) ([f0bf56d](https://github.com/ni/systemlink-grafana-plugins/commit/f0bf56de3022a35820acd609975f9f10b6601936))

## [3.93.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.92.0...v3.93.0) (2025-05-28)

### Features

* **core:** Add inner Errors with Severity support and Toast message support  ([#217](https://github.com/ni/systemlink-grafana-plugins/issues/217)) ([a4194f4](https://github.com/ni/systemlink-grafana-plugins/commit/a4194f492d9c176ecffa10ddb7f33df3ea32c996))

## [3.92.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.91.1...v3.92.0) (2025-05-27)

### Features

* **test-plans:** Query variable query editor ([#221](https://github.com/ni/systemlink-grafana-plugins/issues/221)) ([3e58cb4](https://github.com/ni/systemlink-grafana-plugins/commit/3e58cb465f5c4bc3af110dd623366e8a2f5d3d57))

## [3.91.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.91.0...v3.91.1) (2025-05-27)

### Bug Fixes

* **results:** Hide Order by and Take fields when output type is set to total count ([#219](https://github.com/ni/systemlink-grafana-plugins/issues/219)) ([ae9a06b](https://github.com/ni/systemlink-grafana-plugins/commit/ae9a06be5a9e94a0e7d5f6ae75ea7ef3f5854ea5))

## [3.91.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.90.0...v3.91.0) (2025-05-27)

### Features

* **workorders:** add query by change ([#215](https://github.com/ni/systemlink-grafana-plugins/issues/215)) ([e87753d](https://github.com/ni/systemlink-grafana-plugins/commit/e87753daa67e967a092ea28b3e6897148fcdf9c8))

## [3.90.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.89.0...v3.90.0) (2025-05-27)

### Features

* **test-plans:** Query test plans in batches ([#199](https://github.com/ni/systemlink-grafana-plugins/issues/199)) ([c3e1559](https://github.com/ni/systemlink-grafana-plugins/commit/c3e15594fd25c55855dae2ace0a3e5695e903860))

## [3.89.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.88.1...v3.89.0) (2025-05-26)

### Features

* **products:** Fix Duplicate API calls in query builder for Workspace and Updated At ([#216](https://github.com/ni/systemlink-grafana-plugins/issues/216)) ([ece36fe](https://github.com/ni/systemlink-grafana-plugins/commit/ece36fe5798873eac971a45b0d104373faf63471))
* **results:** Add Take control for Results Query in Results Variable Editor ([#214](https://github.com/ni/systemlink-grafana-plugins/issues/214)) ([d4dda93](https://github.com/ni/systemlink-grafana-plugins/commit/d4dda936bf36de26c7fe9a4e16c67470aab3e061))

### Bug Fixes

* **products, results:** Refactor Descending control below the Order by ([#218](https://github.com/ni/systemlink-grafana-plugins/issues/218)) ([d644ad6](https://github.com/ni/systemlink-grafana-plugins/commit/d644ad668e84aa08bbc4ea36ef90cf19e885416b))

## [3.88.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.88.0...v3.88.1) (2025-05-26)

### Bug Fixes

* **results:** Label not persisting in Query Builder after selection from dropdown ([#195](https://github.com/ni/systemlink-grafana-plugins/issues/195)) ([ff26625](https://github.com/ni/systemlink-grafana-plugins/commit/ff2662511b2890c860832786bf13404270755013))

## [3.88.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.87.0...v3.88.0) (2025-05-23)

### Features

* **workorders:** Add support to query workorders ([#204](https://github.com/ni/systemlink-grafana-plugins/issues/204)) ([a7a12f5](https://github.com/ni/systemlink-grafana-plugins/commit/a7a12f5e0087f9ffe8ce24927973c7e85f6ba476))

## [3.87.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.86.0...v3.87.0) (2025-05-23)

### Features

* **workorders:** Add support for properties ([#196](https://github.com/ni/systemlink-grafana-plugins/issues/196)) ([021a8f8](https://github.com/ni/systemlink-grafana-plugins/commit/021a8f84bc8c66ec3e14c5fe420673d926a2fa29))

## [3.86.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.85.0...v3.86.0) (2025-05-23)

### Features

* add nimble theming for query builder ([#175](https://github.com/ni/systemlink-grafana-plugins/issues/175)) ([d241e93](https://github.com/ni/systemlink-grafana-plugins/commit/d241e932e71dd88109c4e4be2b1a58b3f764eb84))

## [3.85.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.84.0...v3.85.0) (2025-05-23)

### Features

* **workorders:** Add support to order by and order by descending in work orders datasource ([#198](https://github.com/ni/systemlink-grafana-plugins/issues/198)) ([2eafdf8](https://github.com/ni/systemlink-grafana-plugins/commit/2eafdf8d83b6575f88d2b2a73122defe72bde954))

## [3.84.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.83.0...v3.84.0) (2025-05-23)

### Features

* **results:** Add take control for Steps Query in Results variable query ([#211](https://github.com/ni/systemlink-grafana-plugins/issues/211)) ([7214f9e](https://github.com/ni/systemlink-grafana-plugins/commit/7214f9ea33e844332db86ab4d064a6daa594a95c))

## [3.83.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.82.0...v3.83.0) (2025-05-23)

### Features

* **testplans:** Add variable Query editor ([#203](https://github.com/ni/systemlink-grafana-plugins/issues/203)) ([f00a4fe](https://github.com/ni/systemlink-grafana-plugins/commit/f00a4fe89d0c949110b35e4bd8a0480070d2fe41))

## [3.82.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.81.0...v3.82.0) (2025-05-23)

### Features

* **results:** Add logic to MetricFindQuery for Steps Query in Variable Editor ([#209](https://github.com/ni/systemlink-grafana-plugins/issues/209)) ([7c86540](https://github.com/ni/systemlink-grafana-plugins/commit/7c86540aa9dc7dc70c80b8d151efada85dbec04f))
* Update Date-Time query builder operators to 'isAfter' & 'isBefore' ([#210](https://github.com/ni/systemlink-grafana-plugins/issues/210)) ([d5b8264](https://github.com/ni/systemlink-grafana-plugins/commit/d5b826401d765d26293415ebe19910e391126a29))

## [3.81.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.80.0...v3.81.0) (2025-05-23)

### Features

* **results:** Add steps Query type to Variable Query Editor ([#200](https://github.com/ni/systemlink-grafana-plugins/issues/200)) ([eeb8eb6](https://github.com/ni/systemlink-grafana-plugins/commit/eeb8eb65037fde7d58781c1ca01b5eff383c082a))

## [3.80.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.79.1...v3.80.0) (2025-05-22)

### Features

* **results:**  Conditionally render QueryBy field and adjust label widths ([#202](https://github.com/ni/systemlink-grafana-plugins/issues/202)) ([64bfb10](https://github.com/ni/systemlink-grafana-plugins/commit/64bfb10604a1cf0c73123f4e71a8e48756def751))

## [3.79.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.79.0...v3.79.1) (2025-05-22)

### Bug Fixes

* **results:** Align label widths ([#206](https://github.com/ni/systemlink-grafana-plugins/issues/206)) ([a43d0bc](https://github.com/ni/systemlink-grafana-plugins/commit/a43d0bc4bffae6dadf9205e0d67a8005d222d0aa))

## [3.79.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.78.0...v3.79.0) (2025-05-22)

### Features

* **results:** Implement Query Transformation Logic for Steps Query Builder ([#181](https://github.com/ni/systemlink-grafana-plugins/issues/181)) ([6662454](https://github.com/ni/systemlink-grafana-plugins/commit/66624540eb151cbb653ae558a6e995c45eaab006))

## [3.78.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.77.0...v3.78.0) (2025-05-22)

### Features

* **results:** Add logic to metricFindQuery of results variable query ([#197](https://github.com/ni/systemlink-grafana-plugins/issues/197)) ([ec819f6](https://github.com/ni/systemlink-grafana-plugins/commit/ec819f631ad35969db6d51c1ea15c9eb2d74a764))

## [3.77.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.76.0...v3.77.0) (2025-05-21)

### Features

* **results:** Load PartNumber and Workspace lookups in Variable Editor Query builder ([#193](https://github.com/ni/systemlink-grafana-plugins/issues/193)) ([4e26618](https://github.com/ni/systemlink-grafana-plugins/commit/4e266182eb527d334b52c0fd57caa61752189de5))

## [3.76.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.75.0...v3.76.0) (2025-05-20)

### Features

* **workorders:** add support for output type ([#194](https://github.com/ni/systemlink-grafana-plugins/issues/194)) ([113ee2f](https://github.com/ni/systemlink-grafana-plugins/commit/113ee2f088bea805fd4a6912deae49705344e4c1))

## [3.75.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.74.0...v3.75.0) (2025-05-20)

### Features

* **workorders:** Add dummy workorders query builder ([#189](https://github.com/ni/systemlink-grafana-plugins/issues/189)) ([a03f89b](https://github.com/ni/systemlink-grafana-plugins/commit/a03f89b31b2f00a60f8393d0bc30b763dc4a720d))

## [3.74.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.73.1...v3.74.0) (2025-05-20)

### Features

* **results:** Integrate StepsQueryBuilder in editor ([#178](https://github.com/ni/systemlink-grafana-plugins/issues/178)) ([213e639](https://github.com/ni/systemlink-grafana-plugins/commit/213e63989c2e1b0d60c73077e76cf03256bbfbdd))

## [3.73.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.73.0...v3.73.1) (2025-05-19)

### Bug Fixes

* **products:** Render and run Query on Mount ([#190](https://github.com/ni/systemlink-grafana-plugins/issues/190)) ([8311f85](https://github.com/ni/systemlink-grafana-plugins/commit/8311f856e04c9529ba99e1f6831fe66991bf6469))

## [3.73.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.72.0...v3.73.0) (2025-05-17)

### Features

* add order by and descending controls in test plans data source ([#187](https://github.com/ni/systemlink-grafana-plugins/issues/187)) ([7408090](https://github.com/ni/systemlink-grafana-plugins/commit/7408090939b340ad0e55043d2db109070d2278cf))

## [3.72.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.71.0...v3.72.0) (2025-05-16)

### Features

* Add a wrapper query builder ([#160](https://github.com/ni/systemlink-grafana-plugins/issues/160)) ([12a1877](https://github.com/ni/systemlink-grafana-plugins/commit/12a1877a5462769013f8d57eb4078b1e76e6c141))

## [3.71.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.70.0...v3.71.0) (2025-05-16)

### Features

* **results:** Add variable Query editor template for Results Datasource ([#183](https://github.com/ni/systemlink-grafana-plugins/issues/183)) ([f42879d](https://github.com/ni/systemlink-grafana-plugins/commit/f42879d060f1e7f1d664251feba5a3078ccad7bf))

## [3.70.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.69.0...v3.70.0) (2025-05-16)

### Features

* **results:** Add tooltip for results and steps query builder ([#185](https://github.com/ni/systemlink-grafana-plugins/issues/185)) ([33b0be5](https://github.com/ni/systemlink-grafana-plugins/commit/33b0be5d914c22d8e366622c99ac9f5351fa3011))

## [3.69.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.68.0...v3.69.0) (2025-05-16)

### Features

* add properties to test plans query editor ([#186](https://github.com/ni/systemlink-grafana-plugins/issues/186)) ([3df5d20](https://github.com/ni/systemlink-grafana-plugins/commit/3df5d2051b75d2752b9eae23ade55dc852e3077b))

## [3.68.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.67.0...v3.68.0) (2025-05-13)

### Features

* **results:** Add Step query builder wrapper ([#177](https://github.com/ni/systemlink-grafana-plugins/issues/177)) ([26b6a52](https://github.com/ni/systemlink-grafana-plugins/commit/26b6a521a2cb4b5bfb3dd596ed87b875a95fd5b9))

## [3.67.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.66.1...v3.67.0) (2025-05-13)

### Features

* **results:** Add steps query builder component ([#174](https://github.com/ni/systemlink-grafana-plugins/issues/174)) ([1f79d1b](https://github.com/ni/systemlink-grafana-plugins/commit/1f79d1b0ca7f252f7970c230f970502dda9c0541))

## [3.66.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.66.0...v3.66.1) (2025-05-13)

### Bug Fixes

* **results:** Update keyword filter operations in result query builder ([#179](https://github.com/ni/systemlink-grafana-plugins/issues/179)) ([8981c35](https://github.com/ni/systemlink-grafana-plugins/commit/8981c35d4807053bbea6ab9090ac0752f3b1f893))

## [3.66.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.65.0...v3.66.0) (2025-05-13)

### Features

* **results:** Implement Query Transformation Logic for Results Query Builder ([#166](https://github.com/ni/systemlink-grafana-plugins/issues/166)) ([8a6344b](https://github.com/ni/systemlink-grafana-plugins/commit/8a6344b8849d42b05ef71bc7326a7d070872ac24))

### Bug Fixes

* **results:** Fix Steps Query Builder Field Configurations and Filter Operations for Keywords ([#182](https://github.com/ni/systemlink-grafana-plugins/issues/182)) ([b124073](https://github.com/ni/systemlink-grafana-plugins/commit/b124073c71db98b6baff3c2f7068a68e3983ef53))

## [3.65.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.64.0...v3.65.0) (2025-05-13)

### Features

* add output type to test plans query editor ([#180](https://github.com/ni/systemlink-grafana-plugins/issues/180)) ([e979aeb](https://github.com/ni/systemlink-grafana-plugins/commit/e979aebd7adb99a7a89190e3a5256e866a8b534d))

## [3.64.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.63.0...v3.64.0) (2025-05-13)

### Features

* **results:** Add constants for Steps Query Builder ([#170](https://github.com/ni/systemlink-grafana-plugins/issues/170)) ([708f355](https://github.com/ni/systemlink-grafana-plugins/commit/708f355801c9925b794b484491a5552edc57030b))

## [3.63.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.62.0...v3.63.0) (2025-05-12)

### Features

* **results:** Integrate ResultsQueryBuilder into QueryResultsEditor ([#164](https://github.com/ni/systemlink-grafana-plugins/issues/164)) ([c1293b6](https://github.com/ni/systemlink-grafana-plugins/commit/c1293b612cea5b049bed6440f68f44908956ca4d))

## [3.62.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.61.0...v3.62.0) (2025-05-09)

### Features

* **results:** Add Global Variable Options to ResultsDataSourceBase for Query Builder ([#173](https://github.com/ni/systemlink-grafana-plugins/issues/173)) ([6f73c41](https://github.com/ni/systemlink-grafana-plugins/commit/6f73c41358468983f881bcfa07a39bd9dc2767c1))

## [3.61.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.60.0...v3.61.0) (2025-05-09)

### Features

* **results:** Add Results Query Builder component ([#158](https://github.com/ni/systemlink-grafana-plugins/issues/158)) ([66b41c5](https://github.com/ni/systemlink-grafana-plugins/commit/66b41c585664e45b4f4ed32041d9aafe241b83eb))

## [3.60.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.59.0...v3.60.0) (2025-05-09)

### Features

* **results:** Add workspace and part number caching for results query builder ([#157](https://github.com/ni/systemlink-grafana-plugins/issues/157)) ([db59790](https://github.com/ni/systemlink-grafana-plugins/commit/db59790580332db691eecbe39d852b4091cf3ad4))

## [3.59.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.58.0...v3.59.0) (2025-05-07)

### Features

* **workorders:** Set base for workorders ([#162](https://github.com/ni/systemlink-grafana-plugins/issues/162)) ([3e5464b](https://github.com/ni/systemlink-grafana-plugins/commit/3e5464be8f9597c362c93eb8e489da6ade04f8e4))

## [3.58.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.57.0...v3.58.0) (2025-05-07)

### Features

* **testplans:** Set base for testplans ([#165](https://github.com/ni/systemlink-grafana-plugins/issues/165)) ([c2659f5](https://github.com/ni/systemlink-grafana-plugins/commit/c2659f556e64143c38724f0a83258514185911f4))

## [3.57.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.56.1...v3.57.0) (2025-05-07)

### Features

* **results:** Introduce feature flag toggles for Results and Steps query builders ([#159](https://github.com/ni/systemlink-grafana-plugins/issues/159)) ([6e543ac](https://github.com/ni/systemlink-grafana-plugins/commit/6e543ac9fde4d23d23f8e730ec7f0946ffd28c1d))

## [3.56.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.56.0...v3.56.1) (2025-05-05)

### Bug Fixes

* **data-frame:** Replace Variable support for $__all variable ([#155](https://github.com/ni/systemlink-grafana-plugins/issues/155)) ([9f4a242](https://github.com/ni/systemlink-grafana-plugins/commit/9f4a2421c59934e4dfe1630de03b96c16c1bf468))

## [3.56.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.55.0...v3.56.0) (2025-04-30)

### Features

* **results:** Add Constants for Results Query Builder ([#154](https://github.com/ni/systemlink-grafana-plugins/issues/154)) ([cef3f2c](https://github.com/ni/systemlink-grafana-plugins/commit/cef3f2ca7a1845ad792dd0a3a03836572fa8dfda))

## [3.55.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.54.0...v3.55.0) (2025-04-25)

### Features

* **results:** Add batching functionality for query steps ([#146](https://github.com/ni/systemlink-grafana-plugins/issues/146)) ([2ee3f61](https://github.com/ni/systemlink-grafana-plugins/commit/2ee3f619951e4c4c7f09d1518f789675f708b9a2))

## [3.54.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.53.1...v3.54.0) (2025-04-23)

### Features

* **results:** Add tooltip for QueryStepsEditor and QueryType controls ([#153](https://github.com/ni/systemlink-grafana-plugins/issues/153)) ([e14ff15](https://github.com/ni/systemlink-grafana-plugins/commit/e14ff15fa7fffd29fef31ee294e1fa15f10b1152))

## [3.53.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.53.0...v3.53.1) (2025-04-22)

### Bug Fixes

* **results:** Align label widths for consistency in result query editor ([#147](https://github.com/ni/systemlink-grafana-plugins/issues/147)) ([aff3d45](https://github.com/ni/systemlink-grafana-plugins/commit/aff3d459699587e305c0b935358d63b78dacd917))

## [3.53.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.52.0...v3.53.0) (2025-04-22)

### Features

* **results:** Conditional render of QueryStepsEditor in Results query editor based on queryType ([#152](https://github.com/ni/systemlink-grafana-plugins/issues/152)) ([843dded](https://github.com/ni/systemlink-grafana-plugins/commit/843dded2518b901a777c412d03cc596ca5022e2c))

## [3.52.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.51.0...v3.52.0) (2025-04-22)

### Features

* **results:** Show measurements control in query steps editor ([#151](https://github.com/ni/systemlink-grafana-plugins/issues/151)) ([4194fa0](https://github.com/ni/systemlink-grafana-plugins/commit/4194fa0c2c985fbbd4815d2d3d1ea783b12683c6))

## [3.51.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.50.0...v3.51.0) (2025-04-22)

### Features

* **results:** Add steps query datasource ([#150](https://github.com/ni/systemlink-grafana-plugins/issues/150)) ([8b70786](https://github.com/ni/systemlink-grafana-plugins/commit/8b7078635b9a60d5eeaf58b40b314a8bfd125cf3))

## [3.50.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.49.1...v3.50.0) (2025-04-22)

### Features

* **results:** Add steps query editor component ([#149](https://github.com/ni/systemlink-grafana-plugins/issues/149)) ([1936dcc](https://github.com/ni/systemlink-grafana-plugins/commit/1936dcc37d95ecf6b724cb73569f236db59c3b0c))

## [3.49.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.49.0...v3.49.1) (2025-04-15)

### Bug Fixes

* **results:** Prevent non-numeric input in record count(Take) field ([#141](https://github.com/ni/systemlink-grafana-plugins/issues/141)) ([5ec731e](https://github.com/ni/systemlink-grafana-plugins/commit/5ec731e1114579fb3f5ce898286463fa83dc14de))

## [3.49.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.48.1...v3.49.0) (2025-04-11)

### Features

* **results:** Create base datasource for results ([#136](https://github.com/ni/systemlink-grafana-plugins/issues/136)) ([578d378](https://github.com/ni/systemlink-grafana-plugins/commit/578d378f92802e1f0b6dfdbab47eb5d5c5b99951))

## [3.48.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.48.0...v3.48.1) (2025-02-28)

### Bug Fixes

* **products:** Enhance tooltips and documentation ([#134](https://github.com/ni/systemlink-grafana-plugins/issues/134)) ([427aae6](https://github.com/ni/systemlink-grafana-plugins/commit/427aae6010ae51076366a50be479d7266b65db34))

## [3.48.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.47.3...v3.48.0) (2025-02-27)

### Features

* **assets:** add part number filtering ([#132](https://github.com/ni/systemlink-grafana-plugins/issues/132)) ([e0c034c](https://github.com/ni/systemlink-grafana-plugins/commit/e0c034cf256bcc85bd79f4fcb2471bc3ec538588))

### Bug Fixes

* **products:** Enclose filter conditions in parentheses for grouping ([#133](https://github.com/ni/systemlink-grafana-plugins/issues/133)) ([62d63c0](https://github.com/ni/systemlink-grafana-plugins/commit/62d63c0e030b3b0aaeeef209814691403ef279d6))

## [3.47.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.47.2...v3.47.3) (2025-02-20)

### Bug Fixes

* **products:** Enhance metricFindQuery to support multiple values ([0d74870](https://github.com/ni/systemlink-grafana-plugins/commit/0d74870762453b466e62b1d1613d50be4da6c559))
* **products:** Improve error handling in product queries ([#129](https://github.com/ni/systemlink-grafana-plugins/issues/129)) ([492273f](https://github.com/ni/systemlink-grafana-plugins/commit/492273fe1656f376d38b59d0402c844c49044898))
* **products:** Prevent non-numeric input in record count field ([#130](https://github.com/ni/systemlink-grafana-plugins/issues/130)) ([9521952](https://github.com/ni/systemlink-grafana-plugins/commit/9521952a7e23208f90f5325ea7de8effb2009d29))

## [3.47.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.47.1...v3.47.2) (2025-02-18)

### Bug Fixes

* **products:** Add workspace id to name conversion in query response ([#127](https://github.com/ni/systemlink-grafana-plugins/issues/127)) ([73af0cb](https://github.com/ni/systemlink-grafana-plugins/commit/73af0cbe894bb467d46092cc00002fd539ca21f1))

## [3.47.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.47.0...v3.47.1) (2025-02-17)

### Bug Fixes

* **products:** Change the variable query output format ([#126](https://github.com/ni/systemlink-grafana-plugins/issues/126)) ([331b6e5](https://github.com/ni/systemlink-grafana-plugins/commit/331b6e529b428022c6986c09e27be0075e2314c2))

## [3.47.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.46.3...v3.47.0) (2025-02-17)

### Features

* **products:** Add Family name lookup into the query builder  ([#125](https://github.com/ni/systemlink-grafana-plugins/issues/125)) ([ba1768c](https://github.com/ni/systemlink-grafana-plugins/commit/ba1768cf3fc5d2235daa365fec0a4a3b68ce444f))

## [3.46.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.46.2...v3.46.3) (2025-02-12)

### Bug Fixes

* **products:** Set defaults for OrderBy and Decending ([#124](https://github.com/ni/systemlink-grafana-plugins/issues/124)) ([1373424](https://github.com/ni/systemlink-grafana-plugins/commit/137342460e36a087cd5efa6a7fb0f03f0c80798b))

## [3.46.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.46.1...v3.46.2) (2025-02-10)

### Bug Fixes

* **assets:** fix display for assets in global variable ([#123](https://github.com/ni/systemlink-grafana-plugins/issues/123)) ([7408f7e](https://github.com/ni/systemlink-grafana-plugins/commit/7408f7e482f8e036339bae0d1a7ff27984ae92c5))

## [3.46.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.46.0...v3.46.1) (2025-02-06)

### Bug Fixes

* **products:** Fix query builder css rendering and minor UI improvements ([#122](https://github.com/ni/systemlink-grafana-plugins/issues/122)) ([7e4441b](https://github.com/ni/systemlink-grafana-plugins/commit/7e4441b990d7bf9e21f3ec55c3569e01f2c27485))

## [3.46.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.45.0...v3.46.0) (2025-02-06)

### Features

* **results:** Add Test Results datasource and its query editor ([#117](https://github.com/ni/systemlink-grafana-plugins/issues/117)) ([4c4a072](https://github.com/ni/systemlink-grafana-plugins/commit/4c4a072faff923b6cbf40395645eecdbcb7c1a4e))

## [3.45.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.44.1...v3.45.0) (2025-02-04)

### Features

* **products:** Add Variable query editor to products datasource ([#119](https://github.com/ni/systemlink-grafana-plugins/issues/119)) ([64d64f0](https://github.com/ni/systemlink-grafana-plugins/commit/64d64f03c4e53501620bd0ddfb6e7d158f15c0b6))

## [3.44.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.44.0...v3.44.1) (2025-02-03)

### Bug Fixes

* **products:** Add query help and update label name in the products datasource ([#120](https://github.com/ni/systemlink-grafana-plugins/issues/120)) ([7c1be3a](https://github.com/ni/systemlink-grafana-plugins/commit/7c1be3a9a88f3ac2d9e17fadfbec81b15074b54b))

## [3.44.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.7...v3.44.0) (2025-01-24)

### Features

* **products:** Add Products datatsource ([#115](https://github.com/ni/systemlink-grafana-plugins/issues/115)) ([fae0b39](https://github.com/ni/systemlink-grafana-plugins/commit/fae0b3966fdd8fdf6aa1bc96357d6d0ec73bef7d))

## [3.43.7](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.6...v3.43.7) (2024-12-03)

### Bug Fixes

* **assets:** addressing feedback for naming the assets ([#114](https://github.com/ni/systemlink-grafana-plugins/issues/114)) ([5b0bd98](https://github.com/ni/systemlink-grafana-plugins/commit/5b0bd987dffadbe6fe2ef7349d3a9fc9fa72d87b))

## [3.43.6](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.5...v3.43.6) (2024-11-25)

### Bug Fixes

* **assets:** updating visualization for the asset display name in global variable ([#113](https://github.com/ni/systemlink-grafana-plugins/issues/113)) ([24f3ec9](https://github.com/ni/systemlink-grafana-plugins/commit/24f3ec91d29bae4277474f759d277ba7819d5628))

## [3.43.5](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.4...v3.43.5) (2024-11-14)

### Bug Fixes

* **asset:** calibration forecast timezone issues on datalinks ([#111](https://github.com/ni/systemlink-grafana-plugins/issues/111)) ([f5209e8](https://github.com/ni/systemlink-grafana-plugins/commit/f5209e80fcc8a1335589c6f9d5dec0f742dd17ab))

## [3.43.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.3...v3.43.4) (2024-11-06)

### Bug Fixes

* **notebook:** fix input sanitization for notebook query builder ([#110](https://github.com/ni/systemlink-grafana-plugins/issues/110)) ([b0406c3](https://github.com/ni/systemlink-grafana-plugins/commit/b0406c36a68bae1cdfdfcbb538ac1278b6c505f0))

## [3.43.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.2...v3.43.3) (2024-10-30)

### Bug Fixes

* **asset:** fix data link construction ([#109](https://github.com/ni/systemlink-grafana-plugins/issues/109)) ([55cca79](https://github.com/ni/systemlink-grafana-plugins/commit/55cca7983d3a702c40a2409aa3419b55f769c6ad))

## [3.43.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.1...v3.43.2) (2024-10-30)

### Bug Fixes

* **asset:** fix assets input sanitization for query builders ([#105](https://github.com/ni/systemlink-grafana-plugins/issues/105)) ([05cf5c0](https://github.com/ni/systemlink-grafana-plugins/commit/05cf5c0e3d0796887de66693d0f4362e3cfd1784))

## [3.43.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.43.0...v3.43.1) (2024-10-29)

### Bug Fixes

* **asset:** data link creation on deployed envs ([#108](https://github.com/ni/systemlink-grafana-plugins/issues/108)) ([11125b3](https://github.com/ni/systemlink-grafana-plugins/commit/11125b363aa5dc47b54f4b41c14ff879988f714e))

## [3.43.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.42.0...v3.43.0) (2024-10-29)

### Features

* **asset:** compute "Now" in a way that can be saved ([#107](https://github.com/ni/systemlink-grafana-plugins/issues/107)) ([728d47f](https://github.com/ni/systemlink-grafana-plugins/commit/728d47f7a7f3e957ab0de1e8572dd4ad3afd0f42))

## [3.42.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.41.0...v3.42.0) (2024-10-25)

### Features

* **asset:** more friendly options for calibration due date and add new option ([#106](https://github.com/ni/systemlink-grafana-plugins/issues/106)) ([48fa51c](https://github.com/ni/systemlink-grafana-plugins/commit/48fa51cf332600cdbf718aa3e73d757852a20e5c))

## [3.41.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.40.1...v3.41.0) (2024-10-25)

### Features

* **asset:** remove includeOnlyDataInTimeRange query param, default true ([#104](https://github.com/ni/systemlink-grafana-plugins/issues/104)) ([29e9eea](https://github.com/ni/systemlink-grafana-plugins/commit/29e9eea9946303e387fd08f06ecb26deb5c79f57))

## [3.40.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.40.0...v3.40.1) (2024-10-25)

### Bug Fixes

* **asset:** fix data link on deployed env ([#103](https://github.com/ni/systemlink-grafana-plugins/issues/103)) ([f1e4cd2](https://github.com/ni/systemlink-grafana-plugins/commit/f1e4cd2bf29f964ca7f100a7d4fbf7e86c879e4a))

## [3.40.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.39.0...v3.40.0) (2024-10-24)

### Features

* **asset:** add resolved due date filter for list assets ([#102](https://github.com/ni/systemlink-grafana-plugins/issues/102)) ([d4ad953](https://github.com/ni/systemlink-grafana-plugins/commit/d4ad953970721f1a32c0c944fa1f6c96dae39914))

## [3.39.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.38.0...v3.39.0) (2024-10-24)

### Features

* **asset:** add location column to list assets ([#101](https://github.com/ni/systemlink-grafana-plugins/issues/101)) ([de0a6b4](https://github.com/ni/systemlink-grafana-plugins/commit/de0a6b4b4e37578e1833e8fe0785a5c9dc16f591))

## [3.38.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.37.0...v3.38.0) (2024-10-24)

### Features

* **asset:** add more options to list assets query builder ([#99](https://github.com/ni/systemlink-grafana-plugins/issues/99)) ([f5705a1](https://github.com/ni/systemlink-grafana-plugins/commit/f5705a176cb22493a33f6d142681aa644ccb722c))

## [3.37.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.36.0...v3.37.0) (2024-10-24)

### Features

* **asset:** added support for IncludeOnlyDataInTimeRange ([#96](https://github.com/ni/systemlink-grafana-plugins/issues/96)) ([2f49843](https://github.com/ni/systemlink-grafana-plugins/commit/2f498437433a78703f6a55382c3c87d4339b7593))

## [3.36.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.35.0...v3.36.0) (2024-10-23)

### Features

* **asset:** add calibration due date column ([#100](https://github.com/ni/systemlink-grafana-plugins/issues/100)) ([c35ef78](https://github.com/ni/systemlink-grafana-plugins/commit/c35ef7879d9bec80b1eec7fa7d70271db416bd62))

## [3.35.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.34.1...v3.35.0) (2024-10-22)

### Features

* **asset:** time based data links ([#93](https://github.com/ni/systemlink-grafana-plugins/issues/93)) ([fc95303](https://github.com/ni/systemlink-grafana-plugins/commit/fc95303aba264c2025dac604e41330a7e4a9ba71))

## [3.34.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.34.0...v3.34.1) (2024-10-22)

### Bug Fixes

* **asset:** fix empty string error on Linq filter for assets ([#98](https://github.com/ni/systemlink-grafana-plugins/issues/98)) ([35a1ad7](https://github.com/ni/systemlink-grafana-plugins/commit/35a1ad7be37449178280b4ad94a2c540d6406c01))

## [3.34.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.33.0...v3.34.0) (2024-10-21)

### Features

* **asset:** avoid side effects on field constants ([#95](https://github.com/ni/systemlink-grafana-plugins/issues/95)) ([ab60877](https://github.com/ni/systemlink-grafana-plugins/commit/ab6087735e2f623296a83134c0403aab85407644))

## [3.33.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.32.0...v3.33.0) (2024-10-18)

### Features

* **asset:** change query types for assets ([#94](https://github.com/ni/systemlink-grafana-plugins/issues/94)) ([184ebeb](https://github.com/ni/systemlink-grafana-plugins/commit/184ebeb93ba4f94234a5c543ebced70d74061422))

## [3.32.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.31.0...v3.32.0) (2024-10-17)

### Features

* **asset:** add asset variable query with query builder ([#90](https://github.com/ni/systemlink-grafana-plugins/issues/90)) ([4de79ff](https://github.com/ni/systemlink-grafana-plugins/commit/4de79ff716ce20059502ae8dab946e756d0120f7))

## [3.31.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.30.0...v3.31.0) (2024-10-17)

### Features

* **tag:** add multi value variable support  ([#89](https://github.com/ni/systemlink-grafana-plugins/issues/89)) ([ee422d8](https://github.com/ni/systemlink-grafana-plugins/commit/ee422d863727607318e55253c6eeb9fc037e531a))

## [3.30.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.29.0...v3.30.0) (2024-10-17)

### Features

* **asset:**  add global variables as options ([#92](https://github.com/ni/systemlink-grafana-plugins/issues/92)) ([70f8c7a](https://github.com/ni/systemlink-grafana-plugins/commit/70f8c7a30cb53d57f782fbe36575000059d53079))

## [3.29.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.28.0...v3.29.0) (2024-10-17)

### Features

* **asset:** add support for grafana variables for list assets ([#91](https://github.com/ni/systemlink-grafana-plugins/issues/91)) ([0cdc52e](https://github.com/ni/systemlink-grafana-plugins/commit/0cdc52eacae0960ccabf691738211777ef1aaa9a))

## [3.28.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.27.0...v3.28.0) (2024-10-17)

### Features

* **asset:** merge asset & asset-calibration plugins ([#88](https://github.com/ni/systemlink-grafana-plugins/issues/88)) ([b327c8c](https://github.com/ni/systemlink-grafana-plugins/commit/b327c8c418e213516998bc17b500b1bc61739267))

## [3.27.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.26.0...v3.27.0) (2024-10-17)

### Features

* **asset:** load dependencies only once, change ttlcache to map ([#81](https://github.com/ni/systemlink-grafana-plugins/issues/81)) ([d17bfa1](https://github.com/ni/systemlink-grafana-plugins/commit/d17bfa1789c7f0cb571bef423cda81bf54cac1d7))

## [3.26.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.25.0...v3.26.0) (2024-10-15)

### Features

* **asset:** query builder for list assets ([#85](https://github.com/ni/systemlink-grafana-plugins/issues/85)) ([1a9e939](https://github.com/ni/systemlink-grafana-plugins/commit/1a9e9391cebb6442d9f50d05c3819a7483f84fcf))

## [3.25.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.24.0...v3.25.0) (2024-10-15)

### Features

* **asset:** fix [object Object] error message ([#86](https://github.com/ni/systemlink-grafana-plugins/issues/86)) ([ef9eaaf](https://github.com/ni/systemlink-grafana-plugins/commit/ef9eaafd60230781f8c6d4cdb11b5c61758d088d))

## [3.24.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.23.0...v3.24.0) (2024-10-15)

### Features

* **assets:** fix explorer rendering for assets plugin ([#87](https://github.com/ni/systemlink-grafana-plugins/issues/87)) ([54d9ade](https://github.com/ni/systemlink-grafana-plugins/commit/54d9adec97c6e25a5d083f1a707d2b027273e80f))

## [3.23.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.22.0...v3.23.0) (2024-10-15)

### Features

* **asset:** add group by vendor, assetType, busType ([#84](https://github.com/ni/systemlink-grafana-plugins/issues/84)) ([0e30e6a](https://github.com/ni/systemlink-grafana-plugins/commit/0e30e6afb43be0eb63185b6e67773574382dd0a2))

## [3.22.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.21.0...v3.22.0) (2024-10-15)

### Features

* **asset:** multiple values from global vals filter support ([#80](https://github.com/ni/systemlink-grafana-plugins/issues/80)) ([a710a2e](https://github.com/ni/systemlink-grafana-plugins/commit/a710a2ee408a403fc8422f2054c7f9de15438a5f))

## [3.21.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.20.0...v3.21.0) (2024-10-14)

### Features

* **asset:** add feature flag support ([#79](https://github.com/ni/systemlink-grafana-plugins/issues/79)) ([de4ee90](https://github.com/ni/systemlink-grafana-plugins/commit/de4ee905a94cbc96beabf3a45e93f4b58db3e1e7))

## [3.20.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.19.0...v3.20.0) (2024-10-14)

### Features

* **asset:** Validate calibration forecast interval ([#82](https://github.com/ni/systemlink-grafana-plugins/issues/82)) ([57b8ebd](https://github.com/ni/systemlink-grafana-plugins/commit/57b8ebd2c4918ac0a5d5d77fafc7b4e5f956661e))

## [3.19.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.18.0...v3.19.0) (2024-10-10)

### Features

* **asset-calibration:** workspace grouping ([#77](https://github.com/ni/systemlink-grafana-plugins/issues/77)) ([045b0ea](https://github.com/ni/systemlink-grafana-plugins/commit/045b0ea1aa4b4fa57ca287401f5d217782763403))

## [3.18.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.17.0...v3.18.0) (2024-10-07)

### Features

* **asset-calibration:** added systems as dropdown values for location ([#76](https://github.com/ni/systemlink-grafana-plugins/issues/76)) ([5f74d39](https://github.com/ni/systemlink-grafana-plugins/commit/5f74d39b26c96c49350433627a2cd23ae503a53c))

## [3.17.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.16.0...v3.17.0) (2024-10-07)

### Features

* **asset:** Add query type to asset plugin ([#75](https://github.com/ni/systemlink-grafana-plugins/issues/75)) ([64e52ff](https://github.com/ni/systemlink-grafana-plugins/commit/64e52ff4440583ebd6aa5ec88871755fb5248933))

## [3.16.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.15.0...v3.16.0) (2024-10-03)


### Features

* **asset:** resolve minion id ([#73](https://github.com/ni/systemlink-grafana-plugins/issues/73)) ([75972dd](https://github.com/ni/systemlink-grafana-plugins/commit/75972dda72cb6370032a130a1c3d59cf2bc53ecf))

## [3.15.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.14.1...v3.15.0) (2024-10-02)


### Features

* **asset:** Added calibration forecast query builder ([#69](https://github.com/ni/systemlink-grafana-plugins/issues/69)) ([99f2fff](https://github.com/ni/systemlink-grafana-plugins/commit/99f2fff82c10c8567b3056d8035712a0e4c309d6))

## [3.14.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.14.0...v3.14.1) (2024-10-02)


### Bug Fixes

* **notebook:** More specific error in query inspector ([#72](https://github.com/ni/systemlink-grafana-plugins/issues/72)) ([90bb8e9](https://github.com/ni/systemlink-grafana-plugins/commit/90bb8e9055fdfac08aa9c7b153d20c83ae7be903))

## [3.14.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.13.0...v3.14.0) (2024-09-24)


### Features

* **asset:** add calibration forecast property only row formatting ([#68](https://github.com/ni/systemlink-grafana-plugins/issues/68)) ([162d782](https://github.com/ni/systemlink-grafana-plugins/commit/162d7826c9219ccfc1fc807aae2a61ea0b6b031d))

## [3.13.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.12.1...v3.13.0) (2024-09-11)


### Features

* **tag:** visualize history of multiple tags ([#60](https://github.com/ni/systemlink-grafana-plugins/issues/60)) ([5826522](https://github.com/ni/systemlink-grafana-plugins/commit/5826522ef3bb59ff01162cb6c20eca50fe9a00e9))

## [3.12.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.12.0...v3.12.1) (2024-09-09)


### Bug Fixes

* **assets:** split asset utilization plugin code from asset calibration plugin code ([#65](https://github.com/ni/systemlink-grafana-plugins/issues/65)) ([2c99c56](https://github.com/ni/systemlink-grafana-plugins/commit/2c99c56cc4a77fcb2c537c0ce47868e8c18723dd))

## [3.12.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.11.0...v3.12.0) (2024-08-28)


### Features

* **asset:** add the query type and group by buttons for calibration forecast ([#64](https://github.com/ni/systemlink-grafana-plugins/issues/64)) ([7ab470b](https://github.com/ni/systemlink-grafana-plugins/commit/7ab470b2c888c72ea65bfc1bf9243ede7ed2a55f))

## [3.11.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.10.1...v3.11.0) (2024-07-16)


### Features

* **asset:** add asset data source ([#62](https://github.com/ni/systemlink-grafana-plugins/issues/62)) ([b641456](https://github.com/ni/systemlink-grafana-plugins/commit/b64145685e14f22c1db8ef27a67e70d228a544a6))

## [3.10.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.10.0...v3.10.1) (2024-05-29)


### Bug Fixes

* **notebook:** fix notebook plugin not loading notebook parameters when opening visualization ([#61](https://github.com/ni/systemlink-grafana-plugins/issues/61)) ([c81d963](https://github.com/ni/systemlink-grafana-plugins/commit/c81d96336e48e17c798317a10e5c567baabac4e0))

## [3.10.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.9.2...v3.10.0) (2024-05-07)


### Features

* **tag:** visualizing current value of multiple tags ([#58](https://github.com/ni/systemlink-grafana-plugins/issues/58)) ([9ac340a](https://github.com/ni/systemlink-grafana-plugins/commit/9ac340acf493220008382653cac3c7df08ef4bd3))

## [3.9.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.9.1...v3.9.2) (2024-01-04)


### Bug Fixes

* **system:** Run query on initial load ([#55](https://github.com/ni/systemlink-grafana-plugins/issues/55)) ([0f8ec32](https://github.com/ni/systemlink-grafana-plugins/commit/0f8ec324dd18eafdd339a37433188ae509804db6))

## [3.9.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.9.0...v3.9.1) (2023-11-06)


### Bug Fixes

* **dataframe:** switch orientation of metadata frame ([#51](https://github.com/ni/systemlink-grafana-plugins/issues/51)) ([bd9a0b9](https://github.com/ni/systemlink-grafana-plugins/commit/bd9a0b9490af62213f13e33631dde9a257645780))

## [3.9.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.8.0...v3.9.0) (2023-11-03)


### Features

* **dataframe:** Column variable support ([#50](https://github.com/ni/systemlink-grafana-plugins/issues/50)) ([db00fa6](https://github.com/ni/systemlink-grafana-plugins/commit/db00fa670928dda01562d645b21a4da582c9d188))

## [3.8.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.7.4...v3.8.0) (2023-11-01)


### Features

* **dataframe:** visualize table properties ([#49](https://github.com/ni/systemlink-grafana-plugins/issues/49)) ([8006749](https://github.com/ni/systemlink-grafana-plugins/commit/80067499e4b5cffdd895ec7c03f4cc97157ac4f2))

## [3.7.4](https://github.com/ni/systemlink-grafana-plugins/compare/v3.7.3...v3.7.4) (2023-10-24)


### Bug Fixes

* **tag:** support `datatype` and `type` properties ([#48](https://github.com/ni/systemlink-grafana-plugins/issues/48)) ([0004773](https://github.com/ni/systemlink-grafana-plugins/commit/00047738960b535efa2ca1280f7079f59090a720))

## [3.7.3](https://github.com/ni/systemlink-grafana-plugins/compare/v3.7.2...v3.7.3) (2023-10-24)


### Bug Fixes

* **data-frame:** Boolean and "Value" columns ([#46](https://github.com/ni/systemlink-grafana-plugins/issues/46)) ([941dce3](https://github.com/ni/systemlink-grafana-plugins/commit/941dce3782dbeaa6cc0e30eb39504b4b45717efc))

## [3.7.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.7.1...v3.7.2) (2023-10-18)


### Bug Fixes

* **tag:** support both `workspace` and `workspace_id` properties ([#47](https://github.com/ni/systemlink-grafana-plugins/issues/47)) ([67dc4ed](https://github.com/ni/systemlink-grafana-plugins/commit/67dc4ed1af3444975aee17ed1741fdbe0377414c))

## [3.7.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.7.0...v3.7.1) (2023-10-18)


### Bug Fixes

* **tag:** Update tag fields to camel case ([#45](https://github.com/ni/systemlink-grafana-plugins/issues/45)) ([2e15cd1](https://github.com/ni/systemlink-grafana-plugins/commit/2e15cd179f8d3fe661a54c8e93f42e4ec9c61c6d))

## [3.7.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.6.0...v3.7.0) (2023-10-09)


### Features

* **system:** Filter system metadata by workspace and variable chaining ([#43](https://github.com/ni/systemlink-grafana-plugins/issues/43)) ([14de6ed](https://github.com/ni/systemlink-grafana-plugins/commit/14de6ed4e85a7a58d8315155a381e1ee1a51f405))

## [3.6.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.5.0...v3.6.0) (2023-10-06)


### Features

* **tag:** include properties in query result ([#42](https://github.com/ni/systemlink-grafana-plugins/issues/42)) ([0ffc1e2](https://github.com/ni/systemlink-grafana-plugins/commit/0ffc1e2541d10716551ec42648974c2149298655))

## [3.5.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.4.0...v3.5.0) (2023-10-05)


### Features

* **tag:** Workspace variable resolution ([#41](https://github.com/ni/systemlink-grafana-plugins/issues/41)) ([f4fe35a](https://github.com/ni/systemlink-grafana-plugins/commit/f4fe35aeb760f2dc45ada144ac25e53b87963a56))

## [3.4.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.3.0...v3.4.0) (2023-10-03)


### Features

* **workspace:** Workspace data source returns workspaces ([#38](https://github.com/ni/systemlink-grafana-plugins/issues/38)) ([a8877ba](https://github.com/ni/systemlink-grafana-plugins/commit/a8877ba22deef270d0eb8df874739eb650bfd121))

## [3.3.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.2.1...v3.3.0) (2023-09-28)


### Features

* **data-frame:** Data Frame data source displays associated Workspace ([#40](https://github.com/ni/systemlink-grafana-plugins/issues/40)) ([7dfc0c5](https://github.com/ni/systemlink-grafana-plugins/commit/7dfc0c5c011f0fbaa154e1a7cbc6eb7a1ea6e35a))

## [3.2.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.2.0...v3.2.1) (2023-09-26)


### Bug Fixes

* **system:** improve query help docs ([#39](https://github.com/ni/systemlink-grafana-plugins/issues/39)) ([49487f0](https://github.com/ni/systemlink-grafana-plugins/commit/49487f04743f181b4b3fa49b25a4f96cc926962b))

## [3.2.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.1.1...v3.2.0) (2023-09-25)


### Features

* **system:** filter query variable by workspace ([#35](https://github.com/ni/systemlink-grafana-plugins/issues/35)) ([08de856](https://github.com/ni/systemlink-grafana-plugins/commit/08de856c677f959869360caa751c1d89f7ac4888))
* **workspace:** Add skeleton workspace data source ([#36](https://github.com/ni/systemlink-grafana-plugins/issues/36)) ([1ff0282](https://github.com/ni/systemlink-grafana-plugins/commit/1ff0282af4ced0bbc87ddbf2a1f9bbd89cfdf49d))

## [3.1.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.1.0...v3.1.1) (2023-09-18)


### Bug Fixes

* **tag:** convert strings to numbers for tag current value ([#31](https://github.com/ni/systemlink-grafana-plugins/issues/31)) ([f0d2685](https://github.com/ni/systemlink-grafana-plugins/commit/f0d26854046c5464b76973f45a2bee68119e63f4))

## [3.1.0](https://github.com/ni/systemlink-grafana-plugins/compare/v3.0.2...v3.1.0) (2023-09-15)


### Features

* **tag:** retry requests for 429 error ([#30](https://github.com/ni/systemlink-grafana-plugins/issues/30)) ([48f664c](https://github.com/ni/systemlink-grafana-plugins/commit/48f664c37a6b16124c5cf2cb3a3b17f1d82dce7b))

## [3.0.2](https://github.com/ni/systemlink-grafana-plugins/compare/v3.0.1...v3.0.2) (2023-09-12)


### Bug Fixes

* **tag:** crash when visualizing tag with no value ([#29](https://github.com/ni/systemlink-grafana-plugins/issues/29)) ([81aa28e](https://github.com/ni/systemlink-grafana-plugins/commit/81aa28eecceefd0bfe98e7dd74fe8e323cbf7158))

## [3.0.1](https://github.com/ni/systemlink-grafana-plugins/compare/v3.0.0...v3.0.1) (2023-09-12)


### Bug Fixes

* **tag:** set max width for tag path input ([#28](https://github.com/ni/systemlink-grafana-plugins/issues/28)) ([7c1ca49](https://github.com/ni/systemlink-grafana-plugins/commit/7c1ca49b3c4325a92cee656858e8705f46ffde6f))

## [3.0.0](https://github.com/ni/systemlink-grafana-plugins/compare/v2.2.1...v3.0.0) (2023-09-12)


### ⚠ BREAKING CHANGES

* **tag:** use tag name instead of 'value' for field name (#27)

### Bug Fixes

* **tag:** use tag name instead of 'value' for field name ([#27](https://github.com/ni/systemlink-grafana-plugins/issues/27)) ([44566ca](https://github.com/ni/systemlink-grafana-plugins/commit/44566ca7fdd0783ba72323d94ac3aa2a1b6d3186))

## [2.2.1](https://github.com/ni/systemlink-grafana-plugins/compare/v2.2.0...v2.2.1) (2023-09-11)

# [2.2.0](https://github.com/ni/systemlink-grafana-plugins/compare/v2.1.1...v2.2.0) (2023-09-06)


### Features

* **tag:** add user-friendly workspace dropdown ([#25](https://github.com/ni/systemlink-grafana-plugins/issues/25)) ([3f56d62](https://github.com/ni/systemlink-grafana-plugins/commit/3f56d62f7655aa3f55cfa8f4b94669f1388edd67))

## [2.1.1](https://github.com/ni/systemlink-grafana-plugins/compare/v2.1.0...v2.1.1) (2023-08-30)


### Bug Fixes

* **tag:** don't error on null properties ([#24](https://github.com/ni/systemlink-grafana-plugins/issues/24)) ([6431586](https://github.com/ni/systemlink-grafana-plugins/commit/64315869fb247d1386b70a578ca0190d1d71c2ad))

# [2.1.0](https://github.com/ni/systemlink-grafana-plugins/compare/v2.0.0...v2.1.0) (2023-08-22)


### Features

* **tag:** add query help documentation ([#23](https://github.com/ni/systemlink-grafana-plugins/issues/23)) ([f8ff3d2](https://github.com/ni/systemlink-grafana-plugins/commit/f8ff3d2b49505ee65fd883a4c111564689df116f))

# [2.0.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.13.0...v2.0.0) (2023-08-18)


### chore

* remove tag prototype ([#22](https://github.com/ni/systemlink-grafana-plugins/issues/22)) ([c223329](https://github.com/ni/systemlink-grafana-plugins/commit/c22332976961f5614adaf83b8af876537e7ba405))


### BREAKING CHANGES

* replace `ni-sltag-datasource` prototype with new version.
Saved queries will not be backwards compatible.

# [1.13.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.12.0...v1.13.0) (2023-08-18)


### Features

* **tag:** add support for explicit workspace ([#21](https://github.com/ni/systemlink-grafana-plugins/issues/21)) ([e037cb3](https://github.com/ni/systemlink-grafana-plugins/commit/e037cb3ab0fe7fed1a3849a95756c1ce5cf2a186))

# [1.12.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.11.0...v1.12.0) (2023-08-17)


### Features

* **tag:** add support for tag path as variable ([#19](https://github.com/ni/systemlink-grafana-plugins/issues/19)) ([97e22f9](https://github.com/ni/systemlink-grafana-plugins/commit/97e22f997b038543a91adc73007b9170517e6264))

# [1.11.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.10.1...v1.11.0) (2023-08-17)


### Features

* **tag:** add support for history queries ([#18](https://github.com/ni/systemlink-grafana-plugins/issues/18)) ([aafd782](https://github.com/ni/systemlink-grafana-plugins/commit/aafd78214210d35f90a0a85e2e22c6fbee0e2a84))

## [1.10.1](https://github.com/ni/systemlink-grafana-plugins/compare/v1.10.0...v1.10.1) (2023-08-16)


### Bug Fixes

* Revert Data Frame data source rename ([#17](https://github.com/ni/systemlink-grafana-plugins/issues/17)) ([ba07c95](https://github.com/ni/systemlink-grafana-plugins/commit/ba07c95b819f7b62c1c101688f76aa5a1256ab2b))

# [1.10.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.9.1...v1.10.0) (2023-08-14)


### Features

* **tag:** tag current value queries ([#16](https://github.com/ni/systemlink-grafana-plugins/issues/16)) ([8360234](https://github.com/ni/systemlink-grafana-plugins/commit/836023440005536fd45de1e7c5e322b0950c3354))

## [1.9.1](https://github.com/ni/systemlink-grafana-plugins/compare/v1.9.0...v1.9.1) (2023-08-14)


### Bug Fixes

* Rename Data Table data source ([#15](https://github.com/ni/systemlink-grafana-plugins/issues/15)) ([d0926ce](https://github.com/ni/systemlink-grafana-plugins/commit/d0926ce4a584658968e38c69a9884482585b1be9))

# [1.9.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.8.0...v1.9.0) (2023-08-11)


### Features

* display workspace alias instead of workspace ID ([#13](https://github.com/ni/systemlink-grafana-plugins/issues/13)) ([869b01c](https://github.com/ni/systemlink-grafana-plugins/commit/869b01ca68e2668c989483b0407bed0fab50062e))

# [1.8.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.7.0...v1.8.0) (2023-08-11)


### Features

* implement metricFindQuery  ([#11](https://github.com/ni/systemlink-grafana-plugins/issues/11)) ([a5abed2](https://github.com/ni/systemlink-grafana-plugins/commit/a5abed209d0c18d730a02e02fc269cc7ac3d1368))

# [1.7.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.6.1...v1.7.0) (2023-08-01)


### Features

* display system metadata ([#7](https://github.com/ni/systemlink-grafana-plugins/issues/7)) ([fa5c1f5](https://github.com/ni/systemlink-grafana-plugins/commit/fa5c1f50218449596c545a11362578df3fa303cc))

## [1.6.1](https://github.com/ni/systemlink-grafana-plugins/compare/v1.6.0...v1.6.1) (2023-07-31)


### Bug Fixes

* duplicate tag plugin.json ids ([ac54798](https://github.com/ni/systemlink-grafana-plugins/commit/ac54798dc88c3d8d5e29268e54cd76ba1434a090))

# [1.6.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.5.0...v1.6.0) (2023-07-26)


### Features

* display system status counts ([#6](https://github.com/ni/systemlink-grafana-plugins/issues/6)) ([285b8b2](https://github.com/ni/systemlink-grafana-plugins/commit/285b8b23d180d54fbcce90a7cc50536a3d3c07c5))

# [1.5.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.4.1...v1.5.0) (2023-07-21)


### Features

* implement testDatasource method for systems data source ([#4](https://github.com/ni/systemlink-grafana-plugins/issues/4)) ([b5a9726](https://github.com/ni/systemlink-grafana-plugins/commit/b5a97267200d7354facd32007e5f2a638e4699d4))

## [1.4.1](https://github.com/ni/systemlink-grafana-plugins/compare/v1.4.0...v1.4.1) (2023-07-20)


### Bug Fixes

* Broken and missing plugin defintions ([71ef81e](https://github.com/ni/systemlink-grafana-plugins/commit/71ef81e0ed06cb1682e9981a5e08f421535e05a9))

# [1.4.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.3.0...v1.4.0) (2023-07-20)


### Features

* Add plotly panel ([cdd14a0](https://github.com/ni/systemlink-grafana-plugins/commit/cdd14a0fd12289599c069bdf5653299be6a27d30))

# [1.3.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.2.0...v1.3.0) (2023-07-19)


### Features

* Add notebook data source ([905955a](https://github.com/ni/systemlink-grafana-plugins/commit/905955ab925903b9f0101cc857425af24e1c5945))

# [1.2.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.1.0...v1.2.0) (2023-07-19)


### Features

* Systems data source template ([#3](https://github.com/ni/systemlink-grafana-plugins/issues/3)) ([6e3c79e](https://github.com/ni/systemlink-grafana-plugins/commit/6e3c79e569669a0dc69de50bd7f2173730d0f759))

# [1.1.0](https://github.com/ni/systemlink-grafana-plugins/compare/v1.0.0...v1.1.0) (2023-07-19)


### Features

* Add tag data source prototype ([a2a04e6](https://github.com/ni/systemlink-grafana-plugins/commit/a2a04e6233a6c641b03eb0fccb4f97e48fdcfe2c))

# 1.0.0 (2023-07-13)


### Features

* Initial commit 🎉 ([d4339ad](https://github.com/ni/systemlink-grafana-plugins/commit/d4339ad1f2f1bba39d2250bf163d27f96b5c8534))
