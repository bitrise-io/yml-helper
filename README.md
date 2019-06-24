# yml-helper
NPM package for parsing Bitrise apps' bitrise.yml

### Example code
```js
import { StepSourceService, App } from 'yml-helper';

const bitriseYml = `
format_version: '6'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: other
trigger_map: []
workflows:
  workflow-test:
    steps:
    - script@1.1.5: {}
    - script@1.1.4: {}
  workflow-test-old:
    steps:
    - script@1.1.3: {}
    - script@1.1.2: {}
`;

const stepSourceService = new StepSourceService();
stepSourceService.loadDefaultLibrary().then(() => {
  const app = new App(bitriseYml, stepSourceService);

  app.workflows.forEach(workflow => {
    workflow.steps.forEach(step => {
      console.log(stepSourceService.isStepAtLeastOnVersion(step, '1.1.4'));
    });
  });
});
```
