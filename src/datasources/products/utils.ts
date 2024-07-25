import _ from 'lodash';

export const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
