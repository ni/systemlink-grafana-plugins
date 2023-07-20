export const notebookMetadataSchema = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['metadata', 'parameters'],
  properties: {
    metadata: {
      type: 'object',
      required: ['outputs', 'parameters', 'version'],
      properties: {
        outputs: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['display_name', 'id', 'type'],
            properties: {
              display_name: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
            },
          },
        },
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            required: ['display_name', 'id', 'type'],
            properties: {
              display_name: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
            },
          },
        },
        version: {
          const: 2,
        },
      },
    },
    parameters: {
      type: 'object',
    },
  },
};

export const executionResultSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['result'],
  properties: {
    result: {
      type: 'array',
      items: {
        oneOf: [
          {
            description: 'Scalar data',
            type: 'object',
            required: ['id', 'type', 'value'],
            properties: {
              id: {
                type: 'string',
              },
              type: {
                const: 'scalar',
              },
              value: {},
            },
          },
          {
            description: 'Dataframe data (original)',
            type: 'object',
            required: ['id', 'type', 'data'],
            properties: {
              id: {
                description: 'Output identifier',
                type: 'string',
              },
              type: {
                const: 'data_frame',
              },
              data: {
                type: 'array',
                items: {
                  oneOf: [
                    {
                      type: 'object',
                      description: 'XY data',
                      required: ['format', 'x', 'y'],
                      properties: {
                        format: {
                          const: 'XY',
                        },
                        x: {
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'string',
                              },
                              {
                                type: 'number',
                              },
                            ],
                          },
                        },
                        y: {
                          type: 'array',
                          items: [
                            {
                              type: 'number',
                            },
                          ],
                        },
                      },
                    },
                    {
                      type: 'object',
                      description: 'Index data',
                      required: ['format', 'y'],
                      properties: {
                        format: {
                          const: 'INDEX',
                        },
                        y: {
                          type: 'array',
                          items: [
                            {
                              type: 'number',
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            description: 'Dataframe data (native)',
            type: 'object',
            required: ['id', 'type', 'data'],
            properties: {
              id: {
                description: 'Output identifier',
                type: 'string',
              },
              type: {
                const: 'data_frame',
              },
              data: {
                type: 'object',
                description: 'Native dataframe',
                required: ['columns', 'values'],
                properties: {
                  columns: {
                    type: 'array',
                    items: [
                      {
                        type: 'object',
                        required: ['name', 'type'],
                        properties: {
                          name: {
                            type: 'string',
                          },
                          type: {
                            type: 'string',
                          },
                        },
                      },
                    ],
                  },
                  values: {
                    type: 'array',
                    items: [
                      {
                        type: 'array',
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            description: 'Array data',
            type: 'object',
            required: ['id', 'type', 'data'],
            properties: {
              id: {
                type: 'string',
              },
              type: {
                const: 'array',
              },
              data: {
                type: 'array',
                items: {
                  oneOf: [
                    {
                      type: 'string',
                    },
                    {
                      type: 'number',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  },
};
