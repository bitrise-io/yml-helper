const _ = require('underscore');

import { Step } from './step';

export class Workflow {
  constructor(id, workflowConfig, stepSourceService) {
    this.id = id;
    this.workflowConfig = workflowConfig;

    if (!this.workflowConfig) {
      return;
    }

    this.steps = _.map(workflowConfig.steps, function(aWrappedUserStepConfig) {
      var stepCVS = Step.cvsFromWrappedStepConfig(aWrappedUserStepConfig);
      var step;
      var userStepConfig = aWrappedUserStepConfig[stepCVS];

      try {
        step = stepSourceService.stepFromCVS(stepCVS);
        step.userStepConfig = userStepConfig;
      } catch (error) {
        console.log(error.message);
        step = new Step(stepCVS, userStepConfig);
      }

      return step;
    });
  }
}
