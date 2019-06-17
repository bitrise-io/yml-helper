const _ = require('underscore');
const yaml = require('js-yaml');

import { Workflow } from './workflow';

export class App {
  constructor(bitriseYML, stepSourceService) {
    const appConfig = yaml.safeLoad(bitriseYML);
    this.defaultLibraryURL = appConfig.default_step_lib_source;

    this.workflows = _.map(appConfig.workflows, (workflowConfig, workflowID) => {
      return new Workflow(workflowID, workflowConfig, stepSourceService);
    });
  }
}
