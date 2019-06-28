import _ from 'underscore';

export class Step {
  constructor(cvs, userStepConfig, defaultStepConfig) {
    this.cvs = cvs;
    this.localPath;
    this.gitURL;
    this.libraryURL;
    this.id;
    this.version;

    this.userStepConfig = userStepConfig;
    if (!this.userStepConfig) {
      this.userStepConfig = {};
    }

    this.defaultStepConfig = defaultStepConfig;
  }

  static cvsFromWrappedStepConfig(wrappedStepConfig) {
    return _.first(_.keys(wrappedStepConfig));
  }
}
